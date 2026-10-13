# Cosmo Chat — Opération Aube Féline

Shooter d'arcade en HTML autonome. **Aucune connexion, aucun compte** : le jeu
s'ouvre directement sur le menu et se joue hors ligne.

## Déploiement

Le dépôt est 100 % statique : pas de compilation, pas de fonction serveur, pas
de variable d'environnement, pas de base de données.

1. Importez ce dépôt dans Netlify (la configuration `netlify.toml` publie la
   racine du dépôt telle quelle).
2. C'est tout. `https://VOTRE-SITE/` redirige vers `shootemup.html`, et
   `https://VOTRE-SITE/jeu` sert aussi le jeu.

Le même dossier fonctionne tel quel sur GitHub Pages, Vercel, un serveur
statique classique ou même en ouvrant `shootemup.html` en local.

## Commandes

| Touche | Effet |
| --- | --- |
| `←→↑↓` / `WASD` / `ZQSD` | déplacement |
| `Espace` | tirer |
| `Maj` | mode précision (hitbox visible) |
| `X` | bombe · `C` cycle des 5 armes · `1–5` choisir |
| `E` | impulsion · `F` Surcharge Aube |
| `P` ou `Échap` | pause / reprendre |
| `R` | recommencer (pendant la pause) |
| `M` | couper le son |
| `Entrée` | menu : lancer la partie · pause : reprendre · fin de partie : rejouer |

Le bouton du menu principal est aussi jouable à la souris ou au doigt ; en
mobile, glisser le doigt pour se déplacer (tir automatique).

## Meilleurs scores

Le menu affiche les **cinq meilleures parties** conservées sur l'appareil
(score, secteur, niveau, date). Le classement est purement local : il ne part
sur aucun serveur, ne demande aucun compte, et voyage avec l'export du profil.

## Sauvegardes

Toute la progression reste sur l'appareil, dans le stockage local du navigateur
(clés `cosmochat_*`) :

- **Réglages** : niveau, volume, flashs, mode fluide.
- **Record** : meilleur score.
- **Checkpoint** : dernier secteur atteint, proposé via « REPRENDRE LA CAMPAGNE ».
- **Meilleurs scores** : les cinq meilleures parties.

Deux boutons du menu permettent de déplacer un profil d'un appareil à l'autre :

- **SAUVEGARDER LE PROFIL** télécharge un fichier `cosmo-chat-sauvegarde.json`
  (réglages, record, checkpoint, meilleurs scores).
- **RESTAURER** réimporte ce fichier.

Aucune donnée n'est envoyée sur un serveur : le fichier peut être conservé où
vous voulez (iCloud, Drive, Dropbox, clé USB…).

## Structure

| Fichier | Rôle |
| --- | --- |
| `shootemup.html` | Le jeu complet (HTML, CSS, JavaScript, sons). |
| `index.html` | Redirection de la racine vers le jeu. |
| `netlify.toml` | Publication statique et redirection `/jeu`. |
| `tests/local-profile.test.js` | Tests du démarrage sans compte, des scores et des sauvegardes. |
| `tests/browser-smoke.test.js` | Test de bout en bout dans un DOM simulé (optionnel, nécessite jsdom). |

## Tests

```bash
node --test tests/                       # tests principaux, aucune dépendance
npm i --no-save jsdom && node --test tests/   # + test navigateur de bout en bout
```

Les tests vérifient que le jeu démarre sur le menu sans écran d'identification,
qu'aucune connexion externe ne subsiste, que les jetons d'anciennes sessions
sont purgés, que le tableau des scores trie et plafonne correctement, que les
raccourcis clavier déclenchent les bonnes actions et que l'export/import du
profil reste fidèle.
