# Phase 0 — Instructions opérationnelles

> Document d'accompagnement pour Réda et Néode.  
> Complète `MIGRATION-NEODE.md` (analyse) pour la Phase 0 uniquement.

---

## A. Ce que Réda doit faire — dans cet ordre

### A1. Sauvegarde des données (PRIORITÉ ABSOLUE)

**1. Télécharger la clé service account Firebase**
- Aller sur https://console.firebase.google.com/
- Projet `fichestechniques-cd97c` → Paramètres projet (⚙️) → Comptes de service
- Cliquer **"Générer une nouvelle clé privée"** → télécharger le fichier `.json`
- Le renommer `serviceAccount.json` et le déposer à la **racine du repo**
- ⚠️ **Ne jamais committer ce fichier** (il est dans `.gitignore`)

**2. Installer les dépendances des scripts**
```bash
cd scripts
npm install
cd ..
```

**3. Exporter Firestore**
```bash
cd scripts
node export-firestore.mjs
# → backup/firestore-export.json
```
Vérifier : le script affiche le nombre de documents par collection.

**4. Télécharger toutes les images**
```bash
node download-images.mjs
# → backup/images/ (sous-dossiers covers/, phases/, defects/, tools/)
# → backup/images-mapping.json
```
Vérifier : le script affiche le nombre d'images et le volume total.

**5. Créer l'archive**
```bash
cd ..
tar -czf backup/ft-backup-$(date +%Y-%m-%d).tar.gz \
  -C backup \
  firestore-export.json \
  images/ \
  images-mapping.json
```
(Sur Windows, utiliser 7-Zip ou WSL)

**6. Transférer sur Shadow (une fois le user SFTP créé par Néode)**
```bash
sftp ft-migration@<ip-shadow>
> put backup/ft-backup-XXXX-XX-XX.tar.gz /data/ft-backup/
> quit
```

### A2. Vérification des règles Firestore

- Console Firebase → Firestore Database → **Rules**
- Vérifier que les règles ne sont **pas** en mode complètement ouvert :
  ```
  allow read, write: if true;   ← DANGEREUX si c'est ça
  ```
- Signaler à Cédric si les règles sont ouvertes (ne pas corriger pour l'instant).

### A3. Configurer les secrets GitHub pour le CI

Dans le repo `neode-cedric/app-ft-shadow` (après push) :
- Settings → Secrets and variables → Actions → **New repository secret**
- Créer un secret pour chaque variable (copier les valeurs depuis le `.env` local) :

| Nom du secret | Valeur (depuis .env) |
|---|---|
| `VITE_FIREBASE_API_KEY` | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `fichestechniques-cd97c.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `fichestechniques-cd97c` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `fichestechniques-cd97c.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `479197498353` |
| `VITE_FIREBASE_APP_ID` | `1:479197...` |
| `VITE_FIREBASE_MEASUREMENT_ID` | `G-98QERT...` |
| `VITE_IMGBB_API_KEY` | `c6ebf695...` |
| `VITE_SUPABASE_URL` | `https://jxymbu...supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` |

### A4. Pousser vers le repo Néode

```bash
# (dans le repo FichesTechniques)
git remote add neode https://github.com/neode-cedric/app-ft-shadow.git
git push neode main
```

Une fois poussé, le workflow `.github/workflows/build-and-push.yml` se déclenche automatiquement et construit + pousse l'image vers `ghcr.io/neode-cedric/app-ft-shadow:latest`.

---

## B. Ce que Néode doit faire

| Tâche | Détail |
|---|---|
| Repo GHCR | `neode-cedric/app-ft-shadow` — repo GitHub privé déjà créé ✓. Activer les packages (Settings → Packages) pour que GHCR soit disponible. |
| DNS | Entrée A `ft.shadow.ajust82.fr` → IP du VPS Shadow (comme pour gstock) |
| docker-compose | Ajouter le service `app-ft` (voir extrait ci-dessous) |
| SFTP | Créer user `ft-migration` + dossier `/data/ft-backup/` pour recevoir la sauvegarde |
| neode-app config | Activer `ft` dans `a82/config.json` (`enabled: true`) pour le bouton "Mettre à jour" |

**Extrait docker-compose à ajouter sur Shadow :**
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

> Pas de volume uploads, pas de Postgres, pas de variables d'env runtime :
> l'app est 100 % statique, toutes les clés sont baked dans l'image au build.

---

## C. Note sur la feature Consommables (Supabase gstock)

L'app lit le Supabase `jxymbulpvnzzysfcsxvw.supabase.co` — c'est l'ancien Supabase de gstock,
destiné à être mis en pause depuis la migration gstock → Postgres Shadow.

**À vérifier** : tester si la page "Outils" / sélecteur de consommables dans l'éditeur de phases
fonctionne encore ou retourne des erreurs. Si le Supabase gstock est déjà en pause, cette feature
sera silencieusement désactivée (le code a un fallback qui retourne une liste vide sans erreur visible).

Ce sera repointé vers `app_gstock` (Postgres Shadow) en Phase 2 — rien à faire en Phase 0.
