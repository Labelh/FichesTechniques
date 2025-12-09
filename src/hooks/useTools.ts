import { useState, useEffect } from 'react';
import { fetchConsumables } from '@/services/consumablesService';
import { getCategories, getStorageZones } from '@/services/supabaseService';
import type { Tool, Consumable } from '@/types';

/**
 * Hook pour récupérer les outils depuis Supabase (consommables)
 * et enrichissement avec les données Supabase (catégories et zones de stockage)
 */
export function useTools() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTools = async () => {
      setLoading(true);
      try {
        console.log('🔧 useTools: Loading tools from Supabase...');

        // Récupérer les consommables depuis Supabase
        const consumables = await fetchConsumables();
        console.log('🔧 useTools: Consumables loaded:', consumables.length);
        console.log('🔧 useTools: First 3 consumables:', consumables.slice(0, 3).map(c => ({
          id: c.id,
          designation: c.designation,
          hasPhoto: !!c.photo,
          hasImageUrl: !!c.image_url,
          hasPhotoUrl: !!c.photo_url
        })));

        // Récupérer les catégories et zones de stockage pour enrichissement
        const [categories, storageZones] = await Promise.all([
          getCategories(),
          getStorageZones()
        ]);

        // Convertir les consommables en outils
        const convertedTools: Tool[] = consumables.map((consumable: Consumable) => {
          // Déterminer l'URL de l'image (priorité: photo > image_url > photo_url)
          const imageUrl = consumable.photo || consumable.image_url || consumable.photo_url;

          const tool: Tool = {
            id: consumable.id,
            name: consumable.designation || '',
            description: consumable.description || '',
            category: consumable.category || '',
            reference: consumable.reference,
            price: consumable.price,
            image: imageUrl ? { url: imageUrl } : undefined,
            deleted: false,
            createdAt: consumable.created_at ? new Date(consumable.created_at) : new Date(),
            updatedAt: consumable.updated_at ? new Date(consumable.updated_at) : new Date(),
          };

          return tool;
        });

        console.log('🔧 useTools: Converted tools count:', convertedTools.length);
        console.log('🔧 useTools: First 3 converted tools:', convertedTools.slice(0, 3).map(t => ({
          id: t.id,
          name: t.name,
          hasImage: !!t.image,
          imageUrl: t.image?.url?.substring(0, 50)
        })));

        setTools(convertedTools);
        setLoading(false);
      } catch (error) {
        console.error('🔧 useTools: Error loading tools from Supabase:', error);
        setTools([]);
        setLoading(false);
      }
    };

    loadTools();
  }, []);

  return loading ? undefined : tools;
}
