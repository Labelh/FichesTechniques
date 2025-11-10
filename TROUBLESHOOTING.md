# Dépannage - Erreur de permissions Firestore

## Problème actuel
`FirebaseError: Missing or insufficient permissions` lors de la création de procédures.

## Diagnostic étape par étape

### 1. Vérifier que Firebase est bien connecté

Ouvrez la console du navigateur (F12) et tapez :
```javascript
console.log(window.firebase)
```

Vous devriez voir un objet Firebase. Si c'est `undefined`, Firebase n'est pas initialisé.

### 2. Vérifier les règles Firestore

#### Option A : Règles ultra-simples (TEMPORAIRE)
Allez dans Firebase Console → Firestore → Règles, et remplacez TOUT par :

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

Cliquez sur **PUBLIER**, puis attendez **5 MINUTES** complètes.

#### Option B : Test de connexion direct
Dans la console du navigateur, testez directement :

```javascript
import { collection, addDoc } from 'firebase/firestore';
import { db } from './src/lib/firebase';

// Test d'écriture direct
addDoc(collection(db, 'test'), {
  timestamp: new Date(),
  message: 'Test de connexion'
}).then(docRef => {
  console.log('✅ Test réussi ! ID:', docRef.id);
}).catch(error => {
  console.error('❌ Test échoué:', error);
});
```

### 3. Vérifier le projet Firebase

1. Allez sur https://console.firebase.google.com/
2. Vérifiez que vous êtes bien sur le projet **fichestechniques-cd97c**
3. Vérifiez que Firestore est bien activé (mode Native)
4. Vérifiez la région : devrait être `europe-west1` ou similaire

### 4. Vérifier les credentials .env

Ouvrez le fichier `.env` et vérifiez :
- Toutes les clés commencent par `VITE_`
- Pas d'espaces avant ou après les `=`
- Pas de guillemets autour des valeurs

**IMPORTANT** : Après toute modification du `.env`, vous devez :
```bash
# Arrêter le serveur (Ctrl+C)
npm run dev
```

### 5. Hard Reset complet

Si rien ne fonctionne :

```bash
# 1. Arrêter le serveur
Ctrl+C

# 2. Vider le cache du navigateur
# Dans Chrome/Edge : Ctrl+Shift+Delete → Cocher "Cached images and files" → Clear

# 3. Vider le cache de Vite
rm -rf node_modules/.vite

# 4. Redémarrer
npm run dev
```

### 6. Vérifier les quotas Firebase

Allez dans Firebase Console → Usage and billing
- Vérifiez que vous n'avez pas dépassé les quotas gratuits
- Vérifiez qu'il n'y a pas d'alertes

### 7. Logs détaillés

Activez les logs détaillés de Firebase en ajoutant dans `src/lib/firebase.ts` :

```typescript
import { setLogLevel } from 'firebase/firestore';

// Après l'initialisation de Firestore
setLogLevel('debug');
```

Ensuite, rechargez l'application et regardez les logs dans la console.

## Causes possibles

### Cause 1 : Règles non propagées
**Symptôme** : Règles publiées mais erreur persiste
**Solution** : Attendre 5-10 minutes après publication

### Cause 2 : Cache du navigateur
**Symptôme** : Anciennes règles encore en cache
**Solution** : Hard refresh (Ctrl+Shift+R) ou vider le cache

### Cause 3 : Mauvais projet Firebase
**Symptôme** : Les règles sont bonnes mais sur un autre projet
**Solution** : Vérifier le `projectId` dans `.env` et Firebase Console

### Cause 4 : .env non chargé
**Symptôme** : Variables d'environnement undefined
**Solution** : Redémarrer le serveur après modification du `.env`

### Cause 5 : Firestore pas en mode Native
**Symptôme** : Erreurs étranges de permissions
**Solution** : Dans Firebase Console, vérifier que Firestore est en mode "Native" (pas "Datastore")

## Test de diagnostic complet

Créez un fichier de test `src/test-firestore.ts` :

```typescript
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from './lib/firebase';

export async function testFirestoreConnection() {
  console.log('🔍 Test de connexion Firestore...');

  try {
    // Test 1 : Lecture
    console.log('📖 Test 1 : Lecture des collections...');
    const collections = await getDocs(collection(db, 'test'));
    console.log('✅ Lecture OK. Documents:', collections.size);

    // Test 2 : Écriture
    console.log('✍️ Test 2 : Écriture dans collection test...');
    const docRef = await addDoc(collection(db, 'test'), {
      timestamp: new Date(),
      message: 'Test de connexion',
      version: 1
    });
    console.log('✅ Écriture OK. ID:', docRef.id);

    return true;
  } catch (error) {
    console.error('❌ Test échoué:', error);
    if (error.code === 'permission-denied') {
      console.error('🔒 Erreur de permissions. Vérifiez les règles Firestore.');
    } else if (error.code === 'unavailable') {
      console.error('🌐 Firestore n\'est pas disponible. Vérifiez votre connexion internet.');
    }
    return false;
  }
}
```

Puis dans `src/App.tsx`, importez et appelez :

```typescript
import { testFirestoreConnection } from './test-firestore';

useEffect(() => {
  testFirestoreConnection();
}, []);
```

## Solution rapide recommandée

Si vous voulez juste débloquer la situation MAINTENANT :

1. **Supprimez complètement Firestore** dans Firebase Console :
   - Firestore Database → ⋮ (menu) → Delete database

2. **Re-créez Firestore** :
   - Firestore Database → Create database
   - Mode : **Production** (pas Test)
   - Région : **europe-west1**

3. **Publiez ces règles ultra-simples** :
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

4. **Attendez 5 minutes**

5. **Redémarrez l'application** :
   ```bash
   Ctrl+C
   npm run dev
   ```

6. **Hard refresh du navigateur** : Ctrl+Shift+R

7. **Testez la création d'une procédure**

## Besoin d'aide supplémentaire ?

Si rien ne fonctionne, envoyez-moi :
1. Capture d'écran des règles Firestore (onglet Règles)
2. Capture d'écran de Firebase Console → Project Settings → General
3. Console logs complets (F12 → Console → Clic droit → Save as...)
4. Résultat du test `testFirestoreConnection()`
