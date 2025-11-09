import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import type { ProcedureStatus, SearchFilters, SortOption, Procedure } from '@/types';

/**
 * Hook pour récupérer toutes les procédures avec filtres et tri optionnels
 */
export function useProcedures(filters?: SearchFilters, sort?: SortOption) {
  return useLiveQuery(async () => {
    let query = db.procedures.toCollection();

    // Appliquer les filtres
    if (filters?.status && filters.status.length > 0) {
      query = query.filter(p => filters.status!.includes(p.status));
    }

    if (filters?.difficulty && filters.difficulty.length > 0) {
      query = query.filter(p => filters.difficulty!.includes(p.difficulty));
    }

    if (filters?.categories && filters.categories.length > 0) {
      query = query.filter(p => filters.categories!.includes(p.category));
    }

    if (filters?.tags && filters.tags.length > 0) {
      query = query.filter(p => p.tags.some(tag => filters.tags!.includes(tag)));
    }

    if (filters?.priority && filters.priority.length > 0) {
      query = query.filter(p => filters.priority!.includes(p.priority));
    }

    let results = await query.toArray();

    // Tri
    if (sort) {
      results.sort((a, b) => {
        const aVal = (a as any)[sort.field];
        const bVal = (b as any)[sort.field];

        if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      // Tri par défaut : updatedAt desc
      results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    return results;
  }, [filters, sort]);
}

/**
 * Hook pour récupérer une procédure par son ID
 */
export function useProcedure(id?: string): Procedure | undefined {
  return useLiveQuery(
    () => id ? db.procedures.get(id) : Promise.resolve(undefined),
    [id]
  ) as Procedure | undefined;
}

/**
 * Hook pour récupérer les procédures par statut
 */
export function useProceduresByStatus(status: ProcedureStatus) {
  return useLiveQuery(
    () => db.procedures.where('status').equals(status).toArray(),
    [status]
  );
}

/**
 * Hook pour récupérer les procédures d'une catégorie
 */
export function useProceduresByCategory(category: string) {
  return useLiveQuery(
    () => db.procedures.where('category').equals(category).toArray(),
    [category]
  );
}

/**
 * Hook pour les statistiques des procédures
 */
export function useProcedureStats() {
  return useLiveQuery(async () => {
    const procedures = await db.procedures.toArray();

    return {
      total: procedures.length,
      draft: procedures.filter(p => p.status === 'draft').length,
      inProgress: procedures.filter(p => p.status === 'in_progress').length,
      completed: procedures.filter(p => p.status === 'completed').length,
      archived: procedures.filter(p => p.status === 'archived').length,
    };
  });
}

/**
 * Hook pour les procédures récentes
 */
export function useRecentProcedures(limitCount: number = 5) {
  return useLiveQuery(async () => {
    const procedures = await db.procedures
      .orderBy('updatedAt')
      .reverse()
      .limit(limitCount)
      .toArray();

    return procedures;
  }, [limitCount]);
}
