const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('shootemup.html', 'utf8');
function setup({ response, sessionError, oauthError, callbackError } = {}) {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, { textContent: '', disabled: false, classList: { toggle() {} } });
    return elements.get(id);
  };
  const timers = [];
  let listener, options, syncs = 0;
  const client = { auth: {
    async getSession() { return { data: { session: null }, error: sessionError }; },
    onAuthStateChange(fn) { listener = fn; return { data: { subscription: {} } }; },
    async signInWithOAuth(value) { options = value; return { error: oauthError }; }
  } };
  const context = vm.createContext({
    $: element, window: { supabase: { createClient: () => client } },
    fetch: async () => response || { ok: true, json: async () => ({ url: 'https://example.supabase.co', key: 'public-key' }) },
    AbortSignal, URLSearchParams, location: { origin: 'https://game.example', pathname: '/jeu', search: callbackError ? '?error=access_denied&error_description=Accès+refusé' : '', hash: '' },
    history: { replaceState() {} }, setTimeout: fn => timers.push(fn)
  });
  const start = html.indexOf('const Cloud={');
  const end = html.indexOf("$('googleSignIn').addEventListener", start);
  vm.runInContext(html.slice(start, end) + '\nglobalThis.cloud=Cloud;', context);
  const cloud = context.cloud;
  cloud.refreshBoard = async () => {};
  cloud.syncAccount = async () => { syncs++; };
  return { cloud, element, timers, emit: session => listener('SIGNED_IN', session), options: () => options, syncs: () => syncs };
}

test('Netlify serves the same public config as the API and never a service role key', async () => {
  const saved = { ...process.env };
  try {
    for (const key of Object.keys(process.env)) if (key.includes('SUPABASE')) delete process.env[key];
    const { handler } = require('../netlify/functions/game-config');
    let result = await handler();
    assert.equal(result.statusCode, 503);
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_PUBLISHABLE_KEY = 'public-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'private-key';
    result = await handler();
    assert.equal(result.statusCode, 200);
    assert.deepEqual(JSON.parse(result.body), { url: process.env.SUPABASE_URL, key: 'public-key' });
    assert.equal(result.headers['Cache-Control'], 'no-store');
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }
});

test('missing configuration shows a visible error and permits retry', async () => {
  const { cloud, element } = setup({ response: { ok: false, status: 503 } });
  await cloud.init();
  assert.equal(cloud.ready, false);
  assert.match(element('gateStatus').textContent, /variables Supabase/);
  assert.equal(element('gateGoogleSignIn').disabled, false);
  assert.match(element('gateGoogleSignIn').textContent, /RÉESSAYER/);
});

test('static HTML in place of API JSON is diagnosed', async () => {
  const { cloud, element } = setup({ response: { ok: true, json: async () => { throw new SyntaxError(); } } });
  await cloud.init();
  assert.match(element('gateStatus').textContent, /configuration de connexion invalide/i);
});

test('auth callback defers database requests until the auth lock is released', async () => {
  const { cloud, emit, timers, syncs } = setup();
  await cloud.init();
  emit({ user: { id: 'pilot' } });
  assert.equal(cloud.user.id, 'pilot');
  assert.equal(syncs(), 0);
  assert.equal(timers.length, 1);
  timers[0]();
  assert.equal(syncs(), 1);
});

test('Google uses the canonical callback and surfaces provider errors in the gate', async () => {
  const { cloud, options, element } = setup({ oauthError: new Error('Provider disabled') });
  await cloud.init();
  await cloud.signIn();
  assert.equal(options().provider, 'google');
  assert.equal(options().options.redirectTo, 'https://game.example/shootemup.html');
  assert.match(element('gateStatus').textContent, /Provider disabled/);
  assert.equal(element('gateGoogleSignIn').disabled, false);
});

test('session errors do not silently open the game or disable retry', async () => {
  const { cloud, element } = setup({ sessionError: new Error('Session invalide') });
  await cloud.init();
  assert.equal(cloud.ready, false);
  assert.match(element('gateStatus').textContent, /Session invalide/);
  assert.equal(element('gateGoogleSignIn').disabled, false);
});

test('OAuth callback errors remain visible', async () => {
  const { cloud, element } = setup({ callbackError: true });
  await cloud.init();
  assert.match(element('gateStatus').textContent, /Accès refusé/);
});

test('root redirect preserves OAuth callback parameters', () => {
  const index = fs.readFileSync('index.html', 'utf8');
  assert.ok(index.includes("location.replace('shootemup.html'+location.search+location.hash)"));
});


test('a failed configuration load can recover on the next button click', async () => {
  const response = { ok: false, status: 503, json: async () => ({ url: 'https://example.supabase.co', key: 'public-key' }) };
  const { cloud, options } = setup({ response });
  await cloud.init();
  assert.equal(cloud.ready, false);
  response.ok = true;
  await cloud.signIn();
  assert.equal(cloud.ready, true);
  assert.equal(options().provider, 'google');
});
