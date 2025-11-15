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
  url?: string; // URL hébergée (ImgBB, etc.)
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

  // Outil spécifique à cette sous-étape
  toolId?: string;
  tool?: Tool;

  // Conseils et sécurité par sous-étape
  tips?: string[];
  safetyNotes?: SafetyNote[];
}

export interface Phase extends BaseEntity {
  procedureId: string;
  order: number;
  phaseNumber?: number; // Numéro de phase personnalisable
  title: string;
  difficulty: DifficultyLevel;
  estimatedTime: number; // en minutes

  // Contenu
  steps: SubStep[];

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
  reference?: string; // Référence de la procédure
  title: string;
  designation?: string; // Nom descriptif de la procédure
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
  coverImage?: string; // URL Firebase Storage

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
  parentId?: string;
  procedureCount: number;
}

export interface Tag extends BaseEntity {
  name: string;
  color: string;
  procedureCount: number;
}

export interface UserPreferences extends BaseEntity {
  theme: 'light' | 'dark' | 'auto';
  accentColor: string;
  fontSize: 'compact' | 'normal' | 'comfortable';
  density: 'compact' | 'normal' | 'spacious';
  defaultView: 'grid' | 'list' | 'kanban';
  autoSave: boolean;
  autoSaveInterval: number;
  confirmBeforeDelete: boolean;
  defaultPDFConfig: PDFConfig;
  keyboardShortcuts: Record<string, string>;
}

// ==========================================
// CONFIGURATION PDF
// ==========================================

export interface PDFConfig {
  // Format
  pageSize: 'a4' | 'letter' | 'a5';
  orientation: 'portrait' | 'landscape';
  columns: 1 | 2;

  // Qualité
  imageQuality: 'high' | 'medium' | 'low';

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
