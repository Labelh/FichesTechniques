import {
  createTool as createToolFirestore,
  updateTool as updateToolFirestore,
  deleteTool as deleteToolFirestore,
  getAllTools as getAllToolsFirestore,
} from '@/lib/firestore';
import type { Tool } from '@/types';

/**
 * Crée un nouvel outil dans Firestore
 */
export async function createTool(data: Partial<Tool>): Promise<string> {
  try {
    const toolData: any = {
      name: data.name || 'Nouvel outil',
      designation: data.designation || '',
      category: data.category || 'Général',
      owned: data.owned || false,
      quantity: data.quantity || 1,
      location: data.location || '',
      condition: data.condition || 'good',
      notes: data.notes || '',
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
