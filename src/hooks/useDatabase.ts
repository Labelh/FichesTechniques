// Wrappers pour compatibilité avec l'ancienne API (retourne directement les données)
import {
  useTools as useFirebaseTools,
  useMaterials as useFirebaseMaterials,
  useCategories as useFirebaseCategories,
  useTags as useFirebaseTags,
  useTemplates as useFirebaseTemplates,
  usePreferences as useFirebasePreferences,
} from './useFirebase';

/**
 * Hook pour récupérer tous les outils
 */
export function useTools() {
  const { data } = useFirebaseTools();
  return data;
}

/**
 * Hook pour récupérer tous les matériaux
 */
export function useMaterials() {
  const { data } = useFirebaseMaterials();
  return data;
}

/**
 * Hook pour récupérer toutes les catégories
 */
export function useCategories() {
  const { data } = useFirebaseCategories();
  return data;
}

/**
 * Hook pour récupérer tous les tags
 */
export function useTags() {
  const { data } = useFirebaseTags();
  return data;
}

/**
 * Hook pour récupérer tous les templates
 */
export function useTemplates() {
  const { data } = useFirebaseTemplates();
  return data;
}

/**
 * Hook pour récupérer les préférences utilisateur
 */
export function usePreferences() {
  const { data } = useFirebasePreferences();
  return data;
}
