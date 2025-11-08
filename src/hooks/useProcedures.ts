// Wrappers pour compatibilité avec l'ancienne API (retourne directement les données)
import {
  useProcedures as useFirebaseProcedures,
  useProcedure as useFirebaseProcedure,
  useProceduresByStatus as useFirebaseProceduresByStatus,
  useProceduresByCategory as useFirebaseProceduresByCategory,
  useProcedureStats as useFirebaseProcedureStats,
  useRecentProcedures as useFirebaseRecentProcedures,
} from './useFirebase';
import type { ProcedureStatus, SearchFilters, SortOption } from '@/types';

/**
 * Hook pour récupérer toutes les procédures avec filtres et tri optionnels
 */
export function useProcedures(filters?: SearchFilters, sort?: SortOption) {
  const { data } = useFirebaseProcedures(filters, sort);
  return data;
}

/**
 * Hook pour récupérer une procédure par son ID
 */
export function useProcedure(id?: string) {
  const { data } = useFirebaseProcedure(id);
  return data;
}

/**
 * Hook pour récupérer les procédures par statut
 */
export function useProceduresByStatus(status: ProcedureStatus) {
  const { data } = useFirebaseProceduresByStatus(status);
  return data;
}

/**
 * Hook pour récupérer les procédures d'une catégorie
 */
export function useProceduresByCategory(category: string) {
  const { data } = useFirebaseProceduresByCategory(category);
  return data;
}

/**
 * Hook pour les statistiques des procédures
 */
export function useProcedureStats() {
  const { data } = useFirebaseProcedureStats();
  return data;
}

/**
 * Hook pour les procédures récentes
 */
export function useRecentProcedures(limit: number = 5) {
  const { data } = useFirebaseRecentProcedures(limit);
  return data;
}
