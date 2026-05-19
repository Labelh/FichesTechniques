import { useState, useEffect } from 'react';
import { fetchConsumables } from '@/services/consumablesService';
import { getStorageZones } from '@/services/supabaseService';
import { base64ToBlob } from '@/lib/utils';
import type { Tool, Consumable, Image } from '@/types';

export function useTools() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTools = async () => {
      setLoading(true);
      try {
        const [consumables, storageZonesMap] = await Promise.all([
          fetchConsumables(),
          getStorageZones()
        ]);

        const convertedTools: Tool[] = consumables.map((consumable: Consumable) => {
          const imageUrl = consumable.photo || consumable.photo_url || consumable.image_url || undefined;

          let image: Image | undefined = undefined;
          if (imageUrl) {
            try {
              if (imageUrl.startsWith('data:image')) {
                const blob = base64ToBlob(imageUrl);
                image = {
                  id: `${consumable.id}-image`,
                  name: `${consumable.designation || 'image'}.jpg`,
                  blob,
                  size: blob.size,
                  mimeType: blob.type,
                  url: imageUrl,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                };
              } else {
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
            image,
            location,
            deleted: false,
            createdAt: consumable.created_at ? new Date(consumable.created_at) : new Date(),
            updatedAt: consumable.updated_at ? new Date(consumable.updated_at) : new Date(),
          };

          return tool;
        });

        setTools(convertedTools);
        setLoading(false);
      } catch (error) {
        console.error('Error loading tools from API:', error);
        setTools([]);
        setLoading(false);
      }
    };

    loadTools();
  }, []);

  return loading ? undefined : tools;
}
