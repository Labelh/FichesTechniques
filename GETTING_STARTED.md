# Guide de Démarrage - FichesTechniques

## 🚀 Démarrage Rapide

### Prérequis
- Node.js 18+ installé
- npm ou yarn
- Compte Firebase (gratuit)

### Installation

```bash
# Les dépendances sont déjà installées
# Si besoin, réinstallez avec :
npm install

# Configurer Firebase (voir section ci-dessous)
cp .env.example .env
# Modifiez .env avec vos credentials Firebase

# Lancer l'application en mode développement
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

## 🔥 Configuration Firebase

### 1. Créer un Projet Firebase

1. Allez sur https://console.firebase.google.com/
2. Cliquez sur "Ajouter un projet"
3. Donnez un nom à votre projet (ex: "fiches-techniques")
4. Suivez les étapes de création

### 2. Activer Firestore et Storage

1. Dans votre projet Firebase, allez dans "Firestore Database"
2. Cliquez sur "Créer une base de données"
3. Choisissez "Commencer en mode test" (vous pourrez sécuriser plus tard)
4. Sélectionnez votre région

5. Allez dans "Storage"
6. Cliquez sur "Commencer"
7. Acceptez les règles par défaut

### 3. Obtenir les Credentials

1. Dans Firebase Console, cliquez sur l'icône ⚙️ (Paramètres)
2. Allez dans "Paramètres du projet"
3. Faites défiler jusqu'à "Vos applications"
4. Cliquez sur l'icône Web `</>`
5. Donnez un nom à votre app (ex: "FichesTech Web")
6. Copiez les credentials affichés

### 4. Remplir le fichier .env

Créez un fichier `.env` à la racine du projet et remplissez-le avec vos credentials :

```env
VITE_FIREBASE_API_KEY=votre_api_key
VITE_FIREBASE_AUTH_DOMAIN=votre_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=votre_project_id
VITE_FIREBASE_STORAGE_BUCKET=votre_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=votre_sender_id
VITE_FIREBASE_APP_ID=votre_app_id
```

## 📋 Commandes Disponibles

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

## 🎨 Nouveau Design Appliqué

L'application utilise maintenant le design system de **GestionDesStocks** :

- **Couleur principale**: Orange vif `rgb(249, 55, 5)`
- **Thème sombre** avec background `#1f1f1f`
- **Sidebar** redesignée avec header et footer
- **Cards** avec effet hover lift
- **Buttons** et **Inputs** harmonisés
- **Status badges** colorés
- **Tables** interactives

### Consulter la Documentation Design

- **DESIGN_GUIDE.md** - Guide complet du design system
- **DESIGN_CHANGES.md** - Liste des changements appliqués

## 🏗️ Structure du Projet

```
FichesTechniques/
├── src/
│   ├── components/        # Composants React
│   │   ├── ui/           # Composants UI de base
│   │   ├── layout/       # Layout (Header, Sidebar)
│   │   ├── dashboard/    # Composants du dashboard
│   │   └── editor/       # Composants de l'éditeur
│   ├── pages/            # Pages de l'application
│   ├── styles/           # Styles globaux
│   │   ├── variables.css          # Variables CSS
│   │   ├── custom-bootstrap.scss  # Bootstrap personnalisé
│   │   └── globals.css            # Styles globaux
│   ├── hooks/            # Custom React hooks
│   ├── store/            # State management (Zustand)
│   ├── db/               # Configuration Firebase
│   └── types/            # Types TypeScript
├── public/               # Fichiers statiques
├── DESIGN_GUIDE.md       # Guide du design system
├── DESIGN_CHANGES.md     # Changements appliqués
└── package.json
```

## 🎯 Fonctionnalités Principales

### Gestion des Procédures
- Création, modification, suppression
- Organisation par phases avec étapes
- Niveaux de difficulté (très facile à expert)
- Statuts (brouillon, en cours, en révision, terminée, archivée)
- Catégorisation et tags

### Interface Utilisateur
- Dashboard avec statistiques
- Vues multiples : grille, liste, kanban
- Recherche full-text
- Filtres avancés
- Mode sombre/clair/auto
- Interface responsive

### Base de Données
- Stockage en ligne avec Firebase Firestore
- Synchronisation en temps réel
- Stockage des images avec Firebase Storage

## 🎨 Utiliser le Design System

### Variables CSS

```css
.mon-element {
  background: var(--bg-color);
  color: var(--text-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
}
```

### Composants Bootstrap

```jsx
// Boutons
<button className="btn btn-primary">Primaire</button>
<button className="btn btn-secondary">Secondaire</button>

// Cards
<div className="card">
  <div className="card-header">Titre</div>
  <div className="card-body">Contenu</div>
</div>

// Stat Cards
<div className="stat-card">
  <h3>Total</h3>
  <p className="stat-value">42</p>
</div>

// Status Badges
<span className="status-badge terminée">Terminée</span>
<span className="status-badge en-cours">En cours</span>
```

### Forms

```jsx
<form className="product-form">
  <div className="form-section">
    <h2 className="form-section-title">Informations</h2>
    <div className="form-row">
      <div className="form-group">
        <label>Titre</label>
        <input type="text" />
      </div>
    </div>
  </div>
  <div className="form-actions">
    <button type="button" className="btn btn-secondary">Annuler</button>
    <button type="submit" className="btn btn-primary">Enregistrer</button>
  </div>
</form>
```

## 🐛 Résolution de Problèmes

### Le build échoue
```bash
# Nettoyer node_modules et réinstaller
rm -rf node_modules package-lock.json
npm install
```

### Erreur Firebase
- Vérifiez que le fichier `.env` existe et contient les bonnes credentials
- Vérifiez que Firestore et Storage sont activés dans Firebase Console
- Vérifiez que les règles de sécurité permettent la lecture/écriture (mode test)

### Port 5173 déjà utilisé
```bash
# Utiliser un autre port
npm run dev -- --port 3000
```

## 📚 Ressources

- **Documentation React**: https://react.dev/
- **Documentation Vite**: https://vitejs.dev/
- **Documentation Firebase**: https://firebase.google.com/docs
- **Documentation Bootstrap**: https://getbootstrap.com/
- **Documentation TypeScript**: https://www.typescriptlang.org/

## 🤝 Support

Pour toute question ou problème :
1. Consultez le fichier **DESIGN_GUIDE.md** pour le design
2. Consultez le fichier **README.md** pour les fonctionnalités
3. Consultez le fichier **FIREBASE_SETUP.md** pour Firebase

## 📝 Prochaines Étapes

1. ✅ Projet cloné et dépendances installées
2. ✅ Design harmonisé avec GestionDesStocks
3. ⏳ Configurer Firebase (voir section ci-dessus)
4. ⏳ Lancer l'application avec `npm run dev`
5. ⏳ Créer votre première procédure technique

---

**Bon développement !** 🚀
