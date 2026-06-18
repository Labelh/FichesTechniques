# Instructions — app Fiches Techniques (Réda / Ajust'82)

Application cliente de Réda (Ajust'82), hébergée sur le VPS Shadow.

## Règle JOURNAL.md — OBLIGATOIRE

À **chaque modification visible par l'utilisateur**, ajouter une entrée dans `JOURNAL.md` (racine du repo) **avant le commit** :

- **Français clair, sans jargon** : pas de noms de librairies, de fichiers, ni de termes techniques (« ImgBB », « Firestore », « CORS », « onSnapshot »… interdits). On décrit **ce que ça change pour l'utilisateur**.
- Une puce = un changement, formulé côté usage (« Vos images sont… », « L'affichage de… »).
- Regrouper sous la **date du jour** (`## JJ mois AAAA`), entrées les plus récentes **en haut**.
- Destinataire = **Réda, utilisateur non technicien**. Calquer le ton des entrées existantes.

Les changements **purement internes** (refactor, CI/CD, infra, dépendances) ne nécessitent **pas** d'entrée.

Un hook `pre-commit` (`.githooks/pre-commit`) bloque un commit qui touche `src/` sans `JOURNAL.md` :
- changement visible → ajouter l'entrée puis recommiter ;
- changement interne → `git commit --no-verify`.

**Activation du hook après un clone** (une fois) : `git config core.hooksPath .githooks`

## Déploiement

Push sur `main` → build image GHCR (`ghcr.io/neode-cedric/app-ft-shadow:latest`) → sur le VPS Shadow :
`cd /opt/neode && docker compose pull app-ft && docker compose up -d app-ft`.
