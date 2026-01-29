import { useState, useEffect } from 'react';
import { fetchConsumables } from '@/services/consumablesService';
import { getStorageZones } from '@/services/supabaseService';
import { base64ToBlob } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { Tool, Consumable, Image } from '@/types';

const STORAGE_BUCKET = 'product-photos';

/**
 * Vérifie si une valeur est un chemin Storage (vs base64 ou URL)
 */
function isStoragePath(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.startsWith('products/') && !value.startsWith('http') && !value.startsWith('data:');
}

/**
 * Obtient l'URL publique d'une photo depuis Supabase Storage
 */
function getProductPhotoUrl(filePath: string | null | undefined): string | null {
  if (!filePath) return null;

  // Si c'est déjà une URL complète ou du base64, le retourner tel quel
  if (filePath.startsWith('http') || filePath.startsWith('data:')) {
    return filePath;
  }

  // Si c'est un chemin Storage, construire l'URL publique
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
  return data?.publicUrl || null;
}

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

        // Récupérer les consommables et zones de stockage depuis Supabase
        const [consumables, storageZonesMap] = await Promise.all([
          fetchConsumables(),
          getStorageZones()
        ]);
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
          // Déterminer l'URL de l'image
          // Le champ photo peut contenir:
          // 1. Un chemin Storage (ex: "products/abc123.jpg") -> convertir en URL publique
          // 2. Du base64 (ex: "data:image/...") -> utiliser tel quel
          // 3. Une URL complète -> utiliser tel quel
          let imageUrl: string | undefined = undefined;

          if (consumable.photo) {
            if (isStoragePath(consumable.photo)) {
              // C'est un chemin Storage, obtenir l'URL publique
              imageUrl = getProductPhotoUrl(consumable.photo) || undefined;
            } else {
              // C'est du base64 ou une URL complète
              imageUrl = consumable.photo;
            }
          }
          // Fallback sur photo_url ou image_url si photo n'est pas défini
          else if (consumable.photo_url) {
            imageUrl = isStoragePath(consumable.photo_url)
              ? getProductPhotoUrl(consumable.photo_url) || undefined
              : consumable.photo_url;
          }
          else if (consumable.image_url) {
            imageUrl = isStoragePath(consumable.image_url)
              ? getProductPhotoUrl(consumable.image_url) || undefined
              : consumable.image_url;
          }

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

          // Assembler l'emplacement à partir de storage_zone, shelf et position
          let location: string | undefined = undefined;
          const locationParts: string[] = [];
          if (consumable.storage_zone_id) {
            const zone = storageZonesMap.get(consumable.storage_zone_id);
            if (zone) locationParts.push(zone.name);
          }
          if (consumable.shelf) locationParts.push(consumable.shelf);
          if (consumable.position) locationParts.push(consumable.position);
          if (locationParts.length > 0) {
            location = '[' + locationParts.join('-') + ']';
          }

          const tool: Tool = {
            id: consumable.id,
            name: consumable.designation || '',
            description: consumable.description || '',
            category: consumable.category || '',
            reference: consumable.reference,
            price: consumable.price,
            image: image,
            location: location,
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
