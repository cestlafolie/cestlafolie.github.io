// ===== Module : Anime (Undercover spécial anime + quiz par anime) =====
(() => {
// ---------- personnages (paires proches pour l'Undercover) ----------
const ANIME_PAIRS = {
  'Naruto': [['Naruto','Sasuke'],['Kakashi','Gaï'],['Itachi','Madara'],['Sakura','Hinata'],['Jiraiya','Tsunade'],['Gaara','Kankuro'],['Minato','Hashirama'],['Shikamaru','Choji'],['Neji','Lee'],['Orochimaru','Kabuto'],['Madara','Hashirama'],['Tobirama','Minato'],['Obito','Shisui'],['Sai','Sasuke'],['Pain','Konan'],['Deidara','Sasori'],['Hidan','Kakuzu'],['Kisame','Zetsu'],['Minato','Kushina'],['Killer Bee','Naruto'],['Yamato','Kakashi'],['Mei','Ônoki'],['Mifune','Ônoki'],['Hiruzen','Danzo'],['Chiyo','Sasori'],['Ino','Sakura'],['Temari','Ino'],['Shino','Kiba']],
  'My Hero Academia': [['Deku','Bakugo'],['All Might','Endeavor'],['Todoroki','Dabi'],['Ochaco','Tsuyu'],['Shigaraki','All For One'],['Aizawa','Present Mic'],['Kirishima','Kaminari'],['Iida','Momo'],['Hawks','Mirko'],['Toga','Twice']],
  'Dragon Ball Z': [['Goku','Vegeta'],['Gohan','Trunks'],['Goten','Trunks enfant'],['Freezer','Cell'],['Piccolo','Dendé'],['Krilin','Yamcha'],['Boo','Babidi'],['Bulma','Chichi'],['Gogeta','Vegeto'],['Tortue Géniale','Kaïo']],
  'One Piece': [['Luffy','Ace'],['Zoro','Sanji'],['Nami','Robin'],['Shanks','Barbe Blanche'],['Usopp','Chopper'],['Law','Kidd'],['Franky','Brook'],['Kaido','Big Mom'],['Garp','Sengoku'],['Mihawk','Crocodile']],
  'L’Attaque des Titans': [['Eren','Armin'],['Mikasa','Annie'],['Livaï','Erwin'],['Reiner','Bertholdt'],['Hansi','Moblit'],['Jean','Connie'],['Historia','Ymir'],['Zeke','Grisha']],
  'Demon Slayer': [['Tanjiro','Zenitsu'],['Nezuko','Shinobu'],['Rengoku','Tengen'],['Inosuke','Genya'],['Muzan','Kokushibo'],['Giyu','Sanemi'],['Mitsuri','Kanao'],['Akaza','Doma']],
  'Jujutsu Kaisen': [['Itadori','Megumi'],['Gojo','Geto'],['Sukuna','Mahito'],['Nobara','Maki'],['Nanami','Todo'],['Yuta','Inumaki']],
};
const COLORS = { 'Naruto': '#ff7a00', 'My Hero Academia': '#2ec27e', 'Dragon Ball Z': '#ffb400', 'One Piece': '#e5383b', 'L’Attaque des Titans': '#8d6e63', 'Demon Slayer': '#2a9d8f', 'Jujutsu Kaisen': '#5b5fef' };
// images de personnages fournies (fichiers dans img/anime/) ; les autres gardent leur badge à initiales
const PHOTOS = {
  'Naruto': 'naruto.jpg', 'Sasuke': 'sasuke.jpg', 'Sakura': 'sakura.jpg', 'Kakashi': 'kakashi.jpg', 'Itachi': 'itachi.jpg', 'Gaara': 'gaara.jpg', 'Hinata': 'hinata.jpg', 'Shikamaru': 'shikamaru.jpg', 'Jiraiya': 'jiraiya.jpg', 'Tsunade': 'tsunade.jpg', 'Madara': 'madara.jpg', 'Obito': 'obito.jpg', 'Shisui': 'shisui.jpg', 'Hashirama': 'hashirama.jpg', 'Tobirama': 'tobirama.jpg', 'Sai': 'sai.jpg',
  'Pain': 'pain.jpg', 'Konan': 'konan.jpg', 'Kisame': 'kisame.jpg', 'Deidara': 'deidara.jpg', 'Sasori': 'sasori.jpg', 'Hidan': 'hidan.jpg', 'Kakuzu': 'kakuzu.jpg', 'Zetsu': 'zetsu.jpg', 'Orochimaru': 'orochimaru.jpg', 'Kabuto': 'kabuto.jpg', 'Minato': 'minato.jpg', 'Kushina': 'kushina.jpg', 'Killer Bee': 'killerbee.jpg', 'Yamato': 'yamato.jpg',
  'Mei': 'mei.jpg', 'Ônoki': 'onoki.jpg', 'Mifune': 'mifune.jpg', 'Hiruzen': 'hiruzen.jpg', 'Danzo': 'danzo.jpg', 'Chiyo': 'chiyo.jpg', 'Lee': 'lee.jpg', 'Neji': 'neji.jpg', 'Gaï': 'gai.jpg', 'Ino': 'ino.jpg', 'Choji': 'choji.jpg', 'Temari': 'temari.jpg', 'Kankuro': 'kankuro.jpg', 'Shino': 'shino.jpg', 'Kiba': 'kiba.jpg',
};
const animeOf = name => Object.keys(ANIME_PAIRS).find(a => ANIME_PAIRS[a].some(p => p.includes(name)));
const initials = n => n.split(/[\s-]+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- quiz : 10 questions par anime ----------
const QUIZ = {
  'Naruto': [
    ['Quel démon à queues est scellé dans Naruto ?', ['Kyûbi, le renard à neuf queues', 'Shukaku', 'Hachibi', 'Matatabi']],
    ['De quel village vient Naruto ?', ['Konoha', 'Suna', 'Kiri', 'Kumo']],
    ['Qui est le sensei de l’équipe 7 ?', ['Kakashi', 'Jiraiya', 'Iruka', 'Gaï']],
    ['À quel clan appartient Sasuke ?', ['Uchiha', 'Hyûga', 'Senju', 'Uzumaki']],
    ['Quel est le plat préféré de Naruto ?', ['Les ramens', 'Les sushis', 'Les onigiri', 'Les dango']],
    ['Comment s’appelle le grand frère de Sasuke ?', ['Itachi', 'Madara', 'Obito', 'Shisui']],
    ['Quelle technique en sphère Jiraiya enseigne-t-il à Naruto ?', ['Le Rasengan', 'Le Chidori', 'L’Amaterasu', 'Le Kamui']],
    ['Qui est l’hôte de Shukaku, devenu Kazekage ?', ['Gaara', 'Kankuro', 'Temari', 'Baki']],
    ['Quelle organisation porte des manteaux à nuages rouges ?', ['L’Akatsuki', 'La Racine', 'L’ANBU', 'Le clan Uchiha']],
    ['Qui est le père de Naruto ?', ['Minato Namikaze', 'Hiruzen Sarutobi', 'Jiraiya', 'Hashirama Senju']],
  ],
  'My Hero Academia': [
    ['Qui est le héros n°1 au début de la série ?', ['All Might', 'Endeavor', 'Hawks', 'Best Jeanist']],
    ['Quel est le vrai nom de Deku ?', ['Izuku Midoriya', 'Katsuki Bakugo', 'Shoto Todoroki', 'Tenya Iida']],
    ['Quel Alter All Might transmet-il à Deku ?', ['One For All', 'All For One', 'Explosion', 'Zero Gravity']],
    ['Dans quel lycée de héros étudie Deku ?', ['Yuei (U.A.)', 'Shiketsu', 'Ketsubutsu', 'Isamu']],
    ['Quel est l’Alter de Bakugo ?', ['Il crée des explosions', 'Il contrôle la glace', 'Il devient dur comme la pierre', 'Il annule les Alters']],
    ['Que peut faire Shoto Todoroki ?', ['Créer de la glace et des flammes', 'Voler', 'Se rendre invisible', 'Lire dans les pensées']],
    ['Qui est le père de Shoto Todoroki ?', ['Endeavor', 'All Might', 'Aizawa', 'Dabi']],
    ['Qui dirige l’Alliance des super-vilains ?', ['Tomura Shigaraki', 'Dabi', 'Himiko Toga', 'Stain']],
    ['Dans quelle classe est Deku ?', ['La 1-A', 'La 1-B', 'La 2-A', 'La 3-A']],
    ['Que fait l’Alter d’Ochaco ?', ['Il annule la gravité de ce qu’elle touche', 'Il crée des champs de force', 'Il soigne les blessures', 'Il projette de l’acide']],
  ],
  'Dragon Ball Z': [
    ['Quel est le nom saiyen de Goku ?', ['Kakarot', 'Raditz', 'Bardock', 'Tarble']],
    ['Qui est le prince des Saiyens ?', ['Vegeta', 'Nappa', 'Broly', 'Raditz']],
    ['Combien y a-t-il de Dragon Balls sur Terre ?', ['7', '5', '6', '9']],
    ['Comment s’appelle le dragon des Dragon Balls terrestres ?', ['Shenron', 'Polunga', 'Porunga d’or', 'Ryujin']],
    ['Comment s’appelle le fils aîné de Goku ?', ['Gohan', 'Goten', 'Trunks', 'Pan']],
    ['Quelle est l’attaque signature de Goku ?', ['Le Kamehameha', 'Le Final Flash', 'Le Makankosappo', 'Le Kienzan']],
    ['Quelle planète Freezer a-t-il détruite ?', ['La planète Vegeta', 'Namek', 'La Terre', 'Yardrat']],
    ['Comment s’appelle la fusion de Goku et Vegeta par la danse ?', ['Gogeta', 'Vegeto', 'Gotenks', 'Kefla']],
    ['Qui est le meilleur ami de Goku depuis l’enfance ?', ['Krilin', 'Yamcha', 'Tenshinhan', 'Piccolo']],
    ['Quel Namek, d’abord ennemi, devient l’allié de Goku ?', ['Piccolo', 'Dendé', 'Nail', 'Kami']],
  ],
  'One Piece': [
    ['Quel fruit du démon Luffy a-t-il mangé ?', ['Le fruit du Gum-Gum (Gomu Gomu)', 'Le fruit de la Flamme', 'Le fruit des Ténèbres', 'Le fruit de l’Opé-Opé']],
    ['Quel est le rêve de Luffy ?', ['Devenir le Roi des pirates', 'Devenir amiral', 'Trouver All Blue', 'Devenir le meilleur bretteur']],
    ['Quel membre de l’équipage se bat avec trois sabres ?', ['Zoro', 'Sanji', 'Brook', 'Usopp']],
    ['Qui est le cuisinier de l’équipage ?', ['Sanji', 'Zoro', 'Franky', 'Jinbe']],
    ['Qui est la navigatrice de l’équipage ?', ['Nami', 'Robin', 'Vivi', 'Boa Hancock']],
    ['Quel membre de l’équipage est un renne médecin ?', ['Chopper', 'Brook', 'Usopp', 'Franky']],
    ['Comment s’appelle le frère de Luffy qui maîtrise le feu ?', ['Ace', 'Sabo', 'Dragon', 'Garp']],
    ['Qui a confié son chapeau de paille à Luffy ?', ['Shanks', 'Barbe Blanche', 'Gol D. Roger', 'Garp']],
    ['Comment s’appelle le premier navire de l’équipage ?', ['Le Vogue Merry', 'Le Thousand Sunny', 'Le Red Force', 'Le Moby Dick']],
    ['Comment s’appelle le trésor légendaire de Gol D. Roger ?', ['Le One Piece', 'L’Arche', 'Le Poneglyphe rouge', 'L’All Blue']],
  ],
  'L’Attaque des Titans': [
    ['Qui est le personnage principal ?', ['Eren Jäger', 'Armin Arlelt', 'Livaï', 'Jean Kirschtein']],
    ['Quel est le mur le plus extérieur ?', ['Le mur Maria', 'Le mur Rose', 'Le mur Sina', 'Le mur Shiganshina']],
    ['Qui est considéré comme le soldat le plus fort de l’humanité ?', ['Livaï', 'Erwin', 'Mikasa', 'Reiner']],
    ['Qui est la sœur adoptive d’Eren ?', ['Mikasa', 'Annie', 'Historia', 'Sasha']],
    ['Qui commande le Bataillon d’exploration au début ?', ['Erwin Smith', 'Hansi Zoe', 'Keith Shadis', 'Dot Pixis']],
    ['Quel Titan Annie peut-elle devenir ?', ['Le Titan Féminin', 'Le Titan Cuirassé', 'Le Titan Colossal', 'Le Titan Bestial']],
    ['Quel Titan Reiner peut-il devenir ?', ['Le Titan Cuirassé', 'Le Titan Féminin', 'Le Titan Charrette', 'Le Titan Mâchoire']],
    ['Avec quoi les soldats se déplacent-ils dans les airs ?', ['L’équipement tridimensionnel', 'Des ailes mécaniques', 'Des chevaux volants', 'Des grappins à vapeur']],
    ['Quel Titan Armin hérite-t-il ?', ['Le Titan Colossal', 'Le Titan Assaillant', 'Le Titan Marteau d’armes', 'Le Titan Originel']],
    ['Comment s’appelle le village natal d’Eren, détruit au début ?', ['Shiganshina', 'Trost', 'Ragako', 'Stohess']],
  ],
  'Demon Slayer': [
    ['Comment s’appelle la sœur de Tanjiro ?', ['Nezuko', 'Kanao', 'Shinobu', 'Mitsuri']],
    ['Dans quoi Tanjiro transporte-t-il Nezuko ?', ['Une boîte en bois sur son dos', 'Un panier', 'Un sac en tissu', 'Une charrette']],
    ['Quel souffle Tanjiro apprend-il en premier ?', ['Le souffle de l’eau', 'Le souffle de la flamme', 'Le souffle de la foudre', 'Le souffle de la bête']],
    ['Quel souffle utilise Zenitsu ?', ['Le souffle de la foudre', 'Le souffle du vent', 'Le souffle de l’eau', 'Le souffle de la brume']],
    ['Que porte Inosuke sur la tête ?', ['Une tête de sanglier', 'Un masque de renard', 'Un casque', 'Un chapeau de paille']],
    ['Qui est le tout premier démon ?', ['Muzan Kibutsuji', 'Akaza', 'Kokushibo', 'Rui']],
    ['Qui est le Pilier de la flamme ?', ['Kyojuro Rengoku', 'Giyu Tomioka', 'Tengen Uzui', 'Sanemi Shinazugawa']],
    ['Comment appelle-t-on les pourfendeurs les plus puissants ?', ['Les Piliers', 'Les Lunes', 'Les Kasugai', 'Les Kakushi']],
    ['Qui entraîne Tanjiro au début de l’histoire ?', ['Sakonji Urokodaki', 'Giyu Tomioka', 'Jigoro Kuwajima', 'Kyojuro Rengoku']],
    ['Quel souffle utilise Inosuke ?', ['Le souffle de la bête', 'Le souffle de la pierre', 'Le souffle de l’insecte', 'Le souffle du serpent']],
  ],
  'Jujutsu Kaisen': [
    ['Qui est le personnage principal ?', ['Yuji Itadori', 'Megumi Fushiguro', 'Satoru Gojo', 'Yuta Okkotsu']],
    ['Que mange Yuji pour devenir l’hôte de Sukuna ?', ['Un doigt de Sukuna', 'Un œil maudit', 'Un fruit maudit', 'Une dent de démon']],
    ['Qui est le professeur aux yeux bandés ?', ['Satoru Gojo', 'Kento Nanami', 'Masamichi Yaga', 'Suguru Geto']],
    ['Comment s’appelle l’école où étudie Yuji ?', ['L’école d’exorcisme de Tokyo', 'Yuei', 'L’académie Shiketsu', 'L’école de Kyoto']],
    ['Avec quoi Megumi combat-il ?', ['Des shikigamis en forme d’ombres', 'Un marteau et des clous', 'Une épée maudite', 'Ses poings uniquement']],
    ['Quelle arme utilise Nobara ?', ['Un marteau et des clous', 'Un arc', 'Une lance', 'Des shurikens']],
    ['Qui était le meilleur ami de Gojo devenu ennemi ?', ['Suguru Geto', 'Kento Nanami', 'Aoi Todo', 'Mahito']],
    ['Comment s’appelle le fléau qui modifie la forme des âmes ?', ['Mahito', 'Jogo', 'Hanami', 'Dagon']],
    ['Comment s’appelle l’extension du territoire de Gojo ?', ['Le Vide infini', 'Le Sanctuaire démoniaque', 'Le Jardin des ombres', 'Le Royaume fermé']],
    ['Quel exorciste adore demander « quel est ton type de fille » ?', ['Aoi Todo', 'Kento Nanami', 'Panda', 'Toge Inumaki']],
  ],
};

// ---------- sous-onglets ----------
const root = $('mod-anime');
const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
function sub(name) {
  root.dataset.sub = name;
  root.querySelectorAll('.an-sub').forEach(b => b.classList.toggle('on', b.dataset.sub === name));
  store.set('anime_sub', name);
}
root.querySelectorAll('.an-sub').forEach(b => b.onclick = () => sub(b.dataset.sub));
const hp = decodeURIComponent(location.hash.slice(1)).split('/');
sub(hp[0] === 'anime' && hp[1] ? 'uc' : store.get('anime_sub', 'quiz'));

// ---------- Undercover anime (même moteur que Mystère White) ----------
createUndercover({
  root: $('anUc'), key: 'an', tab: 'anime', salt: 'k3v8p1', name: 'Undercover Anime', pairs: ANIME_PAIRS,
  wordLabel: 'Ton personnage',
  hero: `<div class="mw-hero an-hero"><h2 class="mw-title">Under<span>cover</span></h2><p class="mw-lead">Tout le monde a le même personnage d’anime… sauf l’intrus, qui en a un proche.</p></div>`,
  picture: w => {
    if (w === null) return '<img class="mw-pic" src="img/role-white.svg" alt="">';
    const a = animeOf(w);
    if (PHOTOS[w]) return `<div class="an-avatar an-photo" style="--ac:${COLORS[a] || '#5b5fef'}"><img src="img/anime/${PHOTOS[w]}" alt=""></div>`;
    return `<div class="an-avatar" style="--ac:${COLORS[a] || '#5b5fef'}"><i>${esc(initials(w))}</i><em>${esc(a || '')}</em></div>`;
  },
});

// ---------- quiz ----------
const QV = $('anQuiz');
const rnd = n => { const lim = Math.floor(0x100000000 / n) * n, a = new Uint32Array(1); do crypto.getRandomValues(a); while (a[0] >= lim); return a[0] % n; };
const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
let Q = null;
const best = () => store.get('anime_best', {});

function quizHome() {
  const b = best();
  QV.innerHTML = `<p class="an-k">Choisis un anime</p><div class="an-grid">${Object.keys(QUIZ).map(a => `
    <button class="an-tile" data-anime="${esc(a)}" style="--ac:${COLORS[a]}">
      <span class="an-tile-n">${esc(a)}</span>
      <span class="an-tile-s">${b[a] != null ? 'Record : ' + b[a] + ' / 10' : '10 questions'}</span>
    </button>`).join('')}</div>`;
}
function start(anime) {
  Q = { anime, qs: shuffle(QUIZ[anime]).map(([q, opts]) => ({ q, good: opts[0], opts: shuffle(opts) })), i: 0, score: 0, picked: null };
  question();
}
function question() {
  const it = Q.qs[Q.i], ac = COLORS[Q.anime];
  QV.innerHTML = `<div class="an-q" style="--ac:${ac}">
    <div class="an-top"><button class="an-x" data-q="quit" aria-label="Quitter">×</button><div class="an-bar"><i style="width:${Q.i / Q.qs.length * 100}%"></i></div><span>${Q.i + 1}/${Q.qs.length}</span></div>
    <p class="an-k">${esc(Q.anime)}</p>
    <h3 class="an-question">${esc(it.q)}</h3>
    <div class="an-opts">${it.opts.map((o, k) => `<button class="an-opt" data-q="pick" data-k="${k}">${esc(o)}</button>`).join('')}</div>
    <button class="an-next" data-q="next" hidden>${Q.i + 1 < Q.qs.length ? 'Question suivante' : 'Voir mon score'}</button></div>`;
}
function pick(k) {
  if (Q.picked !== null) return;
  const it = Q.qs[Q.i]; Q.picked = k;
  const ok = it.opts[k] === it.good; if (ok) Q.score++;
  QV.querySelectorAll('.an-opt').forEach((b, j) => { b.disabled = true; if (it.opts[j] === it.good) b.classList.add('good'); else if (j === k) b.classList.add('bad'); });
  buzz(ok ? 12 : [30, 40, 30]);
  QV.querySelector('.an-next').hidden = false;
}
function next() {
  Q.i++; Q.picked = null;
  if (Q.i < Q.qs.length) return question();
  const b = best(); if (b[Q.anime] == null || Q.score > b[Q.anime]) { b[Q.anime] = Q.score; store.set('anime_best', b); }
  const s = Q.score, msg = s === 10 ? 'Parfait, tu es un vrai otaku !' : s >= 8 ? 'Excellent !' : s >= 5 ? 'Pas mal du tout.' : 'Il va falloir revoir quelques épisodes…';
  QV.innerHTML = `<div class="an-score" style="--ac:${COLORS[Q.anime]}"><p class="an-k">${esc(Q.anime)}</p><b>${s}<small>/10</small></b><p>${msg}</p></div>
    <button class="an-big" data-q="again">Rejouer</button><button class="an-link" data-q="home">Choisir un autre anime</button>`;
}
QV.addEventListener('click', e => {
  const t = e.target.closest('[data-anime],[data-q]'); if (!t) return;
  if (t.dataset.anime) return start(t.dataset.anime);
  const a = t.dataset.q;
  if (a === 'pick') pick(+t.dataset.k);
  else if (a === 'next') next();
  else if (a === 'again') start(Q.anime);
  else if (a === 'home' || a === 'quit') { Q = null; quizHome(); }
});
quizHome();
})();
