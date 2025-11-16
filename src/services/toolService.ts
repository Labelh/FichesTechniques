import {
  createTool as createToolFirestore,
  updateTool as updateToolFirestore,
  deleteTool as deleteToolFirestore,
  getAllTools as getAllToolsFirestore,
} from '@/lib/firestore';
import { supabase } from '@/lib/supabase';
import type { Tool } from '@/types';

/**
 * Crée un nouvel outil dans Firestore
 */
export async function createTool(data: Partial<Tool>): Promise<string> {
  try {
    const toolData: any = {
      name: data.name || 'Nouvel outil',
      description: data.description || '',
      category: data.category || 'Général',
      location: data.location || '',
      reference: data.reference || '',
      alternatives: data.alternatives || [],
      consumables: data.consumables || [],
    };

    console.log('Creating tool with data:', toolData);
    const toolId = await createToolFirestore(toolData);
    console.log('Tool created with ID:', toolId);
    return toolId;
  } catch (error) {
    console.error('Error creating tool:', error);
    throw error;
  }
}

/**
 * Met à jour un outil
 */
export async function updateTool(id: string, updates: Partial<Tool>): Promise<void> {
  try {
    await updateToolFirestore(id, updates);
  } catch (error) {
    console.error('Error updating tool:', error);
    throw error;
  }
}

/**
 * Supprime un outil
 */
export async function deleteTool(id: string): Promise<void> {
  try {
    await deleteToolFirestore(id);
  } catch (error) {
    console.error('Error deleting tool:', error);
    throw error;
  }
}

/**
 * Récupère tous les outils
 */
export async function getAllTools(): Promise<Tool[]> {
  try {
    return await getAllToolsFirestore();
  } catch (error) {
    console.error('Error getting tools:', error);
    throw error;
  }
}

// Liste des noms de tables possibles pour les outils dans Supabase
const possibleToolTableNames = [
  'outils',
  'tools',
  'equipements',
  'equipment',
];

let cachedToolTableName: string | null = null;

/**
 * Détermine le nom de la table des outils dans Supabase
 */
async function findToolsTable(): Promise<string> {
  if (cachedToolTableName) {
    return cachedToolTableName;
  }

  for (const tableName of possibleToolTableNames) {
    try {
      const { error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (!error) {
        cachedToolTableName = tableName;
        console.log(`Found tools table: ${tableName}`);
        return tableName;
      }
    } catch (err) {
      // Continue to next table name
      continue;
    }
  }

  throw new Error('Could not find tools table in Supabase database');
}

/**
 * Récupère tous les outils depuis Supabase
 */
export async function fetchToolsFromSupabase(): Promise<any[]> {
  try {
    const tableName = await findToolsTable();

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .is('deleted_at', null)
      .order('designation', { ascending: true });

    if (error) {
      console.error('Error fetching tools from Supabase:', error);
      throw new Error(`Failed to fetch tools: ${error.message}`);
    }

    return data || [];
  } catch (error: any) {
    console.error('Error in fetchToolsFromSupabase:', error);
    throw error;
  }
}
