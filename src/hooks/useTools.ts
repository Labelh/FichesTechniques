import { useState, useEffect } from 'react';
import { fetchConsumables } from '@/services/consumablesService';
import { base64ToBlob } from '@/lib/utils';
import type { Tool, Consumable, Image } from '@/types';

/**
 * Hook pour récupérer les outils depuis Supabase (consommables)
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

        // Convertir les consommables en outils
        const convertedTools: Tool[] = consumables.map((consumable: Consumable) => {
          // Déterminer l'URL de l'image (priorité: photo > image_url > photo_url)
          const imageUrl = consumable.photo || consumable.image_url || consumable.photo_url;

          // Créer un objet Image si on a une URL
          let image: Image | undefined = undefined;
          if (imageUrl) {
            try {
              // Si c'est une chaîne base64, créer un Blob
              if (imageUrl.startsWith('data:image')) {
                const blob = base64ToBlob(imageUrl);
                image = {
                  id: `${consumable.id}-image`,
                  name: `${consumable.designation || 'image'}.jpg`,
                  blob: blob,
                  size: blob.size,
                  mimeType: blob.type,
                  url: imageUrl,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                };
              } else {
                // Si c'est une URL externe, créer un Blob vide avec l'URL
                const emptyBlob = new Blob([''], { type: 'image/jpeg' });
                image = {
                  id: `${consumable.id}-image`,
                  name: `${consumable.designation || 'image'}.jpg`,
                  blob: emptyBlob,
                  size: 0,
                  mimeType: 'image/jpeg',
                  url: imageUrl,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                };
              }
            } catch (error) {
              console.error('Error creating image object for tool:', consumable.designation, error);
            }
          }

          const tool: Tool = {
            id: consumable.id,
            name: consumable.designation || '',
            description: consumable.description || '',
            category: consumable.category || '',
            reference: consumable.reference,
            price: consumable.price,
            image: image,
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
