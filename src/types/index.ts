// ==========================================
// ENUMS
// ==========================================

export enum DifficultyLevel {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export enum ProcedureStatus {
  DRAFT = 'draft',
  EN_COURS = 'en_cours',
  IN_REVIEW = 'in_review',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

export enum Priority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum RiskLevel {
  NONE = 'none',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum AnnotationType {
  TRAJECTORY = 'trajectory',
  ARROW = 'arrow',
  RECTANGLE = 'rectangle',
  CIRCLE = 'circle',
  TEXT = 'text',
  LINE = 'line',
  CURVED_ARROW = 'curved_arrow',
  NUMBER = 'number',
  HIGHLIGHT = 'highlight',
  ZOOM_AREA = 'zoom_area',
}

export enum ViewMode {
  GRID = 'grid',
  LIST = 'list',
  KANBAN = 'kanban',
}

export enum PDFPageSize {
  A4 = 'a4',
  LETTER = 'letter',
  A5 = 'a5',
}

export enum PDFOrientation {
  PORTRAIT = 'portrait',
  LANDSCAPE = 'landscape',
}

export enum PDFQuality {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

// ==========================================
// TYPES DE BASE
// ==========================================

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Image extends BaseEntity {
  name: string;
  blob: Blob;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  thumbnail?: Blob; // Miniature pour performance
}

export interface Annotation {
  id: string;
  type: AnnotationType;
  data?: any; // Fabric.js object data (optional for backward compatibility)
  points?: { x: number; y: number }[]; // Points for trajectory, line, arrow, etc.
  text?: string; // Text content for text annotations
  label?: string; // Label to display on annotation
  layer?: number;
  visible?: boolean;
  color: string;
  strokeWidth?: number;
  createdAt: Date;
}

export interface AnnotatedImage {
  imageId: string;
  image: Image;
  annotations: Annotation[];
  description?: string;
}

export interface Tool extends BaseEntity {
  name: string;
  description: string;
  category: string;
  reference?: string; // Référence de l'outil
  location?: string; // Emplacement de l'outil
  image?: Image;
  imageId?: string;
  price?: number;
  purchaseLink?: string;
  color?: string; // Couleur de code pour les trajectoires
  alternatives?: string[]; // IDs d'autres outils
  consumables?: string[]; // Consommables associés
}

export interface Material extends BaseEntity {
  name: string;
  description?: string;
  quantity: number;
  unit: string; // pièces, mètres, litres, etc.
  price?: number;
  purchaseLink?: string;
  category?: string;
}

export interface SafetyNote {
  id: string;
  type: 'warning' | 'danger' | 'info' | 'mandatory' | 'forbidden';
  content: string;
  icon?: string;
}

export interface SubStep {
  id: string;
  order: number;
  title: string;
  description: string;
  images?: AnnotatedImage[];
  estimatedTime?: number; // en minutes
  tips?: string[];
  safetyNotes?: SafetyNote[];
}

export interface Phase extends BaseEntity {
  procedureId: string;
  order: number;
  phaseNumber?: number; // Numéro de phase personnalisable
  title: string;
  description: string;
  difficulty: DifficultyLevel;
  estimatedTime: number; // en minutes

  // Outils et matériaux
  tools: Tool[];
  toolIds: string[];
  materials: Material[];

  // Contenu
  steps: SubStep[];
  images: AnnotatedImage[];

  // Sécurité et conseils
  safetyNotes: SafetyNote[];
  tips: string[];
  commonMistakes?: string[];

  // Métadonnées
  riskLevel: RiskLevel;
  requiredSkills?: string[];
  numberOfPeople?: number;

  // État
  completed: boolean;
  notes?: string; // Notes privées
}

export interface Procedure extends BaseEntity {
  // Informations de base
  title: string;
  description: string;
  category: string;
  tags: string[];

  // Statut et priorité
  status: ProcedureStatus;
  priority: Priority;

  // Métadonnées
  estimatedTotalTime: number; // calculé automatiquement
  totalCost?: number; // calculé automatiquement

  // Conditions et prérequis
  season?: string; // Printemps, Été, etc.
  weatherConditions?: string;
  requiredSkills: string[];
  riskLevel: RiskLevel;

  // Contenu
  phases: Phase[];

  // Ressources globales (en plus des phases)
  globalTools: Tool[];
  globalToolIds: string[];
  globalMaterials: Material[];
  coverImage?: AnnotatedImage;

  // Procédures liées
  relatedProcedures?: string[]; // IDs
  prerequisites?: string[]; // IDs de procédures prérequises

  // Versioning
  version: number;
  parentVersion?: string; // ID de la version parente

  // Dates importantes
  startDate?: Date;
  endDate?: Date;
  lastExportDate?: Date;

  // Statistiques
  viewCount: number;
  exportCount: number;

  // Qualité et validation
  validationScore: number; // 0-100
  completionPercentage: number; // 0-100

  // Notes privées
  privateNotes?: string;
}

export interface ProcedureTemplate extends BaseEntity {
  name: string;
  description: string;
  category: string;
  icon?: string;
  previewImage?: Image;

  // Structure template
  defaultPhases: Partial<Phase>[];
  defaultTools: Tool[];
  defaultMaterials: Material[];

  // Métadonnées
  usageCount: number;
  lastUsed?: Date;
}

export interface Category extends BaseEntity {
  name: string;
  description?: string;
  color: string;
  icon?: string;
  parentId?: string; // Pour catégories hiérarchiques
  procedureCount: number;
}

export interface Tag extends BaseEntity {
  name: string;
  color: string;
  procedureCount: number;
}

// ==========================================
// CONFIGURATION PDF
// ==========================================

export interface PDFConfig {
  // Format
  pageSize: PDFPageSize;
  orientation: PDFOrientation;
  columns: 1 | 2;

  // Qualité
  imageQuality: PDFQuality;

  // Personnalisation
  includeTableOfContents: boolean;
  includeCoverPage: boolean;
  includeToolIndex: boolean;
  includeMaterialList: boolean;
  includePrivateNotes: boolean;

  // En-tête et pied de page
  header?: {
    enabled: boolean;
    logo?: Image;
    title?: string;
    subtitle?: string;
  };

  footer?: {
    enabled: boolean;
    showPageNumbers: boolean;
    showDate: boolean;
    showVersion: boolean;
    customText?: string;
  };

  // Watermark
  watermark?: {
    enabled: boolean;
    text: string;
    opacity: number;
  };

  // Couleurs et style
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
}

// ==========================================
// SETTINGS & PREFERENCES
// ==========================================

export interface UserPreferences extends BaseEntity {
  // Apparence
  theme: 'light' | 'dark' | 'auto';
  accentColor: string;
  fontSize: 'compact' | 'normal' | 'comfortable';
  density: 'compact' | 'normal' | 'spacious';

  // Vue par défaut
  defaultView: ViewMode;

  // Comportement
  autoSave: boolean;
  autoSaveInterval: number; // secondes
  confirmBeforeDelete: boolean;

  // PDF par défaut
  defaultPDFConfig: PDFConfig;

  // Raccourcis clavier
  keyboardShortcuts: Record<string, string>;
}

// ==========================================
// STATISTIQUES ET ANALYTICS
// ==========================================

export interface Statistics {
  totalProcedures: number;
  proceduresByStatus: Record<ProcedureStatus, number>;
  proceduresByDifficulty: Record<DifficultyLevel, number>;
  proceduresByCategory: Record<string, number>;

  totalPhases: number;
  totalTools: number;
  totalMaterials: number;
  totalImages: number;

  estimatedTotalTime: number;
  estimatedTotalCost: number;

  mostUsedTools: Tool[];
  mostUsedCategories: string[];
  mostUsedTags: string[];

  recentlyModified: Procedure[];
  recentlyCreated: Procedure[];

  completionRate: number; // Pourcentage
}

// ==========================================
// SEARCH & FILTERS
// ==========================================

export interface SearchFilters {
  query?: string;
  status?: ProcedureStatus[];
  difficulty?: DifficultyLevel[];
  categories?: string[];
  tags?: string[];
  priority?: Priority[];
  riskLevel?: RiskLevel[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  minEstimatedTime?: number;
  maxEstimatedTime?: number;
  hasImages?: boolean;
  hasCoverImage?: boolean;
  validationScoreMin?: number;
}

export interface SortOption {
  field: 'title' | 'createdAt' | 'updatedAt' | 'difficulty' | 'status' | 'priority' | 'estimatedTotalTime';
  direction: 'asc' | 'desc';
}

// ==========================================
// HISTORY & VERSIONING
// ==========================================

export interface HistoryEntry extends BaseEntity {
  procedureId: string;
  action: 'created' | 'updated' | 'deleted' | 'exported' | 'duplicated';
  changes?: Record<string, any>;
  snapshot?: Partial<Procedure>; // Snapshot complet pour restoration
  userId?: string; // Si multi-utilisateur dans le futur
}

// ==========================================
// EXPORT
// ==========================================

export interface ExportOptions {
  format: 'pdf' | 'json' | 'markdown' | 'html';
  config?: PDFConfig;
  includeImages: boolean;
  includeHistory: boolean;
}

export interface ExportResult {
  success: boolean;
  data?: Blob;
  error?: string;
  exportedAt: Date;
}

// ==========================================
// UI STATE
// ==========================================

export interface UIState {
  sidebarOpen: boolean;
  currentView: ViewMode;
  selectedProcedureId?: string;
  searchFilters: SearchFilters;
  sortOption: SortOption;
}
