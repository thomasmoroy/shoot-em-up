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

## Sauvegardes

Toute la progression reste sur l'appareil, dans le stockage local du navigateur
(clés `cosmochat_*`) :

- **Réglages** : niveau, volume, flashs, mode fluide.
- **Record** : meilleur score.
- **Checkpoint** : dernier secteur atteint, proposé via « REPRENDRE LA CAMPAGNE ».

Deux boutons du menu permettent de déplacer un profil d'un appareil à l'autre :

- **SAUVEGARDER LE PROFIL** télécharge un fichier `cosmo-chat-sauvegarde.json`
  (réglages, record, checkpoint).
- **RESTAURER** réimporte ce fichier.

Aucune donnée n'est envoyée sur un serveur : le fichier peut être conservé où
vous voulez (iCloud, Drive, Dropbox, clé USB…).

## Structure

| Fichier | Rôle |
| --- | --- |
| `shootemup.html` | Le jeu complet (HTML, CSS, JavaScript, sons). |
| `index.html` | Redirection de la racine vers le jeu. |
| `netlify.toml` | Publication statique et redirection `/jeu`. |
| `tests/local-profile.test.js` | Tests du démarrage sans compte et des sauvegardes locales. |

## Tests

```bash
node --test tests/
```

Les tests vérifient que le jeu démarre sur le menu sans écran d'identification,
qu'aucune connexion externe ne subsiste, que les jetons d'anciennes sessions
sont purgés et que l'export/import du profil reste fidèle.
