# 🔴 Problèmes d'architecture identifiés

## Incohérences majeures

### 1. Mélange de deux systèmes de base de données

**État actuel** :
- ✅ **Firestore** : Procedures, Phases, Categories, Preferences
- ✅ **IndexedDB (Dexie)** : Templates uniquement
- ❌ **Problème** : Tools et Materials ne sont nulle part !

**Fichiers affectés** :
- `src/pages/ToolsLibrary.tsx` - Utilise encore `db.tools` (Dexie)
- `src/services/templateService.ts` - Utilise `db.templates` (Dexie) ✅ CORRECT
- `src/components/editor/PhaseTemplateSelector.tsx` - Utilise `db.templates` (Dexie) ✅ CORRECT

### 2. Tools et Materials non migrés

**Problème** : La bibliothèque d'outils (`ToolsLibrary.tsx`) utilise encore IndexedDB, mais les procédures sont dans Firestore.

**Impact** :
- Les outils créés dans IndexedDB ne sont pas synchronisés avec Firestore
- Les procédures dans Firestore ne peuvent pas référencer les outils correctement
- Perte de données si on supprime IndexedDB

**Solution requise** :
- Soit migrer Tools vers Firestore
- Soit garder Tools dans IndexedDB mais avec une logique claire

### 3. Duplication de la logique d'initialisation

**Problème** : On initialise à la fois Dexie ET Firestore avec les mêmes catégories

**Fichiers** :
- `src/db/database.ts:115` - Initialise les catégories dans Dexie
- `src/lib/firestore.ts:368` - Initialise les catégories dans Firestore

**Impact** :
- Données dupliquées
- Incohérence entre les deux bases
- Confusion sur quelle source est la vérité

### 4. Hooks mixtes

**Problème** : Certains hooks utilisent Dexie, d'autres Firestore

**Fichiers** :
- `src/hooks/useProcedures.ts` - ✅ Utilise Firestore
- `src/hooks/useCategories.ts` - ❓ Quel système utilise-t-il ?

## Erreurs TypeScript corrigées

1. ✅ **procedureService.ts** - Import inutile de `ProcedureStatus`
2. ✅ **templateService.ts** - Type mismatch sur `difficulty` et `riskLevel`

## Recommandations

### Option A : Migration complète vers Firestore (Recommandé)

**Avantages** :
- Architecture claire et cohérente
- Synchronisation cloud pour tout
- Pas de duplication

**Étapes** :
1. Migrer Tools vers Firestore
2. Migrer Materials vers Firestore
3. Supprimer les collections procedures/phases de Dexie
4. Garder uniquement Templates dans Dexie (données locales)

### Option B : Système hybride clair

**Avantages** :
- Performances pour les données locales
- Moins de coûts Firestore

**Étapes** :
1. **Firestore** : Procedures, Phases, Categories (partagées)
2. **Dexie** : Tools, Materials, Templates, Preferences (locales)
3. Documenter clairement quelle donnée va où
4. Implémenter des références claires entre les deux systèmes

### Option C : Rollback vers IndexedDB uniquement

**Avantages** :
- Architecture simple
- Pas de coûts Firebase
- Pas de problèmes de permissions

**Inconvénients** :
- Pas de cloud
- Pas de synchronisation multi-device
- Risque de perte de données

## Actions immédiates requises

1. **Décider d'une architecture claire** - Option A, B ou C ?
2. **Documenter clairement** quelle collection va dans quelle base
3. **Migrer ou supprimer** les données dupliquées
4. **Tester complètement** chaque fonctionnalité après la décision

## Problèmes Firestore actuels

### Permissions

Malgré les règles `allow read, write: if true`, les écritures échouent.

**Causes possibles** :
1. Règles non propagées (attendre 5-10 minutes)
2. Cache du navigateur (hard refresh requis)
3. Problème de configuration Firebase
4. Document size > 1 MB (mais logs montrent 340 bytes)

**Solution de diagnostic** :
- Outil de test automatique créé : `src/test-firestore.ts`
- S'exécute au démarrage de l'application
- Identifie précisément où le problème se situe

## État du build

✅ **Build réussi** après correction des erreurs TypeScript

```
✓ built in 10.71s
dist/assets/index-D3VV21Js.js  1,454.31 kB
```

⚠️ **Warning** : Chunks > 500 kB (considérer code-splitting)

## Prochaines étapes

1. **Attendre retour utilisateur** sur les logs du diagnostic
2. **Décider de l'architecture** (A, B ou C)
3. **Implémenter la migration** selon le choix
4. **Nettoyer le code** des anciennes références
5. **Documenter clairement** l'architecture finale
