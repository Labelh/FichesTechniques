import {
  createProcedure as createProcedureFirestore,
  updateProcedure as updateProcedureFirestore,
  deleteProcedure as deleteProcedureFirestore,
  getProcedure as getProcedureFirestore,
  createPhase as createPhaseFirestore,
  getPhasesByProcedure as getPhasesByProcedureFirestore,
  updatePhase as updatePhaseFirestore,
  deletePhase as deletePhaseFirestore,
} from '@/lib/firestore';
import type { Procedure, Phase, DifficultyLevel } from '@/types';

// ==========================================
// PROCEDURE CRUD - FIRESTORE
// ==========================================

/**
 * Cree une nouvelle procedure dans Firestore
 */
export async function createProcedure(
  data: Partial<Procedure>
): Promise<string> {
  try {
    // Préparer les données en supprimant les undefined
    const procedureData: any = {
      title: data.title || 'Nouvelle Procedure',
      description: data.description || '',
      category: data.category || '',
      tags: data.tags || [],
      status: data.status || 'en_cours',
      priority: data.priority || 'normal',
      estimatedTotalTime: 0,
      totalCost: 0,
      requiredSkills: data.requiredSkills || [],
      riskLevel: data.riskLevel || 'low',
      phases: [],
      globalTools: [],
      globalToolIds: [],
      globalMaterials: [],
      viewCount: 0,
      exportCount: 0,
      version: 1,
      validationScore: 0,
      completionPercentage: 0,
    };

    // Ajouter reference seulement si défini
    if (data.reference) {
      procedureData.reference = data.reference;
    }

    console.log('Creating procedure with data:', procedureData);
    console.log('Data size (approx):', JSON.stringify(procedureData).length, 'bytes');
    const procedureId = await createProcedureFirestore(procedureData);
    console.log('Procedure created with ID:', procedureId);

    return procedureId;
  } catch (error) {
    console.error('Error creating procedure:', error);
    throw error;
  }
}

/**
 * Met a jour une procedure
 */
export async function updateProcedure(
  id: string,
  updates: Partial<Procedure>
): Promise<void> {
  try {
    // Recuperer la procedure existante pour calculer les totaux
    const procedure = await getProcedureFirestore(id);
    if (!procedure) {
      throw new Error(`Procedure ${id} introuvable`);
    }

    const updatedData = { ...updates };

    // Recalculer les totaux si les phases sont fournies
    if (updates.phases) {
      updatedData.estimatedTotalTime = calculateTotalTime(updates.phases);
      updatedData.completionPercentage = calculateCompletion({ ...procedure, ...updates });
      updatedData.validationScore = calculateValidationScore({ ...procedure, ...updates });
    }

    console.log('Updating procedure', id, 'with data size:', JSON.stringify(updatedData).length, 'bytes');
    await updateProcedureFirestore(id, updatedData);
  } catch (error) {
    console.error('Error updating procedure:', error);
    throw error;
  }
}

/**
 * Supprime une procedure
 */
export async function deleteProcedure(id: string): Promise<void> {
  const procedure = await getProcedureFirestore(id);
  if (!procedure) {
    throw new Error(`Procedure ${id} introuvable`);
  }

  // La suppression des phases est geree automatiquement par deleteProcedureFirestore
  await deleteProcedureFirestore(id);
}

// ==========================================
// PHASES
// ==========================================

/**
 * Ajoute une phase a une procedure
 */
export async function addPhase(
  procedureId: string,
  phaseData: Partial<Phase>
): Promise<string> {
  const procedure = await getProcedureFirestore(procedureId);
  if (!procedure) {
    throw new Error(`Procedure ${procedureId} introuvable`);
  }

  // Recuperer les phases existantes pour determiner l'ordre
  const existingPhases = await getPhasesByProcedureFirestore(procedureId);

  const now = new Date();
  const phaseToCreate: Omit<Phase, 'id' | 'createdAt' | 'updatedAt'> = {
    procedureId,
    order: existingPhases.length,
    title: phaseData.title || 'Nouvelle Phase',
    description: phaseData.description || '',
    difficulty: phaseData.difficulty || ('medium' as DifficultyLevel),
    estimatedTime: phaseData.estimatedTime || 30,
    tools: phaseData.tools || [],
    toolIds: phaseData.toolIds || [],
    materials: phaseData.materials || [],
    steps: phaseData.steps || [],
    images: phaseData.images || [],
    safetyNotes: phaseData.safetyNotes || [],
    tips: phaseData.tips || [],
    riskLevel: phaseData.riskLevel || ('low' as any),
    completed: false,
    ...phaseData,
  };

  const phaseId = await createPhaseFirestore(phaseToCreate);

  // Mettre a jour les totaux de la procedure
  const allPhases = [...existingPhases, { ...phaseToCreate, id: phaseId, createdAt: now, updatedAt: now }];
  await updateProcedureWithPhaseCalculations(procedureId, allPhases);

  return phaseId;
}

/**
 * Met a jour une phase
 */
export async function updatePhase(
  procedureId: string,
  phaseId: string,
  updates: Partial<Phase>
): Promise<void> {
  const procedure = await getProcedureFirestore(procedureId);
  if (!procedure) {
    throw new Error(`Procedure ${procedureId} introuvable`);
  }

  // Mettre a jour la phase dans Firestore
  await updatePhaseFirestore(phaseId, updates);

  // Recuperer toutes les phases pour recalculer les totaux
  const allPhases = await getPhasesByProcedureFirestore(procedureId);
  await updateProcedureWithPhaseCalculations(procedureId, allPhases);
}

/**
 * Supprime une phase
 */
export async function deletePhase(
  procedureId: string,
  phaseId: string
): Promise<void> {
  const procedure = await getProcedureFirestore(procedureId);
  if (!procedure) {
    throw new Error(`Procedure ${procedureId} introuvable`);
  }

  // Supprimer la phase
  await deletePhaseFirestore(phaseId);

  // Recuperer les phases restantes
  const remainingPhases = await getPhasesByProcedureFirestore(procedureId);

  // Reordonner les phases
  const reorderedPhases = remainingPhases.map((phase, index) => ({
    ...phase,
    order: index,
  }));

  // Mettre a jour l'ordre de chaque phase
  await Promise.all(
    reorderedPhases.map(phase =>
      updatePhaseFirestore(phase.id, { order: phase.order })
    )
  );

  // Mettre a jour les totaux de la procedure
  await updateProcedureWithPhaseCalculations(procedureId, reorderedPhases);
}

/**
 * Reordonne les phases
 */
export async function reorderPhases(
  procedureId: string,
  phaseIds: string[]
): Promise<void> {
  const procedure = await getProcedureFirestore(procedureId);
  if (!procedure) {
    throw new Error(`Procedure ${procedureId} introuvable`);
  }

  // Recuperer toutes les phases
  const allPhases = await getPhasesByProcedureFirestore(procedureId);

  // Creer un map pour un acces rapide
  const phaseMap = new Map(allPhases.map(p => [p.id, p]));

  // Verifier que tous les IDs existent
  for (const id of phaseIds) {
    if (!phaseMap.has(id)) {
      throw new Error(`Phase ${id} introuvable`);
    }
  }

  // Mettre a jour l'ordre de chaque phase
  await Promise.all(
    phaseIds.map((id, index) =>
      updatePhaseFirestore(id, { order: index })
    )
  );

  // Recuperer les phases avec le nouvel ordre
  const reorderedPhases = await getPhasesByProcedureFirestore(procedureId);
  await updateProcedureWithPhaseCalculations(procedureId, reorderedPhases);
}

// ==========================================
// HELPERS
// ==========================================

/**
 * Met a jour la procedure avec les calculs bases sur les phases
 */
async function updateProcedureWithPhaseCalculations(
  procedureId: string,
  phases: Phase[]
): Promise<void> {
  const procedure = await getProcedureFirestore(procedureId);
  if (!procedure) return;

  const estimatedTotalTime = calculateTotalTime(phases);
  const procedureWithPhases = { ...procedure, phases };
  const completionPercentage = calculateCompletion(procedureWithPhases);
  const validationScore = calculateValidationScore(procedureWithPhases);

  await updateProcedureFirestore(procedureId, {
    estimatedTotalTime,
    completionPercentage,
    validationScore,
  });
}

/**
 * Calcule le temps total d'une procedure
 */
function calculateTotalTime(phases: Phase[]): number {
  return phases.reduce((total, phase) => total + (phase.estimatedTime || 0), 0);
}

/**
 * Calcule le pourcentage de completion
 */
function calculateCompletion(procedure: Procedure): number {
  let totalPoints = 0;
  let earnedPoints = 0;

  // Titre et description (10 points)
  totalPoints += 10;
  if (procedure.title && procedure.description) earnedPoints += 10;

  // Categorie (5 points)
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

  // Outils definis (10 points)
  totalPoints += 10;
  if (procedure.globalTools.length > 0 || procedure.phases.some((p) => p.tools.length > 0)) {
    earnedPoints += 10;
  }

  // Temps estime (5 points)
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
