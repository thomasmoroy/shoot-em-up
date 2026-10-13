const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('shootemup.html', 'utf8');
// Les lignes très longues sont des sons encodés en base64 : elles ne participent
// pas au code et fausseraient les recherches de motifs.
const codeLines = html.split('\n').filter(line => line.length < 2000).join('\n');

function slice(startMarker, endMarker) {
  const start = html.indexOf(startMarker);
  assert.ok(start >= 0, `début de section introuvable : ${startMarker}`);
  const end = html.indexOf(endMarker, start);
  assert.ok(end > start, `fin de section introuvable : ${endMarker}`);
  return html.slice(start, end);
}

const storeCode = slice('const Store={', '/* Sauvegarde locale uniquement');
const purgeCode = slice('/* Sauvegarde locale uniquement', '// Le mode fluide');
const profileCode = slice('const PROFILE_KEYS=', '/* ============================ ENTRÉES');

function fakeElement(id) {
  return {
    id,
    textContent: '',
    innerHTML: '',
    className: '',
    children: [],
    classList: { toggle() {}, add() {}, remove() {} },
    appendChild(child) { this.children.push(child); },
    replaceChildren() { this.children = []; this.innerHTML = ''; },
    click() {}
  };
}

function makeEnv(storage = new Map()) {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, fakeElement(id));
    return elements.get(id);
  };
  let blob = null;
  let settingsApplied = 0;
  const context = vm.createContext({
    $: element,
    localStorage: {
      getItem: key => (storage.has(key) ? storage.get(key) : null),
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: key => storage.delete(key),
      get length() { return storage.size; },
      key: index => [...storage.keys()][index] ?? null
    },
    Blob: class { constructor(parts) { this.text = parts.join(''); } },
    URL: { createObjectURL(value) { blob = value; return 'blob:local'; }, revokeObjectURL() {} },
    document: { createElement: tag => fakeElement(tag) },
    FileReader: class { readAsText(file) { this.result = file.text; this.onload && this.onload(); } },
    setTimeout: fn => fn(),
    applyStoredSettings: () => { settingsApplied++; },
    chapterAt: () => ({ sector: 'SECTEUR 01', index: 0, title: 'NÉBULEUSE D’AZUR' }),
    DIFFICULTY: { cadet: { name: 'CADET' }, normal: { name: 'PILOTE' }, veteran: { name: 'VÉTÉRAN' } },
    CAMPAIGN: [{ sector: 'SECTEUR 01', index: 0 }],
    BOSS_EVERY: 5,
    difficulty: 'normal', eliteRun: false,
    waveIdx: 0, score: 0, lives: 3, bombs: 2, focus: 0,
    P: { w: 0, lv: 0 }
  });
  vm.runInContext(
    storeCode + profileCode +
    'globalThis.__api={Store,PROFILE_KEYS,checkpoint,getCheckpoint,clearCheckpoint,profilePayload,exportProfile,importProfile,loadScores,refreshScores,saveRunScore,SCORES_MAX};',
    context
  );
  return {
    api: context.__api,
    element,
    context,
    storage,
    blobText: () => (blob ? blob.text : null),
    settingsApplied: () => settingsApplied
  };
}

test('le jeu se lance directement sur le menu, sans écran d’identification', () => {
  assert.ok(html.includes('<div class="overlay" id="menu">'), 'le menu doit être visible au chargement');
  assert.ok(!html.includes('overlay hidden" id="menu"'), 'le menu ne doit pas être masqué au démarrage');
  assert.ok(!/loginGate|accountPanel|IDENTIFICATION DU PILOTE/i.test(html));
  assert.ok(html.includes('reset();refreshContinueButton();refreshScores();requestAnimationFrame(loop);'));
});

test('plus aucune trace de connexion externe ni de compte', () => {
  assert.ok(!/google|supabase|oauth|gapi|firebase|jsdelivr|game-config|signIn|signOut/i.test(codeLines));
  assert.ok(!codeLines.includes('fetch('), 'aucun appel réseau ne doit avoir lieu');
  const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
  for (const id of ['googleSignIn', 'gateGoogleSignIn', 'accountName', 'leaderboardRows', 'gateStatus']) {
    assert.ok(!ids.has(id), `l'élément #${id} ne doit plus exister`);
  }
});

test('les jetons d’anciennes sessions sont purgés sans toucher aux sauvegardes locales', () => {
  const storage = new Map([
    ['sb-exemple-auth-token', '{"access_token":"secret"}'],
    ['sb-exemple-auth-token-code-verifier', 'verifier'],
    ['cosmochat_best', '4200'],
    ['cosmochat_checkpoint', '{"v":1,"wave":2}'],
    ['cosmochat_scores', '[]']
  ]);
  const context = vm.createContext({
    localStorage: {
      getItem: key => (storage.has(key) ? storage.get(key) : null),
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: key => storage.delete(key),
      get length() { return storage.size; },
      key: index => [...storage.keys()][index] ?? null
    }
  });
  vm.runInContext(purgeCode, context);
  assert.equal(storage.has('sb-exemple-auth-token'), false);
  assert.equal(storage.has('sb-exemple-auth-token-code-verifier'), false);
  assert.equal(storage.get('cosmochat_best'), '4200');
  assert.equal(storage.get('cosmochat_checkpoint'), '{"v":1,"wave":2}');
  assert.equal(storage.get('cosmochat_scores'), '[]');
});

test('le checkpoint local est enregistré, relu puis effacé', () => {
  const env = makeEnv();
  env.context.waveIdx = 2; env.context.score = 100; env.context.lives = 2;
  env.context.bombs = 1; env.context.focus = 40; env.context.P.w = 1; env.context.P.lv = 2;
  env.api.checkpoint();
  const saved = env.api.getCheckpoint();
  assert.equal(saved.v, 1);
  assert.equal(saved.wave, 3);
  assert.equal(saved.score, 800);
  assert.equal(saved.lives, 2);
  assert.equal(saved.bombs, 1);
  assert.equal(saved.weapon, 1);
  assert.equal(saved.level, 2);
  assert.equal(saved.focus, 40);
  env.api.clearCheckpoint();
  assert.equal(env.api.getCheckpoint(), null);
});

test('le tableau des meilleurs scores garde les cinq meilleures parties, triées', () => {
  const env = makeEnv();
  const runs = [[1200, 2], [4200, 5], [800, 1], [9000, 9], [300, 0], [2600, 3], [50, 0]];
  const ranks = runs.map(([points, wave]) => {
    env.context.score = points; env.context.waveIdx = wave;
    return env.api.saveRunScore();
  });
  assert.deepEqual(ranks, [1, 1, 3, 1, 5, 3, 0],
    'chaque partie annonce sa place, et 0 signifie « hors du top 5 »');

  const table = env.api.loadScores();
  assert.equal(table.length, env.api.SCORES_MAX);
  assert.deepEqual([...table.map(entry => entry.score)], [9000, 4200, 2600, 1200, 800]);
  for (const entry of table) {
    assert.equal(entry.level, 'PILOTE');
    assert.equal(entry.sector, 'SECTEUR 01');
    assert.ok(entry.wave >= 1);
    assert.ok(Number.isFinite(entry.at));
  }
  // un score meilleur que le premier passe en tête
  env.context.score = 12000; env.context.waveIdx = 12; env.context.eliteRun = true;
  assert.equal(env.api.saveRunScore(), 1);
  const updated = env.api.loadScores();
  assert.equal(updated.length, env.api.SCORES_MAX, 'le tableau reste limité à cinq lignes');
  assert.deepEqual([...updated.map(entry => entry.score)], [12000, 9000, 4200, 2600, 1200]);
  assert.equal(updated[0].level, 'PILOTE · ÉLITE');
});

test('le tableau affiche un état vide lisible puis les lignes classées', () => {
  const env = makeEnv();
  env.api.refreshScores();
  assert.match(env.element('scoresRows').innerHTML, /Aucune partie enregistrée/);
  env.context.score = 1500; env.context.waveIdx = 3;
  env.api.saveRunScore();
  const rows = env.element('scoresRows').children;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].className, 'top');
  assert.deepEqual(rows[0].children.map(td => td.textContent),
    ['1', (1500).toLocaleString('fr-FR'), 'SECTEUR 01', 'PILOTE', rows[0].children[4].textContent]);
  assert.match(rows[0].children[4].textContent, /^\d{1,2}\/\d{1,2}$/);
});

test('l’export du profil produit un fichier JSON réimportable à l’identique', () => {
  const source = makeEnv();
  source.api.Store.set('cosmochat_best', '4200');
  source.api.Store.set('cosmochat_difficulty', 'veteran');
  source.api.Store.set('cosmochat_checkpoint', '{"v":1,"wave":3,"score":800,"lives":2,"bombs":1,"weapon":1,"level":2,"focus":40,"at":1}');
  source.context.score = 4200; source.context.waveIdx = 4;
  source.api.saveRunScore();
  source.api.exportProfile();
  assert.match(source.element('saveStatus').textContent, /Sauvegarde téléchargée/);
  const file = source.blobText();
  const parsed = JSON.parse(file);
  assert.equal(parsed.app, 'COSMO_CHAT');
  assert.equal(parsed.version, 1);
  assert.ok(parsed.savedAt);
  assert.deepEqual([...Object.keys(parsed.profile)].sort(),
    ['cosmochat_best', 'cosmochat_checkpoint', 'cosmochat_difficulty', 'cosmochat_scores']);

  const target = makeEnv();
  target.api.importProfile({ text: file });
  assert.equal(target.api.Store.get('cosmochat_best'), '4200');
  assert.equal(target.api.Store.get('cosmochat_difficulty'), 'veteran');
  assert.equal(JSON.parse(target.api.Store.get('cosmochat_checkpoint')).wave, 3);
  assert.deepEqual([...target.api.loadScores().map(entry => entry.score)], [4200],
    'les meilleurs scores voyagent avec le profil');
  assert.equal(target.settingsApplied(), 1);
  assert.match(target.element('saveStatus').textContent, /Sauvegarde restaurée/);
});

test('un fichier étranger est refusé sans écraser la sauvegarde', () => {
  const env = makeEnv();
  env.api.Store.set('cosmochat_best', '777');
  env.api.importProfile({ text: '{"app":"AUTRE","profile":{"cosmochat_best":"9999"}}' });
  assert.equal(env.api.Store.get('cosmochat_best'), '777');
  assert.match(env.element('saveStatus').textContent, /pas une sauvegarde Cosmo Chat valide/);
  env.api.importProfile({ text: '{oups' });
  assert.equal(env.api.Store.get('cosmochat_best'), '777');
});

test('le menu annonce les raccourcis clavier et le tableau local', () => {
  const panel = slice('<section id="scoresPanel"', '</section>');
  for (const marker of ['MEILLEURS SCORES', 'scoresRows', 'scoresTable', 'export du profil']) {
    assert.ok(panel.includes(marker), `le panneau doit contenir « ${marker} »`);
  }
  const keys = slice('<p id="menuKeys">', '</p>');
  for (const key of ['Entrée', 'Échap', 'M']) assert.ok(keys.includes(`<kbd>${key}</kbd>`), `raccourci ${key} absent`);
  assert.ok(html.includes('<p id="pauseInfo"'), 'l’écran de pause rappelle la partie en cours');
});

test('les raccourcis sont branchés sur les bonnes actions', () => {
  const handler = slice("addEventListener('keydown',e=>{", 'addEventListener(\'keyup\'');
  assert.ok(handler.includes("e.code==='KeyM'") && handler.includes('toggleMute()'));
  assert.ok(handler.includes("e.code==='Escape'"));
  assert.ok(handler.includes("e.code==='Enter'||e.code==='NumpadEnter'") && handler.includes('primaryAction()'));
  assert.ok(handler.includes("closest('button,input,select,label,textarea')"),
    'un bouton focalisé ne doit pas déclencher deux fois l’action');

  const action = slice('function primaryAction(){', 'function notify(');
  assert.ok(action.includes("state==='menu'") && action.includes('beginCheckpoint():start()'));
  assert.ok(action.includes("state==='over'") && action.includes("state==='victory'") && action.includes("state==='pause'"));

  const mute = slice('function toggleMute(){', 'function selectWeapon(');
  assert.ok(mute.includes("Store.set('cosmochat_mute'"));
  assert.ok(mute.includes("$('optMute').checked=$('optMute2').checked=Audio_.muted"));
});

test('la racine redirige vers le jeu sans paramètre d’authentification', () => {
  const index = fs.readFileSync('index.html', 'utf8');
  assert.ok(index.includes("location.replace('shootemup.html')"));
  assert.ok(!index.includes('location.search'));
});

test('le déploiement reste entièrement statique', () => {
  assert.ok(!fs.existsSync('netlify/functions'), 'plus de fonction Netlify');
  assert.ok(!fs.existsSync('api'), 'plus d’API de configuration');
  assert.ok(!fs.existsSync('supabase'), 'plus de schéma de base de données');
  const toml = fs.readFileSync('netlify.toml', 'utf8');
  assert.ok(!toml.includes('.netlify/functions'));
  assert.ok(toml.includes('from = "/jeu"'));
  assert.ok(toml.includes('publish = "."'));
});
