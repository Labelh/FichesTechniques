import {
  createTemplate,
  getAllTemplates,
  updateTemplate as updateTemplateFirestore,
  deleteTemplate as deleteTemplateFirestore,
} from '@/lib/firestore';
import { addPhase } from '@/services/procedureService';
import type { ProcedureTemplate, Phase } from '@/types';

/**
 * Crée un template de phase à partir d'une phase existante
 * Sauvegardé dans Firestore pour synchronisation cloud
 */
export async function createPhaseTemplate(
  phase: Phase,
  templateName: string,
  category: string = 'Général'
): Promise<string> {
  const template: Omit<ProcedureTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
    name: templateName,
    description: `Template basé sur: ${phase.title}`,
    category,
    defaultPhases: [{
      ...phase,
      id: '', // Will be regenerated when used
      procedureId: '', // Will be set when used
      completed: false,
    }],
    defaultTools: [],
    defaultMaterials: [],
    usageCount: 0,
  };

  const templateId = await createTemplate(template);
  return templateId;
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

    const templates = await getAllTemplates();
    const template = templates.find(t => t.id === templateId);
    if (!template) {
      throw new Error(`Template ${templateId} introuvable`);
    }

    const newPhaseIds: string[] = [];

    // Créer chaque phase du template dans Firestore
    for (const templatePhase of template.defaultPhases) {
      const phaseData: Partial<Phase> = {
        title: templatePhase.title || 'Nouvelle phase',
        difficulty: (templatePhase.difficulty as any) || 'medium',
        estimatedTime: templatePhase.estimatedTime || 30,
        riskLevel: (templatePhase.riskLevel as any) || 'low',
        steps: templatePhase.steps || [],
        completed: false,
      };

      console.log('Creating phase from template:', phaseData);
      const phaseId = await addPhase(procedureId, phaseData);
      newPhaseIds.push(phaseId);
    }

    // Incrémenter le compteur d'utilisation du template dans Firestore
    await updateTemplateFirestore(templateId, {
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
  return await getAllTemplates();
}

/**
 * Récupère les templates par catégorie
 */
export async function getPhaseTemplatesByCategory(category: string): Promise<ProcedureTemplate[]> {
  const allTemplates = await getAllTemplates();
  return allTemplates.filter(t => t.category === category);
}

/**
 * Met à jour un template
 */
export { updateTemplateFirestore };

/**
 * Supprime un template
 */
export async function deletePhaseTemplate(templateId: string): Promise<void> {
  await deleteTemplateFirestore(templateId);
}

/**
 * Met à jour un template
 */
export async function updatePhaseTemplate(
  templateId: string,
  updates: Partial<ProcedureTemplate>
): Promise<void> {
  await updateTemplateFirestore(templateId, updates);
}
