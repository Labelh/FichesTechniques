# Fiches Techniques

Application web de création et génération de procédures techniques en PDF.

## 🎯 Fonctionnalités

### ✅ Fonctionnalités Implémentées (v1.0)

#### Gestion des Procédures
- ✅ Création, modification, suppression de procédures
- ✅ Organisation par phases avec étapes détaillées
- ✅ Niveaux de difficulté (très facile à expert)
- ✅ Statuts (brouillon, en cours, en révision, terminée, archivée)
- ✅ Catégorisation et tags
- ✅ Estimation du temps et nombre de personnes
- ✅ Duplication de procédures
- ✅ Score de validation automatique

#### Interface Utilisateur
- ✅ Dashboard avec statistiques
- ✅ Vues multiples : grille, liste, kanban
- ✅ Recherche full-text
- ✅ Filtres avancés (statut, difficulté, catégorie)
- ✅ Tri personnalisable
- ✅ Mode sombre/clair/auto
- ✅ Interface responsive
- ✅ Sidebar avec navigation

#### Base de Données Locale
- ✅ Stockage local avec IndexedDB (Dexie.js)
- ✅ Aucune connexion internet requise
- ✅ Export/Import des données en JSON
- ✅ Réinitialisation de la base de données
- ✅ Catégories prédéfinies

#### Gestion des Outils et Matériaux
- ✅ Modèles de données pour outils et matériaux
- ✅ Association aux phases
- ✅ Bibliothèque réutilisable

### 🚧 Fonctionnalités À Venir (v2.0+)

#### Annotations d'Images
- ⏳ Éditeur d'annotations avec Fabric.js
- ⏳ Flèches, rectangles, cercles, texte
- ⏳ Numérotation visuelle
- ⏳ Calques d'annotations
- ⏳ Zones de zoom
- ⏳ Palette de couleurs personnalisable

#### Export PDF Avancé
- ⏳ Génération PDF avec jsPDF
- ⏳ Templates personnalisables
- ⏳ Page de garde
- ⏳ Table des matières
- ⏳ Index des outils
- ⏳ En-tête et pied de page personnalisés
- ⏳ Watermark

#### Templates de Procédures
- ⏳ Bibliothèque de templates
- ⏳ Création de templates personnalisés
- ⏳ Procédures prédéfinies par domaine

#### Bibliothèque d'Outils Complète
- ⏳ CRUD complet pour les outils
- ⏳ Catégorisation des outils
- ⏳ Images et descriptions détaillées
- ⏳ Gestion des consommables
- ⏳ Prix et liens d'achat

#### Fonctionnalités Avancées
- ⏳ Historique et versioning
- ⏳ Comparaison de versions
- ⏳ Sous-étapes détaillées
- ⏳ Notes de sécurité
- ⏳ Conseils et astuces
- ⏳ Erreurs courantes à éviter
- ⏳ Glossaire technique
- ⏳ Mode présentation (diaporama)

## 🛠️ Stack Technique

### Frontend
- **React 18** - Framework UI
- **TypeScript** - Typage statique
- **Vite** - Build tool ultra-rapide
- **React Router** - Navigation
- **TailwindCSS** - Styles utilitaires
- **Lucide React** - Icônes

### État et Données
- **Zustand** - State management
- **Dexie.js** - Wrapper IndexedDB
- **React Hooks** - Gestion des effets

### Utilitaires
- **date-fns** - Manipulation de dates
- **clsx** - Classes conditionnelles
- **sonner** - Notifications toast
- **react-hook-form** - Formulaires
- **zod** - Validation de schémas

### À Venir
- **Fabric.js** - Annotations d'images
- **jsPDF** - Génération PDF
- **html2canvas** - Capture d'écran pour PDF

## 📦 Installation

### Prérequis
- Node.js 18+
- npm ou yarn

### Installation

```bash
# Cloner le projet (si Git initialisé)
git clone <url>
cd FichesTechniques

# Installer les dépendances
npm install

# Lancer en développement
npm run dev

# Build pour production
npm run build

# Prévisualiser le build
npm run preview
```

L'application sera accessible sur `http://localhost:5173`

## 📁 Structure du Projet

```
FichesTechniques/
├── public/                 # Fichiers statiques
├── src/
│   ├── assets/            # Images, icônes
│   ├── components/        # Composants React
│   │   ├── ui/           # Composants UI de base
│   │   ├── layout/       # Layout (Header, Sidebar)
│   │   ├── dashboard/    # Composants du dashboard
│   │   ├── editor/       # Composants de l'éditeur
│   │   └── common/       # Composants communs
│   ├── pages/            # Pages de l'application
│   │   ├── Dashboard.tsx
│   │   ├── ProcedureEditor.tsx
│   │   ├── ProcedureView.tsx
│   │   ├── ToolsLibrary.tsx
│   │   ├── Templates.tsx
│   │   └── Settings.tsx
│   ├── hooks/            # Custom React hooks
│   │   ├── useProcedures.ts
│   │   └── useDatabase.ts
│   ├── store/            # State management (Zustand)
│   │   └── useAppStore.ts
│   ├── db/               # Configuration base de données
│   │   └── database.ts
│   ├── types/            # Types TypeScript
│   │   └── index.ts
│   ├── services/         # Services métier
│   │   └── procedureService.ts
│   ├── lib/              # Utilitaires
│   │   └── utils.ts
│   ├── styles/           # Styles globaux
│   │   └── globals.css
│   ├── App.tsx           # Point d'entrée routing
│   └── main.tsx          # Point d'entrée React
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

## 🎨 Guide d'Utilisation

### Créer une Procédure

1. Cliquez sur **"Nouvelle Procédure"** dans la sidebar
2. Remplissez les informations de base :
   - Titre (requis)
   - Description
   - Catégorie
   - Difficulté
   - Nombre de personnes
3. Cliquez sur **"Sauvegarder"**
4. Ajoutez des phases avec **"Ajouter une phase"**

### Organiser les Procédures

**Vue Grille** : Cartes visuelles avec aperçu rapide
**Vue Liste** : Tableau détaillé avec toutes les colonnes
**Vue Kanban** : Organisation par colonnes de statut

### Rechercher et Filtrer

- **Barre de recherche** : Recherche dans titre, description, tags
- **Filtres** : Par statut, difficulté, catégorie
- **Tri** : Par titre, date, difficulté, etc.

### Thème

Basculez entre 3 modes :
- **Clair** : Fond blanc
- **Sombre** : Fond noir
- **Auto** : Suit les préférences système

### Export/Import

**Export** :
- Paramètres → "Exporter"
- Sauvegarde toutes les données en JSON

**Import** :
- À venir dans la prochaine version

## 🗄️ Données

### Stockage Local

Toutes les données sont stockées localement dans votre navigateur via **IndexedDB**.

**Avantages** :
- ✅ Aucune connexion internet requise
- ✅ Données privées (ne quittent jamais votre ordinateur)
- ✅ Rapide et performant
- ✅ Capacité de stockage importante

**Limitations** :
- ⚠️ Les données sont liées au navigateur
- ⚠️ Effacer les données du navigateur supprime tout
- ⚠️ Non synchronisé entre appareils

**Recommandation** : Exportez régulièrement vos données en JSON comme sauvegarde !

### Catégories Prédéfinies

À l'initialisation, 6 catégories sont créées :
- ⚡ Électricité
- 🚰 Plomberie
- 🪚 Menuiserie
- 🎨 Peinture
- 🧱 Maçonnerie
- 🌱 Jardinage

## 🔧 Développement

### Commandes Disponibles

```bash
# Développement avec hot-reload
npm run dev

# Build de production
npm run build

# Prévisualiser le build
npm run preview

# Linter
npm run lint
```

### Ajout de Nouvelles Fonctionnalités

1. **Nouveau type** : Ajouter dans `src/types/index.ts`
2. **Nouveau service** : Créer dans `src/services/`
3. **Nouveau hook** : Créer dans `src/hooks/`
4. **Nouveau composant** : Créer dans `src/components/`
5. **Nouvelle page** : Créer dans `src/pages/` et ajouter route dans `App.tsx`

### Base de Données

Pour modifier le schéma :

1. Éditer `src/db/database.ts`
2. Incrémenter le numéro de version
3. Ajouter une migration si nécessaire

```typescript
this.version(2).stores({
  // Nouveau schéma
}).upgrade(tx => {
  // Migration depuis v1
});
```

## 🎯 Roadmap

### Version 1.5 (Prochaine)
- [ ] Éditeur d'annotations d'images (Fabric.js)
- [ ] Export PDF basique
- [ ] Bibliothèque d'outils complète
- [ ] Templates de procédures

### Version 2.0
- [ ] Export PDF avancé avec templates
- [ ] Historique et versioning
- [ ] Sous-étapes détaillées
- [ ] Import de données
- [ ] Mode présentation

### Version 3.0
- [ ] Collaboration (optionnel)
- [ ] Synchronisation cloud (optionnel)
- [ ] Application mobile (PWA)
- [ ] Impression directe

## 🤝 Contribution

Ce projet est personnel, mais les suggestions sont les bienvenues !

## 📄 Licence

Propriétaire - Tous droits réservés

## 👤 Auteur

Créé avec ❤️ pour faciliter la création de procédures techniques

---

**Version** : 1.0.0
**Date** : 2025
**Technologie** : React + TypeScript + Vite
