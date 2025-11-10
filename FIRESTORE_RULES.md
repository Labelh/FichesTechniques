# Règles de sécurité Firestore

## Configuration actuelle requise

Pour que l'application fonctionne, vous devez configurer les règles de sécurité Firestore :

### 1. Aller dans Firebase Console
1. Ouvrez https://console.firebase.google.com/
2. Sélectionnez votre projet **fichestechniques-cd97c**
3. Dans le menu, cliquez sur **Firestore Database**
4. Cliquez sur l'onglet **Règles** (Rules)

### 2. Copier ces règles

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Autoriser lecture et écriture pour tous (MODE DÉVELOPPEMENT)
    // ⚠️ À SÉCURISER POUR LA PRODUCTION !
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### 3. Publier les règles
Cliquez sur **Publier** pour activer les règles.

## ⚠️ IMPORTANT - Sécurité

Ces règles sont **OUVERTES** et permettent à n'importe qui d'accéder à vos données.

**Pour la production, utilisez ces règles sécurisées :**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Autoriser lecture/écriture uniquement aux utilisateurs authentifiés
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Cela nécessitera d'implémenter Firebase Authentication.

## Vérification

Une fois les règles publiées :
1. Rechargez l'application : http://localhost:5173/FichesTechniques/
2. Ouvrez la console du navigateur (F12)
3. Vous devriez voir : `✅ Firestore initialisé`
4. Créez une procédure de test
5. Vérifiez dans Firebase Console → Firestore Database → vous verrez les collections apparaître !

## Collections créées automatiquement

Au premier lancement, l'application créera :
- **preferences** : Préférences utilisateur
- **categories** : 6 catégories par défaut (Électricité, Plomberie, etc.)

Quand vous créerez votre première procédure :
- **procedures** : Vos procédures
- **phases** : Les phases de chaque procédure
