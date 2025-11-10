import { useEffect, useState } from 'react';
import { collection, query, where, orderBy as firestoreOrderBy, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { convertTimestamps } from '@/lib/firestore';
import type { ProcedureStatus, SearchFilters, SortOption, Procedure } from '@/types';

/**
 * Hook pour récupérer toutes les procédures avec filtres et tri optionnels
 * Utilise Firestore avec écoute en temps réel
 */
export function useProcedures(filters?: SearchFilters, sort?: SortOption) {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    // Construire la requête Firestore
    let q = query(collection(db, 'procedures'));

    // Note: Firestore a des limitations sur les requêtes complexes
    // On appliquera certains filtres côté client

    // Écouter les changements en temps réel
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let results = snapshot.docs.map(doc =>
        convertTimestamps<Procedure>({
          id: doc.id,
          ...doc.data(),
        })
      );

      // Appliquer les filtres côté client
      if (filters?.status && filters.status.length > 0) {
        results = results.filter(p => filters.status!.includes(p.status));
      }

      if (filters?.categories && filters.categories.length > 0) {
        results = results.filter(p => filters.categories!.includes(p.category));
      }

      if (filters?.tags && filters.tags.length > 0) {
        results = results.filter(p =>
          p.tags && p.tags.some(tag => filters.tags!.includes(tag))
        );
      }

      if (filters?.priority && filters.priority.length > 0) {
        results = results.filter(p => filters.priority!.includes(p.priority));
      }

      if (filters?.query) {
        const searchLower = filters.query.toLowerCase();
        results = results.filter(p =>
          p.title.toLowerCase().includes(searchLower) ||
          (p.description && p.description.toLowerCase().includes(searchLower)) ||
          (p.reference && p.reference.toLowerCase().includes(searchLower))
        );
      }

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
        results.sort((a, b) => {
          const aDate = a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt);
          const bDate = b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt);
          return bDate.getTime() - aDate.getTime();
        });
      }

      setProcedures(results);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching procedures:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [filters?.status, filters?.categories, filters?.tags, filters?.priority, filters?.query, sort]);

  return loading ? undefined : procedures;
}

/**
 * Hook pour récupérer une procédure par son ID avec ses phases
 * Utilise Firestore avec écoute en temps réel
 */
export function useProcedure(id?: string): Procedure | undefined {
  const [procedure, setProcedure] = useState<Procedure | undefined>(undefined);

  useEffect(() => {
    if (!id) {
      setProcedure(undefined);
      return;
    }

    // Écouter les changements de la procédure
    const procedureRef = doc(db, 'procedures', id);
    const unsubscribeProcedure = onSnapshot(procedureRef, async (docSnap) => {
      if (!docSnap.exists()) {
        setProcedure(undefined);
        return;
      }

      const procedureData = convertTimestamps<Procedure>({
        id: docSnap.id,
        ...docSnap.data(),
      });

      // Récupérer les phases associées
      const phasesQuery = query(
        collection(db, 'phases'),
        where('procedureId', '==', id),
        firestoreOrderBy('order', 'asc')
      );

      const unsubscribePhases = onSnapshot(phasesQuery, (phasesSnap) => {
        const phases = phasesSnap.docs.map(doc =>
          convertTimestamps<any>({
            id: doc.id,
            ...doc.data(),
          })
        );

        setProcedure({
          ...procedureData,
          phases: phases as any,
        });
      });

      return () => unsubscribePhases();
    });

    return () => unsubscribeProcedure();
  }, [id]);

  return procedure;
}

/**
 * Hook pour récupérer les procédures par statut
 */
export function useProceduresByStatus(status: ProcedureStatus) {
  const [procedures, setProcedures] = useState<Procedure[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'procedures'),
      where('status', '==', status)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map(doc =>
        convertTimestamps<Procedure>({
          id: doc.id,
          ...doc.data(),
        })
      );
      setProcedures(results);
    });

    return () => unsubscribe();
  }, [status]);

  return procedures;
}

/**
 * Hook pour récupérer les procédures d'une catégorie
 */
export function useProceduresByCategory(category: string) {
  const [procedures, setProcedures] = useState<Procedure[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'procedures'),
      where('category', '==', category)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map(doc =>
        convertTimestamps<Procedure>({
          id: doc.id,
          ...doc.data(),
        })
      );
      setProcedures(results);
    });

    return () => unsubscribe();
  }, [category]);

  return procedures;
}

/**
 * Hook pour les statistiques des procédures
 */
export function useProcedureStats() {
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    enCours: 0,
    completed: 0,
    archived: 0,
  });

  useEffect(() => {
    const q = query(collection(db, 'procedures'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const procedures = snapshot.docs.map(doc => doc.data() as Procedure);

      setStats({
        total: procedures.length,
        draft: procedures.filter(p => p.status === 'draft').length,
        enCours: procedures.filter(p => p.status === 'en_cours').length,
        completed: procedures.filter(p => p.status === 'completed').length,
        archived: procedures.filter(p => p.status === 'archived').length,
      });
    });

    return () => unsubscribe();
  }, []);

  return stats;
}

/**
 * Hook pour les procédures récentes
 */
export function useRecentProcedures(limitCount: number = 5) {
  const [procedures, setProcedures] = useState<Procedure[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'procedures'),
      firestoreOrderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs
        .slice(0, limitCount)
        .map(doc =>
          convertTimestamps<Procedure>({
            id: doc.id,
            ...doc.data(),
          })
        );
      setProcedures(results);
    });

    return () => unsubscribe();
  }, [limitCount]);

  return procedures;
}
