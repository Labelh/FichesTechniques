import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { convertTimestamps } from '@/lib/firestore';
import type { Tool } from '@/types';

/**
 * Hook pour récupérer les outils avec synchronisation temps réel
 */
export function useTools() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    // Écouter les changements en temps réel
    const unsubscribe = onSnapshot(
      collection(db, 'tools'),
      (snapshot) => {
        const results = snapshot.docs
          .map(doc =>
            convertTimestamps<Tool>({
              id: doc.id,
              ...doc.data(),
            })
          )
          // Filtrer les outils non supprimés
          .filter(tool => !tool.deleted);

        setTools(results);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching tools:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return loading ? undefined : tools;
}
