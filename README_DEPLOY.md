# Cosmo Chat — déploiement et connexion Google

Le jeu utilise Supabase pour la connexion Google, la sauvegarde des campagnes et le classement. Le JavaScript du jeu est statique, mais **la connexion nécessite une fonction serveur de configuration**. Ouvrir le fichier HTML directement ou le déposer seul sur Netlify Drop ne suffit pas pour jouer avec un compte.

## Déploiement Netlify depuis GitHub

1. Importez ce dépôt dans Netlify et utilisez la configuration `netlify.toml` (publication : `.`, fonctions : `netlify/functions`, aucune compilation nécessaire).
2. Dans les variables d’environnement Netlify, avec accès aux **Functions**, renseignez :
   - `SUPABASE_URL` : URL du projet Supabase.
   - `SUPABASE_PUBLISHABLE_KEY` ou `SUPABASE_ANON_KEY` : clé publique du projet.
3. Redéployez le site après toute modification de ces variables.
4. Vérifiez que `https://VOTRE-SITE/api/game-config` renvoie un JSON contenant `url` et `key` (pas une page HTML ni une erreur 503).

La fonction Netlify réutilise `api/game-config.js`, également compatible avec Vercel. Ne renseignez **jamais** une clé `service_role` à la place de la clé publique : la réponse de cet endpoint est accessible aux visiteurs.

## Configuration Google et Supabase

1. Exécutez `supabase/schema.sql` dans le SQL Editor de votre projet pour créer les tables et les politiques RLS de sauvegarde/classement.
2. Dans Google Cloud Console, créez un client OAuth de type **Application Web** et configurez l’écran de consentement (ajoutez vos comptes de test si l’application est encore en mode test).
3. Ajoutez comme **URI de redirection autorisée Google** l’URL de callback affichée dans Supabase, généralement `https://VOTRE-PROJET.supabase.co/auth/v1/callback`. Ce n’est pas l’URL du jeu.
4. Dans Supabase → Authentication → Sign In / Providers → Google, activez Google et renseignez le client ID et le secret Google. Le secret reste dans Supabase, jamais dans ce dépôt ni dans la configuration publique.
5. Dans Supabase → Authentication → URL Configuration :
   - **Site URL** : `https://VOTRE-SITE/shootemup.html`.
   - **Redirect URLs** : ajoutez exactement `https://VOTRE-SITE/shootemup.html`, ainsi que l’URL correspondante de chaque domaine de test ou de prévisualisation que vous utilisez.

Le bouton Google revient toujours sur `/shootemup.html`, même si le jeu est ouvert depuis `/jeu`. L’ouverture du site à la racine conserve aussi les paramètres de retour OAuth.

## Dépannage

- **« Connexion non configurée »** : vérifiez les variables Supabase et redéployez.
- **Configuration inaccessible ou invalide** : vérifiez le routage `/api/game-config` vers la fonction et utilisez un déploiement qui exécute les fonctions (pas uniquement un hébergement statique).
- **Chargement du service impossible** : vérifiez l’accès réseau à `cdn.jsdelivr.net` et les extensions de blocage.
- **Provider disabled / Unsupported provider** : activez Google dans Supabase.
- **redirect_uri_mismatch** : corrigez l’URI du callback Supabase dans Google Cloud.
- **Retour sur la mauvaise URL** : corrigez les Redirect URLs et la Site URL de Supabase.
- **Accès refusé** : vérifiez les comptes de test et les règles de consentement Google, puis réessayez.

Les erreurs de connexion sont affichées dans l’écran d’identification. En cas de panne de configuration ou de réseau, le bouton permet de réessayer sans recharger la page.

## Sauvegarde portable

Le menu du jeu connecté propose **Sauvegarder le profil**, **Restaurer** et **Reprendre la campagne** après un checkpoint. Le fichier JSON peut être conservé dans Google Drive, iCloud Drive, Dropbox ou OneDrive ; il ne contient pas de mot de passe.

## Tests

Exécutez `node --test tests/google-auth.test.js` (Node.js 22 recommandé). Ces tests vérifient la configuration publique, les erreurs et réessais, l’URL de retour OAuth et la synchronisation différée hors de l’événement d’authentification. La connexion réelle doit également être testée sur le site déployé avec un projet Supabase et un client Google configurés.
