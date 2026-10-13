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

## Fluidité et rendu

Le jeu vise 60 images/s sur un appareil modeste : le coût par image a été réduit
en profondeur, sans changer l'apparence.

- **Dégradés mis en cache** : un dégradé n'est plus créé que lorsque sa géométrie
  change réellement (objets translatés, rayons quantifiés). Les traînées de saut,
  les comètes et les nébuleuses sont dessinées dans leur propre repère pour
  garder un dégradé constant.
- **Halos pré-rendus** : explosions, halos de projectiles et éclairs de bouche
  utilisent un petit sprite réutilisé au lieu d'un dégradé calculé par image.
- **Fond de secteur cuit une fois** dans un canvas dédié, puis blitté.
- **Particules, poussière et étoiles regroupées** par couleur et par palier
  d'opacité : un seul tracé par lot, sans `save`/`restore` ni rotation unitaire.
- **HUD sans écriture inutile** : le DOM n'est touché que si la valeur affichée
  change réellement.
- **Cache borné** avec éviction progressive : jamais de purge massive en pleine
  partie, donc pas de micro-saccade.

Mesures (Chromium headless, scène chargée, processeur bridé) :

| Indicateur, par image | Avant | Après |
| --- | --- | --- |
| `update + render + hud` (CPU bridé ÷4) | 3,33 ms | **2,63 ms** |
| Rendu seul (CPU bridé ÷4) | 2,03 ms | **1,53 ms** |
| Même mesure, CPU bridé ÷8 | 8,00 ms | **5,37 ms** |
| Dégradés créés | 200 | **≈ 0** |
| `fillRect` | 869 | **190** |
| Écritures `textContent` | 13 | **0** |

## Effets visuels

- **Sillage des réacteurs** : la traînée du chasseur rend la vitesse et les
  esquives lisibles.
- **Reflet spéculaire** sur les planètes : un éclat sur la face éclairée donne
  du volume aux astres.

## Structure

| Fichier | Rôle |
| --- | --- |
| `shootemup.html` | Le jeu complet (HTML, CSS, JavaScript, sons). |
| `index.html` | Redirection de la racine vers le jeu. |
| `netlify.toml` | Publication statique et redirection `/jeu`. |
| `tests/local-profile.test.js` | Tests du démarrage sans compte, des scores et des sauvegardes. |
| `tests/browser-smoke.test.js` | Tests de bout en bout dans un DOM simulé (optionnel, nécessite jsdom) : démarrage, raccourcis, et non-régression du rendu (aucun dégradé recréé par image). |

## Tests

```bash
node --test tests/                       # tests principaux, aucune dépendance
npm i --no-save jsdom && node --test tests/   # + test navigateur de bout en bout
```

Les tests vérifient que le jeu démarre sur le menu sans écran d'identification,
qu'aucune connexion externe ne subsiste, que les jetons d'anciennes sessions
sont purgés, que le tableau des scores trie et plafonne correctement, que les
raccourcis clavier déclenchent les bonnes actions, que l'export/import du profil
reste fidèle et que le rendu ne recrée plus d'objets graphiques à chaque image.
