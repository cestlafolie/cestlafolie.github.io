// ===== Module : vote oui / non en direct =====
// Relais temps réel : ntfy.sh (gratuit, sans compte). Les messages sont traités dans
// l'ordre du serveur, identique pour tout le monde :
//  - réinitialisation (admin) : tout repart à zéro
//  - nombre de joueurs (admin) : combien de votes on attend
//  - quand ce nombre est atteint : résultat affiché + nouveau vote ouvert automatiquement
//  - dans un vote, seul le 1er vote de chaque personne compte
// Les messages admin sont signés (ECDSA) ; la clé privée n'est déchiffrable qu'avec le mot de passe.
(() => {
const TOPIC = 'https://ntfy.sh/badgheure-vote-k7q2m9x4w8d1p5z3';
const VADMIN={"pub": "BGKNAOmBPq8xA3rP2cDHYwCc8o934fn3ZkpfQ0iLzx3Gt7JQTrsFfOrjOxvIffjdqiYSBjFEPBbjC5aQcpqJY0Q=", "salt": "YQMGtoxCJY8t4lbb2vEyqQ==", "iv": "rTg0JvMT9iAj0pyD", "ct": "0kTUaUT1nJG7/1vhODkvY6JMuV8ph88LTVQvlbMoNgUBRETQSTMGmIo0uAqL8fPowFbjOnQOjFxjO0yaXIEy71k/mDVqOu9cbllYD44cB8MPlyM/TetLqvY8ugyMR7EVgQnhYG/5drTDgW/MfNJ5tIOz/Q7ALfie7HWU2ouBy5AB8nV6RU2+ievEuttvaSWlfamafsUyZImilw=="};

// ---- état
let timeline = [], seen = new Set(), pending = null, live = false, lastRounds = null, adminKey = null;
const nonces = new Set();
let queue = Promise.resolve();

const me = (() => {
  let v = localStorage.getItem('badgheure_voter');
  if (!v) { v = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => (b % 36).toString(36)).join(''); localStorage.setItem('badgheure_voter', v); }
  return v;
})();

const publish = obj => fetch(TOPIC, { method: 'POST', body: JSON.stringify(obj) }).then(r => { if (!r.ok) throw new Error(r.status); });

// ---- calcul du résultat à partir de l'historique
function tally() {
  let max = 0, ballots = new Map(), last = null, rounds = 0;
  const close = () => { let o = 0, n = 0; ballots.forEach(v => v === 'oui' ? o++ : n++); last = { oui: o, non: n }; rounds++; ballots = new Map(); };
  for (const e of timeline) {
    if (e.k === 'reset') { ballots = new Map(); last = null; rounds = 0; }
    else if (e.k === 'players') { max = e.n; if (max && ballots.size >= max) close(); }
    else if (!ballots.has(e.u)) { ballots.set(e.u, e.v); if (max && ballots.size >= max) close(); }
  }
  return { ballots, last, rounds, max };
}
const verdict = (o, n) => o > n ? 'Adopté' : n > o ? 'Rejeté' : 'Égalité · rejeté';   // égalité = rejet

// ---- affichage
function setLive(on, txt) { const el = $('voteLive'); el.classList.toggle('on', on); el.lastElementChild.textContent = txt; }

function render() {
  const { ballots, last, rounds, max } = tally();
  // vote optimiste : affiché tout de suite, en attendant la confirmation du serveur
  if (pending && timeline.slice(pending.idx).some(e => e.u === me)) pending = null;
  const mine = ballots.get(me) || (pending && pending.v);
  let oui = 0, non = 0; ballots.forEach(v => v === 'oui' ? oui++ : non++);
  if (pending && !ballots.has(me)) pending.v === 'oui' ? oui++ : non++;
  const tot = oui + non, po = tot ? Math.round(oui / tot * 100) : 0, pn = tot ? 100 - po : 0;

  tweenText($('vOuiN'), oui, x => x);
  tweenText($('vNonN'), non, x => x);
  tweenText($('vOuiP'), po, x => x + '%');
  tweenText($('vNonP'), pn, x => x + '%');
  $('vOuiBar').style.transform = 'scaleX(' + po / 100 + ')';
  $('vNonBar').style.transform = 'scaleX(' + pn / 100 + ')';
  $('vTotal').textContent = max ? tot + '/' + max + ' bulletins' : tot + (tot > 1 ? ' bulletins' : ' bulletin');
  $('vRound').textContent = 'Manche ' + (rounds + 1);

  // segments de progression (un par joueur attendu)
  const dots = $('vDots');
  if (max && max <= 30) {
    if (dots.children.length !== max) dots.innerHTML = '<i></i>'.repeat(max);
    [...dots.children].forEach((d, i) => d.classList.toggle('on', i < tot));
  } else dots.innerHTML = '';

  // résultat de la manche précédente
  const wrap = $('vLastWrap'), box = $('vLast');
  if (last) {
    box.className = 'last ' + (last.oui > last.non ? 'oui' : 'non');
    box.innerHTML = '';
    const l = document.createElement('div');
    const k = document.createElement('div'); k.className = 'k'; k.textContent = 'Manche ' + rounds;
    const v = document.createElement('div'); v.className = 'v'; v.textContent = verdict(last.oui, last.non);
    l.append(k, v);
    const d = document.createElement('div'); d.className = 'd'; d.textContent = last.oui + ' oui – ' + last.non + ' non';
    box.append(l, d);
  }
  wrap.classList.toggle('open', !!last);
  if (live && last && lastRounds !== null && rounds !== lastRounds) {
    box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop');
    toast('Manche ' + rounds + ' : ' + verdict(last.oui, last.non).toLowerCase() + ', ' + last.oui + ' – ' + last.non); buzz([20, 60, 20]);
  }
  lastRounds = last ? rounds : 0;

  // boutons
  document.querySelectorAll('.vote-btn').forEach(b => {
    b.classList.toggle('on', mine === b.dataset.v);
    b.classList.toggle('pending', !!pending && pending.v === b.dataset.v);
    b.disabled = !!mine;
  });
  $('voteMine').textContent = mine ? 'Bulletin déposé. Personne ne saura.' : 'Vote à bulletin secret.';

  const pl = $('votePlayers'); if (document.activeElement !== pl) pl.value = max || '';
}
const scheduleRender = rafBatch(render);

// ---- réception des messages
function handle(d) {
  if (d.k === 'reset') timeline.push({ k: 'reset' });
  else if (d.k === 'players' && Number.isInteger(d.n) && d.n >= 0 && d.n <= 99) timeline.push({ k: 'players', n: d.n });
  else if (d.k === 'v' && (d.v === 'oui' || d.v === 'non') && typeof d.u === 'string' && d.u.length <= 40) timeline.push({ k: 'v', u: d.u, v: d.v });
  else return;
  scheduleRender();
}

// ---- connexion temps réel
// Le serveur POUSSE chaque message dès qu'il arrive (quasi instantané, pas d'attente).
// Toutes les 0,5 s on vérifie que la connexion est vivante ; sinon on la relance tout de suite.
const CACHE = 'badgheure_vote_cache', MAX_AGE = 11 * 3600;   // ntfy garde les messages 12 h
let cache = [];

function ingest(m, fromCache) {
  let d;
  try { d = JSON.parse(m.message); } catch { return; }
  if (!m.id || seen.has(m.id)) return; seen.add(m.id);
  if (!fromCache) { cache.push({ id: m.id, time: m.time, message: m.message }); saveCache(); pulseDot(); }
  if (d.k === 'reset' || d.k === 'players') queue = queue.then(() => verify(d)).then(ok => { if (ok) handle(d); });
  else queue = queue.then(() => handle(d));
}
let saveT = null;
function flushCache() { clearTimeout(saveT); try { localStorage.setItem(CACHE, JSON.stringify(cache.slice(-500))); } catch {} }
function saveCache() { clearTimeout(saveT); saveT = setTimeout(flushCache, 300); }
addEventListener('pagehide', flushCache);
function restoreCache() {   // affiche tout de suite le dernier état connu, avant même la connexion
  try {
    const now = Date.now() / 1000;
    cache = (JSON.parse(localStorage.getItem(CACHE)) || []).filter(m => m && m.time > now - MAX_AGE);
    cache.forEach(m => ingest(m, true));
  } catch { cache = []; }
}
function pulseDot() { const i = $('voteLive').firstElementChild; i.classList.remove('tick'); void i.offsetWidth; i.classList.add('tick'); i.addEventListener('animationend', () => i.classList.remove('tick'), { once: true }); }

// Deux connexions ouvertes en parallèle : si l'une tombe, l'autre reçoit déjà les messages
// (aucune coupure), et celle qui est tombée se relance aussitôt (0 s, puis 0,1 s, 0,2 s…).
// Les doublons sont ignorés grâce à l'identifiant unique de chaque message.
const LINKS = 2;
const links = Array.from({ length: LINKS }, () => ({ es: null, last: 0, fails: 0, retryAt: 0 }));
const isOpen = l => l.es && l.es.readyState === 1;
function updateStatus() {
  const n = links.filter(isOpen).length;
  if (n) { setLive(true, 'en direct'); if (!live) setTimeout(() => live = true, 1200); }
  else setLive(false, navigator.onLine === false ? 'hors ligne' : 'reconnexion');
}
function open(l) {
  if (l.es) l.es.close();
  l.last = Date.now();
  const es = l.es = new EventSource(TOPIC + '/sse?since=all');
  const alive = () => { if (l.es === es) l.last = Date.now(); };
  es.onopen = () => { if (l.es !== es) return; l.fails = 0; alive(); updateStatus(); };
  es.addEventListener('keepalive', alive);
  es.addEventListener('open', alive);
  es.onmessage = ev => { alive(); try { ingest(JSON.parse(ev.data), false); } catch {} };
  es.onerror = () => {
    if (l.es !== es) return;
    es.close(); l.fails++;
    l.retryAt = Date.now() + (l.fails === 1 ? 0 : Math.min(100 * 2 ** (l.fails - 2), 3000));
    updateStatus();
    if (l.fails === 1) open(l);            // 1re tentative : immédiate
  };
}
function connectAll(force) { links.forEach(l => { if (force || !isOpen(l)) { l.fails = 0; open(l); } }); }
// surveillance toutes les 0,1 s
setInterval(() => {
  if (document.hidden) return;
  const now = Date.now();
  links.forEach(l => {
    if (!l.es || (l.es.readyState === 2 && now >= l.retryAt)) open(l);
    else if (l.es.readyState === 1 && now - l.last > 70000) open(l);   // connexion muette
  });
}, 100);
document.addEventListener('visibilitychange', () => { if (!document.hidden) connectAll(false); });
addEventListener('online', () => connectAll(true));
addEventListener('offline', updateStatus);

// ---- voter
document.querySelectorAll('.vote-btn').forEach(b => b.onclick = async () => {
  if (b.disabled) return;
  pending = { v: b.dataset.v, idx: timeline.length }; buzz(); render();
  try {
    await publish({ k: 'v', v: b.dataset.v, u: me });
    setTimeout(() => { if (pending) { pending = null; scheduleRender(); } }, 10000);
  } catch { pending = null; render(); toast('Échec de l’envoi, réessaie'); }
});

// ---- admin
const b64 = x => Uint8Array.from(atob(x), c => c.charCodeAt(0));
const tob64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const pubKey = crypto.subtle.importKey('raw', b64(VADMIN.pub), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
const canon = d => JSON.stringify({ k: d.k, n: d.n ?? null, nonce: d.nonce });
const enc = s => new TextEncoder().encode(s);

async function verify(d) {
  try {
    if (typeof d.nonce !== 'string' || typeof d.sig !== 'string' || nonces.has(d.nonce)) return false;
    const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, await pubKey, b64(d.sig), enc(canon(d)));
    if (ok) nonces.add(d.nonce);
    return ok;
  } catch { return false; }
}
async function adminPublish(d) {
  d.nonce = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join('');
  d.sig = tob64(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, adminKey, enc(canon(d))));
  return publish(d);
}
async function unlock(pw) {
  const base = await crypto.subtle.importKey('raw', enc(pw), 'PBKDF2', false, ['deriveKey']);
  const k = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(VADMIN.salt), iterations: 300000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(VADMIN.iv) }, k, b64(VADMIN.ct)));
}
async function setAdmin(pkcs8) {
  adminKey = pkcs8 ? await crypto.subtle.importKey('pkcs8', pkcs8, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']) : null;
  $('adminWrap').classList.toggle('open', !!adminKey);
  $('btnAdmin').textContent = adminKey ? 'admin · actif' : 'admin';
  render();
}

$('btnAdmin').onclick = async () => {
  if (adminKey) { $('adminWrap').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
  const pw = prompt('Mot de passe admin'); if (!pw) return;
  const btn = $('btnAdmin'); btn.textContent = 'vérification…'; btn.disabled = true;
  try { const pk = await unlock(pw.trim()); localStorage.setItem('badgheure_admin', tob64(pk)); await setAdmin(pk); toast('Mode admin'); }
  catch { btn.textContent = 'admin'; toast('Mauvais mot de passe'); }
  btn.disabled = false;
};
$('btnAdminOut').onclick = () => { localStorage.removeItem('badgheure_admin'); setAdmin(null); toast('Admin fermé'); };

async function sendPlayers(n) {
  n = Math.max(0, Math.min(99, Math.round(n || 0)));
  $('votePlayers').value = n || '';
  try { await adminPublish({ k: 'players', n }); toast(n ? n + ' joueurs' : 'Pas de limite'); } catch { toast('Raté, réessaie'); }
}
let plTimer = null;
const stepPlayers = delta => { const el = $('votePlayers'); el.value = Math.max(0, Math.min(99, (+el.value || 0) + delta)) || ''; clearTimeout(plTimer); plTimer = setTimeout(() => sendPlayers(+el.value), 600); };
$('plMinus').onclick = () => adminKey && stepPlayers(-1);
$('plPlus').onclick = () => adminKey && stepPlayers(1);
$('votePlayers').onchange = e => { if (adminKey) { clearTimeout(plTimer); sendPlayers(+e.target.value); } };
$('btnVoteReset').onclick = async () => {
  if (!adminKey || !confirm('Tout remettre à zéro pour tout le monde ?')) return;
  try { await adminPublish({ k: 'reset' }); toast('Remis à zéro'); buzz(); } catch { toast('Raté, réessaie'); }
};

// ---- démarrage
{ const s = localStorage.getItem('badgheure_admin'); if (s) setAdmin(b64(s)).catch(() => localStorage.removeItem('badgheure_admin')); }
restoreCache();
render();
connectAll(true);
})();
