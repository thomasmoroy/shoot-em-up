# Cosmo Chat — déploiement Netlify + GitHub

Ce projet est un jeu statique autonome : il ne nécessite ni Node.js, ni compilation, ni clé API.

## Fichiers à publier

- `shootemup.html` — le jeu complet, avec ses sons embarqués.
- `index.html` — ouvre automatiquement le jeu à la racine du site.
- `netlify.toml` — configuration Netlify prête à l'emploi.

## Déployer via GitHub puis Netlify

1. Créez un nouveau dépôt GitHub vide, par exemple `cosmo-chat`.
2. Ajoutez les trois fichiers ci-dessus à la racine du dépôt, puis poussez-les sur la branche `main`.
3. Sur Netlify, choisissez **Add new project** puis **Import an existing project**.
4. Autorisez Netlify à accéder à GitHub, puis sélectionnez le dépôt `cosmo-chat`.
5. Confirmez les réglages :
   - **Build command** : vide
   - **Publish directory** : `.`
6. Cliquez sur **Deploy**. Le jeu sera disponible immédiatement sur l'URL `*.netlify.app` fournie par Netlify.

## Variante rapide

Le fichier `cosmo-chat-netlify-github.zip` contient uniquement les fichiers de publication. Décompressez-le, poussez son contenu dans GitHub, puis reliez le dépôt dans Netlify.

> Le jeu fonctionne aussi avec GitHub Pages : activez Pages pour la branche `main`, dossier `/ (root)`.
