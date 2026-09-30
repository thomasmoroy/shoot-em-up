# Cosmo Chat — déploiement Netlify

Ce jeu est un site statique autonome : aucune installation, compilation ou clé API n’est nécessaire.

## Publication la plus simple : Netlify Drop

1. Décompressez `cosmo-chat-netlify-github.zip` dans un dossier, par exemple `cosmo-chat`.
2. Connectez-vous à https://app.netlify.com/drop.
3. Glissez le **dossier décompressé** dans la zone de dépôt.
4. Netlify fournit immédiatement une adresse publique en `netlify.app`.

Pour mettre le jeu à jour, remplacez les fichiers dans ce dossier puis glissez à nouveau le dossier dans l’onglet **Deploys** du site Netlify.

## Fichiers à publier

- `shootemup.html` — jeu complet et sons embarqués.
- `index.html` — ouvre automatiquement le jeu à la racine du site.
- `netlify.toml` — configuration statique Netlify.

## Sauvegarde portable, sans compte

Le menu du jeu contient :

- **Sauvegarder le profil** : télécharge `cosmo-chat-sauvegarde.json`.
- **Restaurer** : recharge ce fichier sur tout appareil.
- **Reprendre la campagne** : disponible automatiquement après chaque boss de secteur.

Pour une sauvegarde « en ligne » très simple, placez le fichier JSON téléchargé dans Google Drive, iCloud Drive, Dropbox ou OneDrive. Il contient les réglages, record et dernier checkpoint de secteur ; aucun mot de passe ni service externe n’est nécessaire.
