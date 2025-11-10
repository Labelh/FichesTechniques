# 🔧 Debug des Permissions Firestore

## 🚨 Problème actuel

L'application ne peut pas créer de procédures dans Firestore. Erreur :
```
FirebaseError: Missing or insufficient permissions
```

## 🔍 Diagnostic automatique activé

J'ai ajouté un système de diagnostic automatique qui s'exécute au démarrage de l'application.

### Comment voir les résultats

1. Ouvrez l'application : http://localhost:5173/FichesTechniques/
2. Ouvrez la console du navigateur (F12)
3. Regardez les logs qui commencent par `🔍 DIAGNOSTIC FIRESTORE`

Vous verrez 4 tests :
- ✅ Test 0 : Configuration Firebase
- ✅ Test 1 : Lecture des collections
- ✅ Test 2 : Écriture avec ID automatique
- ✅ Test 3 : Écriture avec ID manuel
- ✅ Test 4 : Simulation création procédure

## 🎯 Ce que les résultats signifient

### Scénario 1 : Configuration ❌
```
📋 Test 0 : Configuration Firebase
   ❌ Variables d'environnement non chargées !
```

**Problème** : Le fichier `.env` n'est pas chargé

**Solution** :
```bash
# 1. Vérifiez que .env existe à la racine
ls -la .env

# 2. Vérifiez le contenu (toutes les variables doivent commencer par VITE_)
cat .env

# 3. Redémarrez le serveur
Ctrl+C
npm run dev
```

### Scénario 2 : Permissions lecture/écriture ❌
```
📖 Test 1 : Lecture des collections
   ❌ Lecture échouée: Missing or insufficient permissions
   🔒 PROBLÈME DE PERMISSIONS DÉTECTÉ
```

**Problème** : Les règles Firestore bloquent l'accès

**Solution immédiate** :

1. **Allez sur Firebase Console**
   - https://console.firebase.google.com/
   - Projet : **fichestechniques-cd97c**
   - Menu : **Firestore Database**
   - Onglet : **Règles**

2. **Remplacez TOUT le contenu par** :
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

3. **Cliquez sur PUBLIER** (bouton en haut à droite)

4. **Attendez 5 minutes complètes** ⏰
   - Les règles Firestore mettent du temps à se propager
   - C'est NORMAL d'attendre

5. **Hard refresh de l'application**
   - Windows/Linux : `Ctrl + Shift + R`
   - Mac : `Cmd + Shift + R`

6. **Rechargez la page**
   - Vous devriez voir tous les tests passer en ✅

### Scénario 3 : Tout fonctionne sauf "procedures" ❌
```
✅ Test 2 : Écriture OK
❌ Test 4 : Création procédure échouée
   🔒 C'EST ICI LE PROBLÈME !
```

**Problème** : Les règles ont une restriction spécifique sur "procedures"

**Solution** : Vérifiez qu'il n'y a PAS de règles comme :
```javascript
// ❌ MAUVAIS - Trop restrictif
match /procedures/{procedureId} {
  allow read: if true;
  allow create: if documentSize();
  allow update: if documentSize();
}
```

Utilisez plutôt :
```javascript
// ✅ BON - Ouvert pour le développement
match /{document=**} {
  allow read, write: if true;
}
```

### Scénario 4 : Erreur "unavailable" 🌐
```
❌ Écriture échouée: unavailable
   🌐 Firestore n'est pas disponible
```

**Problème** : Connexion internet ou Firestore down

**Solution** :
1. Vérifiez votre connexion internet
2. Vérifiez https://status.firebase.google.com/
3. Attendez quelques minutes et réessayez

## 🔄 Après avoir modifié les règles

**TOUJOURS faire ces 3 étapes** :

1. ⏰ **Attendre 5 minutes** après avoir cliqué sur PUBLIER
   - Ne pas réessayer immédiatement
   - Prenez un café ☕

2. 🔄 **Hard refresh du navigateur**
   - `Ctrl + Shift + R` (Windows/Linux)
   - `Cmd + Shift + R` (Mac)

3. 🧪 **Vérifier les logs de diagnostic**
   - F12 → Console
   - Cherchez `🔍 DIAGNOSTIC FIRESTORE`
   - Tous les tests doivent être ✅

## 🛠️ Si rien ne fonctionne

### Solution radicale : Réinitialiser Firestore

⚠️ **ATTENTION** : Cela supprimera toutes les données

1. **Firebase Console** → **Firestore Database**
2. **Menu ⋮** (en haut à droite) → **Delete database**
3. Confirmez la suppression
4. **Create database**
   - Mode : **Production**
   - Région : **europe-west1**
5. **Règles** → Copiez les règles ci-dessus
6. **PUBLIER**
7. **Attendez 5 minutes**
8. Relancez l'application

### Vérification manuelle des règles

Dans Firebase Console → Firestore → Règles, le contenu doit être **EXACTEMENT** :

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

**Vérifiez** :
- ✅ Pas d'espace avant `rules_version`
- ✅ Guillemets simples autour de `'2'`
- ✅ Accolade fermante `}` pour chaque ouvrante `{`
- ✅ Point-virgule `;` après chaque instruction
- ✅ `if true` (pas `if true;`)

## 📞 Besoin d'aide ?

Si après tout ça, ça ne marche toujours pas :

1. **Copiez TOUS les logs** de la console (F12 → Console → Clic droit → Save as...)
2. **Faites une capture d'écran** de l'onglet Règles dans Firebase Console
3. **Faites une capture d'écran** de Firebase Console → Project Settings → General
4. Envoyez-moi tout ça

## 🎯 Prochaines étapes (une fois que ça marche)

Une fois que les permissions fonctionnent :

1. ✅ Créer des procédures
2. ✅ Ajouter des phases
3. ✅ Tester la synchronisation temps réel
4. ⚠️ **Sécuriser les règles** (important pour la production !)

### Sécurisation pour la production

**NE PAS LAISSER** `allow read, write: if true` en production !

Règles sécurisées (nécessite Firebase Authentication) :
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

Mais pour l'instant, **focus sur faire marcher les écritures** 🎯
