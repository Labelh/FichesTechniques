# MIGRATION-NEODE.md — App Fiches Techniques → VPS Shadow Néode

> Document d'analyse technique produit le 2026-06-08.  
> **Étape 1 — Analyse uniquement.** Aucun fichier de code créé ou modifié.  
> Auteur analyse : Claude (Réda + Claude Code).

---

## Sommaire

1. [Cartographie de l'existant](#1-cartographie-de-lexistant)  
2. [Gap analysis : backend actuel → Postgres Néode](#2-gap-analysis--backend-actuel--postgres-néode)  
3. [Évolutions de code nécessaires AVANT migration](#3-évolutions-de-code-nécessaires-avant-migration)  
4. [Déploiement cible](#4-déploiement-cible)  
5. [Plan de migration des données](#5-plan-de-migration-des-données)  
6. [Risques et points durs](#6-risques-et-points-durs)  
7. [Checklist finale](#7-checklist-finale)

---

## 1. Cartographie de l'existant

### 1.1 Stack

| Élément | Valeur |
|---|---|
| Framework | React 18.2 + TypeScript 5.2 |
| Build tool | Vite 5.0.8 |
| Router | react-router-dom 6.21 |
| State management | Zustand 4.4.7 |
| UI | Tailwind CSS 4.x + lucide-react + shadcn-like composants maison |
| PDF | jsPDF 2.5.1 + jspdf-autotable + html2canvas |
| Annotations image | Fabric.js 5.3 |
| Formulaires | react-hook-form 7.49 + zod 3.22 |
| DB locale (legacy) | Dexie 3.2 (IndexedDB navigateur) — **plus utilisée pour les données principales** |
| Backend cloud | Firebase (Firestore + Storage) |
| BaaS secondaire | Supabase (lecture seule, consommables gstock) |
| Hébergement images | ImgBB (API externe) |

**Mode de rendu** : SPA pure (100 % client-side rendering). Aucun SSR, aucun SSG. Vite compile en bundle statique.

**Build output** : `dist/` — fichiers statiques (HTML + JS + CSS + assets). Aucun runtime Node requis : un nginx suffit pour servir le front.

**Base path Vite** : `vite.config.ts:7` → `base: '/FichesTechniques/'`. À changer pour la migration (sera servi à la racine sur `ft.shadow.ajust82.fr`).

**`package.json` intégral** : voir fichier à la racine du repo (déjà présent).

### 1.2 Hébergement actuel

- **Front** : GitHub Pages, repo `FichesTechniques`, base path `/FichesTechniques/`. Pas de Vercel, pas de Netlify.
- **Features GitHub Pages utilisées** : aucune (pas d'edge functions, pas de rewrites, pas de headers custom). Juste du statique.
- **Domaine actuel** : `[user].github.io/FichesTechniques` (à confirmer Réda — pas de domaine custom détecté dans le repo).
- **TLS** : géré automatiquement par GitHub Pages.
- **Backend séparé** : non — tout le "backend" est Firebase et Supabase, appelés directement depuis le navigateur. Aucun serveur intermédiaire.

### 1.3 Backend / persistance — IDENTIFICATION

**Verdict : double backend, deux rôles distincts.**

#### Backend principal — Firebase (Firestore + Storage)

Preuve :
- `package.json:29` → `"firebase": "^12.5.0"` et `"firebase-tools": "^14.26.0"` (devDep)
- `src/lib/firebase.ts:1-31` : initialisation Firestore + Storage
- `src/lib/firestore.ts` : 672 lignes de CRUD complet (procedures, phases, tools, materials, categories, tags, templates, preferences)
- `src/hooks/useFirebase.ts` : hooks `onSnapshot` (temps réel) sur toutes les collections
- `src/hooks/useProcedures.ts:2` → `import { db } from '@/lib/firebase'`
- `src/services/procedureService.ts:1-10` → wrapping des appels Firestore
- `src/services/verificationRequestService.ts:1` → Firestore direct

**Base de données** : Firestore (NoSQL documentaire Google Cloud). Collections actives :

| Collection | Usage |
|---|---|
| `procedures` | Entité racine = un Article/procédure |
| `phases` | Lignes de gamme (relation `procedureId`) |
| `tools` | Outillothèque |
| `materials` | Matériaux |
| `categories` | Catégories procédures |
| `tags` | Tags |
| `templates` | Templates de procédures |
| `substepTemplates` | Templates de sous-étapes |
| `preferences` | Préférences utilisateur (1 document) |
| `history` | Historique (défini dans Dexie legacy, présence Firestore à confirmer) |
| `verification_requests` | Demandes de vérification (`src/services/verificationRequestService.ts:42`) |

**SDK client** : `firebase/firestore` + `firebase/storage` (SDK v9 modulaire). Appelé **directement depuis le navigateur** — aucune couche serveur.

**Auth** : **aucune authentification**. L'app est entièrement publique. Pas de `firebase/auth`, pas de login, pas de session. Tout Firestore est accessible sans token.

**Secrets Firebase exposés côté client** (`src/lib/firebase.ts:13-19`, `.env:5-11`) :

```
VITE_FIREBASE_API_KEY=AIzaSyDmnjA7AFMiLEyzYYD1m1Tg1UAioh-Xxjg
VITE_FIREBASE_PROJECT_ID=fichestechniques-cd97c
VITE_FIREBASE_STORAGE_BUCKET=fichestechniques-cd97c.firebasestorage.app
VITE_FIREBASE_APP_ID=1:479197498353:web:6463d33fe429df8c3f5250
```

> Ces clés sont normales côté Firebase web (protégées par les règles Firestore/Storage, pas par le secret en lui-même). À noter cependant : sans auth et sans règles Firestore strictes, n'importe qui avec ces clés peut lire/écrire toute la base. **Voir §6.**

**Storage Firebase** : bucket `fichestechniques-cd97c.firebasestorage.app`. Utilisé pour les images de couverture de procédures (`src/services/storageService.ts:61-63`). Selon `src/utils/imageMigration.ts`, une migration a déjà été faite depuis Firebase Storage vers ImgBB pour les images de phases/étapes — les images de couverture restent potentiellement sur Firebase Storage.

#### Backend secondaire — Supabase (lecture seule, gstock)

Preuve :
- `package.json:14` → `"@supabase/supabase-js": "^2.80.0"`
- `src/lib/supabase.ts:3-4` : `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
- `src/services/consumablesService.ts:1` → lecture des consommables (table `consommables`/`articles`/etc.)
- `src/services/supabaseService.ts:1` → lecture des `categories` et `storage_zones`

**Ce Supabase n'est PAS le backend de cette app** : c'est le Supabase de **gstock** (`jxymbulpvnzzysfcsxvw.supabase.co`). L'app Fiches Techniques y accède en **lecture seule** pour afficher les consommables et zones de stockage dans l'éditeur de phases.

**Clés Supabase exposées côté client** (`.env:19-20`) :
```
VITE_SUPABASE_URL=https://jxymbulpvnzzysfcsxvw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> C'est la clé anon du projet gstock. Elle est read-only par design Supabase (anon key). La migration doit prévoir un accès équivalent : soit une route de l'API gstock sur Shadow, soit une lecture directe du Postgres Néode si les tables sont partagées.

#### Base locale Dexie / IndexedDB

`src/db/database.ts:14` → commentaire "LEGACY - Firestore is now used". Dexie est encore importé dans `src/services/imageService.ts:2` pour stocker les blobs d'images **localement dans le navigateur** (avant upload ImgBB). Ce n'est pas une persistance serveur.

### 1.4 Schéma de données

**Architecture Firestore** (NoSQL, pas de schéma SQL). Les entités sont décrites via les types TypeScript (`src/types/index.ts`).

#### Hiérarchie Article → Gamme → Lignes de gamme

```
procedures (collection Firestore)
  └── id (string, auto Firestore)
      ├── reference (string?)    ← référence Article (ex: "ART001")
      ├── title (string)         ← désignation (alias de designation)
      ├── designation (string?)  ← nom descriptif
      ├── description (string)
      ├── category (string)      ← catégorie libre (pas un FK)
      ├── tags (string[])
      ├── status (ProcedureStatus enum)
      ├── priority (Priority enum)
      ├── riskLevel (RiskLevel enum)
      ├── versionString (string) ← "1.0", "1.1", "2.0"
      ├── changelog (VersionLog[])
      ├── defects (DefectItem[]) ← défauthèque, avec images ImgBB
      ├── coverImage (string?)   ← URL Firebase Storage ou ImgBB
      ├── globalTools (Tool[])
      ├── globalToolIds (string[])
      ├── globalMaterials (Material[])
      ├── phases (Phase[])       ← ATTENTION : stocké AUSSI dans collection phases
      ├── relatedProcedures (string[])
      ├── estimatedTotalTime (number)
      ├── viewCount, exportCount, validationScore, completionPercentage
      └── createdAt, updatedAt (Timestamp)

phases (collection Firestore séparée)
  └── id (string, auto Firestore)
      ├── procedureId (string)   ← FK vers procedures
      ├── order (number)         ← ordre de tri
      ├── phaseNumber (number?)  ← numéro personnalisable (10, 20, 30…)
      ├── title (string)
      ├── difficulty (DifficultyLevel enum)
      ├── estimatedTime (number)
      ├── riskLevel (RiskLevel enum)
      ├── numberOfPeople (number?)
      ├── requiredSkills (string[])
      ├── completed (boolean)
      ├── notes (string?)
      ├── steps (SubStep[])      ← tableau JSON inline dans le document
      │     └── SubStep {
      │           id, order, title, description,
      │           images (AnnotatedImage[]),   ← URLs ImgBB
      │           videos (Video[]),             ← URLs NAS local (voir §1.5)
      │           documents (StepDocument[]),   ← URLs NAS local
      │           estimatedTime,
      │           tools (StepTool[]),
      │           tips (string[]),
      │           safetyNotes (SafetyNote[])
      │         }
      └── createdAt, updatedAt (Timestamp)
```

**Point important — double stockage des phases** : les phases sont stockées à la fois dans `procedures.phases` (tableau inline) ET dans la collection `phases` séparée. `src/hooks/useProcedures.ts:34-46` charge les deux et fusionne. C'est une incohérence de modèle héritée de la migration Dexie → Firestore. À nettoyer lors du passage à Postgres.

**Référence Article** : le champ `procedures.reference` est une string libre (ex: "ART001"). **À confirmer Réda** : est-ce la même valeur que la référence Article dans TimeTonic/Notion ? Ce point est critique pour l'appariement avec l'app Atelier (§1.6).

**Numérotation des lignes de gamme** : `phases.phaseNumber` est un entier optionnel personnalisable. `phases.order` est l'ordre d'affichage. **À confirmer Réda** : `phaseNumber` correspond-il aux numéros 10/20/30 de la gamme Ajust, ou est-ce un numéro d'affichage libre ?

**Pas d'OF** : confirmé — l'app ne connaît aucun champ OF, aucune référence OF. Le contenu est bien au niveau gamme/ligne de gamme, partagé pour tous les OF d'un article.

**Versioning** : `versionString` (string "1.0") + `changelog` (array VersionLog) au niveau procedure. Pas de versioning par phase.

**Statuts procedure** : `draft | en_cours | verification | relecture | mise_a_jour_timetonic | in_review | completed | archived` (`src/types/index.ts:14-22`).

**Volumétrie** : à confirmer Réda (accès console Firebase). Estimation : dizaines à quelques centaines de procédures, quelques centaines de phases, quelques centaines à milliers d'images ImgBB.

**RLS** : aucune (Firebase, pas Supabase pour le stockage principal). Les règles Firestore sont à vérifier dans la console Firebase — probablement ouvertes (l'app n'a pas d'auth).

### 1.5 APIs externes et intégrations

#### ImgBB (hébergement d'images — section CRITIQUE)

**Clé API** : `VITE_IMGBB_API_KEY=c6ebf695eb71a0248ae4d9a0f0dda637`  
**⚠️ EXPOSÉE CÔTÉ CLIENT** (préfixe `VITE_`). Voir §6.

**Upload** (`src/services/imageHostingService.ts:152-205`) :
- `uploadImageToHost(file: File): Promise<string>` → appel `POST https://api.imgbb.com/1/upload` avec `key`, `image` (base64), `name`, `expiration=0` (permanent)
- La clé API est injectée directement dans le FormData côté navigateur
- Appelé depuis :
  - `src/pages/ProcedureEditor.tsx:7` (images de couverture)
  - `src/components/editor/PhaseItem.tsx:8` (images de phases/étapes)
  - `src/utils/imageMigration.ts:44` (outil de migration Firebase → ImgBB)

**Lecture** : les URLs ImgBB (`i.ibb.co/...`) sont stockées dans Firestore dans :
- `procedures.coverImage` (string) — certaines encore sur Firebase Storage (`firebasestorage.googleapis.com`)
- `phases.steps[n].images[n].image.url` (string)
- `procedures.defects[n].images[n].image.url` (string)

**Énumération exhaustive des images** : la DB Firestore est la source de vérité. Pour tout récupérer, il faut :
1. Lire toutes les `procedures` → extraire `coverImage`
2. Lire toutes les `phases` → extraire `steps[*].images[*].image.url` + `defects[*].images[*].image.url`
3. Filtrer les URLs `i.ibb.co/` ou `ibb.co/`

**⚠️ Pas d'API de listing ImgBB** (compte gratuit). La DB est la seule façon d'énumérer les images.

**Risque de perte** : ImgBB peut supprimer les images sur compte gratuit (purge inactive). **Les images doivent être sauvegardées AVANT toute bascule.**

**Autres services d'images** : Firebase Storage (`firebasestorage.googleapis.com`) pour les images de couverture non encore migrées. Aucun Cloudinary, aucun S3 détecté.

#### Vidéos et documents PDF

`src/components/editor/PhaseItem.tsx:15-16` :
```typescript
const NAS_VIDEO_BASE_KEY = 'fichestechniques_video_base_path';
const NAS_DOCUMENT_BASE_KEY = 'fichestechniques_document_base_path';
```

Les vidéos et PDF ne sont **pas stockés dans Firebase ni ImgBB** : leur chemin de base est configuré dans le `localStorage` du navigateur (clés `fichestechniques_video_base_path` et `fichestechniques_document_base_path`). Il s'agit vraisemblablement de chemins vers un NAS local Ajust'82.

**À confirmer Réda** : où sont physiquement les fichiers vidéo et PDF ? NAS local ? Partage réseau ? URL externe ? Ces fichiers devront être soit rapatriés sur le VPS, soit leur accès reconfigured.

`src/types/index.ts:200-205` : `StepDocument.url` = chemin du fichier PDF (string libre).

#### Supabase gstock

Appels en lecture seule vers `https://jxymbulpvnzzysfcsxvw.supabase.co` :
- `src/services/consumablesService.ts` : `SELECT * FROM consommables WHERE deleted_at IS NULL ORDER BY designation`
- `src/services/supabaseService.ts` : `SELECT * FROM categories`, `SELECT * FROM storage_zones`

Ces appels ont un fallback silencieux (retournent une map vide si erreur). Sur le VPS, ce Supabase sera à remplacer par une lecture directe du Postgres gstock (déjà sur Shadow).

#### Autres intégrations

- **Stripe** : aucun
- **Resend / email** : aucun
- **OpenAI** : aucun
- **Webhooks entrants** : aucun (front only)
- **Crons** : aucun

### 1.6 Exposition du contenu par Ligne de gamme (analyse fonctionnelle)

#### Comment l'app rend une fiche aujourd'hui

Routes (`src/App.tsx:40-44`) :
- `/` → Dashboard (liste des procédures)
- `/procedures/:id/edit` → `ProcedureEditor` (édition d'une procédure et de ses phases)
- `/procedures/new` → `ProcedureEditor` (création)
- `/tools` → bibliothèque d'outils
- `/templates` → templates
- `/verification-requests` → demandes de vérification

**Il n'existe aucune route de lecture/affichage d'une fiche par article ou par ligne de gamme.** L'app est un back-office de saisie, pas un portail de consultation. Il n'y a pas de vue `/fiche/:ref` ni `/fiche/:ref/:ligne`.

La `ProcedureEditor` affiche les phases (lignes de gamme) de la procédure ouverte : chaque `PhaseItem` correspond à une ligne de gamme. Les phases sont rendues en liste, toutes ensemble pour une procédure donnée.

#### Granularité de rendu/exposition cible

Bonne nouvelle : **les données sont déjà structurées par ligne de gamme** (collection `phases` avec `procedureId` + `phaseNumber`/`order`). Il n'y a pas d'obstacle de modèle — les lignes sont des documents Firestore distincts avec leur propre `id`.

Ce qui manque :
1. **Endpoint / route de lecture par `(refArticle, numLigne)`** — inexistant
2. **Vue front de consultation** (rendu de l'en-tête article + bloc ligne) — inexistante
3. **Validation que `reference` = ref Ajust et `phaseNumber` = numéro LdG** — à confirmer Réda (voir ci-dessous)

#### Clé d'appariement — point dur

L'appariement Atelier → Fiches Techniques nécessite :
- **Côté Atelier** : `refArticle` (ex: "ART001") + `numLigne` (ex: 20)
- **Côté Fiches Techniques** : `procedures.reference` + `phases.phaseNumber`

**À confirmer Réda (BLOQUANT)** :
1. `procedures.reference` est-il exactement la référence Article telle qu'elle existe dans TimeTonic/Notion ? Ou une valeur libre de saisie ? Y a-t-il un risque de casse ou d'espaces différents ?
2. `phases.phaseNumber` correspond-il aux numéros 10/20/30 de la gamme Ajust ? Ou est-ce un numéro séquentiel 1/2/3 ? En cas de numéro séquentiel, il faut un mapping.

Si les deux clés correspondent : le développement de l'endpoint est simple.

#### API/URL cible à exposer

```
GET /api/fiche/{refArticle}/{numLigne}
```

Réponse JSON :
```json
{
  "article": {
    "reference": "ART001",
    "designation": "...",
    "versionString": "1.2",
    "coverImageUrl": "https://ft.shadow.ajust82.fr/uploads/covers/..."
  },
  "ligne": {
    "phaseNumber": 20,
    "title": "Étape 20 — Montage",
    "difficulty": "medium",
    "estimatedTime": 30,
    "steps": [
      {
        "order": 1,
        "title": "...",
        "description": "...",
        "images": [{ "url": "https://ft.shadow.ajust82.fr/uploads/phases/...", "annotations": [...] }],
        "tools": [...]
      }
    ],
    "safetyNotes": [...],
    "defects": [...]
  }
}
```

Endpoint complémentaire pour l'en-tête article seul :
```
GET /api/fiche/{refArticle}
```

#### Effort de l'évolution (§1.6 → reverser en §3)

| Item | Effort |
|---|---|
| Route API backend `GET /api/fiche/:ref/:ligne` | ~4h |
| Route API backend `GET /api/fiche/:ref` (intro article) | ~2h |
| Vérification / normalisation clé `reference` + `phaseNumber` | ~2h (+ temps Réda pour valider les données) |
| Vue front optionnelle (si l'Atelier consomme du HTML plutôt que du JSON) | ~4h supplémentaires (non obligatoire si l'Atelier fait son propre rendu) |
| **Total** | **~8h (sans vue front)** |

---

## 2. Gap analysis : backend actuel → Postgres Néode

### 2.1 Accès DB

**Situation actuelle** : SDK Firebase v9 modulaire (`firebase/firestore`) appelé directement depuis le navigateur. Aucun serveur intermédiaire. Modèle NoSQL Firestore.

**Cible** : Postgres Néode, API backend entre le front et la DB.

**Migration NoSQL → Postgres** : effort **moyen à lourd**. Firestore est orienté document (les phases sont à la fois dans `procedures.phases` (inline) ET dans la collection `phases` séparée). La migration vers Postgres implique :
- Choisir UNE représentation (tables relationnelles)
- Supprimer le double stockage
- Réécrire tous les appels SDK (47+ appels directs Firestore dans `src/lib/firestore.ts` + hooks)

**Client DB recommandé** : `pg` (node-postgres), conforme à la convention gstock Shadow. Pas d'ORM — requêtes SQL directes dans un layer `src/api/db/`.

**Schéma Postgres cible proposé** :

```sql
-- Articles / Procédures
CREATE TABLE procedures (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference   TEXT,              -- référence Article (ex: "ART001")
  title       TEXT NOT NULL,
  designation TEXT,
  description TEXT,
  category    TEXT,
  tags        TEXT[],
  status      TEXT NOT NULL DEFAULT 'en_cours',
  priority    TEXT NOT NULL DEFAULT 'normal',
  risk_level  TEXT NOT NULL DEFAULT 'low',
  version_string TEXT DEFAULT '1.0',
  changelog   JSONB DEFAULT '[]',
  defects     JSONB DEFAULT '[]',   -- DefectItem[] avec images
  cover_image TEXT,                  -- URL locale VPS
  global_tools JSONB DEFAULT '[]',
  global_tool_ids TEXT[],
  global_materials JSONB DEFAULT '[]',
  related_procedures UUID[],
  estimated_total_time INT DEFAULT 0,
  total_cost  NUMERIC DEFAULT 0,
  view_count  INT DEFAULT 0,
  export_count INT DEFAULT 0,
  validation_score INT DEFAULT 0,
  completion_percentage INT DEFAULT 0,
  required_skills TEXT[],
  private_notes TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lignes de gamme (phases)
CREATE TABLE phases (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_id  UUID NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
  "order"       INT NOT NULL,
  phase_number  INT,             -- numéro 10/20/30 (à confirmer Réda)
  title         TEXT NOT NULL,
  difficulty    TEXT NOT NULL DEFAULT 'easy',
  estimated_time INT DEFAULT 0,
  risk_level    TEXT DEFAULT 'none',
  number_of_people INT,
  required_skills TEXT[],
  completed     BOOLEAN DEFAULT false,
  notes         TEXT,
  steps         JSONB DEFAULT '[]',  -- SubStep[] inline
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX phases_procedure_id_idx ON phases(procedure_id);

-- Outils
CREATE TABLE tools (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  category    TEXT,
  reference   TEXT,
  location    TEXT,
  color       TEXT,
  price       NUMERIC,
  purchase_link TEXT,
  image_url   TEXT,             -- URL locale VPS
  deleted     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Catégories (pour FT, indépendantes de gstock)
CREATE TABLE ft_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  color       TEXT,
  icon        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Templates de procédures
CREATE TABLE procedure_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  category    TEXT,
  icon        TEXT,
  default_phases JSONB DEFAULT '[]',
  default_tools  JSONB DEFAULT '[]',
  usage_count INT DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Templates de sous-étapes
CREATE TABLE substep_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  category    TEXT,
  sub_step    JSONB,
  usage_count INT DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Demandes de vérification
CREATE TABLE verification_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_id  UUID REFERENCES procedures(id) ON DELETE SET NULL,
  procedure_ref TEXT,
  procedure_name TEXT,
  phase         TEXT,
  step          TEXT,
  phase_index   INT,
  step_index    INT,
  element       TEXT,
  comment       TEXT,
  requester     TEXT,
  status        TEXT DEFAULT 'nouveau',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Préférences (1 ligne)
CREATE TABLE preferences (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme       TEXT DEFAULT 'dark',
  accent_color TEXT DEFAULT '#3b82f6',
  font_size   TEXT DEFAULT 'normal',
  density     TEXT DEFAULT 'normal',
  default_view TEXT DEFAULT 'grid',
  auto_save   BOOLEAN DEFAULT true,
  auto_save_interval INT DEFAULT 30,
  confirm_before_delete BOOLEAN DEFAULT true,
  default_pdf_config JSONB,
  keyboard_shortcuts JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Nombre d'appels SDK à refactoriser** : ~47 fonctions dans `src/lib/firestore.ts` + ~15 hooks dans `src/hooks/useFirebase.ts` + `src/hooks/useProcedures.ts` = **~65 points d'appel** à réécrire en `fetch` vers l'API backend.

**Temps réel** : Firestore `onSnapshot` est utilisé massivement (tous les hooks). Voir §2.4.

### 2.2 Auth

**Situation actuelle** : aucune authentification. L'app est entièrement ouverte.

**Recommandation pour la migration** : **Option B — auth interne à l'app, type badge/PIN**, cohérente avec gstock.

Justification : l'app est un back-office de saisie pour Réda (et quelques relecteurs). Un badge numérique suffit — pas besoin du SSO Microsoft Entra (Option A). Si les utilisateurs ont déjà un n° de badge dans gstock/Atelier, utiliser le même mécanisme.

**Implémentation minimale** : un endpoint `POST /api/auth/badge` qui vérifie le badge dans une table `users` locale (ou dans le Postgres gstock), émet un JWT signé (secret `APP_FT_JWT_SECRET`), stocké en cookie HttpOnly `SameSite=Strict domain=.shadow.ajust82.fr`.

**Note** : si l'API `/api/fiche/:ref/:ligne` doit être consommée par l'app Atelier, ce endpoint devra être accessible sans auth utilisateur (ou avec un token service-to-service `APP_FT_API_TOKEN`).

### 2.3 Storage

**Stratégie** : volume Docker local (`ft_uploads`) monté sur `/data/uploads` dans le conteneur, servi statiquement par nginx sur `https://ft.shadow.ajust82.fr/uploads/`.

**Arborescence cible** :
```
/data/uploads/
  covers/            ← images de couverture (depuis Firebase Storage + ImgBB)
  phases/            ← images de phases/étapes (depuis ImgBB)
  tools/             ← images d'outils
  videos/            ← vidéos (depuis NAS si rapatriées)
  documents/         ← PDF (depuis NAS si rapatriés)
```

**Rapatriement des images ImgBB** — stratégie complète :

1. **Export depuis Firestore** : script Node.js (à écrire, ~3h) qui :
   - Se connecte à Firebase Admin SDK (clé service account)
   - Lit toutes les `procedures` et `phases`
   - Extrait toutes les URLs `i.ibb.co/...` et `firebasestorage.googleapis.com/...`
   - Produit un fichier `images-to-migrate.json` avec `{ firestorePath, oldUrl, localPath }`

2. **Download** : script qui télécharge chaque image depuis ImgBB/Firebase Storage, la sauve dans `/data/uploads/{localPath}` avec un nom slugifié.

3. **Réécriture des URLs** : après download, script SQL UPDATE qui remplace les URLs dans la DB Postgres (`cover_image`, `steps[*].images[*].image.url` dans les JSONB).

4. **Refactor du code d'upload** (`src/services/imageHostingService.ts`) : remplacer l'appel `POST https://api.imgbb.com/1/upload` par un appel au backend `POST /api/uploads/image` qui reçoit le fichier via multipart, l'écrit sur `/data/uploads/phases/`, et retourne l'URL locale. Effort : ~3h.

**Politique d'accès** : images publiques (servies par nginx sans auth), car elles sont référencées depuis les PDF exportés et potentiellement depuis l'app Atelier.

**Firebase Storage** : utiliser Firebase Admin SDK pour lister et télécharger les images de couverture restantes.

**Volumétrie estimée** : à confirmer Réda. Estimation conservatrice : 500 images × 300 Ko moyenne = ~150 Mo. Si des vidéos sont rapatriées, la volumétrie peut exploser (prévoir 10+ Go).

### 2.4 Realtime

**Situation actuelle** : `onSnapshot` Firestore sur toutes les collections principales — temps réel côté client, sans polling.

**Impact migration** : fort. L'app est conçue autour du temps réel Firestore. Toutes les vues se mettent à jour automatiquement.

**Stratégie** :
- **Option simple (recommandée)** : remplacer `onSnapshot` par des appels REST `fetch` + revalidation manuelle après mutation. L'app est mono-utilisateur (Réda). Le temps réel multi-utilisateurs n'est pas critique.
- **Option avancée** : SSE (Server-Sent Events) depuis le backend Express sur un endpoint `/api/events`. À envisager uniquement si plusieurs rédacteurs travaillent simultanément.

**Recommandation** : polling basique ou revalidation après mutation. Effort de réécriture des hooks : ~8h (tous les `onSnapshot` → `useEffect` + `fetch`).

### 2.5 Edge Functions / Cloud Functions

Aucune Cloud Function ni Edge Function Firebase détectée. Tout le code est côté client.

---

## 3. Évolutions de code nécessaires AVANT migration

Liste ordonnée par priorité. Chaque item = fichiers impactés + effort.

- [ ] **[CRITIQUE] Changer le `base` Vite**  
  `vite.config.ts:7` → `base: '/'` (plus de sous-chemin `/FichesTechniques/`)  
  Fichiers : `vite.config.ts` — Trivial — ~15 min

- [ ] **[CRITIQUE] Créer la couche API backend**  
  Nouveau dossier `backend/` (ou `server/`) avec Express + routes REST.  
  Endpoints minimaux :
  - `GET /api/procedures` (liste avec filtres)
  - `GET /api/procedures/:id` (+ phases)
  - `POST /api/procedures`
  - `PUT /api/procedures/:id`
  - `DELETE /api/procedures/:id`
  - `POST /api/phases` / `PUT /api/phases/:id` / `DELETE /api/phases/:id`
  - `GET/POST/PUT/DELETE /api/tools`
  - `GET/POST/PUT/DELETE /api/templates`
  - `GET/POST/PUT/DELETE /api/substep-templates`
  - `GET/PUT /api/preferences`
  - `GET/POST/PUT/DELETE /api/verification-requests`
  - `GET /api/categories`
  - `GET /api/consumables` (proxy vers gstock Postgres)
  - `POST /api/uploads/image` (remplace ImgBB)
  - **`GET /api/fiche/:ref/:ligne`** (nouveau — §1.6)
  - **`GET /api/fiche/:ref`** (nouveau — §1.6)  
  Effort : **~30h** (lourd mais mécanique)

- [ ] **[CRITIQUE] Créer la couche DB `pg`**  
  Nouveau `backend/db/` : client `pg` + repositories (un par entité).  
  Remplace les ~65 appels Firestore SDK.  
  Effort : **~20h** (en parallèle avec l'API)

- [ ] **[CRITIQUE] Réécrire les hooks et services front**  
  Remplacer `onSnapshot` Firestore par des `fetch` vers l'API backend.  
  Fichiers impactés :
  - `src/hooks/useFirebase.ts` (toutes les fonctions → `fetch`)
  - `src/hooks/useProcedures.ts` (idem)
  - `src/services/procedureService.ts` (wrapping → `fetch`)
  - `src/services/verificationRequestService.ts` (→ `fetch`)
  - `src/services/supabaseService.ts` (→ `fetch /api/categories` + `/api/storage-zones`)
  - `src/services/consumablesService.ts` (→ `fetch /api/consumables`)  
  Effort : **~20h**

- [ ] **[CRITIQUE] Remplacer l'upload ImgBB par upload local**  
  `src/services/imageHostingService.ts` : supprimer l'appel `https://api.imgbb.com/1/upload`, le remplacer par `POST /api/uploads/image` (multipart).  
  Backend : recevoir le fichier, écrire sur `/data/uploads/phases/`, retourner l'URL locale.  
  Fichiers impactés : `imageHostingService.ts`, `PhaseItem.tsx:8`, `ProcedureEditor.tsx:7`  
  Effort : **~3h**

- [ ] **[CRITIQUE] Script d'export Firestore → JSON + download ImgBB**  
  Script Node.js standalone (Firebase Admin SDK) :
  1. Export Firestore complet → `firestore-export.json`
  2. Enumération de toutes les URLs ImgBB/Firebase Storage
  3. Download de toutes les images → `images/`  
  Effort : **~4h**

- [ ] **[CRITIQUE] Script d'import JSON → Postgres Néode**  
  Transformer `firestore-export.json` + réécrire les URLs images → INSERT Postgres.  
  Attention au double stockage `procedures.phases` vs collection `phases` (dédoublonner).  
  Effort : **~6h**

- [ ] **[CRITIQUE] Migrations SQL idempotentes**  
  Fichiers `backend/migrations/001_initial.sql`, etc. basés sur le schéma §2.1.  
  Effort : **~4h**

- [ ] **[IMPORTANT] Implémenter l'auth badge**  
  `backend/routes/auth.ts` : `POST /api/auth/badge` → JWT.  
  Front : page de login badge simple + intercepteur `fetch` avec token.  
  Effort : **~6h**

- [ ] **[IMPORTANT] Endpoint exposition par Ligne de gamme**  
  `backend/routes/fiche.ts` :
  - `GET /api/fiche/:ref/:ligne` → procedures JOIN phases WHERE reference = :ref AND phase_number = :ligne
  - `GET /api/fiche/:ref` → procedure par référence article  
  Vérification / normalisation de `reference` (casse, espaces).  
  Effort : **~6h** (dont 2h validation données avec Réda)

- [ ] **[IMPORTANT] Externaliser les URLs hardcodées et clés**  
  Retirer les fallbacks en dur dans :
  - `src/lib/firebase.ts:14-19` → pures variables d'env (supprimer les `|| "YOUR_..."`)
  - `src/lib/supabase.ts:3-4` → idem
  - `src/services/imageHostingService.ts:10` → plus de clé ImgBB (supprimé)  
  Effort : **~1h**

- [ ] **[IMPORTANT] Dockerfile multi-stage**  
  Build front Vite dans stage 1, backend Express dans stage 2, nginx dans stage final (pattern gstock).  
  Effort : **~4h**

- [ ] **[MOYEN] Gérer les vidéos / documents NAS**  
  Clarifier avec Réda le stockage actuel (voir §1.5). Si les vidéos/PDF doivent être sur le VPS : ajouter un endpoint `POST /api/uploads/video` + `POST /api/uploads/document` + volume Docker dédié.  
  Effort : **~4h** (si rapatriement décidé) ou **~1h** (si accès NAS conservé avec URL reconfigurée)

- [ ] **[MOYEN] CORS + cookies**  
  Backend Express : `cors({ origin: 'https://ft.shadow.ajust82.fr', credentials: true })`.  
  Cookie JWT : `domain=.shadow.ajust82.fr`, `SameSite=Strict`, `Secure`, `HttpOnly`.  
  Effort : **~1h**

- [ ] **[MINEUR] Headers de sécurité**  
  Nginx : `X-Frame-Options`, `X-Content-Type-Options`, `Content-Security-Policy` (sans GitHub Pages).  
  Effort : **~1h**

- [ ] **[MINEUR] Nettoyer le double stockage phases**  
  Dans le script d'import : ne pas importer `procedures.phases` (tableau inline) — toutes les phases viennent de la collection `phases` séparée.  
  Dans le front après migration : supprimer le tableau `procedures.phases` inline.  
  Effort : **~2h**

**Total estimé : ~110h** (développement pur, hors validation Réda et temps Néode infra)

---

## 4. Déploiement cible

### 4.1 Dockerfile proposé

```dockerfile
# ─── Stage 1 : Build front Vite ───────────────────────────────────────────
FROM node:20-alpine AS front-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# base path à la racine pour la prod
RUN sed -i "s|base: '/FichesTechniques/'|base: '/'|" vite.config.ts || true
RUN npm run build          # output → /app/dist

# ─── Stage 2 : Build backend Express ──────────────────────────────────────
FROM node:20-alpine AS back-builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend/ .
RUN npm run build          # compile TS → /app/dist (ou tsc)

# ─── Stage 3 : Image finale nginx + node ──────────────────────────────────
FROM node:20-alpine AS final

# nginx
RUN apk add --no-cache nginx supervisor

# Utilisateur non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Front statique
COPY --from=front-builder /app/dist /usr/share/nginx/html

# Backend
COPY --from=back-builder /app/dist ./backend
COPY backend/package*.json ./
RUN npm ci --production

# Config nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Supervisord pour piloter nginx + node
COPY supervisord.conf /etc/supervisor/conf.d/app.conf

RUN mkdir -p /data/uploads && chown -R appuser:appgroup /data

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s \
  CMD wget -qO- http://localhost/api/health || exit 1

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/app.conf"]
```

**Justification** :
- Node:20-alpine → image légère (~150 Mo final estimé)
- Multi-stage : le bundle front est séparé du backend
- nginx sert le front statique + proxifie `/api` vers le backend Node (port interne 3001)
- nginx sert `/uploads` vers `/data/uploads` (volume monté)
- Supervisord minimal (pattern gstock) pour gérer les deux processus
- Utilisateur non-root pour le répertoire uploads

**nginx.conf (extrait)** :
```nginx
location / { root /usr/share/nginx/html; try_files $uri /index.html; }
location /api/ { proxy_pass http://127.0.0.1:3001/; }
location /uploads/ { alias /data/uploads/; }
```

### 4.2 Variables d'environnement de production

| Nom | Rôle | Obligatoire | Exemple | Fichier:ligne |
|---|---|---|---|---|
| `APP_FT_DATABASE_URL` | URL Postgres Néode | Oui | `postgres://ft_user:xxx@postgres:5432/app_ft` | `backend/db/client.ts` |
| `APP_FT_JWT_SECRET` | Secret signature JWT auth | Oui | `changeme-prod-64chars` | `backend/routes/auth.ts` |
| `APP_FT_API_TOKEN` | Token service-to-service (Atelier → FT) | Recommandé | `Bearer xxx` | `backend/middleware/auth.ts` |
| `APP_FT_PORT` | Port écoute backend Express | Non (défaut 3001) | `3001` | `backend/index.ts` |
| `APP_FT_UPLOADS_PATH` | Chemin local uploads | Non (défaut `/data/uploads`) | `/data/uploads` | `backend/routes/uploads.ts` |
| `APP_FT_UPLOADS_URL` | URL publique uploads | Oui | `https://ft.shadow.ajust82.fr/uploads` | `backend/routes/uploads.ts` |
| `APP_FT_GSTOCK_DB_URL` | URL Postgres gstock (pour consommables) | Recommandé | `postgres://gstock_ro:xxx@postgres:5432/gstock` | `backend/routes/consumables.ts` |
| `VITE_APP_FT_API_URL` | URL API backend (front) | Oui (build) | `https://ft.shadow.ajust82.fr/api` | `src/lib/api.ts` (à créer) |

**Clés à NE PLUS utiliser après migration** :
- `VITE_FIREBASE_*` → supprimées
- `VITE_IMGBB_API_KEY` → supprimée
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` → supprimées

### 4.3 Connexion Postgres Néode

`pg` (node-postgres) accepte nativement `DATABASE_URL=postgres://user:pass@postgres:5432/app_ft`. Le container `postgres` est résolu par DNS Docker sur le réseau `neode`. Aucun problème.

```typescript
// backend/db/client.ts
import { Pool } from 'pg';
export const pool = new Pool({ connectionString: process.env.APP_FT_DATABASE_URL });
```

### 4.4 Persistance hors DB

| Volume Docker | Monté sur | Contenu | Taille estimée |
|---|---|---|---|
| `ft_uploads` | `/data/uploads` | Images phases/couvertures, outils | ~200 Mo (images seules) |
| `ft_uploads` | `/data/uploads/videos` | Vidéos (si rapatriées) | ~5-50 Go (à confirmer Réda) |
| `ft_uploads` | `/data/uploads/documents` | PDF (si rapatriés) | ~500 Mo (à confirmer) |

**`docker-compose` extrait (à fournir à Néode)** :
```yaml
volumes:
  ft_uploads:
    driver: local

services:
  app-ft:
    image: ghcr.io/neode-cedric/app-ft-shadow:latest
    volumes:
      - ft_uploads:/data/uploads
    networks:
      - neode
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app-ft.rule=Host(`ft.shadow.ajust82.fr`)"
      - "traefik.http.routers.app-ft.tls.certresolver=letsencrypt"
    environment:
      - APP_FT_DATABASE_URL=postgres://ft_user:${FT_DB_PASS}@postgres:5432/app_ft
      # ...

networks:
  neode:
    external: true
```

---

## 5. Plan de migration des données

### Export Firestore

**Outil** : Firebase Admin SDK (Node.js) avec clé service account (à télécharger depuis la console Firebase → Paramètres projet → Comptes de service → Générer une nouvelle clé privée).

**Script d'export** (à écrire dans `scripts/export-firestore.js`) :
```
node export-firestore.js
→ firestore-export.json (toutes les collections)
→ images-list.json (toutes les URLs ImgBB / Firebase Storage)
```

Collections à exporter : `procedures`, `phases`, `tools`, `materials`, `categories`, `tags`, `templates`, `substepTemplates`, `preferences`, `verification_requests`.

### Export des images ImgBB + Firebase Storage

**Script** (`scripts/download-images.js`) :
1. Lire `images-list.json`
2. Pour chaque URL `i.ibb.co/...` : `fetch(url)` → sauvegarder dans `images-download/phases/`
3. Pour chaque URL `firebasestorage.googleapis.com/...` : utiliser Firebase Admin Storage SDK → download dans `images-download/covers/`
4. Générer `images-mapping.json` : `{ oldUrl: "https://i.ibb.co/...", localPath: "phases/filename.jpg" }`

**Durée estimée** selon volumétrie (à confirmer) : ~30 min pour 500 images, ~2h pour 5000 images.

**⚠️ Sauvegarder AVANT toute bascule** — risque de purge ImgBB sur compte gratuit.

### Import Postgres Néode

**Script** (`scripts/import-postgres.js`) :
1. Lire `firestore-export.json`
2. Transformer les documents Firestore → lignes SQL (UUIDs, Timestamps, JSONB)
3. Appliquer `images-mapping.json` : réécrire toutes les URLs `i.ibb.co/...` → `https://ft.shadow.ajust82.fr/uploads/phases/...`
4. INSERT dans Postgres via `pg`

**Transformations nécessaires** :
- IDs Firestore (strings alphanumériques) → UUIDs Postgres (générer des UUIDs à partir des IDs Firestore, maintenir un mapping)
- Timestamps Firestore (`{ _seconds, _nanoseconds }`) → `TIMESTAMPTZ`
- Dédoublonner `procedures.phases` vs collection `phases` (garder uniquement la collection `phases`)
- `procedures.category` (string libre) → à mapper vers `ft_categories.id` si on normalise (ou garder en string)

**Transfert sur Shadow** :
1. Exporter le bundle : `tar -czf ft-migration.tar.gz firestore-export.json images-download/`
2. SFTP vers Shadow (user `ft-migration` à demander à Néode)
3. `psql -U ft_user -d app_ft < migrations/001_initial.sql`
4. `node import-postgres.js`
5. `rsync images-download/ /data/uploads/` (ou copie directe sur le volume Docker)

### Stratégie de bascule

**Big bang** (comme gstock) : l'app est utilisée par Réda seul (ou très peu d'utilisateurs), pas de saisie continue de production.

1. **J-1 soir** : export Firestore + download images ImgBB/Firebase Storage → bundle SFTP sur Shadow
2. **J matin** : arrêt de l'accès en écriture (mode lecture seule, ou simple info utilisateurs)
3. **J matin** : import Postgres + copie images sur volume
4. **J matin** : déploiement image Docker sur Shadow, test smoke (dashboard, édition, upload image)
5. **J matin** : mise à jour DNS vers `ft.shadow.ajust82.fr`
6. Rollback : si problème, pointer le DNS vers GitHub Pages (toujours actif) — Firestore n'est pas modifié pendant la bascule

**Durée estimée bascule** : 2-3h.

---

## 6. Risques et points durs

### ⚠️ SÉCURITÉ — Secrets exposés côté client

1. **`VITE_IMGBB_API_KEY=c6ebf695eb71a0248ae4d9a0f0dda637`** (`.env:16`, `src/services/imageHostingService.ts:10`)  
   **Exposé en clair dans le bundle JS côté navigateur.** N'importe qui peut uploader des images sur le compte ImgBB de Réda avec cette clé. Limite de quotas et risque d'abus.  
   **Correction** : supprimer cette clé entièrement après migration (l'upload passe par le backend).

2. **`VITE_SUPABASE_ANON_KEY`** (`.env:20`) + clé anon Supabase gstock exposée côté client.  
   C'est la clé anon du projet gstock. Elle permet de lire (et potentiellement écrire selon les RLS) les tables de gstock directement depuis le navigateur.  
   **À confirmer** : les RLS Supabase gstock autorisent-elles l'écriture depuis la clé anon ? Si oui, risque de pollution des données gstock.  
   **Correction** : après migration, l'accès aux consommables passe par l'API backend FT → plus d'exposition côté client.

3. **Firebase config exposée côté client** (`.env:5-11`, `src/lib/firebase.ts:13-19`).  
   Normal pour Firebase web apps, **mais** : sans authentification Firebase et sans règles Firestore restrictives, n'importe qui connaissant ces clés peut lire ET écrire toute la base Firestore (procedures, phases, etc.).  
   **Vérifier immédiatement** dans la console Firebase (Firestore → Rules) que les règles ne sont pas en mode `allow read, write: if true` ouvert.

### Risques de perte de données

4. **Images ImgBB sur compte gratuit** : ImgBB peut purger les images inactives sans préavis. **Sauvegarder IMPÉRATIVEMENT l'intégralité des images avant toute bascule.** Pas d'API de listing ImgBB → la DB Firestore est la seule source d'énumération des URLs.

5. **Images Firebase Storage** : les images de couverture non encore migrées vers ImgBB (celles contenant `firebasestorage.googleapis.com` dans `coverImage`) doivent aussi être téléchargées. Le script `src/utils/imageMigration.ts` montre qu'une migration partielle a eu lieu — vérifier si elle est complète.

### Risques techniques

6. **Double stockage phases** (`procedures.phases` inline vs collection `phases` séparée) : l'import Postgres doit dédoublonner. Si les deux sources divergent (une phase mise à jour dans l'une mais pas l'autre), choisir la collection `phases` comme source de vérité (plus fraîche selon `useProcedures.ts:34-46`).

7. **Clé d'appariement Atelier** : si `procedures.reference` n'est pas la vraie référence Article Ajust ou si `phases.phaseNumber` ne correspond pas aux numéros 10/20/30 de la gamme, l'endpoint `GET /api/fiche/:ref/:ligne` ne pourra pas être utilisé par l'Atelier. **Ce point doit être validé par Réda avant de coder l'endpoint.**

8. **Perte du temps réel Firestore** : tous les hooks utilisent `onSnapshot`. Après migration vers REST, l'auto-refresh disparaît. Pour un back-office mono-utilisateur c'est acceptable, mais à valider avec Réda.

9. **Vidéos et PDF sur NAS** : leur stockage actuel n'est pas sur Firebase ni ImgBB — chemin configuré en `localStorage` navigateur. Ce cas n'est pas résolu par la migration Firestore → Postgres. Si les vidéos/PDF doivent être accessibles depuis le VPS (et depuis l'app Atelier), un plan de rapatriement dédié est nécessaire. **À confirmer Réda.**

10. **`base: '/FichesTechniques/'` dans vite.config.ts** : tous les assets et routes front sont préfixés. À changer impérativement (`base: '/'`) avant le build de l'image Docker, sinon l'app sera cassée à la racine.

11. **`firebase-tools` en devDependency** (`package.json:48`) : à ne pas inclure dans l'image Docker de prod. Géré par le multi-stage Dockerfile (seul `npm ci --production` dans le stage final).

---

## 7. Checklist finale

| # | Étape | Owner | Dépend de |
|---|---|---|---|
| 1 | Valider avec Réda : `procedures.reference` = ref Article Ajust ? `phases.phaseNumber` = numéro LdG 10/20/30 ? | Réda | — |
| 2 | Valider avec Réda : où sont les vidéos et PDF (NAS ? URL ?) | Réda | — |
| 3 | Vérifier les règles Firestore dans la console Firebase (ouvertes ?) | Réda | — |
| 4 | Télécharger la clé service account Firebase Admin (console Firebase) | Réda | — |
| 5 | Écrire et tester le script `export-firestore.js` + `download-images.js` | Claude+Réda | 4 |
| 6 | Exécuter l'export complet + download images → sauvegarder **AVANT tout** | Réda | 5 |
| 7 | Modifier `vite.config.ts` : `base: '/'` | Claude+Réda | — |
| 8 | Créer le backend Express (`backend/`) + couche `pg` + migrations SQL | Claude+Réda | 1, 2 |
| 9 | Réécrire les hooks/services front (Firebase → fetch API) | Claude+Réda | 8 |
| 10 | Remplacer l'upload ImgBB par l'endpoint upload local | Claude+Réda | 8 |
| 11 | Implémenter auth badge (backend + front) | Claude+Réda | 8 |
| 12 | Créer les endpoints `GET /api/fiche/:ref/:ligne` + `GET /api/fiche/:ref` | Claude+Réda | 1, 8 |
| 13 | Écrire le script `import-postgres.js` (Firestore JSON → Postgres + réécriture URLs images) | Claude+Réda | 5, 8 |
| 14 | Créer le Dockerfile multi-stage + nginx.conf + supervisord.conf | Claude+Réda | 8 |
| 15 | Build et test local de l'image Docker | Claude+Réda | 7-14 |
| 16 | Demander à Néode : création DB `app_ft` sur Postgres Shadow + user `ft_user` + user `ft-migration` SFTP | Réda → Néode | — |
| 17 | Demander à Néode : création repo GHCR `ghcr.io/neode-cedric/app-ft-shadow` + droits push | Réda → Néode | — |
| 18 | Demander à Néode : entrée DNS `ft.shadow.ajust82.fr` + config Traefik | Réda → Néode | — |
| 19 | J-1 soir : export Firestore final + SFTP bundle sur Shadow | Réda | 6, 16 |
| 20 | J matin : `psql` migrations SQL sur Postgres Shadow | Réda/Néode | 16, 19 |
| 21 | J matin : `node import-postgres.js` + copie images vers volume `ft_uploads` | Réda/Néode | 13, 19, 20 |
| 22 | J matin : `docker pull` + démarrage conteneur sur Shadow | Néode | 15, 17, 20 |
| 23 | J matin : smoke tests (dashboard, édition procédure, upload image, export PDF) | Réda | 22 |
| 24 | J matin : bascule DNS → `ft.shadow.ajust82.fr` | Réda/Néode | 23 |
| 25 | J+7 : vérifier que GitHub Pages n'est plus nécessaire (désactiver si OK) | Réda | 24 |
| 26 | Désactiver le projet Firebase (ou restreindre les règles Firestore) | Réda | 24 |
| 27 | Révoquer / archiver la clé ImgBB (plus utilisée) | Réda | 24 |

---

*Fin de l'analyse. Document à relire par Cédric avant de déclencher le plan d'action de migration effective.*
