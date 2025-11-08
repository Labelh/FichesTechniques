# Configuration Firebase pour Fiches Techniques

## Étape 1 : Créer un projet Firebase

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Cliquez sur **"Ajouter un projet"** (Add project)
3. Donnez un nom à votre projet (ex: `fiches-techniques`)
4. Désactivez Google Analytics (optionnel pour ce projet)
5. Cliquez sur **"Créer le projet"**

## Étape 2 : Activer Firestore

1. Dans la console Firebase, allez dans **"Build" > "Firestore Database"**
2. Cliquez sur **"Créer une base de données"**
3. Choisissez **"Démarrer en mode test"** (vous pourrez sécuriser plus tard)
4. Sélectionnez une région proche de vous (ex: `europe-west1`)
5. Cliquez sur **"Activer"**

## Étape 3 : Activer Firebase Storage (pour les images)

1. Dans la console Firebase, allez dans **"Build" > "Storage"**
2. Cliquez sur **"Commencer"**
3. Utilisez les règles de sécurité par défaut
4. Cliquez sur **"Terminer"**

## Étape 4 : Obtenir votre configuration Firebase

1. Dans la console Firebase, cliquez sur l'icône **engrenage** ⚙️ (à côté de "Vue d'ensemble du projet")
2. Cliquez sur **"Paramètres du projet"**
3. Faites défiler jusqu'à **"Vos applications"**
4. Cliquez sur l'icône **Web** `</>`
5. Donnez un nom à votre app (ex: `Fiches Techniques Web`)
6. **NE COCHEZ PAS** "Configurer Firebase Hosting"
7. Cliquez sur **"Enregistrer l'application"**

Vous verrez un code comme ceci :

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "votre-projet.firebaseapp.com",
  projectId: "votre-projet",
  storageBucket: "votre-projet.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

## Étape 5 : Configurer les variables d'environnement

1. Copiez le fichier `.env.example` vers `.env` :
   ```bash
   cp .env.example .env
   ```

2. Ouvrez le fichier `.env` et remplissez les valeurs avec votre configuration Firebase :

   ```env
   VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   VITE_FIREBASE_AUTH_DOMAIN=votre-projet.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=votre-projet
   VITE_FIREBASE_STORAGE_BUCKET=votre-projet.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
   VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
   ```

## Étape 6 : Configurer les règles de sécurité Firestore

1. Dans la console Firebase, allez dans **"Firestore Database" > "Règles"**
2. Remplacez les règles par celles-ci (pour commencer) :

   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Autoriser tout le monde à lire et écrire (À SÉCURISER EN PRODUCTION)
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```

   **⚠️ IMPORTANT** : Ces règles sont très permissives. Pour la production, vous devriez ajouter l'authentification et restreindre l'accès.

## Étape 7 : Configurer les règles Firebase Storage

1. Dans la console Firebase, allez dans **"Storage" > "Règles"**
2. Utilisez ces règles (pour commencer) :

   ```javascript
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /{allPaths=**} {
         allow read, write: if true;
       }
     }
   }
   ```

## Étape 8 : Démarrer l'application

1. Assurez-vous que le fichier `.env` est bien configuré
2. Démarrez le serveur de développement :
   ```bash
   npm run dev
   ```

3. Ouvrez votre navigateur et vérifiez la console :
   - Vous devriez voir : `✅ Firebase initialisé`
   - Vous devriez voir : `✅ Préférences par défaut créées`
   - Vous devriez voir : `✅ Catégories par défaut créées`

## Étape 9 : Vérifier dans Firebase Console

1. Allez dans **Firestore Database**
2. Vous devriez voir les collections suivantes :
   - `categories` (avec 6 catégories par défaut)
   - `preferences` (avec les préférences par défaut)

## Étape 10 : Builder pour production

Pour builder l'application et l'ouvrir directement dans le navigateur :

```bash
npm run build
```

Les fichiers buildés seront dans le dossier `dist/`. Vous pouvez ouvrir `dist/index.html` directement dans votre navigateur.

## Structure des données Firebase

### Collections Firestore :
- **procedures** : Toutes vos procédures techniques
- **phases** : Les phases de chaque procédure
- **tools** : Bibliothèque d'outils
- **materials** : Matériaux utilisés
- **categories** : Catégories de procédures
- **tags** : Tags pour organiser les procédures
- **templates** : Templates de procédures
- **preferences** : Préférences utilisateur
- **history** : Historique des modifications

### Firebase Storage :
Les images seront stockées dans Firebase Storage dans le chemin :
- `/images/{procedureId}/{imageId}`

## Sécurisation (Optionnel mais recommandé)

Pour sécuriser votre application en production :

1. **Activer Firebase Authentication** :
   - Allez dans **"Build" > "Authentication"**
   - Activez les méthodes de connexion souhaitées (Email/Password, Google, etc.)

2. **Mettre à jour les règles Firestore** :
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

3. **Mettre à jour les règles Storage** :
   ```javascript
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /{allPaths=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

## Dépannage

### Erreur : "Firebase: Error (auth/api-key-not-valid)"
- Vérifiez que votre `VITE_FIREBASE_API_KEY` est correct dans `.env`
- Redémarrez le serveur après avoir modifié `.env`

### Erreur : "Firebase: Firebase App named '[DEFAULT]' already exists"
- Cela signifie que Firebase est initialisé plusieurs fois
- Vérifiez que vous n'importez `firebase.ts` qu'une seule fois

### Les données n'apparaissent pas
- Vérifiez la console du navigateur pour les erreurs
- Vérifiez que les règles Firestore autorisent la lecture
- Vérifiez que Firebase est bien initialisé (message dans la console)

### CORS errors avec Firebase Storage
- Configurez CORS pour votre bucket Storage :
  ```bash
  gsutil cors set cors.json gs://votre-projet.appspot.com
  ```

## Limites du plan gratuit Firebase

- **Firestore** : 50 000 lectures/jour, 20 000 écritures/jour, 1 GiB stockage
- **Storage** : 1 GB stockage, 10 GB transfert/mois
- **Hosting** : 10 GB stockage, 360 MB/jour de transfert

C'est largement suffisant pour une utilisation personnelle !

## Support

Si vous rencontrez des problèmes :
1. Consultez la [documentation Firebase](https://firebase.google.com/docs)
2. Vérifiez la console du navigateur pour les messages d'erreur
3. Assurez-vous que toutes les règles de sécurité sont configurées
