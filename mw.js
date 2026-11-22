// ===== Module : Mystère White =====
// Jeu d'ambiance à mots : les Civils ont un mot, les Undercover un mot proche, Mister White n'a rien.
// Deux façons de jouer :
//  - « Un seul téléphone » : on se passe le téléphone, tout est géré sur cet appareil.
//  - « Un téléphone par joueur » : un hôte crée une partie (code à 4 caractères), les autres la rejoignent.
//    Les messages passent par ntfy.sh. Chaque mot est chiffré pour son seul destinataire (ECDH + AES-GCM) :
//    personne ne peut lire le mot des autres, même en fouillant le code de la page.
// Le hasard vient de crypto.getRandomValues.
const MW_PAIRS = {
  'Nourriture': [['Café','Thé'],['Pizza','Quiche'],['Croissant','Pain au chocolat'],['Pomme','Poire'],['Chocolat','Caramel'],['Burger','Sandwich'],['Fromage','Beurre'],['Sushi','Maki'],['Crêpe','Gaufre'],['Pâtes','Riz'],['Glace','Sorbet'],['Orange','Clémentine'],['Ketchup','Mayonnaise'],['Miel','Confiture'],['Frites','Chips'],['Soupe','Bouillon'],['Tacos','Kebab'],['Fraise','Framboise'],['Lait','Yaourt'],['Citron','Pamplemousse']],
  'Animaux': [['Chat','Tigre'],['Chien','Loup'],['Lion','Panthère'],['Dauphin','Requin'],['Abeille','Guêpe'],['Cheval','Âne'],['Aigle','Faucon'],['Grenouille','Crapaud'],['Lapin','Lièvre'],['Papillon','Libellule'],['Crocodile','Lézard'],['Pingouin','Phoque'],['Hibou','Chouette'],['Souris','Rat'],['Mouton','Chèvre'],['Vache','Buffle'],['Escargot','Limace'],['Perroquet','Toucan'],['Poule','Canard'],['Ours','Panda']],
  'Lieux': [['Plage','Piscine'],['Cinéma','Théâtre'],['Hôpital','Pharmacie'],['École','Université'],['Montagne','Colline'],['Forêt','Jungle'],['Aéroport','Gare'],['Restaurant','Cantine'],['Musée','Galerie'],['Bibliothèque','Librairie'],['Supermarché','Marché'],['Désert','Savane'],['Prison','Commissariat'],['Stade','Gymnase'],['Hôtel','Camping'],['Château','Palais'],['Boulangerie','Pâtisserie'],['Parc','Jardin'],['Métro','Tramway'],['Discothèque','Bar']],
  'Objets': [['Téléphone','Tablette'],['Stylo','Crayon'],['Lunettes','Lentilles'],['Montre','Bracelet'],['Parapluie','Imperméable'],['Clé','Cadenas'],['Chaise','Tabouret'],['Oreiller','Coussin'],['Bougie','Lampe'],['Miroir','Fenêtre'],['Valise','Sac à dos'],['Brosse à dents','Dentifrice'],['Fourchette','Cuillère'],['Casque','Écouteurs'],['Livre','Magazine'],['Ciseaux','Couteau'],['Télécommande','Manette'],['Canapé','Fauteuil'],['Ballon','Balle'],['Savon','Shampoing']],
  'Métiers': [['Médecin','Infirmier'],['Pompier','Policier'],['Boulanger','Pâtissier'],['Professeur','Directeur'],['Pilote','Hôtesse de l’air'],['Chanteur','Rappeur'],['Acteur','Mannequin'],['Avocat','Juge'],['Coiffeur','Barbier'],['Cuisinier','Serveur'],['Dentiste','Chirurgien'],['Footballeur','Basketteur'],['Journaliste','Écrivain'],['Plombier','Électricien'],['Vétérinaire','Fermier'],['Architecte','Maçon'],['Youtubeur','Streamer'],['Astronaute','Astronome'],['Magicien','Clown'],['Facteur','Livreur']],
  'Loisirs': [['Football','Rugby'],['Tennis','Badminton'],['Ski','Snowboard'],['Guitare','Violon'],['Piano','Batterie'],['Échecs','Dames'],['Netflix','YouTube'],['Karaoké','Concert'],['Vélo','Trottinette'],['Natation','Plongée'],['Boxe','Judo'],['Bowling','Billard'],['Poker','Blackjack'],['Danse','Gymnastique'],['Camping','Randonnée'],['Jeux vidéo','Jeux de société'],['Surf','Skate'],['Photo','Vidéo'],['Pêche','Chasse'],['Golf','Mini-golf']],
  'Divers': [['Été','Printemps'],['Soleil','Lune'],['Pluie','Neige'],['Anniversaire','Mariage'],['Noël','Nouvel An'],['Roi','Prince'],['Vampire','Zombie'],['Fantôme','Squelette'],['Sorcière','Fée'],['Pirate','Viking'],['Mer','Océan'],['Instagram','TikTok'],['Paris','Londres'],['Voiture','Moto'],['Avion','Hélicoptère'],['Bateau','Sous-marin'],['Rêve','Cauchemar'],['Amour','Amitié'],['Matin','Soir'],['Tempête','Orage']],
};

// La fabrique createUndercover() permet de lancer ce jeu plusieurs fois avec des mots différents
// (Mystère White, et le jeu Anime qui a son propre onglet). Chaque instance a ses propres données et ses propres mots.
function createUndercover(CFG) {
const ROOT = CFG.root;
const K = CFG.key;   // préfixe des données enregistrées et des canaux

// ---------- mots (paires originales) ----------
const PAIRS = CFG.pairs;
const CATS = Object.keys(PAIRS);

// ---------- outils ----------
const rnd = n => { const lim = Math.floor(0x100000000 / n) * n, a = new Uint32Array(1); do crypto.getRandomValues(a); while (a[0] >= lim); return a[0] % n; };
const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '').replace(/s+$/, '');
const store = {
  get: (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del: k => { try { localStorage.removeItem(k); } catch {} },
};
const ROLE = { civil: 'Civil', under: 'Undercover', white: 'Mister White' };
const rolePic = (role, cls = '') => `<img class="mw-pic ${cls}" src="img/role-${role}.svg" alt="">`;
const PLURAL = { civil: 'Civils', under: 'Undercover', white: 'Mister White' };

// réglages par défaut selon le nombre de joueurs
function defaults(n) { return n <= 4 ? { nU: 1, nW: 0 } : n <= 6 ? { nU: 1, nW: 1 } : n <= 9 ? { nU: 2, nW: 1 } : { nU: 3, nW: 1 }; }
// combinaison valide : au moins 1 intrus et plus de civils que d'intrus
function valid(n, nU, nW) { const imp = nU + nW, civ = n - imp; return n >= 3 && imp >= 1 && civ >= 2 && civ > imp; }
function maxImp(n) { return Math.max(1, Math.ceil(n / 2) - 1); }

// tirage des rôles et des mots
function deal(n, nU, nW, cats) {
  const pool = (cats && cats.length ? cats : CATS).flatMap(c => PAIRS[c] || []);
  const pair = pool[rnd(pool.length)], swap = rnd(2) === 1;
  const civil = swap ? pair[1] : pair[0], under = swap ? pair[0] : pair[1];
  const roles = shuffle([...Array(nU).fill('under'), ...Array(nW).fill('white'), ...Array(n - nU - nW).fill('civil')]);
  let order = shuffle([...Array(n).keys()]);
  if (roles[order[0]] === 'white') { const k = order.findIndex(i => roles[i] !== 'white'); if (k > 0) [order[0], order[k]] = [order[k], order[0]]; }   // Mister White ne commence jamais
  return { civil, under, roles, order };
}
function winner(roles, alive) {
  let civ = 0, imp = 0;
  roles.forEach((r, i) => { if (!alive[i]) return; r === 'civil' ? civ++ : imp++; });
  if (imp === 0) return 'civils';
  if (civ <= 1) return 'intrus';
  return null;
}
const wordOf = (role, civil, under) => role === 'civil' ? civil : role === 'under' ? under : null;

// ---------- écran d'accueil du jeu ----------
let mode = store.get(K + '_mode', null);   // 'local' | 'online' | null
function home() {
  ROOT.innerHTML = `
    ${CFG.hero || `<div class="mw-hero">
      <h2 class="mw-title">Mystère<br><span>White</span></h2>
      <p class="mw-lead">Tout le monde a le même mot… sauf l’intrus. Trouve-le avant qu’il ne vous trouve.</p>
    </div>`}
    <div class="mw-modes">
      <button class="mw-card mw-yellow" data-act="mode-local"><b>Un seul téléphone</b><span>On se le passe pour découvrir son mot en secret.</span></button>
      <button class="mw-card mw-mint" data-act="mode-online"><b>Un téléphone par joueur</b><span>Une partie avec un code, chacun sur son téléphone.</span></button>
    </div>
    ${rulesHTML()}`;
}
function rulesHTML() {
  return `<details class="mw-rules"><summary>Les règles</summary>
    <div class="mw-rolepics">${rolePic('civil')}${rolePic('under')}${rolePic('white')}</div><p><b>Civils</b> : ils ont tous le même mot. <b>Undercover</b> : ils ont un mot proche, sans savoir qu’ils sont l’intrus. <b>Mister White</b> : il n’a aucun mot et doit bluffer.</p>
    <p>Chacun à son tour dit <b>un mot ou une courte phrase</b> sur son mot, sans être trop évident. Puis tout le monde vote pour éliminer quelqu’un, qui révèle son rôle.</p>
    <p>Les <b>Civils</b> gagnent s’ils éliminent tous les intrus. Les <b>intrus</b> gagnent s’il ne reste plus qu’un Civil. Si <b>Mister White</b> est éliminé, il peut encore gagner en devinant le mot des Civils.</p></details>`;
}
function backBtn(label = 'Changer de mode') { return `<button class="mw-back" data-act="back">‹ ${label}</button>`; }

// =====================================================================
// MODE 1 : UN SEUL TÉLÉPHONE
// =====================================================================
let L = store.get(K + '_local', null) || { players: [], nU: 1, nW: 0, cats: [], game: null };
const saveL = () => store.set(K + '_local', L);

function localRender() {
  const g = L.game;
  if (!g) return localSetup();
  if (g.step === 'deal') return localDeal();
  if (g.step === 'play') return localPlay();
  if (g.step === 'vote') return localVote();
  if (g.step === 'reveal') return localReveal();
  if (g.step === 'end') return endScreen(g.players.map(p => ({ name: p.name, role: p.role, alive: p.alive })), g.civil, g.under, g.winner, g.guess, true);
}
function settingsHTML(n, nU, nW, cats, editable = true) {
  const ok = valid(n, nU, nW);
  return `<div class="mw-box">
    <div class="mw-row"><span>Undercover</span><div class="mw-step">${editable ? `<button data-act="nU-">−</button>` : ''}<b>${nU}</b>${editable ? `<button data-act="nU+">+</button>` : ''}</div></div>
    <div class="mw-row"><span>Mister White</span><div class="mw-step">${editable ? `<button data-act="nW-">−</button>` : ''}<b>${nW}</b>${editable ? `<button data-act="nW+">+</button>` : ''}</div></div>
    <div class="mw-row"><span>Civils</span><div class="mw-step"><b>${Math.max(0, n - nU - nW)}</b></div></div>
    <p class="mw-label">Thèmes ${cats.length ? '' : '(tous)'}</p>
    <div class="mw-cats">${CATS.map(c => `<button class="mw-cat${cats.includes(c) ? ' on' : ''}" data-act="cat" data-v="${esc(c)}"${editable ? '' : ' disabled'}>${esc(c)}</button>`).join('')}</div>
    ${n >= 3 && !ok ? `<p class="mw-warn">Il faut au moins 1 intrus et plus de Civils que d’intrus.</p>` : ''}
  </div>`;
}
function localSetup() {
  const n = L.players.length;
  ROOT.innerHTML = `${backBtn()}
    <h3 class="mw-h">Les joueurs <em>${n}</em></h3>
    <form class="mw-add" data-form="lp" autocomplete="off"><input name="n" maxlength="18" placeholder="Prénom" enterkeyhint="done"><button>Ajouter</button></form>
    <div class="mw-chips">${L.players.map((p, i) => `<span class="mw-chip">${esc(p)}<button data-act="lp-del" data-i="${i}" aria-label="Supprimer">×</button></span>`).join('') || '<p class="mw-muted">Au moins 3 joueurs.</p>'}</div>
    ${settingsHTML(n, L.nU, L.nW, L.cats)}
    <button class="mw-go" data-act="l-start"${valid(n, L.nU, L.nW) ? '' : ' disabled'}>Distribuer les mots</button>`;
}
function localStart() {
  const n = L.players.length;
  const d = deal(n, L.nU, L.nW, L.cats);
  L.game = { step: 'deal', dealIdx: 0, shown: false, civil: d.civil, under: d.under, order: d.order, round: 1,
    players: L.players.map((name, i) => ({ name, role: d.roles[i], alive: true })), lastOut: null, winner: null, guess: null };
  saveL(); localRender();
}
function localDeal() {
  const g = L.game, p = g.players[g.dealIdx];
  if (!g.shown) {
    ROOT.innerHTML = `<p class="mw-kicker">Distribution ${g.dealIdx + 1} / ${g.players.length}</p>
      <div class="mw-pass"><span>Passe le téléphone à</span><b>${esc(p.name)}</b></div>
      <button class="mw-go" data-act="l-show">C’est moi, voir mon mot</button>
      <button class="mw-link" data-act="l-quit">Arrêter la partie</button>`;
  } else {
    const w = wordOf(p.role, g.civil, g.under);
    ROOT.innerHTML = `<p class="mw-kicker">${esc(p.name)}, ${CFG.wordLabel ? 'ton personnage secret' : 'ton mot secret'}</p>
      ${wordCard(w)}
      <button class="mw-go" data-act="l-hide">J’ai retenu, cacher</button>`;
  }
}
function wordCard(w) {
  const pic = CFG.picture ? CFG.picture(w) : '';
  return w ? `<div class="mw-word">${pic}<span>${CFG.wordLabel || 'Ton mot'}</span><b>${esc(w)}</b><em>Ne le montre à personne</em></div>`
           : `<div class="mw-word mw-white">${pic}<span>Tu es</span><b>Mister White</b><em>Tu n’as pas de mot : écoute les autres et bluffe.</em></div>`;
}
function orderHTML(names, alive, title) {
  return `<div class="mw-box"><p class="mw-label">${title}</p><ol class="mw-order">${names.map((n, k) => `<li class="${alive[k] ? '' : 'out'}">${esc(n)}</li>`).join('')}</ol></div>`;
}
function localPlay() {
  const g = L.game, names = g.order.map(i => g.players[i].name), alive = g.order.map(i => g.players[i].alive);
  ROOT.innerHTML = `<p class="mw-kicker">Tour ${g.round}</p><h3 class="mw-h">Chacun décrit son mot</h3>
    <p class="mw-muted">Un mot ou une courte phrase chacun, dans cet ordre.</p>
    ${orderHTML(names, alive, 'Ordre de parole')}
    <button class="mw-go" data-act="l-vote">Passer au vote</button>
    <button class="mw-link" data-act="l-quit">Arrêter la partie</button>`;
}
function localVote() {
  const g = L.game;
  ROOT.innerHTML = `<p class="mw-kicker">Tour ${g.round} · vote</p><h3 class="mw-h">Qui éliminer ?</h3>
    <p class="mw-muted">Discutez, votez à main levée, puis touchez la personne éliminée.</p>
    <div class="mw-pick">${g.players.map((p, i) => p.alive ? `<button data-act="l-out" data-i="${i}">${esc(p.name)}</button>` : '').join('')}</div>
    <button class="mw-link" data-act="l-back-play">‹ Retour</button>`;
}
function localReveal() {
  const g = L.game, p = g.players[g.lastOut];
  if (p.role === 'white' && g.guess === null) {
    ROOT.innerHTML = `<div class="mw-reveal mw-white-bg">${rolePic('white')}<span>${esc(p.name)} était</span><b>Mister White</b></div>
      <p class="mw-muted">Dernière chance : ${esc(p.name)} essaie de deviner le mot des Civils.</p>
      <form class="mw-add" data-form="lguess" autocomplete="off"><input name="g" maxlength="30" placeholder="Le mot des Civils" enterkeyhint="done"><button>Valider</button></form>`;
    return;
  }
  ROOT.innerHTML = `<div class="mw-reveal mw-${p.role}">${rolePic(p.role)}<span>${esc(p.name)} était</span><b>${ROLE[p.role]}</b></div>
    ${p.role === 'white' ? `<p class="mw-muted">Il a proposé « ${esc(g.guess)} » : raté !</p>` : ''}
    <button class="mw-go" data-act="l-next">Continuer</button>`;
}
function localEliminate(i) {
  const g = L.game; g.players[i].alive = false; g.lastOut = i; g.guess = null; g.step = 'reveal'; saveL(); localRender();
}
function localAfterReveal() {
  const g = L.game, w = winner(g.players.map(p => p.role), g.players.map(p => p.alive));
  if (w) { g.winner = w; g.step = 'end'; } else { g.round++; g.step = 'play'; }
  saveL(); localRender();
}
function localGuess(text) {
  const g = L.game; g.guess = text.trim() || '…';
  if (norm(g.guess) && norm(g.guess) === norm(g.civil)) { g.winner = 'white'; g.step = 'end'; saveL(); return localRender(); }
  saveL(); localRender();
}

// ---------- écran de fin (commun aux deux modes) ----------
function endScreen(players, civil, under, win, guess, isLocal, canReplay = true) {
  const title = win === 'civils' ? 'Les Civils gagnent' : win === 'white' ? 'Mister White gagne' : 'Les intrus gagnent';
  const sub = win === 'white' ? `Il a deviné le mot « ${esc(civil)} ».` : win === 'civils' ? 'Tous les intrus ont été démasqués.' : 'Il ne reste plus qu’un Civil.';
  ROOT.innerHTML = `<div class="mw-end mw-end-${win}">${rolePic(win === 'civils' ? 'civil' : win === 'white' ? 'white' : 'under')}<span>Fin de partie</span><b>${title}</b><em>${sub}</em></div>
    <div class="mw-box mw-words"><div><span>Civils</span><b>${esc(civil)}</b></div><div><span>Undercover</span><b>${esc(under)}</b></div></div>
    <div class="mw-box"><p class="mw-label">Les rôles</p><ul class="mw-roles">${players.map(p => `<li class="mw-r-${p.role}${p.alive ? '' : ' out'}">${rolePic(p.role, 'xs')}<span>${esc(p.name)}</span><b>${ROLE[p.role]}</b></li>`).join('')}</ul></div>
    ${canReplay ? `<button class="mw-go" data-act="${isLocal ? 'l-replay' : 'o-replay'}">Rejouer</button>` : `<p class="mw-muted mw-center">L’hôte peut relancer une partie.</p>`}
    <button class="mw-link" data-act="${isLocal ? 'l-edit' : 'o-lobby'}">${isLocal ? 'Modifier les joueurs' : canReplay ? 'Retour au salon' : ''}</button>`;
  if (!isLocal && !canReplay) ROOT.querySelector('.mw-link').remove();
  confettiBurst();
}
function confettiBurst() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = ROOT.querySelector('.mw-end'); if (!box) return;
  const r = box.getBoundingClientRect(), cv = document.createElement('canvas'); cv.className = 'r-confetti';
  const dpr = Math.min(2, devicePixelRatio || 1); cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
  document.body.appendChild(cv); const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
  const cols = ['#ffd93d', '#6bcb77', '#ff6b6b', '#4d96ff', '#111'];
  const parts = Array.from({ length: 80 }, () => { const a = rnd(360) * Math.PI / 180, sp = 3 + rnd(60) / 10; return { x: r.left + r.width / 2, y: r.top + r.height / 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 4, s: 5 + rnd(5), rot: rnd(360), c: cols[rnd(cols.length)] }; });
  const t0 = performance.now();
  (function f(now) { const t = now - t0; ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts.forEach(p => { p.vy += .2; p.x += p.vx; p.y += p.vy; p.rot += 6; ctx.save(); ctx.globalAlpha = Math.max(0, 1 - t / 1500); ctx.translate(p.x, p.y); ctx.rotate(p.rot * Math.PI / 180); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); });
    if (t < 1500) requestAnimationFrame(f); else cv.remove(); })(t0);
}

// =====================================================================
// MODE 2 : UN TÉLÉPHONE PAR JOUEUR
// =====================================================================
const topicOf = code => 'https://ntfy.sh/cestlafolie-' + K + '-' + code.toLowerCase() + '-' + CFG.salt;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const enc = s => new TextEncoder().encode(s);
const subtle = crypto.subtle;

let O = null;        // état de la partie en ligne
let chan = null;     // canal temps réel
let me = null;       // { code, pid, name, host, priv(jwk), pub }

async function genKeys() {
  const kp = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
  return { priv: await subtle.exportKey('jwk', kp.privateKey), pub: b64(await subtle.exportKey('raw', kp.publicKey)) };
}
async function sharedKey(privJwk, pubB64) {
  const priv = await subtle.importKey('jwk', privJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey']);
  const pub = await subtle.importKey('raw', unb64(pubB64), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  return subtle.deriveKey({ name: 'ECDH', public: pub }, priv, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function seal(privJwk, pubB64, obj) {
  const k = await sharedKey(privJwk, pubB64), iv = crypto.getRandomValues(new Uint8Array(12));
  return { iv: b64(iv), ct: b64(await subtle.encrypt({ name: 'AES-GCM', iv }, k, enc(JSON.stringify(obj)))) };
}
async function open_(privJwk, pubB64, box) {
  const k = await sharedKey(privJwk, pubB64);
  return JSON.parse(new TextDecoder().decode(await subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, k, unb64(box.ct))));
}

function freshState() { return { players: [], cfg: { nU: 1, nW: 0, cats: [] }, phase: 'lobby', gid: null, order: [], alive: {}, r: 0, votes: {}, mine: null, last: null, end: null, guessSent: false, hostPub: null }; }
const roomKey = code => K + '_room_' + code;
const send = obj => chan ? chan.publish(Object.assign({ gid: O && O.gid }, obj)).catch(() => toast('Pas de connexion, réessaie')) : null;

function connect(code) {
  if (chan) chan.close();
  O = freshState();
  chan = liveTopic(topicOf(code), {
    onStatus: s => { O.net = s; const el = ROOT.querySelector('.mw-net'); if (el) { el.className = 'mw-net ' + s; el.lastElementChild.textContent = s === 'on' ? 'Connecté' : s === 'offline' ? 'Hors ligne' : 'Connexion…'; } },
    onReady: () => { O.ready = true; ensureJoined(); hostTick(); onlineRender(); },
    onMessage: (d) => { handle(d); if (O.ready) { hostTick(); onlineRender(); } },
  });
}
function ensureJoined() {
  if (!O.players.some(p => p.pid === me.pid)) send({ k: 'join', pid: me.pid, name: me.name, pub: me.pub });
}
function handle(d) {
  if (d.k === 'join' && typeof d.pid === 'string' && typeof d.name === 'string' && typeof d.pub === 'string') {
    const p = O.players.find(x => x.pid === d.pid);
    if (p) { p.name = d.name.slice(0, 18); p.pub = d.pub; } else if (O.players.length < 20) O.players.push({ pid: d.pid, name: d.name.slice(0, 18), pub: d.pub });
  } else if (d.k === 'leave') { O.players = O.players.filter(p => p.pid !== d.pid); }
  else if (d.k === 'cfg' && d.cfg) { O.cfg = { nU: +d.cfg.nU || 0, nW: +d.cfg.nW || 0, cats: Array.isArray(d.cfg.cats) ? d.cfg.cats.filter(c => CATS.includes(c)) : [] }; }
  else if (d.k === 'start' && d.gid && Array.isArray(d.order) && d.box) {
    Object.assign(O, { phase: 'play', gid: d.gid, order: d.order, alive: Object.fromEntries(d.order.map(p => [p, true])), r: 0, votes: {}, mine: null, last: null, end: null, guessSent: false, hostPub: d.hostPub, box: d.box[me.pid] || null, names: d.names || {} });
    if (O.box) open_(me.priv, d.hostPub, O.box).then(x => { if (O.gid === d.gid) { O.mine = x; onlineRender(); } }).catch(() => { O.mine = { err: true }; onlineRender(); });
  }
  else if (d.gid !== O.gid) return;   // message d'une ancienne partie
  else if (d.k === 'vote' && d.r === O.r && O.phase === 'play' && O.alive[d.pid] && O.alive[d.t]) { (O.votes[d.r] = O.votes[d.r] || {})[d.pid] = d.t; }
  else if (d.k === 'res' && d.r === O.r) {
    O.last = { out: d.out, role: d.role || null, tie: !d.out, guess: null, ok: null };
    if (d.out) O.alive[d.out] = false;
    O.r++;
    O.phase = d.role === 'white' ? 'guess' : 'play';
  }
  else if (d.k === 'guess' && O.phase === 'guess' && O.last && d.pid === O.last.out) { O.last.guess = String(d.text || '').slice(0, 30); }
  else if (d.k === 'wg' && O.phase === 'guess' && O.last) { O.last.ok = !!d.ok; O.last.guess = d.text; O.phase = 'play'; }
  else if (d.k === 'end' && d.roles) { O.end = d; O.phase = 'end'; }
  else if (d.k === 'lobby') { Object.assign(O, { phase: 'lobby', end: null, last: null }); }
}
// ----- l'hôte arbitre : dépouillement, révélations, fin de partie -----
function hostSecret() { return store.get(roomKey(me.code), {}).secret || null; }
function hostTick() {
  if (!me || !me.host || !O.ready) return;
  // salon : réglages adaptés automatiquement au nombre de joueurs
  if (O.phase === 'lobby') {
    const n = O.players.length;
    // tant que l'hôte n'a pas touché aux réglages (ou s'ils deviennent impossibles), on applique ceux conseillés
    if (n >= 3 && O._cfgN !== n && (!O._manual || !valid(n, O.cfg.nU, O.cfg.nW))) {
      O._cfgN = n; const d = defaults(n);
      if (d.nU !== O.cfg.nU || d.nW !== O.cfg.nW) { O.cfg = Object.assign({}, O.cfg, d); send({ k: 'cfg', cfg: O.cfg }); }
    }
    return;
  }
  const sec = hostSecret();
  if (!sec || sec.gid !== O.gid) return;
  if (O.phase === 'play') {
    // fin de partie ?
    const w = winner(O.order.map(p => sec.roles[p]), O.order.map(p => O.alive[p]));
    if (w) { if (!O.end && O._endSent !== O.gid) { O._endSent = O.gid; send({ k: 'end', winner: w, roles: sec.roles, civil: sec.civil, under: sec.under }); } return; }
    // tout le monde a voté : dépouillement
    const aliveIds = O.order.filter(p => O.alive[p]), v = O.votes[O.r] || {};
    if (aliveIds.length && aliveIds.every(p => v[p]) && O._resSent !== O.gid + ':' + O.r) {
      O._resSent = O.gid + ':' + O.r;
      const count = {}; Object.values(v).forEach(t => count[t] = (count[t] || 0) + 1);
      const max = Math.max(...Object.values(count)), top = Object.keys(count).filter(t => count[t] === max);
      if (top.length === 1) send({ k: 'res', r: O.r, out: top[0], role: sec.roles[top[0]] });
      else send({ k: 'res', r: O.r, out: null });
    }
  } else if (O.phase === 'guess' && O.last && O.last.guess !== null && O._wgSent !== O.gid + ':' + O.r) {
    O._wgSent = O.gid + ':' + O.r;
    const ok = !!norm(O.last.guess) && norm(O.last.guess) === norm(sec.civil);
    send({ k: 'wg', ok, text: O.last.guess });
    if (ok) { O._endSent = O.gid; setTimeout(() => send({ k: 'end', winner: 'white', roles: sec.roles, civil: sec.civil, under: sec.under }), 300); }
  }
}
async function hostStart() {
  const players = O.players.slice(), n = players.length, { nU, nW, cats } = O.cfg;
  if (!valid(n, nU, nW)) return toast('Réglages impossibles pour ' + n + ' joueurs');
  const d = deal(n, nU, nW, cats), gid = Date.now().toString(36) + rnd(1e6).toString(36);
  const roles = {}, box = {}, names = {};
  players.forEach((p, i) => { roles[p.pid] = d.roles[i]; names[p.pid] = p.name; });
  for (const p of players) box[p.pid] = await seal(me.priv, p.pub, { word: wordOf(roles[p.pid], d.civil, d.under) });
  const r = store.get(roomKey(me.code), {}); r.secret = { gid, roles, civil: d.civil, under: d.under }; store.set(roomKey(me.code), r);
  const msg = { k: 'start', gid, order: d.order.map(i => players[i].pid), hostPub: me.pub, box, names };
  if (new TextEncoder().encode(JSON.stringify(msg)).length > 3900) return toast('Trop de joueurs pour une partie en ligne');
  chan.publish(msg).catch(() => toast('Pas de connexion, réessaie'));
}

// ----- écrans du mode en ligne -----
const nameOf = pid => (O.names && O.names[pid]) || (O.players.find(p => p.pid === pid) || {}).name || '?';
function netHTML() { const s = O.net || 'wait'; return `<p class="mw-net ${s}"><i></i><span>${s === 'on' ? 'Connecté' : s === 'offline' ? 'Hors ligne' : 'Connexion…'}</span></p>`; }

function onlineEntry() {
  const hp = decodeURIComponent(location.hash.slice(1)).split('/');
  const code = hp[0] === CFG.tab ? (hp[1] || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) : '';
  const lastName = store.get('mw_name', '');
  ROOT.innerHTML = `${backBtn()}
    <div class="mw-box">
      <p class="mw-label">Rejoindre une partie</p>
      <form class="mw-form" data-form="join" autocomplete="off">
        <input name="code" maxlength="4" placeholder="CODE" value="${esc(code)}" autocapitalize="characters" class="mw-code-in">
        <input name="name" maxlength="18" placeholder="Ton prénom" value="${esc(lastName)}">
        <button class="mw-go">Rejoindre</button>
      </form>
    </div>
    <p class="mw-or">ou</p>
    <div class="mw-box">
      <p class="mw-label">Créer une partie</p>
      <form class="mw-form" data-form="create" autocomplete="off">
        <input name="name" maxlength="18" placeholder="Ton prénom" value="${esc(lastName)}">
        <button class="mw-go mw-dark">Créer et inviter</button>
      </form>
    </div>`;
}
async function enterRoom(code, name, host) {
  name = name.trim().replace(/\s+/g, ' ').slice(0, 18);
  if (!name) return toast('Indique ton prénom');
  if (!/^[A-Z0-9]{4}$/.test(code)) return toast('Le code fait 4 caractères');
  store.set('mw_name', name);
  let r = store.get(roomKey(code), null);
  if (!r || !r.priv) { const k = await genKeys(); r = { pid: rnd(1e9).toString(36) + rnd(1e9).toString(36), priv: k.priv, pub: k.pub }; }
  r.name = name; r.host = host || !!r.host; store.set(roomKey(code), r);
  me = Object.assign({ code }, r);
  store.set(K + '_cur', code);
  if (location.hash.slice(1).split('/')[0] === CFG.tab) history.replaceState(null, '', '#' + CFG.tab + '/' + code);
  connect(code);
  onlineRender();
  if (O.ready) ensureJoined();
  // le nom a pu changer : on se réannonce
  setTimeout(() => { if (O && O.ready) send({ k: 'join', pid: me.pid, name: me.name, pub: me.pub }); }, 50);
}
function leaveRoom() {
  if (chan && me) chan.publish({ k: 'leave', pid: me.pid }).catch(() => {});
  if (chan) chan.close(); chan = null; O = null; me = null;
  store.del(K + '_cur'); if (location.hash.slice(1).split('/')[0] === CFG.tab) history.replaceState(null, '', '#' + CFG.tab);
  render();
}

// Redessine l'écran sans perdre ce que l'utilisateur est en train de faire :
// carte du mot ouverte, texte en cours de saisie, curseur.
function keepUI(fn) {
  const det = ROOT.querySelector('.mw-secret'), wasOpen = det ? det.open : null;
  const vals = {}; ROOT.querySelectorAll('input[name]').forEach(i => { vals[i.closest('form')?.dataset.form + ':' + i.name] = i.value; });
  const f = document.activeElement, fKey = f && ROOT.contains(f) && f.name ? f.closest('form')?.dataset.form + ':' + f.name : null;
  const sel = fKey && f.selectionStart != null ? [f.selectionStart, f.selectionEnd] : null;
  fn();
  const det2 = ROOT.querySelector('.mw-secret'); if (det2 && wasOpen !== null) det2.open = wasOpen;
  ROOT.querySelectorAll('input[name]').forEach(i => { const k = i.closest('form')?.dataset.form + ':' + i.name; if (vals[k] !== undefined && vals[k] !== '') i.value = vals[k]; });
  if (fKey) { const i = [...ROOT.querySelectorAll('input[name]')].find(x => x.closest('form')?.dataset.form + ':' + x.name === fKey); if (i) { i.focus(); if (sel) try { i.setSelectionRange(sel[0], sel[1]); } catch {} } }
}
function onlineRender() { keepUI(onlineRender_); }
function onlineRender_() {
  if (!me) return onlineEntry();
  if (!O.ready) { ROOT.innerHTML = `${netHTML()}<p class="mw-muted mw-center mw-pad">Connexion à la partie ${esc(me.code)}…</p>`; return; }
  if (O.phase === 'lobby') return lobby();
  if (O.phase === 'end') {
    const e = O.end, players = O.order.map(p => ({ name: nameOf(p), role: e.roles[p], alive: O.alive[p] }));
    return endScreen(players, e.civil, e.under, e.winner, null, false, me.host);
  }
  if (!O.order.includes(me.pid)) { ROOT.innerHTML = `${netHTML()}<div class="mw-box mw-center"><b>Partie en cours</b><p class="mw-muted">Tu joueras à la prochaine. L’hôte peut relancer quand celle-ci est finie.</p></div>${leaveBtn()}`; return; }
  return game();
}
function leaveBtn() { return `<button class="mw-link" data-act="o-leave">Quitter la partie</button>`; }
function lobby() {
  const n = O.players.length, url = location.origin + location.pathname + '#' + CFG.tab + '/' + me.code;
  ROOT.innerHTML = `${netHTML()}
    <div class="mw-codebox"><span>Code de la partie</span><b>${esc(me.code)}</b>
      <button class="mw-share" data-act="o-share" data-url="${esc(url)}">Inviter</button></div>
    <h3 class="mw-h">Dans le salon <em>${n}</em></h3>
    <div class="mw-chips">${O.players.map(p => `<span class="mw-chip${p.pid === me.pid ? ' me' : ''}">${esc(p.name)}${p.pid === me.pid ? ' (toi)' : ''}</span>`).join('')}</div>
    ${me.host ? settingsHTML(n, O.cfg.nU, O.cfg.nW, O.cfg.cats) + `<button class="mw-go" data-act="o-start"${valid(n, O.cfg.nU, O.cfg.nW) ? '' : ' disabled'}>Lancer la partie</button>`
              : `${settingsHTML(n, O.cfg.nU, O.cfg.nW, O.cfg.cats, false)}<p class="mw-muted mw-center">En attente que l’hôte lance la partie…</p>`}
    ${leaveBtn()}`;
}
function game() {
  const aliveMe = O.alive[me.pid], v = O.votes[O.r] || {}, aliveIds = O.order.filter(p => O.alive[p]);
  const voted = aliveIds.filter(p => v[p]).length, myVote = v[me.pid];
  let top = '';
  if (O.last) {
    if (O.last.tie) top = `<div class="mw-note">Égalité au vote : on revote.</div>`;
    else if (O.last.role) {
      const extra = O.last.role === 'white' ? (O.phase === 'guess' ? ' — il tente de deviner le mot…' : O.last.ok === false ? ` — il a proposé « ${esc(O.last.guess)} » : raté !` : '') : '';
      top = `<div class="mw-reveal mw-${O.last.role} mw-small">${rolePic(O.last.role, 'sm')}<span>${esc(nameOf(O.last.out))} était</span><b>${ROLE[O.last.role]}</b><em>${extra}</em></div>`;
    }
  }
  const mine = O.mine ? (O.mine.err ? `<div class="mw-note">Impossible de lire ton mot. Quitte et rejoins la partie.</div>` : `<details class="mw-secret"><summary><span class="o">Toucher pour voir ${CFG.wordLabel ? 'mon personnage' : 'mon mot'}</span><span class="c">Cacher mon mot</span></summary>${wordCard(O.mine.word)}</details>`) : `<p class="mw-muted mw-center">Réception de ton mot…</p>`;
  let action = '';
  if (O.phase === 'guess' && O.last && O.last.out === me.pid) {
    action = O.last.guess !== null ? `<p class="mw-muted mw-center">Réponse envoyée…</p>` :
      `<div class="mw-box"><p class="mw-label">Dernière chance : devine le mot des Civils</p><form class="mw-add" data-form="oguess" autocomplete="off"><input name="g" maxlength="30" placeholder="Le mot des Civils" enterkeyhint="done"><button>Valider</button></form></div>`;
  } else if (O.phase === 'guess') {
    action = `<p class="mw-muted mw-center">${esc(nameOf(O.last.out))} essaie de deviner le mot…</p>`;
  } else if (!aliveMe) {
    action = `<div class="mw-note">Tu es éliminé : regarde la suite sans rien dire !</div><p class="mw-muted mw-center">Votes : ${voted} / ${aliveIds.length}</p>`;
  } else {
    action = `<div class="mw-box"><p class="mw-label">Vote ${myVote ? '— tu peux encore changer' : ': qui éliminer ?'}</p>
      <div class="mw-pick">${aliveIds.filter(p => p !== me.pid).map(p => `<button class="${myVote === p ? 'on' : ''}" data-act="o-vote" data-p="${esc(p)}">${esc(nameOf(p))}</button>`).join('')}</div>
      <p class="mw-muted mw-center">${voted} / ${aliveIds.length} ont voté${voted === aliveIds.length ? ' — dépouillement…' : ''}</p></div>`;
  }
  ROOT.innerHTML = `${netHTML()}<p class="mw-kicker">Partie ${esc(me.code)} · tour ${O.r + 1}</p>
    ${top}${mine}
    ${orderHTML(O.order.map(nameOf), O.order.map(p => O.alive[p]), 'Ordre de parole')}
    ${action}
    ${me.host ? `<button class="mw-link" data-act="o-lobby">Arrêter et revenir au salon</button>` : ''}${leaveBtn()}`;
}

// =====================================================================
// navigation entre les écrans
// =====================================================================
function render() {
  if (!mode) return home();
  if (mode === 'local') return localRender();
  return onlineRender();
}

ROOT.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  const a = b.dataset.act;
  if (a === 'mode-local') { mode = 'local'; store.set(K + '_mode', mode); return render(); }
  if (a === 'mode-online') { mode = 'online'; store.set(K + '_mode', mode); return render(); }
  if (a === 'back') { if (me) leaveRoom(); mode = null; store.set(K + '_mode', null); return render(); }
  // réglages (local ou hôte en ligne)
  if (/^(nU|nW)[+-]$|^cat$/.test(a)) {
    const cfg = mode === 'local' ? L : O.cfg, n = mode === 'local' ? L.players.length : O.players.length;
    if (a === 'cat') { const c = b.dataset.v; cfg.cats = cfg.cats.includes(c) ? cfg.cats.filter(x => x !== c) : [...cfg.cats, c]; }
    else { const k = a.slice(0, 2), up = a.endsWith('+'); cfg[k] = Math.max(0, Math.min(k === 'nW' ? 2 : maxImp(n), cfg[k] + (up ? 1 : -1))); }
    if (mode === 'local') { saveL(); return render(); }
    if (a !== 'cat') O._manual = true;
    send({ k: 'cfg', cfg: O.cfg }); return render();
  }
  // mode un seul téléphone
  if (a === 'lp-del') { L.players.splice(+b.dataset.i, 1); Object.assign(L, defaults(L.players.length)); saveL(); return render(); }
  if (a === 'l-start') return localStart();
  if (a === 'l-show') { L.game.shown = true; saveL(); return render(); }
  if (a === 'l-hide') { const g = L.game; g.shown = false; g.dealIdx++; if (g.dealIdx >= g.players.length) g.step = 'play'; saveL(); return render(); }
  if (a === 'l-vote') { L.game.step = 'vote'; saveL(); return render(); }
  if (a === 'l-back-play') { L.game.step = 'play'; saveL(); return render(); }
  if (a === 'l-out') { const i = +b.dataset.i; if (confirm('Éliminer ' + L.game.players[i].name + ' ?')) localEliminate(i); return; }
  if (a === 'l-next') return localAfterReveal();
  if (a === 'l-replay') return localStart();
  if (a === 'l-edit' || a === 'l-quit') { if (a === 'l-quit' && !confirm('Arrêter la partie en cours ?')) return; L.game = null; saveL(); return render(); }
  // mode un téléphone par joueur
  if (a === 'o-share') { const url = b.dataset.url; if (navigator.share) navigator.share({ title: CFG.name, text: 'Rejoins ma partie de ' + CFG.name + ' : code ' + me.code, url }).catch(() => {}); else navigator.clipboard?.writeText(url).then(() => toast('Lien copié')).catch(() => toast(url)); return; }
  if (a === 'o-start') return hostStart();
  if (a === 'o-vote') { send({ k: 'vote', r: O.r, pid: me.pid, t: b.dataset.p }); (O.votes[O.r] = O.votes[O.r] || {})[me.pid] = b.dataset.p; buzz(8); return render(); }
  if (a === 'o-replay') return hostStart();
  if (a === 'o-lobby') { if (me.host && O.phase !== 'end' && !confirm('Arrêter la partie et revenir au salon ?')) return; if (me.host) send({ k: 'lobby' }); return; }
  if (a === 'o-leave') { if (confirm('Quitter la partie ?')) leaveRoom(); return; }
});
ROOT.addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target, kind = f.dataset.form;
  if (kind === 'lp') {
    const v = f.n.value.trim().replace(/\s+/g, ' ').slice(0, 18); if (!v) return;
    if (L.players.length >= 20) return toast('Maximum 20 joueurs');
    if (L.players.some(p => p.toLowerCase() === v.toLowerCase())) return toast(v + ' est déjà dans la liste');
    L.players.push(v); Object.assign(L, defaults(L.players.length)); saveL(); render();
    const inp = ROOT.querySelector('[data-form="lp"] input'); if (inp) inp.focus();
  } else if (kind === 'lguess') localGuess(f.g.value);
  else if (kind === 'join') enterRoom(f.code.value.toUpperCase().replace(/[^A-Z0-9]/g, ''), f.name.value, false);
  else if (kind === 'create') { let c = ''; for (let i = 0; i < 4; i++) c += CODE_CHARS[rnd(CODE_CHARS.length)]; enterRoom(c, f.name.value, true); }
  else if (kind === 'oguess') { const t = f.g.value.trim(); if (!t) return; O.last.guess = t; send({ k: 'guess', pid: me.pid, text: t }); render(); }
});

// ---------- démarrage ----------
// lien d'invitation (#mw/CODE) : on passe directement en mode « un téléphone par joueur »
const hashParts = decodeURIComponent(location.hash.slice(1)).split('/');
const inviteCode = hashParts[0] === CFG.tab ? (hashParts[1] || '').toUpperCase() : '';
const cur = store.get(K + '_cur', null);
if (inviteCode && /^[A-Z0-9]{4}$/.test(inviteCode)) {
  mode = 'online'; store.set(K + '_mode', mode);
  const r = store.get(roomKey(inviteCode), null);
  if (r && r.name) enterRoom(inviteCode, r.name, !!r.host); else render();
} else if (mode === 'online' && cur) {
  const r = store.get(roomKey(cur), null);
  if (r && r.name) enterRoom(cur, r.name, !!r.host); else render();
} else render();
}

// ---------- Mystère White classique ----------
createUndercover({ root: $('mwView'), key: 'mw', tab: 'mw', salt: 'q7x2k9', name: 'Mystère White', pairs: MW_PAIRS,
  picture: w => w === null ? '<img class="mw-pic" src="img/role-white.svg" alt="">' : '' });
