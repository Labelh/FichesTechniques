# Guide d'Installation - Fiches Techniques

Ce guide vous accompagne pas à pas pour installer l'application depuis GitHub.

## 🚀 Installation Rapide (5 minutes)

### Étape 1 : Cloner le projet

```bash
git clone https://github.com/Labelh/FichesTechniques.git
cd FichesTechniques
```

### Étape 2 : Installer les dépendances

```bash
npm install
```

### Étape 3 : Configurer Firebase

#### 3.1 Créer un projet Firebase

1. Allez sur https://console.firebase.google.com/
2. Cliquez sur **"Ajouter un projet"**
3. Donnez un nom (ex: `mes-fiches-techniques`)
4. Désactivez Google Analytics (optionnel)
5. Cliquez sur **"Créer le projet"**

#### 3.2 Activer Firestore

1. Menu **"Build" > "Firestore Database"**
2. Cliquez sur **"Créer une base de données"**
3. Choisissez **"Démarrer en mode test"**
4. Sélectionnez une région proche (ex: `europe-west1`)
5. Cliquez sur **"Activer"**

#### 3.3 Activer Storage

1. Menu **"Build" > "Storage"**
2. Cliquez sur **"Commencer"**
3. Utilisez les règles par défaut
4. Cliquez sur **"Terminer"**

#### 3.4 Récupérer la configuration

1. Cliquez sur l'icône **engrenage** ⚙️ (Paramètres du projet)
2. Faites défiler jusqu'à **"Vos applications"**
3. Cliquez sur l'icône **Web** `</>`
4. Donnez un nom (ex: `Fiches Techniques Web`)
5. Cliquez sur **"Enregistrer l'application"**

Vous obtiendrez un code comme :

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "votre-projet.firebaseapp.com",
  projectId: "votre-projet",
  storageBucket: "votre-projet.appspot.com",
  messagingSenderId: "123...",
  appId: "1:123..."
};
```

#### 3.5 Configurer le fichier .env

```bash
# Copier le template
cp .env.example .env

# Éditer le fichier .env avec vos valeurs
```

Remplissez le fichier `.env` :

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=votre-projet.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=votre-projet
VITE_FIREBASE_STORAGE_BUCKET=votre-projet.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123...
VITE_FIREBASE_APP_ID=1:123...
```

### Étape 4 : Démarrer l'application

```bash
npm run dev
```

Ouvrez http://localhost:5173 dans votre navigateur !

## 🎯 Mode Production (Sans Serveur)

Si vous voulez utiliser l'application sans serveur de développement :

```bash
# Builder l'application
npm run build

# Ouvrir dist/index.html dans votre navigateur
# Double-cliquez sur le fichier ou utilisez :
# Windows: start dist/index.html
# Mac: open dist/index.html
# Linux: xdg-open dist/index.html
```

L'application fonctionnera directement dans votre navigateur !

## ✅ Vérification

Après le démarrage, vous devriez voir dans la console du navigateur :

```
✅ Firebase initialisé
✅ Firestore initialisé
✅ Préférences par défaut créées
✅ Catégories par défaut créées
```

## 🔧 Dépannage

### Erreur : "Firebase: Error (auth/api-key-not-valid)"

- Vérifiez que votre `.env` contient les bonnes valeurs
- Redémarrez le serveur après avoir modifié `.env`

### Erreur : "Permission denied" dans Firestore

1. Allez dans Firebase Console > Firestore Database > Règles
2. Utilisez ces règles temporaires :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### L'application ne charge pas

- Vérifiez que vous avez bien activé **Firestore** et **Storage** dans Firebase
- Vérifiez la console du navigateur pour les erreurs
- Assurez-vous que le fichier `.env` existe et est bien rempli

### Les données n'apparaissent pas

- Vérifiez que Firebase est bien initialisé (message dans la console)
- Allez dans Firebase Console > Firestore Database pour voir si les collections sont créées
- Vérifiez les règles de sécurité Firestore

## 📚 Documentation Complète

Pour plus d'informations, consultez :

- **README.md** - Vue d'ensemble du projet
- **FIREBASE_SETUP.md** - Guide détaillé Firebase avec screenshots
- **GitHub** - https://github.com/Labelh/FichesTechniques

## 🆘 Besoin d'aide ?

Ouvrez une issue sur GitHub : https://github.com/Labelh/FichesTechniques/issues

---

**Temps d'installation** : ~5 minutes
**Difficulté** : Facile
**Prérequis** : Node.js 18+ installé
