# Configuration Firebase

## Problème Actuel

**⚠️ URGENT:** Vos procédures ont été perdues car Firebase n'était pas configuré correctement. Le fichier `.env` n'existait pas, donc l'application utilisait des valeurs factices.

## Solution

### Étape 1: Créer un projet Firebase

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Cliquez sur "Ajouter un projet" ou "Add project"
3. Nommez votre projet (ex: "fiches-techniques")
4. Désactivez Google Analytics (optionnel)
5. Cliquez sur "Créer le projet"

### Étape 2: Créer une application Web

1. Dans votre projet Firebase, cliquez sur l'icône Web `</>`
2. Donnez un nom à votre app (ex: "FichesTechniques Web")
3. **NE PAS** cocher "Firebase Hosting" pour l'instant
4. Cliquez sur "Enregistrer l'application"
5. **Copiez la configuration `firebaseConfig`** qui s'affiche

### Étape 3: Configurer Firestore

1. Dans le menu de gauche, cliquez sur "Firestore Database"
2. Cliquez sur "Créer une base de données"
3. Choisissez le mode de démarrage:
   - **Mode test** (recommandé pour débuter): Accès libre pendant 30 jours
   - **Mode production**: Nécessite des règles de sécurité
4. Choisissez un emplacement (ex: `europe-west1` pour l'Europe)
5. Cliquez sur "Activer"

### Étape 4: Configurer les règles de sécurité (Important!)

Dans l'onglet "Règles" de Firestore, remplacez par ces règles **temporaires** (à sécuriser plus tard):

\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Autoriser lecture/écriture pour tous (TEMPORAIRE - À SÉCURISER!)
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
\`\`\`

**⚠️ ATTENTION:** Ces règles permettent à n'importe qui d'accéder à vos données. Pour une utilisation en production, vous devez les sécuriser.

### Étape 5: Configurer le fichier .env

Ouvrez le fichier \`.env\` à la racine du projet et remplacez les valeurs:

\`\`\`env
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=votre-projet.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=votre-projet
VITE_FIREBASE_STORAGE_BUCKET=votre-projet.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
\`\`\`

### Étape 6: Redémarrer l'application

\`\`\`bash
npm run dev
\`\`\`

L'application va automatiquement créer les collections et données par défaut au premier lancement.

## Structure Firestore

L'application créera automatiquement ces collections:

- **procedures**: Toutes vos procédures techniques
- **phases**: Les phases de chaque procédure
- **tools**: Outils disponibles (stockés aussi localement avec Dexie)
- **materials**: Matériaux
- **categories**: Catégories de procédures
- **tags**: Tags pour l'organisation
- **templates**: Templates de phases réutilisables
- **preferences**: Préférences utilisateur

## Règles de Sécurité Recommandées (Production)

Pour une utilisation en production, configurez Firebase Authentication puis utilisez ces règles:

\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Seuls les utilisateurs authentifiés peuvent lire/écrire
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
\`\`\`

## Récupération des Données Perdues

Malheureusement, si vos procédures étaient stockées avec les mauvaises credentials Firebase, elles sont perdues définitivement.

**Conseil:** Une fois Firebase configuré correctement:
1. Créez quelques procédures de test
2. Exportez-les régulièrement en PDF ou JSON
3. Activez la sauvegarde automatique (déjà implémentée)

## Support

Pour plus d'aide sur Firebase:
- [Documentation Firebase](https://firebase.google.com/docs/firestore)
- [Guide de démarrage Firestore](https://firebase.google.com/docs/firestore/quickstart)
