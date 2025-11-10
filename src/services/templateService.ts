import { db } from '@/db/database';
import { addPhase } from '@/services/procedureService';
import type { ProcedureTemplate, Phase } from '@/types';

/**
 * Crée un template de phase à partir d'une phase existante
 * Note: Les templates restent dans IndexedDB (Dexie) car ils sont locaux
 */
export async function createPhaseTemplate(
  phase: Phase,
  templateName: string,
  category: string = 'Général'
): Promise<string> {
  const now = new Date();

  const template: ProcedureTemplate = {
    id: crypto.randomUUID(),
    name: templateName,
    description: `Template basé sur: ${phase.title}`,
    category,
    defaultPhases: [{
      ...phase,
      id: '', // Will be regenerated when used
      procedureId: '', // Will be set when used
      completed: false,
      createdAt: now,
      updatedAt: now,
    }],
    defaultTools: phase.tools || [],
    defaultMaterials: phase.materials || [],
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  await db.templates.add(template);
  return template.id;
}

/**
 * Applique un template de phase à une procédure (Firestore)
 */
export async function applyPhaseTemplate(
  templateId: string,
  procedureId: string
): Promise<string[]> {
  try {
    console.log('Applying template', templateId, 'to procedure', procedureId);

    const template = await db.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} introuvable`);
    }

    const newPhaseIds: string[] = [];

    // Créer chaque phase du template dans Firestore
    for (const templatePhase of template.defaultPhases) {
      const phaseData = {
        title: templatePhase.title || 'Nouvelle phase',
        description: templatePhase.description || '',
        difficulty: templatePhase.difficulty || 'medium',
        estimatedTime: templatePhase.estimatedTime || 30,
        riskLevel: templatePhase.riskLevel || 'low',
        tools: templatePhase.tools || [],
        toolIds: templatePhase.toolIds || [],
        materials: templatePhase.materials || [],
        steps: templatePhase.steps || [],
        images: templatePhase.images || [],
        safetyNotes: templatePhase.safetyNotes || [],
        tips: templatePhase.tips || [],
        completed: false,
      };

      console.log('Creating phase from template:', phaseData);
      const phaseId = await addPhase(procedureId, phaseData);
      newPhaseIds.push(phaseId);
    }

    // Incrémenter le compteur d'utilisation du template (reste dans IndexedDB)
    await db.templates.update(templateId, {
      usageCount: (template.usageCount || 0) + 1,
    });

    console.log('Template applied successfully, created phases:', newPhaseIds);
    return newPhaseIds;
  } catch (error) {
    console.error('Error applying template:', error);
    throw error;
  }
}

/**
 * Récupère tous les templates de phases
 */
export async function getAllPhaseTemplates(): Promise<ProcedureTemplate[]> {
  return await db.templates.toArray();
}

/**
 * Récupère les templates par catégorie
 */
export async function getPhaseTemplatesByCategory(category: string): Promise<ProcedureTemplate[]> {
  return await db.templates.where('category').equals(category).toArray();
}

/**
 * Supprime un template
 */
export async function deletePhaseTemplate(templateId: string): Promise<void> {
  await db.templates.delete(templateId);
}

/**
 * Met à jour un template
 */
export async function updatePhaseTemplate(
  templateId: string,
  updates: Partial<ProcedureTemplate>
): Promise<void> {
  await db.templates.update(templateId, {
    ...updates,
    updatedAt: new Date(),
  });
}
