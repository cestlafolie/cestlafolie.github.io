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
const VADMIN={"pub": "BMragD96AUSFozDC1lvCc4NOii6S7sUlmi2j4JfSGvWxyN7KZDLT8lIQW0GVxmGXN3kjOI+GUkP8UpjLfLZRW4Q=", "salt": "YRCwiWqxX2biEY1F/CEZKg==", "iv": "r4Bvt6uCLQcO+0XD", "ct": "+Z2X+kawgw5VcNxw809Xlfi4WCDJ96eiSRc4Ah9D/+LJmoykSimKdyv4ZVQSSFSPB8e8JQVcCNFHG1gqyOxzrjBmEUeUPX1m/3T7GpX6rCi7a+GwpDAEWfa4CYlKLF4jGTMsFLKP2t2SxrFIP/zldUhLdtbtG9nr2WDUWpsndQZdW3bLPgRqsfmxYyRO2l+K5GhcavZmSmx7BA=="};

// ---- état
let timeline = [], seen = new Set(), src = null, pending = null, live = false, lastRounds = null, adminKey = null;
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
const verdict = (o, n) => o > n ? 'OUI ✅' : n > o ? 'NON ❌' : 'Égalité 🤝';

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

  tweenText($('vOuiTxt'), po, p => oui + ' · ' + p + ' %');
  tweenText($('vNonTxt'), pn, p => non + ' · ' + p + ' %');
  $('vOuiBar').style.transform = 'scaleX(' + po / 100 + ')';
  $('vNonBar').style.transform = 'scaleX(' + pn / 100 + ')';
  $('vTotal').textContent = max ? tot + ' / ' + max + ' joueurs ont voté' : tot + (tot > 1 ? ' votes' : ' vote');

  // pastilles de progression (une par joueur attendu)
  const dots = $('vDots');
  if (max && max <= 30) {
    if (dots.children.length !== max) dots.innerHTML = '<i></i>'.repeat(max);
    [...dots.children].forEach((d, i) => d.classList.toggle('on', i < tot));
  } else dots.innerHTML = '';

  // dernier résultat
  const wrap = $('vLastWrap'), box = $('vLast');
  if (last) {
    box.className = 'last ' + (last.oui > last.non ? 'oui' : last.non > last.oui ? 'non' : '');
    box.innerHTML = '';
    const k = document.createElement('div'); k.className = 'k'; k.textContent = 'Résultat du dernier vote';
    const v = document.createElement('div'); v.className = 'v'; v.textContent = verdict(last.oui, last.non);
    const d = document.createElement('div'); d.className = 'd'; d.textContent = last.oui + ' oui · ' + last.non + ' non — nouveau vote ouvert';
    box.append(k, v, d);
  }
  wrap.classList.toggle('open', !!last);
  if (live && last && lastRounds !== null && rounds !== lastRounds) {
    box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop');
    toast('Vote terminé : ' + verdict(last.oui, last.non)); buzz([20, 60, 20]);
  }
  lastRounds = last ? rounds : 0;

  // boutons
  document.querySelectorAll('.vote-btn').forEach(b => {
    b.classList.toggle('on', mine === b.dataset.v);
    b.classList.toggle('pending', !!pending && pending.v === b.dataset.v);
    b.disabled = !!mine;
  });
  $('voteMine').textContent = mine ? 'Ton vote : ' + mine.toUpperCase() + ' (anonyme). Définitif jusqu’à la fin de ce vote.' : 'Tu n’as pas encore voté.';

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

function connect() {
  if (src) src.close();
  src = new EventSource(TOPIC + '/sse?since=all');
  src.onopen = () => { setLive(true, 'En direct'); setTimeout(() => live = true, 1500); };
  src.onerror = () => setLive(false, 'Reconnexion…');
  src.onmessage = ev => {
    let m, d;
    try { m = JSON.parse(ev.data); d = JSON.parse(m.message); } catch { return; }
    if (!m.id || seen.has(m.id)) return; seen.add(m.id);
    if (d.k === 'reset' || d.k === 'players') queue = queue.then(() => verify(d)).then(ok => { if (ok) handle(d); });
    else queue = queue.then(() => handle(d));
  };
}
// retour sur l'appli (mobile) : relance la connexion si elle est tombée
document.addEventListener('visibilitychange', () => { if (!document.hidden && (!src || src.readyState === 2)) connect(); });

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
  $('btnAdmin').textContent = adminKey ? '🔓 Admin activé' : '🔒 Admin';
  render();
}

$('btnAdmin').onclick = async () => {
  if (adminKey) { $('adminWrap').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
  const pw = prompt('Mot de passe admin'); if (!pw) return;
  const btn = $('btnAdmin'); btn.textContent = '⏳ Vérification…'; btn.disabled = true;
  try { const pk = await unlock(pw.trim()); localStorage.setItem('badgheure_admin', tob64(pk)); await setAdmin(pk); toast('Mode admin activé'); }
  catch { btn.textContent = '🔒 Admin'; toast('Mot de passe incorrect'); }
  btn.disabled = false;
};
$('btnAdminOut').onclick = () => { localStorage.removeItem('badgheure_admin'); setAdmin(null); toast('Mode admin désactivé'); };

async function sendPlayers(n) {
  n = Math.max(0, Math.min(99, Math.round(n || 0)));
  $('votePlayers').value = n || '';
  try { await adminPublish({ k: 'players', n }); toast(n ? n + ' joueurs attendus' : 'Sans limite de joueurs'); } catch { toast('Échec, réessaie'); }
}
let plTimer = null;
const stepPlayers = delta => { const el = $('votePlayers'); el.value = Math.max(0, Math.min(99, (+el.value || 0) + delta)) || ''; clearTimeout(plTimer); plTimer = setTimeout(() => sendPlayers(+el.value), 600); };
$('plMinus').onclick = () => adminKey && stepPlayers(-1);
$('plPlus').onclick = () => adminKey && stepPlayers(1);
$('votePlayers').onchange = e => { if (adminKey) { clearTimeout(plTimer); sendPlayers(+e.target.value); } };
$('btnVoteReset').onclick = async () => {
  if (!adminKey || !confirm('Réinitialiser le vote pour tout le monde ?')) return;
  try { await adminPublish({ k: 'reset' }); toast('Vote réinitialisé'); buzz(); } catch { toast('Échec, réessaie'); }
};

// ---- démarrage
{ const s = localStorage.getItem('badgheure_admin'); if (s) setAdmin(b64(s)).catch(() => localStorage.removeItem('badgheure_admin')); }
render();
connect();
})();
