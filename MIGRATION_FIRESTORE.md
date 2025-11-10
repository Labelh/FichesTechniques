# Migration Firestore - Récapitulatif

## 🎯 Ce qui a été fait

### 1. Migration vers Firestore Cloud
- ✅ Remplacement d'IndexedDB (Dexie) par Firestore
- ✅ `procedureService.ts` : Toutes les fonctions CRUD migrées
- ✅ `templateService.ts` : Application des templates vers Firestore
- ✅ `useProcedures.ts` : Hooks avec écoute temps réel
- ✅ Configuration Firebase avec credentials

### 2. Corrections appliquées
- ✅ Suppression des valeurs `undefined` (rejetées par Firestore)
- ✅ Désactivation images de couverture (limite 1 MB dépassée)
- ✅ Délai auto-save changé à 10 minutes (600000 ms)
- ✅ Thème gris harmonisé pour modal templates

### 3. Configuration Firestore

#### Règles de sécurité
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function documentSize() {
      return request.resource.size < 1048576; // 1 MB max
    }

    match /procedures/{procedureId} {
      allow read: if true;
      allow create: if documentSize();
      allow update: if documentSize();
      allow delete: if true;
    }

    match /phases/{phaseId} {
      allow read: if true;
      allow create: if documentSize();
      allow update: if documentSize();
      allow delete: if true;
    }

    match /categories/{categoryId} {
      allow read: if true;
      allow write: if false;
    }

    match /templates/{templateId} {
      allow read: if true;
      allow create: if documentSize();
      allow update: if documentSize();
      allow delete: if true;
    }

    match /preferences/{prefId} {
      allow read: if true;
      allow write: if documentSize();
    }
  }
}
```

#### Index requis
- **Collection** : `phases`
- **Champs** :
  - `procedureId` : Ascending
  - `order` : Ascending

## 📂 Structure Firestore

```
fichestechniques-cd97c (projet)
├── procedures/          → Procédures techniques
│   ├── {procedureId}/
│   │   ├── title
│   │   ├── description
│   │   ├── reference
│   │   ├── category
│   │   ├── status
│   │   ├── createdAt
│   │   └── updatedAt
│
├── phases/             → Phases des procédures
│   ├── {phaseId}/
│   │   ├── procedureId  (référence)
│   │   ├── order
│   │   ├── title
│   │   ├── description
│   │   ├── difficulty
│   │   ├── estimatedTime
│   │   ├── steps[]
│   │   └── ...
│
├── categories/         → Catégories (lecture seule)
├── preferences/        → Préférences utilisateur
└── templates/          → Templates (restent dans IndexedDB)
```

## ⚠️ Limitations actuelles

### Images de couverture désactivées
**Problème** : Les images base64 dépassent la limite Firestore (1 MB)

**Solution temporaire** : Images désactivées

**TODO** : Implémenter Firebase Storage
1. Upload images vers Firebase Storage
2. Stocker URL dans Firestore (pas l'image)

### Templates restent locaux
Les templates de phases restent dans IndexedDB (Dexie) car :
- Données locales à l'utilisateur
- Pas besoin de synchronisation cloud
- Performances optimales

## 🔧 Credentials Firebase

Fichier : `.env` (non versionné)
```env
VITE_FIREBASE_API_KEY=AIzaSyDmnjA7AFMiLEyzYYD1m1Tg1UAioh-Xxjg
VITE_FIREBASE_AUTH_DOMAIN=fichestechniques-cd97c.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=fichestechniques-cd97c
VITE_FIREBASE_STORAGE_BUCKET=fichestechniques-cd97c.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=479197498353
VITE_FIREBASE_APP_ID=1:479197498353:web:6463d33fe429df8c3f5250
VITE_FIREBASE_MEASUREMENT_ID=G-98QERTYMZ9
```

## 🚀 Utilisation

### Créer une procédure
```typescript
import { createProcedure } from '@/services/procedureService';

const procedureId = await createProcedure({
  title: 'Ma procédure',
  description: 'Description',
  reference: 'REF-001',
});
```

### Ajouter une phase
```typescript
import { addPhase } from '@/services/procedureService';

await addPhase(procedureId, {
  title: 'Phase 1',
  description: 'Description de la phase',
  difficulty: 'medium',
  estimatedTime: 30,
});
```

### Écouter les procédures en temps réel
```typescript
import { useProcedures } from '@/hooks/useProcedures';

const procedures = useProcedures(); // Synchronisation temps réel
```

## 🐛 Problèmes connus et solutions

### Erreur "Missing or insufficient permissions"
**Cause** : Règles Firestore non publiées ou mal configurées

**Solution** :
1. Firebase Console → Firestore → Règles
2. Vérifier les règles ci-dessus
3. Cliquer sur **PUBLIER**
4. Attendre 1-2 minutes

### Erreur "The query requires an index"
**Cause** : Index Firestore manquant pour collection `phases`

**Solution** :
1. Cliquer sur le lien dans l'erreur (crée l'index automatiquement)
2. OU créer manuellement (voir section Index requis)
3. Attendre 2-5 minutes (création de l'index)

### Erreur "Request payload size exceeds limit"
**Cause** : Images base64 trop volumineuses

**Solution** : Ne pas ajouter d'image de couverture pour l'instant

## 📊 Avantages Firestore

- ✅ **Cloud** : Données sauvegardées en ligne
- ✅ **Temps réel** : Synchronisation automatique
- ✅ **Multi-device** : Accès depuis n'importe où
- ✅ **Backup** : Plus de risque de perte de données
- ✅ **Scalabilité** : Gère de grandes quantités de données

## 🔐 Sécurité

**Actuellement** : Accès ouvert avec limite de taille (1 MB)

**Pour production** : Implémenter Firebase Authentication
```javascript
match /{document=**} {
  allow read, write: if request.auth != null;
}
```

## 📝 Commits importants

1. `47c3ddf` - Implémentation auto-save (10 minutes)
2. `9df0c6a` - Migration complète vers Firestore
3. `abf7043` - Fix valeurs undefined
4. `db04628` - Thème modal + fix templates Firestore

## ✅ Tests à effectuer

- [ ] Créer une procédure
- [ ] Ajouter des phases
- [ ] Modifier une procédure
- [ ] Supprimer une procédure
- [ ] Vérifier synchronisation temps réel
- [ ] Vérifier données dans Firebase Console
