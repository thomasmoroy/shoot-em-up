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

function makeEnv() {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, { textContent: '', classList: { toggle() {}, add() {}, remove() {} } });
    return elements.get(id);
  };
  const storage = new Map();
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
    document: { createElement: () => ({ href: '', download: '', click() {} }) },
    FileReader: class { readAsText(file) { this.result = file.text; this.onload && this.onload(); } },
    setTimeout: fn => fn(),
    applyStoredSettings: () => { settingsApplied++; },
    chapterAt: () => ({ sector: 'SECTEUR 01', index: 0, title: 'NÉBULEUSE D’AZUR' }),
    CAMPAIGN: [{ sector: 'SECTEUR 01', index: 0 }],
    BOSS_EVERY: 5,
    waveIdx: 0, score: 0, lives: 3, bombs: 2, focus: 0,
    P: { w: 0, lv: 0 }
  });
  vm.runInContext(
    storeCode + profileCode +
    'globalThis.__api={Store,PROFILE_KEYS,checkpoint,getCheckpoint,clearCheckpoint,profilePayload,exportProfile,importProfile};',
    context
  );
  return {
    api: context.__api,
    element,
    context,
    blobText: () => (blob ? blob.text : null),
    settingsApplied: () => settingsApplied
  };
}

test('le jeu se lance directement sur le menu, sans écran d’identification', () => {
  assert.ok(html.includes('<div class="overlay" id="menu">'), 'le menu doit être visible au chargement');
  assert.ok(!html.includes('overlay hidden" id="menu"'), 'le menu ne doit pas être masqué au démarrage');
  assert.ok(!/loginGate|accountPanel|IDENTIFICATION DU PILOTE/i.test(html));
  assert.ok(html.includes('reset();refreshContinueButton();requestAnimationFrame(loop);'));
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
    ['cosmochat_checkpoint', '{"v":1,"wave":2}']
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

test('l’export du profil produit un fichier JSON réimportable à l’identique', () => {
  const source = makeEnv();
  source.api.Store.set('cosmochat_best', '4200');
  source.api.Store.set('cosmochat_difficulty', 'veteran');
  source.api.Store.set('cosmochat_checkpoint', '{"v":1,"wave":3,"score":800,"lives":2,"bombs":1,"weapon":1,"level":2,"focus":40,"at":1}');
  source.api.exportProfile();
  assert.match(source.element('saveStatus').textContent, /Sauvegarde téléchargée/);
  const file = source.blobText();
  const parsed = JSON.parse(file);
  assert.equal(parsed.app, 'COSMO_CHAT');
  assert.equal(parsed.version, 1);
  assert.ok(parsed.savedAt);
  // seules les clés réellement enregistrées sont exportées
  assert.deepEqual(Object.keys(parsed.profile).sort(), ['cosmochat_best', 'cosmochat_checkpoint', 'cosmochat_difficulty']);

  const target = makeEnv();
  target.api.importProfile({ text: file });
  assert.equal(target.api.Store.get('cosmochat_best'), '4200');
  assert.equal(target.api.Store.get('cosmochat_difficulty'), 'veteran');
  assert.equal(JSON.parse(target.api.Store.get('cosmochat_checkpoint')).wave, 3);
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
