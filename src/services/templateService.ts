import { db } from '@/db/database';
import type { ProcedureTemplate, Phase } from '@/types';

/**
 * Crée un template de phase à partir d'une phase existante
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
 * Applique un template de phase à une procédure
 */
export async function applyPhaseTemplate(
  templateId: string,
  procedureId: string
): Promise<string[]> {
  const template = await db.templates.get(templateId);
  if (!template) {
    throw new Error(`Template ${templateId} introuvable`);
  }

  const procedure = await db.procedures.get(procedureId);
  if (!procedure) {
    throw new Error(`Procédure ${procedureId} introuvable`);
  }

  const now = new Date();
  const newPhaseIds: string[] = [];

  // Créer une copie de chaque phase du template
  for (const templatePhase of template.defaultPhases) {
    const newPhase: Phase = {
      ...templatePhase as Phase,
      id: crypto.randomUUID(),
      procedureId,
      order: procedure.phases.length,
      title: templatePhase.title || 'Nouvelle phase',
      description: templatePhase.description || '',
      difficulty: (templatePhase.difficulty || 'medium') as any,
      estimatedTime: templatePhase.estimatedTime || 30,
      riskLevel: (templatePhase.riskLevel || 'low') as any,
      tools: templatePhase.tools || [],
      toolIds: templatePhase.toolIds || [],
      materials: templatePhase.materials || [],
      steps: templatePhase.steps || [],
      images: templatePhase.images || [],
      safetyNotes: templatePhase.safetyNotes || [],
      tips: templatePhase.tips || [],
      createdAt: now,
      updatedAt: now,
      completed: false,
    };

    procedure.phases.push(newPhase);
    newPhaseIds.push(newPhase.id);
  }

  // Mettre à jour la procédure
  await db.procedures.update(procedureId, {
    phases: procedure.phases,
    updatedAt: now,
  });

  // Incrémenter le compteur d'utilisation du template
  await db.templates.update(templateId, {
    usageCount: (template.usageCount || 0) + 1,
  });

  return newPhaseIds;
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
