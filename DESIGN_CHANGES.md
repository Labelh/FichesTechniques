# Changements de Design - FichesTechniques

Ce document récapitule tous les changements appliqués pour harmoniser le design de **FichesTechniques** avec celui de **GestionDesStocks**.

## 📋 Résumé des Modifications

L'application FichesTechniques a été entièrement redessinée pour adopter le système de design de GestionDesStocks, offrant ainsi une cohérence visuelle entre les deux projets.

## 🎨 Changements Principaux

### 1. Palette de Couleurs

#### Avant
- Primary: `#ff6b35` (orange)
- Background: `#0a0a0a` (noir profond)
- Variables diverses et incohérentes

#### Après (Harmonisé avec GestionDesStocks)
- **Primary/Accent**: `rgb(249, 55, 5)` - Orange vif
- **Background**: `#1f1f1f` - Gris foncé
- **Hover Background**: `#303030`
- **Text Primary**: `#f1f5f9`
- **Text Secondary**: `#808080`
- **Border**: `rgba(148, 163, 184, 0.1)` et `#3a3a3a`

### 2. Sidebar (Navigation)

#### Modifications du Composant (`src/components/layout/Sidebar.tsx`)

**Header Ajouté**:
- Logo avec icône SVG (cube 3D)
- Titre "FichesTech" en blanc
- Sous-titre "Ajust'82" en orange accent
- Bordure inférieure subtile

**Navigation Links**:
- État normal: Texte gris avec transparence
- État hover: Background gris clair + texte blanc
- État active: Background orange + texte blanc
- Icônes de 20px
- Badges de notification en orange

**Footer**:
- Avatar circulaire avec initiale "U"
- Background orange
- Nom d'utilisateur et rôle affichés
- Style identique à GestionDesStocks

**Dimensions**:
- Width: `260px` (au lieu de 256px)
- Background: `#1f1f1f` (au lieu de rgba)
- Border: `rgba(255, 255, 255, 0.1)`

### 3. Système de Variables CSS

**Nouveau fichier créé**: `src/styles/variables.css`

Contient toutes les variables CSS du design system :
- Couleurs (primary, status, backgrounds, text, borders)
- Espacements (xs, sm, md, lg, xl)
- Border radius (sm, default, md, lg)
- Font sizes et weights
- Transitions et shadows
- Z-index

### 4. Bootstrap Personnalisé

**Fichier modifié**: `src/styles/custom-bootstrap.scss`

#### Variables SCSS Mises à Jour
```scss
$primary: rgb(249, 55, 5);
$body-bg: #1f1f1f;
$body-color: #f1f5f9;
$input-bg: #1f1f1f;
$card-bg: #1f1f1f;
$border-radius: 8px;
$card-border-radius: 12px;
```

#### Nouveaux Styles de Boutons
- Focus state avec box-shadow orange
- Hover avec translateY(-1px)
- Transitions fluides

#### Nouveaux Styles d'Inputs
- Background #1f1f1f
- Border rgba(148, 163, 184, 0.1)
- Focus avec glow orange
- Placeholder gris

### 5. Cards & Stat Cards

**Fichier modifié**: `src/styles/custom-bootstrap.scss`

```scss
.card {
  background: #1f1f1f;
  border-radius: 12px;
  border: 1px solid #3a3a3a;
  &:hover {
    transform: translateY(-4px);
  }
}

.stat-card {
  background: #1f1f1f;
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid #3a3a3a;
}
```

### 6. Status Badges

**Nouveaux styles ajoutés**:
```scss
.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  background-color: transparent;
}
```

**Couleurs par Statut**:
- Terminée/Normal: `#10b981` (vert)
- En cours/Low: `#f59e0b` (ambre)
- Brouillon/Critical: `#ef4444` (rouge)
- En révision/Pending: `#3b82f6` (bleu)
- Archivée: `#808080` (gris)

### 7. Tables

**Styles harmonisés**:
- Header avec background `#1f1f1f`
- Text uppercase et gris `#808080`
- Row hover avec background `#303030`
- Bordures subtiles `rgba(148, 163, 184, 0.1)`

### 8. Forms

**Fichier modifié**: `src/styles/globals.css`

**Nouveaux composants ajoutés**:
- `.form-section` - Sections de formulaire
- `.form-section-title` - Titres de section
- `.form-row` - Grille responsive pour les champs
- `.form-group` - Groupes label + input
- `.form-actions` - Actions en bas de formulaire
- `.error-text` - Messages d'erreur

**Styles d'Input**:
- Focus state avec border orange et glow
- État disabled avec background gris
- Classe `.error` pour les champs invalides

### 9. Layouts & Grids

**Stats Grid**:
```css
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}
```

**Form Row**:
```css
.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}
```

## 📁 Fichiers Modifiés

### Fichiers Créés
1. ✅ `src/styles/variables.css` - Variables CSS globales
2. ✅ `DESIGN_GUIDE.md` - Guide de design complet
3. ✅ `DESIGN_CHANGES.md` - Ce document

### Fichiers Modifiés
1. ✅ `src/styles/custom-bootstrap.scss` - Personnalisation Bootstrap
2. ✅ `src/styles/globals.css` - Styles globaux
3. ✅ `src/components/layout/Sidebar.tsx` - Composant Sidebar

### Fichiers Inchangés
- `src/components/ui/Button.tsx` - Utilise déjà Bootstrap
- `src/components/ui/Card.tsx` - Utilise déjà Bootstrap
- `src/components/ui/Badge.tsx` - Utilise déjà Bootstrap
- `src/components/ui/Input.tsx` - Utilise déjà Bootstrap

## 🎯 Cohérence avec GestionDesStocks

### Éléments Identiques
- ✅ Couleur accent: `rgb(249, 55, 5)`
- ✅ Background principal: `#1f1f1f`
- ✅ Border radius des cards: `12px`
- ✅ Border radius des boutons: `8px`
- ✅ Sidebar width: `260px`
- ✅ Hover effects (translateY)
- ✅ Focus states avec glow orange
- ✅ Typography (Nunito Sans, weights, sizes)
- ✅ Spacing system
- ✅ Status colors
- ✅ Table styles
- ✅ Badge styles

### Design Patterns Appliqués
- ✅ Stat cards avec hover lift
- ✅ Navigation links avec états hover/active
- ✅ Form sections avec titres
- ✅ Form rows en grid responsive
- ✅ Status badges colorés
- ✅ Tables avec hover sur les lignes
- ✅ Inputs avec focus glow
- ✅ Cards avec border subtile

## 🚀 Comment Utiliser

### 1. Utiliser les Variables CSS
```css
.mon-composant {
  background: var(--bg-color);
  color: var(--text-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
}
```

### 2. Utiliser les Classes Bootstrap Personnalisées
```jsx
<button className="btn btn-primary">Mon Bouton</button>
<div className="card">
  <div className="card-header">Header</div>
  <div className="card-body">Content</div>
</div>
```

### 3. Utiliser les Stat Cards
```jsx
<div className="stats-grid">
  <div className="stat-card">
    <h3>Total Procédures</h3>
    <p className="stat-value">42</p>
  </div>
</div>
```

### 4. Utiliser les Status Badges
```jsx
<span className="status-badge terminée">Terminée</span>
<span className="status-badge en-cours">En cours</span>
<span className="status-badge brouillon">Brouillon</span>
```

### 5. Utiliser les Forms
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

## 📊 Avant / Après

### Sidebar
| Élément | Avant | Après |
|---------|-------|-------|
| Width | 256px | 260px |
| Background | rgba(18, 18, 18, 0.98) | #1f1f1f |
| Header | Absent | Logo + Titre + Sous-titre |
| Active state | bg-primary | rgb(249, 55, 5) |
| Badge color | Variable | rgb(249, 55, 5) |
| Footer | Version simple | Avatar + User info |

### Cards
| Élément | Avant | Après |
|---------|-------|-------|
| Background | rgba(31, 41, 55, 0.3) | #1f1f1f |
| Border | rgba(75, 85, 99, 0.3) | #3a3a3a |
| Border radius | 8px | 12px |
| Hover | box-shadow | translateY(-4px) |

### Buttons
| Élément | Avant | Après |
|---------|-------|-------|
| Primary color | #ff6b35 | rgb(249, 55, 5) |
| Focus shadow | rgba(255, 107, 53, 0.1) | rgba(249, 55, 5, 0.1) |
| Hover | translateY(-1px) | translateY(-1px) |

### Inputs
| Élément | Avant | Après |
|---------|-------|-------|
| Background | rgba(31, 41, 55, 0.5) | #1f1f1f |
| Border | rgba(75, 85, 99, 0.5) | rgba(148, 163, 184, 0.1) |
| Focus border | #ff6b35 | rgb(249, 55, 5) |
| Focus shadow | rgba(255, 107, 53, 0.1) | rgba(249, 55, 5, 0.1) |

## ✅ Checklist de Migration

- [x] Variables CSS créées
- [x] Palette de couleurs mise à jour
- [x] Bootstrap personnalisé
- [x] Sidebar redesignée
- [x] Cards harmonisées
- [x] Buttons harmonisés
- [x] Inputs harmonisés
- [x] Tables harmonisées
- [x] Badges harmonisés
- [x] Forms stylisés
- [x] Grids créées
- [x] Documentation créée

## 🎓 Ressources

- **DESIGN_GUIDE.md** - Guide complet du design system
- **src/styles/variables.css** - Toutes les variables CSS
- **src/styles/custom-bootstrap.scss** - Personnalisation Bootstrap
- **GestionDesStocks** - Projet de référence

## 📝 Notes

- Tous les styles sont basés sur le design de **GestionDesStocks**
- Les couleurs, espacements, et effets sont identiques
- Les composants utilisent Bootstrap 5 personnalisé
- Les variables CSS permettent une maintenance facile
- Le design est entièrement responsive
- Les transitions sont fluides et cohérentes

---

**Date de mise à jour**: 2025-01-10
**Version**: 1.0.0
**Basé sur**: GestionDesStocks Design System
