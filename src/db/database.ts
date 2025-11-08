import Dexie, { Table } from 'dexie';
import type {
  Procedure,
  Phase,
  Tool,
  Material,
  Image,
  ProcedureTemplate,
  Category,
  Tag,
  UserPreferences,
  HistoryEntry,
} from '@/types';

// ==========================================
// DATABASE CLASS
// ==========================================

export class FichesTechniquesDB extends Dexie {
  // Tables
  procedures!: Table<Procedure, string>;
  phases!: Table<Phase, string>;
  tools!: Table<Tool, string>;
  materials!: Table<Material, string>;
  images!: Table<Image, string>;
  templates!: Table<ProcedureTemplate, string>;
  categories!: Table<Category, string>;
  tags!: Table<Tag, string>;
  preferences!: Table<UserPreferences, string>;
  history!: Table<HistoryEntry, string>;

  constructor() {
    super('FichesTechniquesDB');

    this.version(1).stores({
      procedures: `
        id,
        title,
        status,
        priority,
        difficulty,
        category,
        createdAt,
        updatedAt,
        *tags,
        *relatedProcedures
      `,
      phases: `
        id,
        procedureId,
        order,
        difficulty,
        createdAt
      `,
      tools: `
        id,
        name,
        category,
        owned,
        createdAt
      `,
      materials: `
        id,
        name,
        category,
        createdAt
      `,
      images: `
        id,
        name,
        mimeType,
        createdAt
      `,
      templates: `
        id,
        name,
        category,
        usageCount,
        createdAt
      `,
      categories: `
        id,
        name,
        parentId,
        createdAt
      `,
      tags: `
        id,
        name,
        createdAt
      `,
      preferences: `
        id
      `,
      history: `
        id,
        procedureId,
        action,
        createdAt
      `,
    });
  }
}

// Instance singleton
export const db = new FichesTechniquesDB();

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Initialise la base de données avec des données par défaut
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // Vérifier si des préférences existent
    const prefsCount = await db.preferences.count();

    if (prefsCount === 0) {
      // Créer les préférences par défaut
      await db.preferences.add({
        id: 'default',
        theme: 'auto',
        accentColor: '#3b82f6',
        fontSize: 'normal',
        density: 'normal',
        defaultView: 'grid' as any,
        autoSave: true,
        autoSaveInterval: 30,
        confirmBeforeDelete: true,
        defaultPDFConfig: {
          pageSize: 'a4' as any,
          orientation: 'portrait' as any,
          columns: 1,
          imageQuality: 'high' as any,
          includeTableOfContents: true,
          includeCoverPage: true,
          includeToolIndex: true,
          includeMaterialList: true,
          includePrivateNotes: false,
          header: {
            enabled: true,
          },
          footer: {
            enabled: true,
            showPageNumbers: true,
            showDate: true,
            showVersion: true,
          },
          primaryColor: '#1f2937',
          accentColor: '#3b82f6',
          fontFamily: 'Helvetica',
        },
        keyboardShortcuts: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log('✅ Préférences par défaut créées');
    }

    // Créer des catégories par défaut
    const categoriesCount = await db.categories.count();
    if (categoriesCount === 0) {
      const defaultCategories = [
        {
          id: crypto.randomUUID(),
          name: 'Électricité',
          description: 'Travaux électriques',
          color: '#fbbf24',
          icon: '⚡',
          procedureCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          name: 'Plomberie',
          description: 'Travaux de plomberie',
          color: '#3b82f6',
          icon: '🚰',
          procedureCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          name: 'Menuiserie',
          description: 'Travaux de menuiserie et bois',
          color: '#92400e',
          icon: '🪚',
          procedureCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          name: 'Peinture',
          description: 'Peinture et décoration',
          color: '#ec4899',
          icon: '🎨',
          procedureCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          name: 'Maçonnerie',
          description: 'Travaux de maçonnerie',
          color: '#6b7280',
          icon: '🧱',
          procedureCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          name: 'Jardinage',
          description: 'Travaux de jardinage et extérieur',
          color: '#10b981',
          icon: '🌱',
          procedureCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await db.categories.bulkAdd(defaultCategories);
      console.log('✅ Catégories par défaut créées');
    }

    console.log('✅ Base de données initialisée');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de la base de données:', error);
    throw error;
  }
}

/**
 * Réinitialise complètement la base de données
 */
export async function resetDatabase(): Promise<void> {
  await db.delete();
  await db.open();
  await initializeDatabase();
  console.log('✅ Base de données réinitialisée');
}

/**
 * Exporte toutes les données de la base
 */
export async function exportDatabase(): Promise<any> {
  const data = {
    procedures: await db.procedures.toArray(),
    phases: await db.phases.toArray(),
    tools: await db.tools.toArray(),
    materials: await db.materials.toArray(),
    templates: await db.templates.toArray(),
    categories: await db.categories.toArray(),
    tags: await db.tags.toArray(),
    preferences: await db.preferences.toArray(),
    history: await db.history.toArray(),
    exportedAt: new Date(),
    version: 1,
  };

  return data;
}

/**
 * Importe des données dans la base
 */
export async function importDatabase(data: any): Promise<void> {
  try {
    // Clear existing data (optionnel)
    // await db.delete();
    // await db.open();

    if (data.procedures) await db.procedures.bulkPut(data.procedures);
    if (data.phases) await db.phases.bulkPut(data.phases);
    if (data.tools) await db.tools.bulkPut(data.tools);
    if (data.materials) await db.materials.bulkPut(data.materials);
    if (data.templates) await db.templates.bulkPut(data.templates);
    if (data.categories) await db.categories.bulkPut(data.categories);
    if (data.tags) await db.tags.bulkPut(data.tags);
    if (data.preferences) await db.preferences.bulkPut(data.preferences);
    if (data.history) await db.history.bulkPut(data.history);

    console.log('✅ Données importées avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de l\'importation:', error);
    throw error;
  }
}

/**
 * Obtient les statistiques de la base de données
 */
export async function getDatabaseStats() {
  const stats = {
    procedures: await db.procedures.count(),
    phases: await db.phases.count(),
    tools: await db.tools.count(),
    materials: await db.materials.count(),
    images: await db.images.count(),
    templates: await db.templates.toArray(),
    categories: await db.categories.count(),
    tags: await db.tags.count(),
    historyEntries: await db.history.count(),
  };

  return stats;
}
