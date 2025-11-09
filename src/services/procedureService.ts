import { db } from '@/db/database';
import type { Procedure, Phase, DifficultyLevel, ProcedureStatus } from '@/types';

// ==========================================
// PROCEDURE CRUD
// ==========================================

/**
 * Crée une nouvelle procédure
 */
export async function createProcedure(
  data: Partial<Procedure>
): Promise<string> {
  const now = new Date();

  const procedure: Procedure = {
    id: crypto.randomUUID(),
    title: data.title || 'Nouvelle Procédure',
    description: data.description || '',
    category: data.category || '',
    tags: data.tags || [],
    status: data.status || ('en_cours' as ProcedureStatus),
    priority: data.priority || ('normal' as any),
    estimatedTotalTime: 0,
    totalCost: 0,
    requiredSkills: data.requiredSkills || [],
    riskLevel: data.riskLevel || ('low' as any),
    phases: [],
    globalTools: [],
    globalToolIds: [],
    globalMaterials: [],
    viewCount: 0,
    exportCount: 0,
    version: 1,
    validationScore: 0,
    completionPercentage: 0,
    createdAt: now,
    updatedAt: now,
    ...data,
  };

  await db.procedures.add(procedure);

  // Créer une entrée dans l'historique
  await db.history.add({
    id: crypto.randomUUID(),
    procedureId: procedure.id,
    action: 'created',
    createdAt: now,
    updatedAt: now,
  });

  return procedure.id;
}

/**
 * Met à jour une procédure
 */
export async function updateProcedure(
  id: string,
  updates: Partial<Procedure>
): Promise<void> {
  const procedure = await db.procedures.get(id);
  if (!procedure) {
    throw new Error(`Procédure ${id} introuvable`);
  }

  const updatedProcedure = {
    ...procedure,
    ...updates,
    updatedAt: new Date(),
  };

  // Recalculer les totaux si nécessaire
  if (updates.phases) {
    updatedProcedure.estimatedTotalTime = calculateTotalTime(updates.phases);
    updatedProcedure.completionPercentage = calculateCompletion(updatedProcedure);
    updatedProcedure.validationScore = calculateValidationScore(updatedProcedure);
  }

  await db.procedures.update(id, updatedProcedure);

  // Ajouter à l'historique
  await db.history.add({
    id: crypto.randomUUID(),
    procedureId: id,
    action: 'updated',
    changes: updates,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

/**
 * Supprime une procédure
 */
export async function deleteProcedure(id: string): Promise<void> {
  const procedure = await db.procedures.get(id);
  if (!procedure) {
    throw new Error(`Procédure ${id} introuvable`);
  }

  // Supprimer les phases associées
  await db.phases.where('procedureId').equals(id).delete();

  // Sauvegarder dans l'historique avant suppression
  await db.history.add({
    id: crypto.randomUUID(),
    procedureId: id,
    action: 'deleted',
    snapshot: procedure,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.procedures.delete(id);
}

/**
 * Duplique une procédure
 */
export async function duplicateProcedure(id: string): Promise<string> {
  const original = await db.procedures.get(id);
  if (!original) {
    throw new Error(`Procédure ${id} introuvable`);
  }

  const now = new Date();
  const duplicate: Procedure = {
    ...original,
    id: crypto.randomUUID(),
    title: `${original.title} (Copie)`,
    status: 'draft' as ProcedureStatus,
    createdAt: now,
    updatedAt: now,
    viewCount: 0,
    exportCount: 0,
    version: 1,
  };

  await db.procedures.add(duplicate);

  await db.history.add({
    id: crypto.randomUUID(),
    procedureId: duplicate.id,
    action: 'duplicated',
    createdAt: now,
    updatedAt: now,
  });

  return duplicate.id;
}

// ==========================================
// PHASES
// ==========================================

/**
 * Ajoute une phase à une procédure
 */
export async function addPhase(
  procedureId: string,
  phaseData: Partial<Phase>
): Promise<string> {
  const procedure = await db.procedures.get(procedureId);
  if (!procedure) {
    throw new Error(`Procédure ${procedureId} introuvable`);
  }

  const now = new Date();
  const phase: Phase = {
    id: crypto.randomUUID(),
    procedureId,
    order: procedure.phases.length,
    title: phaseData.title || 'Nouvelle Phase',
    description: phaseData.description || '',
    difficulty: phaseData.difficulty || ('medium' as DifficultyLevel),
    estimatedTime: phaseData.estimatedTime || 30,
    tools: [],
    toolIds: [],
    materials: [],
    steps: [],
    images: [],
    safetyNotes: [],
    tips: [],
    riskLevel: phaseData.riskLevel || ('low' as any),
    completed: false,
    createdAt: now,
    updatedAt: now,
    ...phaseData,
  };

  // Ajouter la phase à la procédure
  procedure.phases.push(phase);
  await updateProcedure(procedureId, { phases: procedure.phases });

  return phase.id;
}

/**
 * Met à jour une phase
 */
export async function updatePhase(
  procedureId: string,
  phaseId: string,
  updates: Partial<Phase>
): Promise<void> {
  const procedure = await db.procedures.get(procedureId);
  if (!procedure) {
    throw new Error(`Procédure ${procedureId} introuvable`);
  }

  const phaseIndex = procedure.phases.findIndex((p) => p.id === phaseId);
  if (phaseIndex === -1) {
    throw new Error(`Phase ${phaseId} introuvable`);
  }

  procedure.phases[phaseIndex] = {
    ...procedure.phases[phaseIndex],
    ...updates,
    updatedAt: new Date(),
  };

  await updateProcedure(procedureId, { phases: procedure.phases });
}

/**
 * Supprime une phase
 */
export async function deletePhase(
  procedureId: string,
  phaseId: string
): Promise<void> {
  const procedure = await db.procedures.get(procedureId);
  if (!procedure) {
    throw new Error(`Procédure ${procedureId} introuvable`);
  }

  procedure.phases = procedure.phases.filter((p) => p.id !== phaseId);

  // Réordonner les phases
  procedure.phases.forEach((phase, index) => {
    phase.order = index;
  });

  await updateProcedure(procedureId, { phases: procedure.phases });
}

/**
 * Réordonne les phases
 */
export async function reorderPhases(
  procedureId: string,
  phaseIds: string[]
): Promise<void> {
  const procedure = await db.procedures.get(procedureId);
  if (!procedure) {
    throw new Error(`Procédure ${procedureId} introuvable`);
  }

  const reorderedPhases = phaseIds.map((id, index) => {
    const phase = procedure.phases.find((p) => p.id === id);
    if (!phase) throw new Error(`Phase ${id} introuvable`);
    return { ...phase, order: index };
  });

  await updateProcedure(procedureId, { phases: reorderedPhases });
}

// ==========================================
// HELPERS
// ==========================================

/**
 * Calcule le temps total d'une procédure
 */
function calculateTotalTime(phases: Phase[]): number {
  return phases.reduce((total, phase) => total + (phase.estimatedTime || 0), 0);
}

/**
 * Calcule le pourcentage de complétion
 */
function calculateCompletion(procedure: Procedure): number {
  let totalPoints = 0;
  let earnedPoints = 0;

  // Titre et description (10 points)
  totalPoints += 10;
  if (procedure.title && procedure.description) earnedPoints += 10;

  // Catégorie (5 points)
  totalPoints += 5;
  if (procedure.category) earnedPoints += 5;

  // Au moins une phase (20 points)
  totalPoints += 20;
  if (procedure.phases.length > 0) earnedPoints += 20;

  // Chaque phase a une description (20 points)
  totalPoints += 20;
  const phasesWithDesc = procedure.phases.filter((p) => p.description).length;
  earnedPoints += (phasesWithDesc / Math.max(procedure.phases.length, 1)) * 20;

  // Au moins une image (15 points)
  totalPoints += 15;
  const hasImages = procedure.phases.some((p) => p.images.length > 0) || !!procedure.coverImage;
  if (hasImages) earnedPoints += 15;

  // Outils définis (10 points)
  totalPoints += 10;
  if (procedure.globalTools.length > 0 || procedure.phases.some((p) => p.tools.length > 0)) {
    earnedPoints += 10;
  }

  // Temps estimé (5 points)
  totalPoints += 5;
  if (procedure.estimatedTotalTime > 0) earnedPoints += 5;

  // Tags (5 points)
  totalPoints += 5;
  if (procedure.tags.length > 0) earnedPoints += 5;

  // Image de couverture (5 points)
  totalPoints += 5;
  if (procedure.coverImage) earnedPoints += 5;

  return Math.round((earnedPoints / totalPoints) * 100);
}

/**
 * Calcule le score de validation
 */
function calculateValidationScore(procedure: Procedure): number {
  return calculateCompletion(procedure);
}
