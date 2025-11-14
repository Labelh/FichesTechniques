/**
 * Utilitaire de migration pour convertir les anciennes URLs Firebase Storage vers ImgBB
 */

import { getAllProcedures, updateProcedure, getPhasesByProcedure, updatePhase } from '@/lib/firestore';
import { uploadImageToHost } from '@/services/imageHostingService';
import type { Procedure, Phase, AnnotatedImage } from '@/types';

interface MigrationStats {
  totalProcedures: number;
  migratedProcedures: number;
  totalPhases: number;
  migratedPhases: number;
  totalImages: number;
  migratedImages: number;
  errors: Array<{ type: string; id: string; error: string }>;
}

/**
 * Vérifie si une URL est une URL Firebase Storage
 */
function isFirebaseStorageUrl(url: string): boolean {
  return url.includes('firebasestorage.googleapis.com') || url.includes('firebase');
}

/**
 * Télécharge une image depuis une URL et la ré-upload vers ImgBB
 */
async function reuploadImageToImgBB(imageUrl: string, imageName: string): Promise<string | null> {
  try {
    // Télécharger l'image depuis Firebase
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const blob = await response.blob();

    // Créer un objet File à partir du Blob
    const file = new File([blob], imageName, { type: blob.type });

    // Upload vers ImgBB
    console.log(`Uploading ${imageName} to ImgBB...`);
    const newUrl = await uploadImageToHost(file);
    console.log(`Successfully uploaded: ${newUrl}`);

    return newUrl;
  } catch (error) {
    console.error(`Error reupload image ${imageName}:`, error);
    return null;
  }
}

/**
 * Migre les images d'une procédure
 */
async function migrateProcedureImages(procedure: Procedure): Promise<boolean> {
  let hasChanges = false;

  // Migrer l'image de couverture
  if (procedure.coverImage && isFirebaseStorageUrl(procedure.coverImage)) {
    console.log(`Migrating cover image for procedure ${procedure.id}...`);
    const newUrl = await reuploadImageToImgBB(
      procedure.coverImage,
      `cover-${procedure.id}.jpg`
    );

    if (newUrl) {
      await updateProcedure(procedure.id, { coverImage: newUrl });
      hasChanges = true;
      console.log(`✅ Cover image migrated`);
    }
  }

  return hasChanges;
}

/**
 * Migre les images d'une phase
 */
async function migratePhaseImages(_procedureId: string, phase: Phase): Promise<number> {
  let migratedCount = 0;

  // Migrer les images des sous-étapes
  if (phase.steps && phase.steps.length > 0) {
    let hasStepChanges = false;
    const updatedSteps = [...phase.steps];

    for (let i = 0; i < updatedSteps.length; i++) {
      const step = updatedSteps[i];
      if (step.images && step.images.length > 0) {
        const updatedStepImages: AnnotatedImage[] = [];

        for (const img of step.images) {
          if (img.image.url && isFirebaseStorageUrl(img.image.url)) {
            console.log(`Migrating step image ${img.image.name}...`);
            const newUrl = await reuploadImageToImgBB(img.image.url, img.image.name);

            if (newUrl) {
              updatedStepImages.push({
                ...img,
                image: {
                  ...img.image,
                  url: newUrl,
                },
              });
              migratedCount++;
              hasStepChanges = true;
            } else {
              updatedStepImages.push(img);
            }
          } else {
            updatedStepImages.push(img);
          }
        }

        if (updatedStepImages.length > 0) {
          updatedSteps[i] = {
            ...step,
            images: updatedStepImages,
          };
        }
      }
    }

    if (hasStepChanges) {
      await updatePhase(phase.id, { steps: updatedSteps });
    }
  }

  return migratedCount;
}

/**
 * Lance la migration complète de toutes les images Firebase vers ImgBB
 */
export async function migrateAllImagesToImgBB(
  onProgress?: (stats: MigrationStats) => void
): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalProcedures: 0,
    migratedProcedures: 0,
    totalPhases: 0,
    migratedPhases: 0,
    totalImages: 0,
    migratedImages: 0,
    errors: [],
  };

  console.log('🚀 Starting migration from Firebase Storage to ImgBB...');

  try {
    // Récupérer toutes les procédures
    const procedures = await getAllProcedures();
    stats.totalProcedures = procedures.length;
    console.log(`Found ${procedures.length} procedures to check`);

    for (const procedure of procedures) {
      console.log(`\n📋 Processing procedure: ${procedure.title} (${procedure.id})`);

      try {
        // Migrer les images de la procédure
        const procedureMigrated = await migrateProcedureImages(procedure);
        if (procedureMigrated) {
          stats.migratedProcedures++;
        }

        // Récupérer les phases
        const phases = await getPhasesByProcedure(procedure.id);
        stats.totalPhases += phases.length;

        for (const phase of phases) {
          console.log(`  📑 Processing phase: ${phase.title}`);

          try {
            const migratedImagesCount = await migratePhaseImages(procedure.id, phase);

            if (migratedImagesCount > 0) {
              stats.migratedPhases++;
              stats.migratedImages += migratedImagesCount;
              stats.totalImages += migratedImagesCount;
              console.log(`  ✅ Migrated ${migratedImagesCount} images from phase`);
            }
          } catch (error: any) {
            console.error(`  ❌ Error migrating phase ${phase.id}:`, error);
            stats.errors.push({
              type: 'phase',
              id: phase.id,
              error: error.message,
            });
          }
        }
      } catch (error: any) {
        console.error(`❌ Error migrating procedure ${procedure.id}:`, error);
        stats.errors.push({
          type: 'procedure',
          id: procedure.id,
          error: error.message,
        });
      }

      // Appeler le callback de progression
      if (onProgress) {
        onProgress(stats);
      }
    }

    console.log('\n✅ Migration completed!');
    console.log(`📊 Stats:
      - Procedures migrated: ${stats.migratedProcedures}/${stats.totalProcedures}
      - Phases migrated: ${stats.migratedPhases}/${stats.totalPhases}
      - Images migrated: ${stats.migratedImages}/${stats.totalImages}
      - Errors: ${stats.errors.length}
    `);

    return stats;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Compte le nombre d'images Firebase Storage restantes
 */
export async function countFirebaseImages(): Promise<{
  procedureCoverImages: number;
  phaseImages: number;
  stepImages: number;
  total: number;
}> {
  const count = {
    procedureCoverImages: 0,
    phaseImages: 0,
    stepImages: 0,
    total: 0,
  };

  const procedures = await getAllProcedures();

  for (const procedure of procedures) {
    // Compter les images de couverture
    if (procedure.coverImage && isFirebaseStorageUrl(procedure.coverImage)) {
      count.procedureCoverImages++;
      count.total++;
    }

    // Compter les images des phases
    const phases = await getPhasesByProcedure(procedure.id);
    for (const phase of phases) {
      // Images des sous-étapes
      if (phase.steps) {
        for (const step of phase.steps) {
          if (step.images) {
            for (const img of step.images) {
              if (img.image.url && isFirebaseStorageUrl(img.image.url)) {
                count.stepImages++;
                count.total++;
              }
            }
          }
        }
      }
    }
  }

  return count;
}
