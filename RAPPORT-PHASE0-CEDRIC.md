# Rapport Phase 0 — App Fiches Techniques → VPS Shadow Néode
**Date :** 2026-06-09  
**Pour :** Cédric HAUVUY (Néode)  
**De :** Réda (Ajust'82) + Claude Code

---

## Ce qui a été fait

### 1. Analyse technique complète (`MIGRATION-NEODE.md`)

Analyse approfondie du code source produite en amont. Points clés retenus :

- **Stack** : SPA Vite/React/TypeScript, 100 % statique — un nginx suffit en prod.
- **Backend actuel** : Firebase (Firestore + Storage) comme base principale. Supabase en lecture seule pour les consommables de gstock.
- **Images** : hébergées sur ImgBB (service tiers gratuit, compte actif). Clé API exposée côté client — risque de purge sur compte gratuit → **sauvegarde prioritaire**.
- **Auth** : aucune. L'app est entièrement publique.
- **Hébergement actuel** : GitHub Pages, base path `/FichesTechniques/`.

---

### 2. Sauvegarde des données (scripts prêts, à exécuter)

Deux scripts Node.js ont été écrits dans `scripts/` :

| Script | Rôle |
|---|---|
| `scripts/export-firestore.mjs` | Export complet de Firestore → `backup/firestore-export.json` |
| `scripts/download-images.mjs` | Télécharge toutes les images (ImgBB + Firebase Storage) → `backup/images/` + `backup/images-mapping.json` |

**Ces scripts s'exécutent en local** (nécessitent la clé service account Firebase). L'archive résultante `backup/ft-backup-AAAA-MM-JJ.tar.gz` sera transférée sur Shadow via SFTP (user `ft-migration` à créer côté Néode).

> La sauvegarde est une copie froide — elle ne sera pas servie par l'app. C'est une sécurité contre la perte de données ImgBB (compte gratuit, pas d'API de listing, risque de purge).

---

### 3. Packaging Docker (prêt)

| Fichier | Contenu |
|---|---|
| `Dockerfile` | Multi-stage : `node:20-alpine` (build Vite) → `nginx:1.27-alpine` (image finale). Build-args pour tous les `VITE_*`. Healthcheck `/health`. Utilisateur non-root. |
| `nginx.conf` | Fallback SPA (`try_files $uri /index.html`), gzip, cache assets, `location = /health`. |
| `.dockerignore` | Exclut `node_modules`, `backup/`, `.env`, `serviceAccount.json`. |

**L'image est 100 % statique** : nginx sert le `dist/` Vite. Pas de backend, pas de volume, pas de Postgres. L'app continue d'appeler Firebase/ImgBB/Supabase directement depuis le navigateur, exactement comme aujourd'hui.

---

### 4. CI/CD GHCR (prêt)

Workflow `.github/workflows/build-and-push.yml` :
- Déclenché sur push `main`
- Build l'image Docker avec les `VITE_*` injectés depuis les secrets GitHub
- Push vers `ghcr.io/neode-cedric/app-ft-shadow` avec tags `:latest` + `:sha-<long>` + labels OCI standards
- Compatible avec le bouton **"Mettre à jour"** de neode-app (lecture du label `org.opencontainers.image.revision`)

---

### 5. Corrections de base path

| Fichier | Modification |
|---|---|
| `vite.config.ts` | `base: '/FichesTechniques/'` → `base: '/'` |
| `src/main.tsx` | `<BrowserRouter basename="/FichesTechniques">` → `<BrowserRouter>` |
| `public/404.html` | Hack GitHub Pages supprimé → simple `meta refresh → /` |

---

## Ce qu'il reste à faire

### Réda (opérationnel)

1. `git pull` (branche locale en retard de 3 commits)
2. Télécharger `serviceAccount.json` depuis la console Firebase (Paramètres → Comptes de service)
3. Exécuter les scripts de sauvegarde **depuis un dossier local hors Google Drive** :
   ```bash
   # Cloner dans un dossier local (Google Drive bloque npm)
   git clone https://github.com/neode-cedric/app-ft-shadow.git C:\Dev\app-ft-shadow
   cd C:\Dev\app-ft-shadow\scripts
   npm install
   node export-firestore.mjs
   node download-images.mjs
   ```
4. Créer l'archive et la transférer sur Shadow (SFTP → `/data/ft-backup/`)
5. Configurer les **10 secrets GitHub** dans `neode-cedric/app-ft-shadow` (Settings → Secrets → Actions) — voir tableau ci-dessous
6. Commiter et pousser vers le repo Néode :
   ```bash
   git remote add neode https://github.com/neode-cedric/app-ft-shadow.git
   git push neode main
   ```

**Secrets GitHub à configurer :**

| Secret | Source (depuis `.env` local) |
|---|---|
| `VITE_FIREBASE_API_KEY` | `.env` ligne 5 |
| `VITE_FIREBASE_AUTH_DOMAIN` | `.env` ligne 6 |
| `VITE_FIREBASE_PROJECT_ID` | `.env` ligne 7 |
| `VITE_FIREBASE_STORAGE_BUCKET` | `.env` ligne 8 |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `.env` ligne 9 |
| `VITE_FIREBASE_APP_ID` | `.env` ligne 10 |
| `VITE_FIREBASE_MEASUREMENT_ID` | `.env` ligne 11 |
| `VITE_IMGBB_API_KEY` | `.env` ligne 16 |
| `VITE_SUPABASE_URL` | `.env` ligne 19 |
| `VITE_SUPABASE_ANON_KEY` | `.env` ligne 20 |

---

### Néode (infra Shadow)

| Action | Détail |
|---|---|
| **DNS** | Entrée A `ft.shadow.ajust82.fr` → IP Shadow (comme gstock) |
| **docker-compose** | Ajouter le service `app-ft` (voir extrait ci-dessous) |
| **SFTP** | User `ft-migration` + dossier `/data/ft-backup/` pour la sauvegarde |
| **neode-app config** | Activer `ft` dans `a82/config.json` (`enabled: true`) |

**Extrait `docker-compose` à ajouter sur Shadow :**
```yaml
  app-ft:
    image: ghcr.io/neode-cedric/app-ft-shadow:latest
    restart: unless-stopped
    networks:
      - neode
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app-ft.rule=Host(`ft.shadow.ajust82.fr`)"
      - "traefik.http.routers.app-ft.entrypoints=websecure"
      - "traefik.http.routers.app-ft.tls.certresolver=letsencrypt"
      - "traefik.http.services.app-ft.loadbalancer.server.port=80"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

> Pas de `volumes:`, pas de `environment:`, pas de Postgres. L'image est autonome.

---

## Points d'attention

### ⚠️ Feature Consommables (Supabase gstock)
L'app lit le Supabase `jxymbulpvnzzysfcsxvw.supabase.co` — c'est l'**ancien Supabase de gstock**, destiné à être mis en pause depuis la migration gstock → Postgres Shadow.

Si ce Supabase est déjà en pause : la liste de consommables dans l'éditeur de phases sera **silencieusement vide** (le code a un fallback sans erreur visible). L'app reste fonctionnelle pour tout le reste.

Remappé vers `app_gstock` (Postgres Shadow) en **Phase 2** — rien à faire en Phase 0.

### ⚠️ Règles Firestore
L'app n'a aucune authentification. À vérifier dans la console Firebase (Firestore → Rules) : si les règles sont en `allow read, write: if true`, n'importe qui avec les clés publiques peut lire et écrire toute la base. À corriger en Phase 2 lors de l'ajout de l'auth.

### ℹ️ npm install sur Google Drive
`npm install` échoue sur Google Drive (Windows) — incompatibilité fichiers système. Sans impact sur le CI (runner Ubuntu). Pour les scripts de sauvegarde, cloner le repo dans `C:\Dev\` (hors Google Drive).

---

## Phase 2 — Aperçu (pour mémoire)

Ce sera fait **directement sur l'instance hébergée sur le VPS**, après validation de la Phase 0 :

- Migration Firestore → Postgres Néode (`app_ft`)
- Rapatriement des images ImgBB → volume local `/data/uploads`
- Ajout authentification badge (cohérent avec gstock + Atelier)
- Endpoint `GET /api/fiche/{refArticle}/{numLigne}` pour l'intégration app Atelier (Sprint 5 / IO12)
- Reroutage consommables → Postgres gstock Shadow

Effort estimé Phase 2 : **~110h** (détaillé dans `MIGRATION-NEODE.md` §3).
