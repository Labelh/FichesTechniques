# Guide de Design - FichesTechniques

Ce document décrit le système de design appliqué à l'application FichesTechniques, inspiré du projet GestionDesStocks.

## 🎨 Palette de Couleurs

### Couleurs Principales
- **Primary/Accent**: `rgb(249, 55, 5)` - Orange vif (couleur de marque)
- **Background**: `#1f1f1f` - Gris foncé
- **Hover Background**: `#303030` - Gris légèrement plus clair

### Couleurs de Statut
- **Success**: `#10b981` - Vert
- **Warning**: `#f59e0b` - Ambre
- **Danger**: `rgb(249, 55, 5)` - Orange (même que primary)
- **Info**: `rgb(249, 55, 5)` - Orange (même que primary)

### Couleurs de Texte
- **Texte Principal**: `#f1f5f9` - Blanc cassé
- **Texte Secondaire**: `#808080` - Gris moyen
- **Texte Atténué**: `#6b7280` - Gris

### Couleurs de Bordure
- **Bordure Principale**: `rgba(148, 163, 184, 0.1)` - Gris transparent
- **Bordure Foncée**: `#3a3a3a` - Gris foncé
- **Bordure Subtile**: `rgba(75, 85, 99, 0.3)` - Gris transparent

## 📐 Espacements & Border Radius

### Border Radius
- **Small**: `6px` (badges, petits éléments)
- **Default**: `8px` (boutons, inputs)
- **Medium**: `10px`
- **Large**: `12px` (cards)

### Spacing
- **XS**: `0.25rem` (4px)
- **SM**: `0.5rem` (8px)
- **MD**: `1rem` (16px)
- **LG**: `1.5rem` (24px)
- **XL**: `2rem` (32px)

## 🔤 Typographie

### Police
- **Font Family**: 'Nunito Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif
- **Font Smoothing**: antialiased

### Tailles de Police
- **XS**: `0.75rem` (12px)
- **SM**: `0.875rem` (14px)
- **Base**: `0.9375rem` (15px)
- **LG**: `1rem` (16px)
- **XL**: `1.25rem` (20px)
- **2XL**: `2rem` (32px)

### Font Weights
- **Normal**: 400
- **Medium**: 500
- **Semibold**: 600
- **Bold**: 700

## 🎯 Composants

### Boutons

#### Bouton Primary
```css
background-color: rgb(249, 55, 5);
color: white;
padding: 0.625rem 1.25rem;
border-radius: 8px;
font-weight: 500;
```

**Hover Effect**: `transform: translateY(-1px)`

#### Bouton Secondary
```css
background: transparent;
border: 1px solid rgba(75, 85, 99, 0.5);
color: #d1d5db;
```

**Hover Effect**:
- Background: `rgba(75, 85, 99, 0.1)`
- Border: `rgba(75, 85, 99, 0.7)`

### Cards

#### Card Standard
```css
background: #1f1f1f;
padding: 1.5rem;
border-radius: 12px;
border: 1px solid #3a3a3a;
```

**Hover Effect**: `transform: translateY(-4px)`

#### Stat Card
```css
background: #1f1f1f;
padding: 1.5rem;
border-radius: 12px;
border: 1px solid #3a3a3a;
```

**Structure**:
- Titre: `font-size: 0.875rem`, `color: #808080`, `text-transform: uppercase`
- Valeur: `font-size: 2rem`, `font-weight: 700`, `color: #f1f5f9`

### Inputs & Forms

#### Input Field
```css
background: #1f1f1f;
border: 1px solid rgba(148, 163, 184, 0.1);
border-radius: 8px;
padding: 0.75rem 1rem;
color: #f1f5f9;
```

**Focus State**:
- Border: `rgb(249, 55, 5)`
- Box Shadow: `0 0 0 3px rgba(249, 55, 5, 0.1)`

#### Label
```css
font-weight: 600;
color: #f1f5f9;
font-size: 0.875rem;
margin-bottom: 0.5rem;
```

### Badges

#### Status Badges
```css
padding: 0.25rem 0.75rem;
border-radius: 6px;
font-size: 0.75rem;
font-weight: 600;
text-transform: uppercase;
background-color: transparent;
```

**Couleurs par Statut**:
- **Terminée/Normal**: `#10b981` (vert)
- **En cours/Low**: `#f59e0b` (ambre)
- **Brouillon/Critical**: `#ef4444` (rouge)
- **En révision/Pending**: `#3b82f6` (bleu)
- **Archivée**: `#808080` (gris)

### Tables

#### Table Header
```css
background-color: #1f1f1f;
padding: 1rem;
font-weight: 600;
color: #808080;
text-transform: uppercase;
font-size: 0.75rem;
letter-spacing: 0.05em;
```

#### Table Row
```css
padding: 1rem;
border-top: 1px solid rgba(148, 163, 184, 0.1);
```

**Hover Effect**: `background-color: #303030`

## 🎭 Sidebar

### Dimensions
- **Width**: `260px`
- **Background**: `#1f1f1f`
- **Border**: `1px solid rgba(255, 255, 255, 0.1)`

### Header
```css
padding: 1.5rem 1.25rem;
border-bottom: 1px solid rgba(255, 255, 255, 0.1);
```

**Titre**:
- Font Size: `1.25rem`
- Font Weight: 700
- Color: `#ffffff`

**Subtitle (Ajust'82)**:
- Font Size: `0.875rem`
- Font Weight: 600
- Color: `rgb(249, 55, 5)`

### Navigation Links

#### État Normal
```css
color: rgba(255, 255, 255, 0.7);
padding: 0.75rem 1rem;
border-radius: 8px;
font-size: 0.9375rem;
font-weight: 500;
```

#### État Hover
```css
background: rgba(255, 255, 255, 0.08);
color: #ffffff;
```

#### État Active
```css
background: rgb(249, 55, 5);
color: #ffffff;
```

### Notification Badges
```css
background: rgb(249, 55, 5);
color: #ffffff;
font-size: 0.75rem;
font-weight: 700;
padding: 0.125rem 0.5rem;
border-radius: 1rem;
```

### Footer (User Avatar)
```css
width: 36px;
height: 36px;
border-radius: 50%;
background: rgb(249, 55, 5);
color: #ffffff;
font-weight: 600;
```

## ✨ Effets & Transitions

### Transitions
- **Fast**: `0.2s ease`
- **Base**: `0.3s ease`

### Hover Lift
```css
transition: transform 0.2s ease, box-shadow 0.2s ease;
transform: translateY(-2px);
```

### Box Shadows
- **SM**: `0 1px 2px 0 rgba(0, 0, 0, 0.05)`
- **Default**: `0 1px 3px 0 rgba(0, 0, 0, 0.1)`
- **MD**: `0 4px 6px -1px rgba(0, 0, 0, 0.1)`
- **LG**: `0 10px 15px -3px rgba(0, 0, 0, 0.1)`

## 📱 Responsive Design

### Breakpoints Bootstrap
- **SM**: `576px`
- **MD**: `768px`
- **LG**: `992px`
- **XL**: `1200px`
- **XXL**: `1400px`

## 🎨 Grilles & Layouts

### Stats Grid
```css
display: grid;
grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
gap: 1.5rem;
```

### Form Row
```css
display: grid;
grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
gap: 1rem;
```

## 📝 Classes Utilitaires

### Couleurs
- `.text-accent`: Texte en couleur accent (orange)
- `.bg-accent`: Background en couleur accent
- `.border-accent`: Bordure en couleur accent

### Hover
- `.hover-bg-secondary`: Background au hover
- `.hover-lift`: Effet de lift au hover

### Autres
- `.text-muted`: Texte atténué
- `.border-subtle`: Bordure subtile

## 🔧 Utilisation des Variables CSS

Toutes les variables sont définies dans `src/styles/variables.css` et peuvent être utilisées dans n'importe quel fichier CSS :

```css
/* Exemple */
.mon-element {
  background-color: var(--bg-color);
  color: var(--text-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  padding: var(--spacing-md);
}
```

## 📚 Fichiers Importants

1. **src/styles/variables.css** - Toutes les variables CSS
2. **src/styles/custom-bootstrap.scss** - Personnalisation de Bootstrap
3. **src/styles/globals.css** - Styles globaux et utilitaires
4. **src/components/layout/Sidebar.tsx** - Composant de navigation
5. **src/components/ui/Button.tsx** - Composant bouton
6. **src/components/ui/Card.tsx** - Composant carte

## 🎯 Principes de Design

1. **Cohérence**: Utiliser toujours les variables CSS pour les couleurs et espacements
2. **Accessibilité**: Contraste suffisant entre texte et background
3. **Transitions**: Toutes les interactions doivent avoir des transitions fluides
4. **Hover States**: Tous les éléments interactifs doivent avoir un état hover visible
5. **Focus States**: Les inputs et boutons doivent avoir un état focus avec la couleur accent
6. **Responsive**: Utiliser les grilles CSS et les classes Bootstrap pour la responsivité

---

**Version**: 1.0.0
**Date**: 2025
**Basé sur**: GestionDesStocks Design System
