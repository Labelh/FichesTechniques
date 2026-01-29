import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  Wrench
} from 'lucide-react';
import { fetchConsumables } from '@/services/consumablesService';
import { supabase } from '@/lib/supabase';
import { Consumable } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { toast } from 'sonner';

const STORAGE_BUCKET = 'product-photos';

function isStoragePath(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.startsWith('products/') && !value.startsWith('http') && !value.startsWith('data:');
}

function getProductPhotoUrl(filePath: string | null | undefined): string | null {
  if (!filePath) return null;
  if (filePath.startsWith('http') || filePath.startsWith('data:')) {
    return filePath;
  }
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
  return data?.publicUrl || null;
}

export default function ToolsLibrary() {
  const [searchTerm, setSearchTerm] = useState('');
  const [tools, setTools] = useState<Consumable[]>([]);
  const [selectedItem, setSelectedItem] = useState<Consumable | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Récupération des outils depuis Supabase uniquement
  const loadTools = async () => {
    setIsLoading(true);
    try {
      const data = await fetchConsumables();
      setTools(data);
      toast.success(`${data.length} outils chargés`);
    } catch (error: any) {
      console.error('Error loading tools:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTools();
  }, []);

  // Sélectionner automatiquement le premier item au chargement
  useEffect(() => {
    if (tools.length > 0 && !selectedItem) {
      setSelectedItem(tools[0]);
    }
  }, [tools]);

  // Filtrage des items
  const filteredItems = useMemo(() => {
    return tools.filter(item => {
      // Filtre par recherche
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const name = item.designation || '';
        const reference = item.reference || '';
        const description = item.description || '';
        const category = item.category || '';

        if (
          !name.toLowerCase().includes(query) &&
          !reference.toLowerCase().includes(query) &&
          !description.toLowerCase().includes(query) &&
          !category.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [tools, searchTerm]);

  const getItemImage = (item: Consumable) => {
    const anyItem = item as any;

    // Vérifier le champ photo
    if (anyItem.photo) {
      if (isStoragePath(anyItem.photo)) {
        return getProductPhotoUrl(anyItem.photo);
      }
      return anyItem.photo;
    }

    // Fallback sur photo_url
    if (anyItem.photo_url) {
      return isStoragePath(anyItem.photo_url)
        ? getProductPhotoUrl(anyItem.photo_url)
        : anyItem.photo_url;
    }

    // Fallback sur image_url
    if (anyItem.image_url) {
      return isStoragePath(anyItem.image_url)
        ? getProductPhotoUrl(anyItem.image_url)
        : anyItem.image_url;
    }

    // Fallback sur image.url
    if (anyItem.image?.url) {
      return isStoragePath(anyItem.image.url)
        ? getProductPhotoUrl(anyItem.image.url)
        : anyItem.image.url;
    }

    return undefined;
  };

  const getItemLocation = (item: Consumable) => {
    return (item as any).emplacement || (item as any).location;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="p-6 border-b border-[#323232] bg-background-surface">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Bibliothèque d'outils</h1>
            <p className="text-sm text-gray-400 mt-1">
              {filteredItems.length} outil{filteredItems.length > 1 ? 's' : ''}
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={loadTools}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Rafraîchir
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            type="text"
            placeholder="Rechercher par nom ou référence..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Content - Two Panels */}
      <div className="flex-1 overflow-hidden flex">
        {/* Liste des items - Gauche */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-16 w-16 mx-auto text-text-muted mb-4 animate-spin" />
              <p className="text-gray-400">Chargement des outils...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Wrench className="h-16 w-16 mx-auto text-text-muted mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                Aucun élément trouvé
              </h3>
              <p className="text-gray-400">
                Essayez de modifier vos filtres
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredItems.map((item) => {
                const imageUrl = getItemImage(item);
                const name = item.designation || item.reference || 'Sans nom';
                const isSelected = selectedItem?.id === item.id;
                const category = item.category || '';
                const location = getItemLocation(item) || '';

                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`p-3 rounded-lg border transition-all text-left ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-[#2a2a2a] bg-background-elevated hover:border-[#404040]'
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Image */}
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={name}
                          className="h-16 w-16 object-cover rounded border border-[#323232] flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="h-16 w-16 bg-background rounded border border-[#323232] flex items-center justify-center flex-shrink-0">
                          <Wrench className="h-6 w-6 text-text-muted" />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white mb-1 truncate">{name}</div>
                        {item.reference && (
                          <div className="text-xs text-gray-400 truncate mb-1">
                            {item.reference}
                          </div>
                        )}
                        {category && (
                          <div className="text-xs text-gray-400 truncate">
                            Catégorie: {category}
                          </div>
                        )}
                        {location && (
                          <div className="text-xs text-gray-400 truncate">
                            {location}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Panneau de détails - Droite */}
        <div className="w-96 border-l border-[#323232] p-6 bg-background-surface overflow-y-auto">
          {selectedItem ? (
            <>
              <h3 className="text-lg font-bold text-white mb-4">Détails</h3>

              {/* Image */}
              {getItemImage(selectedItem) ? (
                <img
                  src={getItemImage(selectedItem)}
                  alt={selectedItem.designation || ''}
                  className="w-full h-48 object-cover rounded-lg border border-[#323232] mb-4"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-48 bg-background rounded-lg border border-[#323232] flex items-center justify-center mb-4">
                  <Wrench className="h-16 w-16 text-text-muted" />
                </div>
              )}

              {/* Informations */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wide">Nom</label>
                  <p className="text-sm text-white font-medium mt-1">
                    {selectedItem.designation || 'Sans nom'}
                  </p>
                </div>

                {selectedItem.reference && (
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wide">Référence</label>
                    <p className="text-sm font-medium mt-1" style={{ color: 'rgb(249, 55, 5)' }}>
                      {selectedItem.reference}
                    </p>
                  </div>
                )}

                {getItemLocation(selectedItem) && (
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wide">Emplacement</label>
                    <p className="text-sm text-gray-300 mt-1">
                      {getItemLocation(selectedItem)}
                    </p>
                  </div>
                )}

                {selectedItem.category && (
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wide">Catégorie</label>
                    <p className="text-sm text-white mt-1">
                      {selectedItem.category}
                    </p>
                  </div>
                )}

                {(selectedItem as any).quantite && (
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wide">Quantité disponible</label>
                    <p className="text-sm text-white mt-1">
                      {(selectedItem as any).quantite}
                    </p>
                  </div>
                )}

                {(selectedItem as any).prix && (
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wide">Prix</label>
                    <p className="text-sm text-white mt-1">
                      {(selectedItem as any).prix}€
                    </p>
                  </div>
                )}

                {selectedItem.description && (
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wide">Description</label>
                    <p className="text-sm text-gray-300 mt-1">
                      {selectedItem.description}
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <Wrench className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Sélectionnez un outil pour voir les détails</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
