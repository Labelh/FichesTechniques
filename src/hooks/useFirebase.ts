import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { collections, convertTimestamps } from '@/lib/firestore';
import type {
  Procedure,
  Tool,
  Material,
  Category,
  Tag,
  ProcedureTemplate,
  UserPreferences,
  ProcedureStatus,
  SearchFilters,
  SortOption,
} from '@/types';

// ==========================================
// PROCEDURES HOOKS
// ==========================================

/**
 * Hook pour récupérer toutes les procédures avec filtres et tri optionnels
 */
export function useProcedures(filters?: SearchFilters, sort?: SortOption) {
  const [procedures, setProcedures] = useState<Procedure[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const constraints: QueryConstraint[] = [];

    // Appliquer les filtres Firestore (seulement ceux supportés par les index)
    if (filters?.status && filters.status.length > 0) {
      constraints.push(where('status', 'in', filters.status));
    }

    if (filters?.categories && filters.categories.length === 1) {
      constraints.push(where('category', '==', filters.categories[0]));
    }

    // Tri
    if (sort) {
      constraints.push(orderBy(sort.field, sort.direction));
    } else {
      constraints.push(orderBy('updatedAt', 'desc'));
    }

    const q = query(collection(db, collections.procedures), ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let results = snapshot.docs.map(doc =>
          convertTimestamps<Procedure>({
            id: doc.id,
            ...doc.data(),
          })
        );

        // Filtres côté client (pour les filtres complexes)
        if (filters) {
          // Filtre par tags
          if (filters.tags && filters.tags.length > 0) {
            results = results.filter(p =>
              p.tags.some(tag => filters.tags!.includes(tag))
            );
          }

          // Filtre par priorité
          if (filters.priority && filters.priority.length > 0) {
            results = results.filter(p => filters.priority!.includes(p.priority));
          }

          // Filtre par niveau de risque
          if (filters.riskLevel && filters.riskLevel.length > 0) {
            results = results.filter(p => filters.riskLevel!.includes(p.riskLevel));
          }

          // Filtre par temps estimé
          if (filters.minEstimatedTime) {
            results = results.filter(p => p.estimatedTotalTime >= filters.minEstimatedTime!);
          }

          if (filters.maxEstimatedTime) {
            results = results.filter(p => p.estimatedTotalTime <= filters.maxEstimatedTime!);
          }

          // Filtre par images
          if (filters.hasImages !== undefined) {
            results = results.filter(p =>
              filters.hasImages ? p.phases.some(ph => ph.steps.some(s => s.images && s.images.length > 0)) : true
            );
          }

          if (filters.hasCoverImage !== undefined) {
            results = results.filter(p =>
              filters.hasCoverImage ? !!p.coverImage : !p.coverImage
            );
          }

          // Filtre par score de validation
          if (filters.validationScoreMin !== undefined) {
            results = results.filter(p => p.validationScore >= filters.validationScoreMin!);
          }

          // Recherche texte
          if (filters.query) {
            const searchLower = filters.query.toLowerCase();
            results = results.filter(
              p =>
                p.title.toLowerCase().includes(searchLower) ||
                p.description.toLowerCase().includes(searchLower) ||
                p.tags.some(tag => tag.toLowerCase().includes(searchLower))
            );
          }
        }

        setProcedures(results);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching procedures:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [filters, sort]);

  return { data: procedures, loading, error };
}

/**
 * Hook pour récupérer une procédure par son ID
 */
export function useProcedure(id?: string) {
  const [procedure, setProcedure] = useState<Procedure | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      setProcedure(null);
      setLoading(false);
      return;
    }

    const docRef = doc(db, collections.procedures, id);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setProcedure(
            convertTimestamps<Procedure>({
              id: snapshot.id,
              ...snapshot.data(),
            })
          );
        } else {
          setProcedure(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching procedure:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [id]);

  return { data: procedure, loading, error };
}

/**
 * Hook pour récupérer les procédures par statut
 */
export function useProceduresByStatus(status: ProcedureStatus) {
  const [procedures, setProcedures] = useState<Procedure[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, collections.procedures),
      where('status', '==', status),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map(doc =>
        convertTimestamps<Procedure>({
          id: doc.id,
          ...doc.data(),
        })
      );
      setProcedures(results);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [status]);

  return { data: procedures, loading };
}

/**
 * Hook pour récupérer les procédures d'une catégorie
 */
export function useProceduresByCategory(category: string) {
  const [procedures, setProcedures] = useState<Procedure[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, collections.procedures),
      where('category', '==', category),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map(doc =>
        convertTimestamps<Procedure>({
          id: doc.id,
          ...doc.data(),
        })
      );
      setProcedures(results);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [category]);

  return { data: procedures, loading };
}

/**
 * Hook pour les statistiques des procédures
 */
export function useProcedureStats() {
  const [stats, setStats] = useState<any>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, collections.procedures),
      (snapshot) => {
        const allProcedures = snapshot.docs.map(doc =>
          convertTimestamps<Procedure>({
            id: doc.id,
            ...doc.data(),
          })
        );

        const calculatedStats = {
          total: allProcedures.length,
          byStatus: {} as Record<ProcedureStatus, number>,
          byDifficulty: {} as Record<string, number>,
          byCategory: {} as Record<string, number>,
          totalEstimatedTime: 0,
          totalEstimatedCost: 0,
          averageCompletionPercentage: 0,
        };

        allProcedures.forEach((proc) => {
          // Par statut
          calculatedStats.byStatus[proc.status] =
            (calculatedStats.byStatus[proc.status] || 0) + 1;

          // Par catégorie
          calculatedStats.byCategory[proc.category] =
            (calculatedStats.byCategory[proc.category] || 0) + 1;

          // Temps total
          calculatedStats.totalEstimatedTime += proc.estimatedTotalTime || 0;

          // Coût total
          calculatedStats.totalEstimatedCost += proc.totalCost || 0;

          // Completion
          calculatedStats.averageCompletionPercentage += proc.completionPercentage || 0;
        });

        if (allProcedures.length > 0) {
          calculatedStats.averageCompletionPercentage /= allProcedures.length;
        }

        setStats(calculatedStats);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { data: stats, loading };
}

/**
 * Hook pour les procédures récentes
 */
export function useRecentProcedures(limitCount: number = 5) {
  const [procedures, setProcedures] = useState<Procedure[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, collections.procedures),
      orderBy('updatedAt', 'desc'),
      limit(limitCount)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map(doc =>
        convertTimestamps<Procedure>({
          id: doc.id,
          ...doc.data(),
        })
      );
      setProcedures(results);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [limitCount]);

  return { data: procedures, loading };
}

// ==========================================
// OTHER HOOKS
// ==========================================

/**
 * Hook pour récupérer tous les outils
 */
export function useTools() {
  const [tools, setTools] = useState<Tool[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, collections.tools),
      (snapshot) => {
        const results = snapshot.docs.map(doc =>
          convertTimestamps<Tool>({
            id: doc.id,
            ...doc.data(),
          })
        );
        setTools(results);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { data: tools, loading };
}

/**
 * Hook pour récupérer tous les matériaux
 */
export function useMaterials() {
  const [materials, setMaterials] = useState<Material[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, collections.materials),
      (snapshot) => {
        const results = snapshot.docs.map(doc =>
          convertTimestamps<Material>({
            id: doc.id,
            ...doc.data(),
          })
        );
        setMaterials(results);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { data: materials, loading };
}

/**
 * Hook pour récupérer toutes les catégories
 */
export function useCategories() {
  const [categories, setCategories] = useState<Category[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, collections.categories),
      (snapshot) => {
        const results = snapshot.docs.map(doc =>
          convertTimestamps<Category>({
            id: doc.id,
            ...doc.data(),
          })
        );
        setCategories(results);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { data: categories, loading };
}

/**
 * Hook pour récupérer tous les tags
 */
export function useTags() {
  const [tags, setTags] = useState<Tag[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, collections.tags),
      (snapshot) => {
        const results = snapshot.docs.map(doc =>
          convertTimestamps<Tag>({
            id: doc.id,
            ...doc.data(),
          })
        );
        setTags(results);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { data: tags, loading };
}

/**
 * Hook pour récupérer tous les templates
 */
export function useTemplates() {
  const [templates, setTemplates] = useState<ProcedureTemplate[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, collections.templates),
      (snapshot) => {
        const results = snapshot.docs.map(doc =>
          convertTimestamps<ProcedureTemplate>({
            id: doc.id,
            ...doc.data(),
          })
        );
        setTemplates(results);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { data: templates, loading };
}

/**
 * Hook pour récupérer les préférences utilisateur
 */
export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, collections.preferences),
      (snapshot) => {
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          setPreferences(
            convertTimestamps<UserPreferences>({
              id: doc.id,
              ...doc.data(),
            })
          );
        } else {
          setPreferences(null);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { data: preferences, loading };
}
