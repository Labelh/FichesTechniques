# app-ft-api-shadow

API **lecture seule** des fiches techniques Ajust'82 (app FT de Réda, Firestore). Sert la **page Opérateur** de l'Atelier : pour une opération donnée (réf article + n° de phase), renvoie le contenu de la phase **si** la fiche est au statut `completed`.

Servi derrière Traefik en `PathPrefix(/ft-api)` sur `shadow.ajust82.fr` (même origine que l'Atelier → pas de CORS, le token SSO `atelier` passe).

## Pourquoi un cache

Le projet Firebase de l'app FT est sur le plan **Spark** (gratuit) : quota de lectures journalier limité, **régulièrement épuisé par l'app FT elle-même** (listeners temps réel). On ne peut donc pas requêter Firestore à chaque chargement de la page Opérateur.

→ Le service maintient un **cache snapshot persistant** (`/data/ft_cache.json`) :
- rebuild **paresseux** (TTL 6 h par défaut) + `POST /ft-api/refresh` manuel ;
- un rebuild qui échoue (quota épuisé) **ne casse rien** : on continue de servir le dernier cache connu ;
- 1 rebuild = 1 lecture groupée (procédures `completed` + toutes les phases).

À fiabiliser : passer le projet Firebase en **Blaze** (supprime le cap dur, dépassement facturé en centimes) ou accélérer la cible « Gestion des articles » (Postgres) qui sort FT de Firebase.

## Endpoints

| Méthode | Route | Auth | Rôle |
|---|---|---|---|
| GET | `/ft-api/health` | non | état + âge du cache |
| GET | `/ft-api/operation?ref=&phase=` | Bearer SSO `atelier` | contenu d'une opération (ou `{found:false}` → fallback PDF) |
| GET | `/ft-api/articles` | Bearer SSO `atelier` | debug : refs indexées |
| POST | `/ft-api/refresh` | `X-Refresh-Token` | force un rebuild du cache |

Réponse `/operation` : `{found:true, procedure, phase:{phaseNumber,title,steps:[{title,description,images,tools,…}]}}`
ou `{found:false, reason:'no_procedure'|'no_phase'}` → l'Atelier bascule sur les PDF Condor / Fiche d'Instruction (TimeTonic).

## Déploiement

Image GHCR `ghcr.io/neode-cedric/app-ft-api-shadow:latest` (CI sur push `main`). Voir `compose.snippet.yml` à fusionner dans `/opt/neode/docker-compose.yml`. Prérequis VPS : `/opt/neode/secrets/ft-serviceAccount.json` + `SSO_TOKEN_SECRET` & `FT_API_REFRESH_TOKEN` dans `/opt/neode/.env`.

## Dev local

```
cp .env.example .env   # renseigner GOOGLE_APPLICATION_CREDENTIALS, SSO_TOKEN_SECRET
npm install
node --env-file=.env server.js
```
