import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { convertTimestamps } from '@/lib/firestore';
import { getCategories, getStorageZones } from '@/services/supabaseService';
import type { Tool } from '@/types';

/**
 * Hook pour récupérer les outils avec synchronisation temps réel
 * et enrichissement avec les données Supabase (catégories et zones de stockage)
 */
export function useTools() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    // Récupérer les catégories et zones de stockage
    const enrichToolsData = async (baseTools: Tool[]) => {
      try {
        const [categories, storageZones] = await Promise.all([
          getCategories(),
          getStorageZones()
        ]);

        return baseTools.map(tool => {
          const enrichedTool = { ...tool };

          // Enrichir avec la catégorie
          if (tool.category_id) {
            const category = categories.get(tool.category_id);
            if (category) {
              enrichedTool.categoryData = category;
              // Mettre à jour aussi le champ category avec le nom
              enrichedTool.category = category.name;
            }
          }

          // Enrichir avec la zone de stockage
          if (tool.storage_zone_id) {
            const zone = storageZones.get(tool.storage_zone_id);
            if (zone) {
              enrichedTool.storageZoneData = zone;
            }
          }

          return enrichedTool;
        });
      } catch (error) {
        console.error('Error enriching tools data:', error);
        return baseTools;
      }
    };

    // Écouter les changements en temps réel
    const unsubscribe = onSnapshot(
      collection(db, 'tools'),
      async (snapshot) => {
        console.log('🔧 useTools: Firestore snapshot received, docs count:', snapshot.docs.length);

        const allTools = snapshot.docs.map(doc =>
          convertTimestamps<Tool>({
            id: doc.id,
            ...doc.data(),
          })
        );

        console.log('🔧 useTools: Total tools before filter:', allTools.length);
        console.log('🔧 useTools: First 3 tools:', allTools.slice(0, 3).map(t => ({
          id: t.id,
          name: t.name,
          deleted: t.deleted,
          hasImage: !!t.image,
          imageUrl: t.image?.url
        })));

        const baseTools = allTools.filter(tool => !tool.deleted);

        console.log('🔧 useTools: Tools after filter (not deleted):', baseTools.length);

        // Enrichir les outils avec les données Supabase
        const enrichedTools = await enrichToolsData(baseTools);

        console.log('🔧 useTools: Enriched tools count:', enrichedTools.length);
        setTools(enrichedTools);
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
