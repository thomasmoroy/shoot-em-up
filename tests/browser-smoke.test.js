/* Test de bout en bout dans un DOM simulé : le jeu doit démarrer sur le menu,
   afficher les meilleurs scores locaux et répondre aux raccourcis clavier.
   Ignoré automatiquement si jsdom n'est pas installé (npm i -D jsdom). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

let JSDOM, VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = require('jsdom'));
} catch (error) {
  JSDOM = null;
}

const skip = JSDOM ? false : 'jsdom absent — lancer « npm i -D jsdom » pour exécuter ce test';

test('démarrage sur le menu, scores locaux et raccourcis clavier', { skip }, () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'shootemup.html'), 'utf8');
  const errors = [];
  const gradient = { addColorStop() {} };
  // Compteurs d'appels : servent à vérifier que le rendu ne recrée plus
  // d'objets graphiques (dégradés) à chaque image.
  const calls = { createLinearGradient: 0, createRadialGradient: 0, drawImage: 0 };

  // Canvas 2D sans implémentation : on ne teste pas le rendu, seulement le jeu.
  const context2d = new Proxy({}, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'canvas') return { width: 480, height: 720 };
      if (prop === 'measureText') return () => ({ width: 12 });
      if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      if (prop in calls) return () => { calls[prop]++; return prop.startsWith('create') ? gradient : undefined; };
      if (typeof prop === 'string' && prop.startsWith('create')) return () => gradient;
      return () => {};
    },
    set(target, prop, value) { target[prop] = value; return true; }
  });

  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', e => errors.push('jsdomError: ' + (e.detail || e.message)));
  virtualConsole.on('error', (...args) => errors.push('console.error: ' + args.join(' ')));

  const dom = new JSDOM(html, {
    url: 'https://exemple.test/shootemup.html',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      window.HTMLCanvasElement.prototype.getContext = () => context2d;
      window.AudioContext = undefined;
      window.webkitAudioContext = undefined;
      window.localStorage.setItem('sb-ancien-projet-auth-token', '{"access_token":"jeton"}');
      window.localStorage.setItem('cosmochat_scores', JSON.stringify([
        { score: 1500, wave: 4, sector: 'SECTEUR 02', level: 'CADET', at: Date.parse('2026-10-01T10:00:00Z') },
        { score: 9200, wave: 9, sector: 'SECTEUR 03', level: 'VÉTÉRAN', at: Date.parse('2026-10-05T10:00:00Z') }
      ]));
      window.addEventListener('error', e => errors.push('window.onerror: ' + e.message));
    }
  });

  const { window } = dom;
  try {
    const doc = window.document;
    const hidden = id => doc.getElementById(id).classList.contains('hidden');
    const press = code => window.dispatchEvent(new window.KeyboardEvent('keydown', { code, bubbles: true }));
    // Les séparateurs de milliers varient selon l'ICU : on compare les chiffres.
    const cells = tr => [...tr.children].map(td => td.textContent.replace(/[\s\u202f\u00a0]+/g, ''));

    // --- démarrage : le menu, et rien d'autre
    assert.equal(doc.getElementById('loginGate'), null, 'aucun écran d’identification');
    assert.equal(doc.getElementById('accountPanel'), null, 'aucun panneau de compte');
    assert.equal(hidden('menu'), false, 'le menu est visible au chargement');
    for (const id of ['pauseScr', 'over', 'victory']) assert.equal(hidden(id), true, `#${id} reste masqué`);
    assert.equal(window.localStorage.getItem('sb-ancien-projet-auth-token'), null, 'jeton d’une ancienne session purgé');
    assert.equal(doc.querySelectorAll('script[src]').length, 0, 'aucun script externe chargé');

    // --- meilleurs scores locaux : rendus et triés
    const rows = [...doc.querySelectorAll('#scoresRows tr')];
    assert.equal(rows.length, 2, 'les deux parties enregistrées sont affichées');
    assert.deepEqual(rows.map(tr => cells(tr)[1]), ['9200', '1500'], 'le meilleur score passe en tête');
    assert.equal(rows[0].className, 'top', 'la meilleure partie est mise en avant');
    assert.ok(cells(rows[0]).includes('SECTEUR03'));
    assert.equal(doc.getElementById('scoresRows').textContent.includes('Aucune partie'), false);

    // --- Entrée lance la campagne depuis le menu
    press('Enter');
    assert.equal(hidden('menu'), true, 'le menu se referme au lancement');
    press('Escape');
    assert.equal(hidden('pauseScr'), false, 'Échap met le jeu en pause');
    assert.match(doc.getElementById('pauseInfo').textContent, /Score 0/);
    press('Escape');
    assert.equal(hidden('pauseScr'), true, 'Échap reprend la partie');
    press('KeyP');
    assert.equal(hidden('pauseScr'), false, 'la touche P reste disponible');
    press('KeyP');
    assert.equal(hidden('pauseScr'), true);

    // --- M coupe le son, l'état est mémorisé et les deux cases suivent
    assert.equal(doc.getElementById('optMute').checked, false);
    press('KeyM');
    assert.equal(doc.getElementById('optMute').checked, true, 'la case du menu suit');
    assert.equal(doc.getElementById('optMute2').checked, true, 'la case de la pause suit');
    assert.equal(window.localStorage.getItem('cosmochat_mute'), '1');
    press('KeyM');
    assert.equal(doc.getElementById('optMute').checked, false);
    assert.equal(window.localStorage.getItem('cosmochat_mute'), '0');

    assert.deepEqual(errors, [], 'aucune erreur JavaScript pendant le test');
  } finally {
    window.close();   // libère la boucle d'animation, même si une assertion échoue
  }
});

test('le rendu ne recrée plus de dégradés à chaque image', { skip }, () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'shootemup.html'), 'utf8');
  const gradient = { addColorStop() {} };
  const calls = { createLinearGradient: 0, createRadialGradient: 0, drawImage: 0 };
  const ticks = { update: 0, render: 0 };
  const context2d = new Proxy({}, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'canvas') return { width: 480, height: 720 };
      if (prop === 'measureText') return () => ({ width: 12 });
      if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      if (prop in calls) return () => { calls[prop]++; return prop.startsWith('create') ? gradient : undefined; };
      if (typeof prop === 'string' && prop.startsWith('create')) return () => gradient;
      return () => {};
    },
    set(target, prop, value) { target[prop] = value; return true; }
  });

  const virtualConsole = new VirtualConsole();
  const errors = [];
  virtualConsole.on('jsdomError', e => errors.push(String(e.detail || e.message)));

  const dom = new JSDOM(html, {
    url: 'https://exemple.test/shootemup.html',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      window.HTMLCanvasElement.prototype.getContext = () => context2d;
      window.AudioContext = undefined;
      window.webkitAudioContext = undefined;
    }
  });

  const { window } = dom;
  try {
    const run = frames => {
      for (let i = 0; i < frames; i++) {
        window.eval('update(1/60)');
        window.eval('render()');
        window.eval('hud()');
        ticks.update++;
      }
    };
    window.eval("document.getElementById('startBtn').click()");
    run(180);                                   // échauffement : caches remplis
    const before = { ...calls };
    const cacheBefore = window.eval('GradientCache.size');
    run(120);                                   // fenêtre mesurée

    const created = (calls.createLinearGradient - before.createLinearGradient)
      + (calls.createRadialGradient - before.createRadialGradient);
    const cacheAfter = window.eval('GradientCache.size');

    assert.ok(created <= 3,
      `le rendu doit réutiliser ses dégradés : ${created} créés sur 120 images`);
    assert.ok(cacheAfter - cacheBefore <= 3,
      `le cache de dégradés doit rester stable : +${cacheAfter - cacheBefore} entrées`);
    assert.ok(calls.drawImage - before.drawImage > 0,
      'les halos doivent passer par des sprites pré-rendus');
    assert.deepEqual(errors, [], 'aucune erreur pendant le rendu accéléré');
  } finally {
    window.close();
  }
});
