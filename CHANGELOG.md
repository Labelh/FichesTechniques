# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

## [1.0.0] - 2025-01-08

### ✨ Ajouté

#### Gestion des Procédures
- Création, modification, suppression de procédures
- Organisation par phases
- Niveaux de difficulté (6 niveaux : très facile à expert)
- Statuts (brouillon, en cours, en révision, terminée, archivée)
- Catégorisation avec 6 catégories prédéfinies
- Système de tags
- Estimation du temps par phase et total
- Nombre de personnes requis
- Duplication de procédures
- Score de validation automatique (0-100%)
- Pourcentage de complétion

#### Interface Utilisateur
- Dashboard avec vue d'ensemble
- Statistiques en temps réel (total, en cours, terminées, temps estimé)
- 3 modes d'affichage : grille, liste, kanban
- Recherche full-text (titre, description, tags)
- Filtres avancés (statut, difficulté, catégorie)
- Tri personnalisable
- Thème clair/sombre/auto avec persistance
- Interface responsive (mobile, tablette, desktop)
- Sidebar avec navigation et statistiques
- Header avec actions rapides
- Notifications toast (succès, erreur)

#### Pages
- Dashboard : Vue d'ensemble des procédures
- Éditeur : Création/modification de procédures
- Vue Procédure : Affichage détaillé d'une procédure
- Paramètres : Configuration et export de données
- Bibliothèque d'outils (placeholder)
- Templates (placeholder)

#### Base de Données
- Stockage local avec IndexedDB via Dexie.js
- Schéma complet pour procédures, phases, outils, matériaux
- Export complet en JSON
- Import de données (à venir)
- Réinitialisation de la base de données
- Initialisation automatique avec catégories prédéfinies

#### Architecture
- React 18 avec TypeScript
- Vite pour le build ultra-rapide
- React Router pour la navigation
- Zustand pour le state management
- TailwindCSS pour le styling
- Lucide React pour les icônes
- Composants UI réutilisables (Button, Card, Badge, Input)

#### Développement
- Configuration TypeScript stricte
- ESLint configuré
- Structure de dossiers claire et organisée
- Types TypeScript complets
- Hooks personnalisés pour la base de données
- Services métier séparés
- Utilitaires (formatage dates, durées, prix)

### 📝 Documentation
- README complet avec guide d'utilisation
- QUICKSTART pour démarrage rapide
- CHANGELOG pour suivi des versions
- Commentaires dans le code

### 🎨 Design
- Palette de couleurs cohérente
- Mode sombre complet
- Animations et transitions fluides
- Icônes cohérentes
- Badges de statut et difficulté colorés
- Layout responsive

---

## [À Venir] - Version 1.5

### 🎯 Prévu

#### Annotations d'Images
- Intégration de Fabric.js
- Outils d'annotation (flèches, rectangles, cercles, texte)
- Numérotation visuelle
- Calques d'annotations
- Palette de couleurs
- Zones de zoom

#### Export PDF
- Génération PDF avec jsPDF
- Page de garde
- Table des matières
- Index des outils
- Mise en page professionnelle

#### Bibliothèque d'Outils
- CRUD complet
- Catégorisation
- Images et descriptions
- Prix et liens d'achat
- Gestion des consommables

#### Templates
- Bibliothèque de templates prédéfinis
- Création de templates personnalisés
- Templates par domaine (électricité, plomberie, etc.)

---

## [À Venir] - Version 2.0

### 🚀 Fonctionnalités Majeures

- Historique et versioning des procédures
- Comparaison de versions
- Sous-étapes détaillées
- Notes de sécurité enrichies
- Conseils et astuces par phase
- Erreurs courantes à éviter
- Glossaire technique
- Mode présentation (diaporama)
- Import de données JSON
- Export en Markdown et HTML

---

## [À Venir] - Version 3.0

### 🌟 Fonctionnalités Avancées

- Application PWA (Progressive Web App)
- Mode hors ligne complet
- Synchronisation cloud optionnelle
- Collaboration multi-utilisateurs
- Application mobile
- Impression directe
- Reconnaissance vocale pour la dictée
- Scanner de QR codes pour liens rapides

---

## Notes de Version

### Migration depuis une version précédente

Actuellement en version 1.0.0, aucune migration n'est nécessaire.

### Compatibilité Navigateurs

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Exigences Système

- Node.js 18+
- 100 MB d'espace disque
- Navigateur moderne avec support IndexedDB
