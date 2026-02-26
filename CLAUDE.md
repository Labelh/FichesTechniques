# CLAUDE.md - AI Assistant Guide for FichesTechniques

> **Last Updated**: 2025-11-13
> **Version**: 1.0.0
> **Purpose**: Comprehensive guide for AI assistants working on this codebase

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture & Directory Structure](#architecture--directory-structure)
4. [Key Conventions](#key-conventions)
5. [Database & Data Layer](#database--data-layer)
6. [Component Patterns](#component-patterns)
7. [State Management](#state-management)
8. [Styling & Design System](#styling--design-system)
9. [Development Workflows](#development-workflows)
10. [Common Tasks](#common-tasks)
11. [Testing & Building](#testing--building)
12. [Deployment](#deployment)
13. [Important Files Reference](#important-files-reference)
14. [Best Practices](#best-practices)

---

## 🎯 Project Overview

**FichesTechniques** is a web application for creating and managing technical procedures in PDF format. It allows users to create detailed step-by-step procedures with phases, tools, materials, annotated images, and safety notes.

### Key Features
- ✅ CRUD operations for procedures with phases and steps
- ✅ Multi-view dashboard (Grid, List, Kanban)
- ✅ Advanced search and filtering
- ✅ Image annotation with Fabric.js
- ✅ PDF generation with jsPDF
- ✅ Firebase Firestore for data persistence
- ✅ Firebase Storage for image hosting
- ✅ Dark/Light/Auto theme support
- ✅ Template system for procedures
- ✅ Tools and materials library

### Project Goals
- Create professional technical documentation
- Provide intuitive procedure management
- Generate high-quality PDF exports
- Support image annotations for visual instructions

---

## 🛠️ Tech Stack

### Core Technologies
- **React 18** - UI framework with hooks
- **TypeScript** - Static typing (strict mode enabled)
- **Vite** - Build tool and dev server
- **React Router DOM** - Client-side routing

### State & Data
- **Zustand** - Lightweight state management with persistence
- **Firebase Firestore** - NoSQL cloud database
- **Firebase Storage** - Cloud storage for images
- **Dexie.js** - IndexedDB wrapper (legacy, being phased out)

### UI & Styling
- **TailwindCSS** - Utility-first CSS framework
- **Bootstrap 5** - Component library (limited usage)
- **Lucide React** - Icon library
- **Sonner** - Toast notifications
- **Custom CSS Variables** - Design system implementation

### Forms & Validation
- **React Hook Form** - Form state management
- **Zod** - Schema validation

### PDF & Images
- **jsPDF** - PDF generation
- **html2canvas** - HTML to canvas conversion
- **Fabric.js** - Canvas manipulation for annotations
- **react-dropzone** - File upload handling

### Utilities
- **date-fns** - Date manipulation
- **clsx** - Conditional classNames
- **XLSX** - Excel export capabilities

---

## 📁 Architecture & Directory Structure

```
FichesTechniques/
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Pages deployment
├── public/                          # Static assets
├── src/
│   ├── components/                  # React components
│   │   ├── ui/                     # Base UI components (Button, Card, Input, Badge)
│   │   ├── layout/                 # Layout components (Header, Sidebar, Layout)
│   │   ├── dashboard/              # Dashboard-specific (ProcedureCard, ProcedureList, ProcedureKanban)
│   │   ├── editor/                 # Editor components (PhaseItem, PhaseTemplateSelector)
│   │   ├── phase/                  # Phase-related (ImageUploader, ImageAnnotator)
│   │   └── templates/              # Template components (TemplateEditor)
│   ├── pages/                      # Route pages
│   │   ├── Dashboard.tsx           # Main dashboard with stats and procedure list
│   │   ├── ProcedureEditor.tsx     # Create/Edit procedures
│   │   ├── ProcedureView.tsx       # View single procedure
│   │   ├── ToolsLibrary.tsx        # Tools management
│   │   ├── Templates.tsx           # Template management
│   │   ├── Settings.tsx            # App settings
│   │   └── NotFound.tsx            # 404 page
│   ├── hooks/                      # Custom React hooks
│   │   ├── useFirebase.ts          # Firebase operations hooks
│   │   ├── useProcedures.ts        # Procedure-specific hooks
│   │   ├── useTools.ts             # Tools library hooks
│   │   ├── useDatabase.ts          # Generic database hooks
│   │   └── useAutoSave.ts          # Auto-save functionality
│   ├── store/                      # Zustand stores
│   │   └── useAppStore.ts          # Global app state (theme, sidebar, filters, view mode)
│   ├── lib/                        # Core libraries & utilities
│   │   ├── firebase.ts             # Firebase initialization
│   │   ├── firestore.ts            # Firestore CRUD operations
│   │   ├── utils.ts                # General utilities
│   │   └── pdfGenerator.ts         # PDF generation logic
│   ├── services/                   # Business logic services
│   │   ├── procedureService.ts     # Procedure business logic
│   │   ├── toolService.ts          # Tools management
│   │   ├── templateService.ts      # Template operations
│   │   ├── imageService.ts         # Image processing
│   │   └── storageService.ts       # Firebase Storage operations
│   ├── types/                      # TypeScript type definitions
│   │   └── index.ts                # All type definitions (450+ lines)
│   ├── db/                         # Database configurations
│   │   └── database.ts             # Dexie.js configuration (legacy)
│   ├── styles/                     # Global styles
│   │   └── globals.css             # Global CSS with variables
│   ├── App.tsx                     # Main app component with routing
│   ├── main.tsx                    # React entry point
│   └── vite-env.d.ts              # Vite type declarations
├── .env.example                    # Environment variables template
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
├── vite.config.ts                  # Vite configuration
├── tailwind.config.js              # Tailwind CSS configuration
└── [Multiple .md files]            # Documentation files
```

### Key Directories Explained

#### `/components/`
- **ui/**: Reusable, generic UI components following design system
- **layout/**: App structure components (Header, Sidebar)
- **dashboard/**: Dashboard-specific views and cards
- **editor/**: Procedure editing components
- **phase/**: Phase and step management components
- **templates/**: Template editing and selection

#### `/pages/`
Route-level components that represent full pages. Each page should:
- Import and compose smaller components
- Handle route parameters
- Manage page-level state
- Use hooks for data fetching

#### `/hooks/`
Custom React hooks for:
- Data fetching and mutations
- Firebase operations
- Auto-save functionality
- Computed values

#### `/services/`
Business logic layer. Services should:
- Be stateless (pure functions)
- Handle complex business logic
- Call Firebase operations from `/lib/firestore.ts`
- Return typed results
- Handle errors gracefully

#### `/lib/`
Core utilities and third-party integrations:
- Firebase initialization and configuration
- Generic Firestore CRUD helpers
- PDF generation utilities
- General utility functions

#### `/store/`
Zustand stores for global state:
- Theme management
- UI state (sidebar, view mode)
- Search and filter state
- Persisted preferences

---

## 🔑 Key Conventions

### Naming Conventions

#### Files & Folders
- **Components**: PascalCase (e.g., `ProcedureCard.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useProcedures.ts`)
- **Services**: camelCase with `Service` suffix (e.g., `procedureService.ts`)
- **Types**: camelCase (e.g., `index.ts` in `/types/`)
- **Utilities**: camelCase (e.g., `utils.ts`)

#### Code
- **React Components**: PascalCase (e.g., `function ProcedureCard() {}`)
- **Functions**: camelCase (e.g., `function formatDate() {}`)
- **Constants**: UPPER_SNAKE_CASE for true constants (e.g., `const MAX_FILE_SIZE = 5000000`)
- **Variables**: camelCase (e.g., `const procedureList = []`)
- **Interfaces/Types**: PascalCase (e.g., `interface Procedure {}`)
- **Enums**: PascalCase (e.g., `enum DifficultyLevel {}`)

### Import Conventions

Always use path aliases with `@/`:
```typescript
// ✅ Good
import { Procedure } from '@/types';
import { Button } from '@/components/ui/Button';
import { useProcedures } from '@/hooks/useProcedures';

// ❌ Bad
import { Procedure } from '../../types';
import { Button } from '../../../components/ui/Button';
```

### Import Order
1. React and external libraries
2. Internal types
3. Hooks
4. Components
5. Utilities and services
6. Styles

```typescript
// Example
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash } from 'lucide-react';

import type { Procedure, Phase } from '@/types';
import { useProcedures } from '@/hooks/useProcedures';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
import { procedureService } from '@/services/procedureService';
```

### TypeScript Conventions

#### Always Use Types
```typescript
// ✅ Good - Explicit types
function createProcedure(data: Partial<Procedure>): Promise<Procedure> {
  // ...
}

// ❌ Bad - Implicit any
function createProcedure(data) {
  // ...
}
```

#### Prefer Interfaces for Objects
```typescript
// ✅ Good
interface ProcedureCardProps {
  procedure: Procedure;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

// Also acceptable for simple types
type ProcedureId = string;
```

#### Use Enums from types/index.ts
```typescript
// ✅ Good
import { ProcedureStatus, DifficultyLevel } from '@/types';

procedure.status = ProcedureStatus.DRAFT;
procedure.difficulty = DifficultyLevel.MEDIUM;

// ❌ Bad - String literals
procedure.status = 'draft';
```

### React Patterns

#### Functional Components with TypeScript
```typescript
interface ComponentProps {
  title: string;
  onSave?: () => void;
  children?: React.ReactNode;
}

export function MyComponent({ title, onSave, children }: ComponentProps) {
  return (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  );
}
```

#### Hooks Usage
```typescript
// Group related useState calls
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

// Use custom hooks for complex logic
const { procedures, loading, createProcedure, updateProcedure } = useProcedures();

// useEffect with proper dependencies
useEffect(() => {
  fetchData();
}, [procedureId]); // Always specify dependencies
```

---

## 🗄️ Database & Data Layer

### Firebase Architecture

#### Firestore Collections
```
firestore/
├── procedures/              # Main procedures collection
│   └── {procedureId}/      # Document per procedure
├── phases/                  # Phases (linked to procedures)
│   └── {phaseId}/
├── tools/                   # Tools library
│   └── {toolId}/
├── materials/              # Materials catalog
│   └── {materialId}/
├── categories/             # Procedure categories
│   └── {categoryId}/
├── tags/                   # Tags for procedures
│   └── {tagId}/
├── templates/              # Procedure templates
│   └── {templateId}/
├── preferences/            # User preferences
│   └── {userId}/
└── history/                # Change history (future)
    └── {entryId}/
```

#### Firebase Storage Structure
```
storage/
└── images/
    └── {procedureId}/
        ├── cover.jpg           # Cover image
        └── {imageId}.jpg       # Phase/step images
```

### Data Flow Pattern

```
User Action (Component)
    ↓
Custom Hook (e.g., useProcedures)
    ↓
Service (e.g., procedureService)
    ↓
Firestore Helper (lib/firestore.ts)
    ↓
Firebase SDK
    ↓
Cloud Firestore
```

### Firestore Operations

#### Reading Data
```typescript
import { getProcedure, getAllProcedures } from '@/lib/firestore';

// Get single document
const procedure = await getProcedure(procedureId);

// Get all documents
const procedures = await getAllProcedures();

// Query with filters (implement in services)
const drafts = procedures.filter(p => p.status === ProcedureStatus.DRAFT);
```

#### Creating Data
```typescript
import { createProcedure } from '@/lib/firestore';
import type { Procedure } from '@/types';

const newProcedure: Partial<Procedure> = {
  title: 'My Procedure',
  description: 'Description here',
  status: ProcedureStatus.DRAFT,
  // ... other fields
};

const created = await createProcedure(newProcedure);
```

#### Updating Data
```typescript
import { updateProcedure } from '@/lib/firestore';

await updateProcedure(procedureId, {
  title: 'Updated Title',
  status: ProcedureStatus.COMPLETED,
});
```

#### Deleting Data
```typescript
import { deleteProcedure } from '@/lib/firestore';

await deleteProcedure(procedureId);
```

### Firebase Storage Operations

```typescript
import { uploadImage, deleteImage, getImageUrl } from '@/services/storageService';

// Upload image
const imageUrl = await uploadImage(file, procedureId, imageId);

// Get image URL
const url = await getImageUrl(procedureId, imageId);

// Delete image
await deleteImage(procedureId, imageId);
```

### Data Type Conversion

**IMPORTANT**: Firestore uses `Timestamp` objects for dates. Always convert them:

```typescript
import { convertTimestamps, prepareForFirestore } from '@/lib/firestore';

// When reading from Firestore
const procedure = convertTimestamps<Procedure>(firestoreDoc);

// When writing to Firestore
const dataToSave = prepareForFirestore(procedure);
```

### Type Definitions

All types are defined in `src/types/index.ts`. Key types include:

#### Core Entities
- `Procedure` - Main procedure entity
- `Phase` - Phase within a procedure
- `SubStep` - Step within a phase
- `Tool` - Tool from library
- `Material` - Material/consumable
- `Category` - Procedure category
- `Tag` - Procedure tag

#### Enums
- `ProcedureStatus` - draft, en_cours, in_review, completed, archived
- `DifficultyLevel` - easy, medium, hard
- `Priority` - low, normal, high, urgent
- `RiskLevel` - none, low, medium, high, critical
- `ViewMode` - grid, list, kanban

#### Configuration
- `PDFConfig` - PDF generation settings
- `UserPreferences` - User preferences
- `SearchFilters` - Search and filter criteria

---

## 🧩 Component Patterns

### Component Structure

```typescript
// 1. Imports
import React, { useState } from 'react';
import type { Procedure } from '@/types';
import { Button } from '@/components/ui/Button';

// 2. Type Definitions
interface ProcedureCardProps {
  procedure: Procedure;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

// 3. Component Function
export function ProcedureCard({ procedure, onEdit, onDelete }: ProcedureCardProps) {
  // 4. Hooks (state, effects, custom hooks)
  const [isExpanded, setIsExpanded] = useState(false);

  // 5. Event Handlers
  const handleEdit = () => {
    onEdit?.(procedure.id);
  };

  // 6. Render
  return (
    <div className="procedure-card">
      {/* Component JSX */}
    </div>
  );
}
```

### UI Component Patterns

#### Base Components (`/components/ui/`)
These should be:
- Highly reusable
- Style agnostic (accept className prop)
- Well-typed with clear props
- Follow design system

```typescript
// Example: Button component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  className,
  ...props
}: ButtonProps) {
  const baseStyles = 'rounded-lg font-medium transition-all';
  const variantStyles = {
    primary: 'bg-accent text-white hover:bg-accent/90',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700',
    // ... more variants
  };

  return (
    <button
      className={clsx(baseStyles, variantStyles[variant], className)}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  );
}
```

### Page Component Patterns

Pages should:
- Use layout components
- Fetch data with hooks
- Handle loading and error states
- Compose smaller components

```typescript
export function Dashboard() {
  const { procedures, loading, error } = useProcedures();
  const { viewMode } = useAppStore();

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <Layout>
      <DashboardHeader />
      <StatsOverview procedures={procedures} />

      {viewMode === 'grid' && <ProcedureGrid procedures={procedures} />}
      {viewMode === 'list' && <ProcedureList procedures={procedures} />}
      {viewMode === 'kanban' && <ProcedureKanban procedures={procedures} />}
    </Layout>
  );
}
```

### Custom Hook Patterns

```typescript
export function useProcedures() {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch data
  useEffect(() => {
    fetchProcedures();
  }, []);

  const fetchProcedures = async () => {
    try {
      setLoading(true);
      const data = await getAllProcedures();
      setProcedures(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  // CRUD operations
  const createProcedure = async (data: Partial<Procedure>) => {
    const created = await procedureService.create(data);
    setProcedures([...procedures, created]);
    return created;
  };

  const updateProcedure = async (id: string, data: Partial<Procedure>) => {
    const updated = await procedureService.update(id, data);
    setProcedures(procedures.map(p => p.id === id ? updated : p));
    return updated;
  };

  const deleteProcedure = async (id: string) => {
    await procedureService.delete(id);
    setProcedures(procedures.filter(p => p.id !== id));
  };

  return {
    procedures,
    loading,
    error,
    refetch: fetchProcedures,
    createProcedure,
    updateProcedure,
    deleteProcedure,
  };
}
```

---

## 🏪 State Management

### Zustand Store Structure

The app uses Zustand for global state with localStorage persistence.

#### Main Store: `useAppStore`

Located in `src/store/useAppStore.ts`:

```typescript
interface AppState {
  // Theme
  theme: 'light' | 'dark' | 'auto';
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;

  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // View mode
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // Search & Filters
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchFilters: SearchFilters;
  setSearchFilters: (filters: SearchFilters) => void;
  clearFilters: () => void;

  // Sort
  sortOption: SortOption;
  setSortOption: (option: SortOption) => void;

  // Selected procedure
  selectedProcedureId: string | null;
  setSelectedProcedureId: (id: string | null) => void;
}
```

#### Usage in Components

```typescript
import { useAppStore } from '@/store/useAppStore';

function MyComponent() {
  // Select only the state you need
  const theme = useAppStore(state => state.theme);
  const setTheme = useAppStore(state => state.setTheme);

  // Or destructure multiple values
  const { viewMode, setViewMode, sidebarOpen } = useAppStore();

  return (
    <div>
      <button onClick={() => setTheme('dark')}>
        Set Dark Theme
      </button>
    </div>
  );
}
```

#### Persisted State

The following state is persisted to localStorage:
- `theme`
- `sidebarOpen`
- `viewMode`
- `sortOption`

The following state is NOT persisted (session only):
- `searchQuery`
- `searchFilters`
- `selectedProcedureId`

### When to Use Zustand vs React State

**Use Zustand when:**
- State needs to be shared across multiple components
- State needs to persist across sessions
- State represents global UI settings (theme, sidebar, view mode)

**Use React useState when:**
- State is local to a single component
- State is temporary (form inputs, modals, toggles)
- State doesn't need to be shared

**Use Custom Hooks when:**
- Working with server data (procedures, tools, etc.)
- Need to encapsulate complex logic
- Want to share logic between components

---

## 🎨 Styling & Design System

### Design System Overview

The project uses a custom design system inspired by GestionDesStocks, implemented with:
- CSS Variables (defined in `src/styles/globals.css`)
- TailwindCSS for utility classes
- Bootstrap 5 (limited usage, being phased out)

### Color Palette

```css
/* Primary Colors */
--accent-color: rgb(249, 55, 5);           /* Orange brand color */
--bg-color: #1f1f1f;                        /* Dark background */
--hover-bg: #303030;                        /* Hover state */

/* Text Colors */
--text-color: #f1f5f9;                      /* Primary text */
--text-secondary: #808080;                  /* Secondary text */
--text-muted: #6b7280;                      /* Muted text */

/* Status Colors */
--success-color: #10b981;                   /* Green */
--warning-color: #f59e0b;                   /* Amber */
--danger-color: rgb(249, 55, 5);            /* Orange */
--info-color: rgb(249, 55, 5);              /* Orange */

/* Border Colors */
--border-color: rgba(148, 163, 184, 0.1);
--border-dark: #3a3a3a;
--border-subtle: rgba(75, 85, 99, 0.3);
```

### Spacing & Sizing

```css
/* Border Radius */
--radius-sm: 6px;    /* Small elements, badges */
--radius: 8px;       /* Default, buttons, inputs */
--radius-md: 10px;   /* Medium elements */
--radius-lg: 12px;   /* Cards, containers */

/* Spacing Scale */
--spacing-xs: 0.25rem;  /* 4px */
--spacing-sm: 0.5rem;   /* 8px */
--spacing-md: 1rem;     /* 16px */
--spacing-lg: 1.5rem;   /* 24px */
--spacing-xl: 2rem;     /* 32px */
```

### Typography

```css
/* Font Family */
font-family: 'Nunito Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Font Sizes */
--font-xs: 0.75rem;    /* 12px */
--font-sm: 0.875rem;   /* 14px */
--font-base: 0.9375rem;/* 15px */
--font-lg: 1rem;       /* 16px */
--font-xl: 1.25rem;    /* 20px */
--font-2xl: 2rem;      /* 32px */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Component Styles

#### Buttons
```tsx
// Primary button
<button className="bg-accent text-white px-5 py-2.5 rounded-lg font-medium hover:translate-y-[-1px] transition-transform">
  Click Me
</button>

// Secondary button
<button className="bg-transparent border border-gray-500 text-gray-300 hover:bg-gray-500/10">
  Secondary
</button>
```

#### Cards
```tsx
<div className="bg-[#1f1f1f] p-6 rounded-xl border border-[#3a3a3a] hover:translate-y-[-4px] transition-transform">
  Card Content
</div>
```

#### Inputs
```tsx
<input
  type="text"
  className="bg-[#1f1f1f] border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-accent focus:ring-2 focus:ring-accent/10"
/>
```

#### Badges
```tsx
// Status badge
<span className="px-3 py-1 rounded-md text-xs font-semibold uppercase bg-green-500/10 text-green-500 border border-green-500">
  Completed
</span>
```

### Theme System

The app supports three theme modes:
- **Light**: White background, dark text
- **Dark**: Dark background, light text (default)
- **Auto**: Follows system preference

Theme is controlled by:
1. `useAppStore` - State management
2. Root element class (`<html class="dark">`)
3. CSS variables in `globals.css`

```typescript
// Change theme
const { setTheme } = useAppStore();
setTheme('dark'); // or 'light' or 'auto'
```

### Responsive Design

Use Tailwind responsive prefixes:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Responsive grid */}
</div>
```

Breakpoints:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### Best Practices

1. **Use CSS Variables**: Always prefer CSS variables for colors and spacing
2. **Consistent Spacing**: Use Tailwind spacing scale (p-4, m-6, gap-2, etc.)
3. **Transitions**: Add transitions to interactive elements
4. **Hover States**: All clickable elements should have hover states
5. **Focus States**: Inputs and buttons must have visible focus states
6. **Accessibility**: Maintain contrast ratios (WCAG AA minimum)

---

## 🔄 Development Workflows

### Starting Development

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Environment Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Fill in Firebase credentials:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

3. Firebase setup:
   - Create project at https://console.firebase.google.com/
   - Enable Firestore Database
   - Enable Storage
   - Configure security rules (see `FIRESTORE_RULES.md`)
   - Add CORS configuration for Storage (see `FIREBASE_STORAGE_CORS.md`)

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/my-feature

# Create pull request on GitHub
```

#### Commit Message Convention

Follow conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting)
- `refactor:` - Code refactoring
- `test:` - Test changes
- `chore:` - Build process or auxiliary tool changes

### Code Review Checklist

Before submitting changes:
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] ESLint passes (`npm run lint`)
- [ ] All imports use `@/` path aliases
- [ ] Types are properly defined (no `any`)
- [ ] Components follow naming conventions
- [ ] New features are documented
- [ ] Firebase operations handle errors
- [ ] UI is responsive
- [ ] Accessibility is maintained

---

## 🛠️ Common Tasks

### Adding a New Page

1. Create page component in `src/pages/`:
```typescript
// src/pages/NewPage.tsx
export function NewPage() {
  return (
    <Layout>
      <h1>New Page</h1>
    </Layout>
  );
}
```

2. Add route in `src/App.tsx`:
```typescript
import { NewPage } from '@/pages/NewPage';

// In Routes
<Route path="/new-page" element={<NewPage />} />
```

3. Add navigation link in `src/components/layout/Sidebar.tsx`:
```typescript
<Link to="/new-page" className="nav-link">
  <Icon />
  New Page
</Link>
```

### Adding a New Type

Add to `src/types/index.ts`:
```typescript
export interface NewEntity extends BaseEntity {
  name: string;
  description: string;
  // ... other fields
}

export enum NewEnum {
  OPTION_A = 'option_a',
  OPTION_B = 'option_b',
}
```

### Adding Firestore Operations

1. Add collection name in `src/lib/firestore.ts`:
```typescript
export const collections = {
  // ... existing
  newCollection: 'newCollection',
} as const;
```

2. Add CRUD functions:
```typescript
export async function createNewEntity(data: Partial<NewEntity>): Promise<NewEntity> {
  const docRef = await addDoc(
    collection(db, collections.newCollection),
    prepareForFirestore(data)
  );
  const doc = await getDoc(docRef);
  return { id: doc.id, ...convertTimestamps(doc.data()) };
}
```

3. Create service in `src/services/newEntityService.ts`:
```typescript
export const newEntityService = {
  async create(data: Partial<NewEntity>) {
    return await createNewEntity(data);
  },
  // ... more operations
};
```

4. Create hook in `src/hooks/useNewEntity.ts`:
```typescript
export function useNewEntity() {
  const [entities, setEntities] = useState<NewEntity[]>([]);
  // ... hook logic
  return { entities, /* ... */ };
}
```

### Adding a UI Component

1. Create component in `src/components/ui/`:
```typescript
// src/components/ui/NewComponent.tsx
interface NewComponentProps {
  title: string;
  onClick?: () => void;
}

export function NewComponent({ title, onClick }: NewComponentProps) {
  return (
    <div className="new-component" onClick={onClick}>
      {title}
    </div>
  );
}
```

2. Export from component directory if needed
3. Use in pages or other components

### Handling Images

#### Upload Image
```typescript
import { uploadImage } from '@/services/storageService';

const handleImageUpload = async (file: File, procedureId: string) => {
  try {
    const imageId = `image-${Date.now()}`;
    const imageUrl = await uploadImage(file, procedureId, imageId);

    // Save URL to procedure
    await updateProcedure(procedureId, {
      coverImage: imageUrl,
    });
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

#### Delete Image
```typescript
import { deleteImage } from '@/services/storageService';

await deleteImage(procedureId, imageId);
```

### PDF Generation

```typescript
import { generatePDF } from '@/lib/pdfGenerator';
import type { PDFConfig } from '@/types';

const config: PDFConfig = {
  pageSize: PDFPageSize.A4,
  orientation: PDFOrientation.PORTRAIT,
  includeTableOfContents: true,
  includeCoverPage: true,
  // ... other options
};

const pdfBlob = await generatePDF(procedure, config);

// Download
const url = URL.createObjectURL(pdfBlob);
const a = document.createElement('a');
a.href = url;
a.download = `${procedure.title}.pdf`;
a.click();
```

### Working with Templates

```typescript
import { useTemplates } from '@/hooks/useTemplates';

function TemplateSelector() {
  const { templates, loading } = useTemplates();

  const applyTemplate = async (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    // Create procedure from template
    const newProcedure = {
      ...template.defaultPhases,
      // ... customize
    };

    await createProcedure(newProcedure);
  };

  return (
    <div>
      {templates.map(template => (
        <button key={template.id} onClick={() => applyTemplate(template.id)}>
          {template.name}
        </button>
      ))}
    </div>
  );
}
```

### Adding Notifications

```typescript
import { toast } from 'sonner';

// Success notification
toast.success('Procedure saved successfully!');

// Error notification
toast.error('Failed to save procedure');

// Loading notification
const toastId = toast.loading('Saving...');
// Later:
toast.success('Saved!', { id: toastId });

// Custom notification
toast('Custom message', {
  description: 'Additional details',
  action: {
    label: 'Undo',
    onClick: () => handleUndo(),
  },
});
```

---

## 🧪 Testing & Building

### Build Process

```bash
# Development build
npm run dev

# Production build (outputs to /dist)
npm run build

# Preview production build
npm run preview
```

### TypeScript Compilation

```bash
# Type check
npx tsc --noEmit

# Type check with watch mode
npx tsc --noEmit --watch
```

### Linting

```bash
# Run ESLint
npm run lint

# Fix auto-fixable issues
npx eslint . --ext ts,tsx --fix
```

### Build Output

Production build creates:
```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── [other assets]
└── vite.svg
```

### Environment Variables in Build

Vite exposes env vars prefixed with `VITE_`:
```typescript
// Access in code
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
```

### Build Optimization

- Tree shaking enabled
- Code splitting for routes (add React.lazy if needed)
- CSS minification
- Asset optimization

---

## 🚀 Deployment

### GitHub Pages Deployment

The project is configured for automatic deployment to GitHub Pages.

#### Setup

1. **Configure GitHub Secrets**:
   - Go to: Repository Settings > Secrets and Variables > Actions
   - Add Firebase env vars as secrets:
     - `VITE_FIREBASE_API_KEY`
     - `VITE_FIREBASE_AUTH_DOMAIN`
     - `VITE_FIREBASE_PROJECT_ID`
     - `VITE_FIREBASE_STORAGE_BUCKET`
     - `VITE_FIREBASE_MESSAGING_SENDER_ID`
     - `VITE_FIREBASE_APP_ID`

2. **Enable GitHub Pages**:
   - Go to: Repository Settings > Pages
   - Source: Select "GitHub Actions"

3. **Deploy**:
   - Push to `main` branch triggers automatic deployment
   - Or manually run workflow from Actions tab

#### Deployment Workflow

Located in `.github/workflows/deploy.yml`:
- Builds on push to `main`
- Uses Node.js 18
- Injects env vars from secrets
- Deploys to gh-pages branch
- Accessible at: `https://[username].github.io/FichesTechniques/`

#### Firebase Configuration for Production

Add the deployment URL to Firebase:
1. Go to Firebase Console
2. Navigate to: Authentication > Settings > Authorized domains
3. Add: `[username].github.io`

### Manual Deployment

```bash
# Build
npm run build

# Deploy dist/ folder to your hosting provider
# Examples:
# - Netlify: netlify deploy --prod --dir=dist
# - Vercel: vercel --prod
# - Firebase Hosting: firebase deploy
```

### Deployment Checklist

Before deploying:
- [ ] Update version in `package.json`
- [ ] Test production build locally (`npm run preview`)
- [ ] Verify Firebase env vars are set
- [ ] Check all API endpoints work
- [ ] Test on different browsers
- [ ] Verify responsive design
- [ ] Check Firebase quotas
- [ ] Update CHANGELOG.md

---

## 📚 Important Files Reference

### Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Dependencies and scripts |
| `tsconfig.json` | TypeScript configuration (strict mode) |
| `vite.config.ts` | Vite build configuration, path aliases |
| `tailwind.config.js` | Tailwind CSS customization |
| `.env.example` | Environment variables template |
| `.eslintrc.cjs` | ESLint rules |
| `postcss.config.js` | PostCSS configuration |

### Core Application Files

| File | Purpose |
|------|---------|
| `src/main.tsx` | React entry point, renders App |
| `src/App.tsx` | Main app component, router setup |
| `src/types/index.ts` | All TypeScript types (450+ lines) |
| `src/store/useAppStore.ts` | Global Zustand store |
| `src/lib/firebase.ts` | Firebase initialization |
| `src/lib/firestore.ts` | Firestore CRUD operations |
| `src/lib/utils.ts` | Utility functions |
| `src/lib/pdfGenerator.ts` | PDF generation logic |
| `src/styles/globals.css` | Global CSS, variables, animations |

### Key Components

| File | Purpose |
|------|---------|
| `src/components/layout/Layout.tsx` | Main layout wrapper |
| `src/components/layout/Header.tsx` | Top navigation bar |
| `src/components/layout/Sidebar.tsx` | Side navigation menu |
| `src/components/ui/Button.tsx` | Reusable button component |
| `src/components/ui/Card.tsx` | Reusable card component |
| `src/components/ui/Input.tsx` | Reusable input component |
| `src/components/ui/Badge.tsx` | Status badge component |

### Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Main project documentation |
| `CLAUDE.md` | This file - AI assistant guide |
| `PROJECT_SUMMARY.md` | Project overview and stats |
| `DESIGN_GUIDE.md` | Design system documentation |
| `FIREBASE_SETUP.md` | Firebase configuration guide |
| `DEPLOYMENT.md` | Deployment instructions |
| `CHANGELOG.md` | Version history |
| `TROUBLESHOOTING.md` | Common issues and solutions |

---

## ✅ Best Practices

### General Principles

1. **Type Safety First**
   - Always define types explicitly
   - Avoid `any` - use `unknown` or proper types
   - Use enums from `types/index.ts`

2. **Component Design**
   - Keep components small and focused (< 200 lines)
   - Use composition over prop drilling
   - Extract reusable logic to hooks
   - Props should be well-typed interfaces

3. **State Management**
   - Use Zustand for global UI state
   - Use React state for local component state
   - Use custom hooks for server state
   - Don't duplicate server data in global state

4. **Performance**
   - Memoize expensive computations with `useMemo`
   - Memoize callbacks with `useCallback`
   - Use `React.memo` for pure components
   - Lazy load routes if needed
   - Optimize images before upload

5. **Error Handling**
   - Always wrap async operations in try-catch
   - Show user-friendly error messages
   - Log errors for debugging
   - Handle loading and error states in UI

6. **Accessibility**
   - Use semantic HTML
   - Add ARIA labels where needed
   - Ensure keyboard navigation works
   - Maintain color contrast ratios
   - Test with screen readers

### Code Style

```typescript
// ✅ Good
export function ProcedureCard({ procedure, onEdit }: ProcedureCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { theme } = useAppStore();

  const handleEdit = useCallback(() => {
    onEdit(procedure.id);
  }, [procedure.id, onEdit]);

  return (
    <Card className="procedure-card">
      <h3>{procedure.title}</h3>
      <Button onClick={handleEdit}>Edit</Button>
    </Card>
  );
}

// ❌ Bad
export default function Card(props: any) {
  const data = props.data;
  return <div onClick={() => props.onClick(data.id)}>{data.title}</div>;
}
```

### Firebase Best Practices

1. **Firestore**
   - Always convert timestamps with `convertTimestamps()`
   - Always prepare data with `prepareForFirestore()`
   - Use batch writes for multiple operations
   - Index fields used in queries
   - Minimize document reads

2. **Storage**
   - Validate file types and sizes before upload
   - Use consistent naming conventions
   - Delete old images when updating
   - Optimize images before upload
   - Handle upload progress

3. **Security**
   - Configure Firestore security rules
   - Configure Storage CORS
   - Never expose Firebase config in public repos (use env vars)
   - Validate data on client and server

### Git Best Practices

1. **Commits**
   - Write clear, descriptive commit messages
   - Use conventional commit format
   - Keep commits focused (one logical change)
   - Don't commit `node_modules/`, `.env`, or build files

2. **Branches**
   - Create feature branches from `main`
   - Use descriptive branch names (`feature/add-pdf-export`)
   - Keep branches short-lived
   - Rebase on `main` before merging

3. **Pull Requests**
   - Write clear PR descriptions
   - Reference related issues
   - Request reviews from team members
   - Address review comments
   - Ensure CI passes before merging

### Documentation

1. **Code Comments**
   - Comment "why", not "what"
   - Use JSDoc for complex functions
   - Document non-obvious behavior
   - Keep comments up to date

2. **README Updates**
   - Update when adding major features
   - Keep setup instructions current
   - Document breaking changes
   - Add examples for complex features

3. **Type Documentation**
   - Document interfaces with JSDoc
   - Explain complex types
   - Provide usage examples

---

## 🔍 Troubleshooting Guide

### Common Issues

#### TypeScript Errors

**Problem**: Import errors or type mismatches
```bash
# Solution: Rebuild TypeScript cache
rm -rf node_modules/.vite
npm run dev
```

**Problem**: Path alias not working
```typescript
// Check vite.config.ts and tsconfig.json have matching aliases
// vite.config.ts
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
}

// tsconfig.json
"paths": {
  "@/*": ["./src/*"]
}
```

#### Firebase Issues

**Problem**: Firebase not initialized
- Check `.env` file exists and has all variables
- Verify Firebase project exists
- Check console for errors

**Problem**: Firestore permission denied
- Check security rules in Firebase Console
- Verify collection names match
- Check if auth is required but not configured

**Problem**: Images not loading
- Check Storage CORS configuration
- Verify image URLs are correct
- Check Storage security rules
- Verify bucket name in `.env`

#### Build Issues

**Problem**: Build fails with out of memory
```bash
# Solution: Increase Node memory
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

**Problem**: Vite cache issues
```bash
# Solution: Clear cache
rm -rf node_modules/.vite
npm run dev
```

#### Runtime Issues

**Problem**: State not persisting
- Check Zustand persist configuration
- Check localStorage is enabled
- Clear browser cache if needed

**Problem**: Images not uploading
- Check file size limits (Firebase: 5MB default)
- Verify file types are allowed
- Check Firebase quota limits

### Getting Help

1. Check existing documentation files
2. Search GitHub issues
3. Check Firebase documentation
4. Check React/Vite documentation
5. Review recent commits for similar changes

---

## 🎯 Future Roadmap

### Planned Features

#### Version 1.5
- [ ] Advanced image annotations with layers
- [ ] PDF templates customization
- [ ] Complete tools library CRUD
- [ ] Batch operations on procedures
- [ ] Export/import procedures

#### Version 2.0
- [ ] Multi-user support with authentication
- [ ] Collaboration features
- [ ] Version history and rollback
- [ ] Advanced search with full-text
- [ ] Mobile app (PWA)

#### Version 3.0
- [ ] AI-assisted procedure generation
- [ ] Voice recording for steps
- [ ] Video integration
- [ ] Translation support
- [ ] API for third-party integrations

### Technical Debt

- [ ] Remove Dexie.js (IndexedDB) - fully migrate to Firebase
- [ ] Phase out Bootstrap - use only Tailwind
- [ ] Add comprehensive error boundaries
- [ ] Implement proper logging system
- [ ] Add performance monitoring
- [ ] Implement proper testing (unit, integration, e2e)
- [ ] Add Storybook for component development
- [ ] Optimize bundle size

---

## 📝 Notes for AI Assistants

### When Making Changes

1. **Always read relevant files first**
   - Check types in `src/types/index.ts`
   - Review existing patterns in similar components
   - Check recent changes in `CHANGELOG.md`

2. **Follow existing patterns**
   - Match naming conventions
   - Use same import style
   - Follow component structure
   - Maintain design system consistency

3. **Test changes**
   - Ensure TypeScript compiles
   - Check in browser
   - Test responsive behavior
   - Verify Firebase operations

4. **Document changes**
   - Update relevant .md files
   - Add code comments for complex logic
   - Update CHANGELOG.md for user-facing changes

### Quick Reference Commands

```bash
# Development
npm run dev              # Start dev server
npm run build           # Production build
npm run lint            # Run linter

# Type checking
npx tsc --noEmit        # Check types

# Firebase
# See FIREBASE_SETUP.md for Firebase commands

# Git
git status              # Check status
git add .               # Stage all
git commit -m "msg"     # Commit
git push                # Push to remote
```

### Key Directories to Know

```
src/
├── types/              # Type definitions - check here first
├── lib/                # Core utilities and Firebase
├── components/ui/      # Reusable UI components
├── pages/              # Route pages
├── hooks/              # Custom hooks
├── services/           # Business logic
└── store/              # Global state
```

### Common Patterns

```typescript
// Import pattern
import type { Type } from '@/types';
import { useHook } from '@/hooks/useHook';
import { Component } from '@/components/ui/Component';

// Component pattern
interface Props {
  data: Type;
}

export function Component({ data }: Props) {
  const [state, setState] = useState();

  useEffect(() => {
    // ...
  }, [dependencies]);

  return <div>{/* ... */}</div>;
}

// Service pattern
export const service = {
  async create(data: Partial<Type>) {
    return await createInFirestore(data);
  },
};

// Hook pattern
export function useData() {
  const [data, setData] = useState<Type[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  return { data, loading };
}
```

---

## 📞 Contact & Resources

### Project Information
- **Repository**: https://github.com/Labelh/FichesTechniques
- **Deployment**: https://labelh.github.io/FichesTechniques/
- **Version**: 1.0.0
- **License**: Proprietary

### External Documentation
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [Zustand Documentation](https://github.com/pmndrs/zustand)

### Useful Links
- [Firebase Console](https://console.firebase.google.com/)
- [GitHub Actions](https://github.com/Labelh/FichesTechniques/actions)
- [Lucide Icons](https://lucide.dev/)

---

**Last Updated**: 2025-11-13
**Maintained By**: Project Team
**For**: AI Assistants working on FichesTechniques codebase

---

*This document should be kept up to date as the project evolves. When making significant architectural changes, update this guide accordingly.*
