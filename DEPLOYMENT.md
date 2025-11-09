# Guide de déploiement sur GitHub Pages

## Configuration requise

L'application nécessite les variables d'environnement Firebase pour fonctionner correctement.

## Étapes de déploiement

### 1. Configurer les GitHub Secrets

Allez sur : https://github.com/Labelh/FichesTechniques/settings/secrets/actions

Cliquez sur **"New repository secret"** et ajoutez les secrets suivants :

| Nom du secret | Description |
|---------------|-------------|
| `VITE_FIREBASE_API_KEY` | Clé API Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | Domaine d'authentification (ex: votre-projet.firebaseapp.com) |
| `VITE_FIREBASE_PROJECT_ID` | ID du projet Firebase |
| `VITE_FIREBASE_STORAGE_BUCKET` | Bucket de stockage (ex: votre-projet.appspot.com) |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ID de l'expéditeur de messages |
| `VITE_FIREBASE_APP_ID` | ID de l'application Firebase |

**Où trouver ces valeurs ?**
- Console Firebase : https://console.firebase.google.com/
- Sélectionnez votre projet
- Allez dans **Project Settings** (⚙️ en haut à gauche)
- Scrollez jusqu'à **"Your apps"** > **Web app**
- Copiez les valeurs de la configuration

### 2. Activer GitHub Pages

1. Allez sur : https://github.com/Labelh/FichesTechniques/settings/pages

2. Dans la section **"Build and deployment"** :
   - **Source** : Sélectionnez **"GitHub Actions"**

3. Sauvegardez et attendez quelques secondes

### 3. Déclencher le déploiement

Le déploiement se fait automatiquement à chaque push sur la branche `main`.

Pour déclencher un nouveau déploiement manuellement :
- Allez sur : https://github.com/Labelh/FichesTechniques/actions
- Sélectionnez le workflow **"Deploy to GitHub Pages"**
- Cliquez sur **"Run workflow"**

### 4. Accéder à l'application

Une fois déployée, l'application sera disponible à :
**https://labelh.github.io/FichesTechniques/**

## Vérifier le déploiement

Pour vérifier l'état du déploiement :
- Actions : https://github.com/Labelh/FichesTechniques/actions
- Consultez le dernier workflow **"Deploy to GitHub Pages"**
- Vérifiez qu'il est en ✅ (succès)

## Dépannage

### Erreur 404
- Vérifiez que GitHub Pages est activé avec la source "GitHub Actions"
- Vérifiez que tous les secrets sont correctement configurés
- Attendez quelques minutes pour la propagation

### Build échoue
- Vérifiez les logs du workflow dans l'onglet Actions
- Assurez-vous que tous les secrets Firebase sont correctement configurés
- Vérifiez qu'il n'y a pas d'erreurs TypeScript dans le code

### Firebase ne fonctionne pas
- Vérifiez que les valeurs des secrets correspondent à votre projet Firebase
- Assurez-vous que l'URL `https://labelh.github.io` est autorisée dans Firebase Console > Authentication > Settings > Authorized domains
