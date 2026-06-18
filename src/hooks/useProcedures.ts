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

    // Construire la requête Firestore pour les procédures
    let q = query(collection(db, 'procedures'));

    // Note: Firestore a des limitations sur les requêtes complexes
    // On appliquera certains filtres côté client

    // Deux listeners INDÉPENDANTS (procédures + phases) recombinés à chaque émission.
    // ⚠️ Ne jamais imbriquer le listener phases dans le callback procédures :
    // cela recrée un abonnement à chaque changement (fuite + amplification massive
    // des lectures Firestore → saturation du quota).
    let procsRaw: Procedure[] = [];
    let phasesRaw: any[] = [];
    let gotProcs = false;
    let gotPhases = false;

    const process = () => {
      if (!gotProcs || !gotPhases) return;

      // Associer les phases aux procédures
      let results = procsRaw.map(proc => ({
        ...proc,
        phases: phasesRaw.filter((phase: any) => phase.procedureId === proc.id).sort((a: any, b: any) => a.order - b.order)
      }));

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

        // Filtre par difficulté des phases
        if (filters?.difficulty && filters.difficulty.length > 0) {
          results = results.filter(p => {
            if (!p.phases || p.phases.length === 0) return false;
            return p.phases.some((phase: any) =>
              filters.difficulty!.includes(phase.difficulty)
            );
          });
        }

        // Recherche avancée dans tous les champs
        if (filters?.query) {
          const searchLower = filters.query.toLowerCase();
          results = results.filter(p => {
            // Recherche dans les champs principaux
            if (
              p.title.toLowerCase().includes(searchLower) ||
              (p.description && p.description.toLowerCase().includes(searchLower)) ||
              (p.reference && p.reference.toLowerCase().includes(searchLower)) ||
              (p.designation && p.designation.toLowerCase().includes(searchLower))
            ) {
              return true;
            }

            // Recherche dans les phases
            if (p.phases && p.phases.length > 0) {
              return p.phases.some((phase: any) => {
                // Recherche dans le titre et la description de la phase
                if (
                  (phase.title && phase.title.toLowerCase().includes(searchLower)) ||
                  (phase.description && phase.description.toLowerCase().includes(searchLower))
                ) {
                  return true;
                }

                // Recherche dans les étapes de la phase
                if (phase.steps && phase.steps.length > 0) {
                  return phase.steps.some((step: any) => {
                    if (step.content && step.content.toLowerCase().includes(searchLower)) {
                      return true;
                    }

                    // Recherche dans les sous-étapes
                    if (step.substeps && step.substeps.length > 0) {
                      return step.substeps.some((substep: any) =>
                        (substep.description && substep.description.toLowerCase().includes(searchLower)) ||
                        (substep.expectedResult && substep.expectedResult.toLowerCase().includes(searchLower))
                      );
                    }

                    return false;
                  });
                }

                return false;
              });
            }

            return false;
          });
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
          // Tri par défaut : par statut, puis updatedAt desc à statut égal
          const STATUS_ORDER: Record<string, number> = {
            'en_cours': 0,
            'verification': 1,
            'relecture': 2,
            'mise_a_jour_timetonic': 3,
            'completed': 4,
          };
          results.sort((a, b) => {
            const aOrder = STATUS_ORDER[a.status] ?? 0;
            const bOrder = STATUS_ORDER[b.status] ?? 0;
            if (aOrder !== bOrder) return aOrder - bOrder;
            const aDate = a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt);
            const bDate = b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt);
            return bDate.getTime() - aDate.getTime();
          });
        }

      setProcedures(results);
      setLoading(false);
    };

    const unsubscribeProcedures = onSnapshot(q, (snapshot) => {
      procsRaw = snapshot.docs.map(doc =>
        convertTimestamps<Procedure>({ id: doc.id, ...doc.data() })
      );
      gotProcs = true;
      process();
    }, (error) => {
      console.error('Error fetching procedures:', error);
      setLoading(false);
    });

    const unsubscribePhases = onSnapshot(query(collection(db, 'phases')), (phasesSnap) => {
      phasesRaw = phasesSnap.docs.map(doc =>
        convertTimestamps<any>({ id: doc.id, ...doc.data() })
      );
      gotPhases = true;
      process();
    }, (error) => {
      console.error('Error fetching phases:', error);
      setLoading(false);
    });

    return () => { unsubscribeProcedures(); unsubscribePhases(); };
  }, [filters?.status, filters?.categories, filters?.tags, filters?.priority, filters?.difficulty, filters?.query, sort]);

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

    // Deux listeners indépendants (doc procédure + ses phases), recombinés.
    // (Pas de listener phases imbriqué dans le callback procédure : fuite + lectures.)
    const procedureRef = doc(db, 'procedures', id);
    const phasesQuery = query(
      collection(db, 'phases'),
      where('procedureId', '==', id),
      firestoreOrderBy('order', 'asc')
    );

    let procData: Procedure | undefined;
    let phases: any[] = [];
    let gotProc = false;

    const emit = () => {
      if (!gotProc) return;
      if (!procData) { setProcedure(undefined); return; }
      setProcedure({ ...procData, phases: phases as any });
    };

    const unsubscribeProcedure = onSnapshot(procedureRef, (docSnap) => {
      procData = docSnap.exists()
        ? convertTimestamps<Procedure>({ id: docSnap.id, ...docSnap.data() })
        : undefined;
      gotProc = true;
      emit();
    });

    const unsubscribePhases = onSnapshot(phasesQuery, (phasesSnap) => {
      phases = phasesSnap.docs.map(doc =>
        convertTimestamps<any>({ id: doc.id, ...doc.data() })
      );
      emit();
    });

    return () => { unsubscribeProcedure(); unsubscribePhases(); };
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
