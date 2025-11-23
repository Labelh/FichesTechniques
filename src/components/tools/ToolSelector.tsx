import { useState, useMemo, useEffect } from 'react';
import { Search, X, Wrench, Package, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { Tool, Consumable } from '@/types';

interface ToolSelectorProps {
  availableTools: Tool[];
  availableConsumables: Consumable[];
  onSelect: (toolId: string, toolName: string, toolLocation?: string, toolReference?: string, type?: 'tool' | 'consumable') => void;
  onClose: () => void;
}

type ToolOrConsumable = (Tool & { type: 'tool' }) | (Consumable & { type: 'consumable'; name?: string });

export default function ToolSelector({ availableTools, availableConsumables, onSelect, onClose }: ToolSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'tool' | 'consumable'>('all');
  const [selectedItem, setSelectedItem] = useState<ToolOrConsumable | null>(null);
  const [storageZoneFilter, setStorageZoneFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Combiner outils et consommables
  const allItems: ToolOrConsumable[] = useMemo(() => {
    const tools: ToolOrConsumable[] = availableTools.map(t => ({ ...t, type: 'tool' as const }));
    const consumables: ToolOrConsumable[] = availableConsumables.map(c => ({
      ...c,
      type: 'consumable' as const,
      name: c.designation
    }));
    return [...tools, ...consumables];
  }, [availableTools, availableConsumables]);

  // Sélectionner automatiquement le premier item au chargement
  useEffect(() => {
    if (allItems.length > 0 && !selectedItem) {
      setSelectedItem(allItems[0]);
    }
  }, [allItems]);

  // Extraire toutes les zones de stockage uniques
  const storageZones = useMemo(() => {
    const zonesMap = new Map<string, { id: string; name: string }>();
    allItems.forEach(item => {
      if (item.type === 'tool' && item.storage_zone_id) {
        if (!zonesMap.has(item.storage_zone_id)) {
          zonesMap.set(item.storage_zone_id, {
            id: item.storage_zone_id,
            name: item.storageZoneData?.name || item.storage_zone_id
          });
        }
      }
    });
    return Array.from(zonesMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allItems]);

  // Filtrer les items
  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      // Filtre par type
      if (filterType !== 'all' && item.type !== filterType) return false;

      // Filtre par zone de stockage
      if (storageZoneFilter && item.type === 'tool') {
        if (item.storage_zone_id !== storageZoneFilter) return false;
      }

      // Filtre par recherche
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const name = item.type === 'tool' ? item.name : item.designation;
        const reference = item.reference || '';
        const location = item.type === 'tool' ? (item.location || '') : ((item as any).emplacement || (item as any).location || '');
        const storageZone = item.type === 'tool' ? (item.storage_zone_id || '') : '';

        return (
          name.toLowerCase().includes(query) ||
          reference.toLowerCase().includes(query) ||
          location.toLowerCase().includes(query) ||
          storageZone.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [allItems, searchQuery, filterType, storageZoneFilter]);

  const handleSelect = async () => {
    if (!selectedItem) return;

    setIsLoading(true);

    // Simuler un léger délai pour l'effet de chargement
    await new Promise(resolve => setTimeout(resolve, 300));

    const name = selectedItem.type === 'tool' ? selectedItem.name : selectedItem.designation;
    const location = selectedItem.type === 'tool'
      ? selectedItem.location
      : ((selectedItem as any).emplacement || (selectedItem as any).location);
    const reference = selectedItem.reference;

    onSelect(selectedItem.id, name, location, reference, selectedItem.type);
    setIsLoading(false);
    onClose();
  };

  const getItemImage = (item: ToolOrConsumable) => {
    if (item.type === 'tool') {
      return item.image?.url;
    } else {
      return (item as any).image_url || (item as any).photo_url;
    }
  };

  const getItemLocation = (item: ToolOrConsumable) => {
    if (item.type === 'tool') {
      return item.location;
    } else {
      return (item as any).emplacement || (item as any).location;
    }
  };


  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] rounded-xl border border-[#323232] max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#323232]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Sélectionner un outil ou consommable</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  type="text"
                  placeholder="Rechercher par nom, référence, emplacement ou zone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filterType === 'all' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setFilterType('all')}
              >
                Tous ({allItems.length})
              </Button>
              <Button
                variant={filterType === 'tool' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setFilterType('tool')}
              >
                <Wrench className="h-4 w-4 mr-1" />
                Outils ({availableTools.length})
              </Button>
              <Button
                variant={filterType === 'consumable' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setFilterType('consumable')}
              >
                <Package className="h-4 w-4 mr-1" />
                Consommables ({availableConsumables.length})
              </Button>

              {/* Filtre par zone de stockage */}
              {storageZones.length > 0 && filterType !== 'consumable' && (
                <>
                  <div className="w-px bg-[#323232] mx-1" />
                  <select
                    value={storageZoneFilter}
                    onChange={(e) => setStorageZoneFilter(e.target.value)}
                    className="px-3 py-1.5 text-sm rounded-lg border border-[#323232] bg-background-elevated text-text-primary"
                  >
                    <option value="">Toutes les zones</option>
                    {storageZones.map(zone => (
                      <option key={zone.id} value={zone.id}>{zone.name}</option>
                    ))}
                  </select>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Liste des items */}
          <div className="flex-1 overflow-y-auto p-6">
            {filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">Aucun résultat trouvé</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredItems.map((item) => {
                  const imageUrl = getItemImage(item);
                  const name = item.type === 'tool' ? item.name : item.designation;
                  const isSelected = selectedItem?.id === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-[#323232] bg-background-elevated hover:border-primary/50'
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
                            {item.type === 'tool' ? (
                              <Wrench className="h-6 w-6 text-text-muted" />
                            ) : (
                              <Package className="h-6 w-6 text-text-muted" />
                            )}
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white mb-1 truncate">{name}</div>
                          {item.reference && (
                            <div className="text-xs text-gray-400 truncate">
                              Réf: {item.reference}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              item.type === 'tool'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-green-500/20 text-green-400'
                            }`}>
                              {item.type === 'tool' ? 'Outil' : 'Consommable'}
                            </span>
                            {item.type === 'tool' && item.storage_zone_id && (
                              <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {item.storageZoneData?.name || item.storage_zone_id}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Aperçu détaillé - Toujours visible */}
          <div className="w-96 border-l border-[#323232] p-6 bg-background-surface overflow-y-auto">
            {selectedItem ? (
              <>
                <h3 className="text-lg font-bold text-white mb-4">Détails</h3>

                {/* Image */}
                {getItemImage(selectedItem) ? (
                  <img
                    src={getItemImage(selectedItem)}
                    alt={selectedItem.type === 'tool' ? selectedItem.name : selectedItem.designation}
                    className="w-full h-48 object-cover rounded-lg border border-[#323232] mb-4"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-48 bg-background rounded-lg border border-[#323232] flex items-center justify-center mb-4">
                    {selectedItem.type === 'tool' ? (
                      <Wrench className="h-16 w-16 text-text-muted" />
                    ) : (
                      <Package className="h-16 w-16 text-text-muted" />
                    )}
                  </div>
                )}

                {/* Informations */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wide">Nom</label>
                    <p className="text-sm text-white font-medium mt-1">
                      {selectedItem.type === 'tool' ? selectedItem.name : selectedItem.designation}
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

                  {selectedItem.type === 'tool' && (selectedItem.storageZoneData || selectedItem.storage_zone_id) && (
                    <div>
                      <label className="text-xs text-gray-400 uppercase tracking-wide">Zone de stockage</label>
                      <p className="text-sm text-purple-400 mt-1 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {selectedItem.storageZoneData?.name || selectedItem.storage_zone_id}
                      </p>
                      {selectedItem.storageZoneData?.location && (
                        <p className="text-xs text-gray-400 mt-1">
                          Localisation: {selectedItem.storageZoneData.location}
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wide">Type</label>
                    <p className={`text-sm mt-1 inline-block px-2 py-1 rounded ${
                      selectedItem.type === 'tool'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-green-500/20 text-green-400'
                    }`}>
                      {selectedItem.type === 'tool' ? 'Outil' : 'Consommable'}
                    </p>
                  </div>

                  {/* Catégorie pour les outils */}
                  {selectedItem.type === 'tool' && (selectedItem.categoryData || selectedItem.category) && (
                    <div>
                      <label className="text-xs text-gray-400 uppercase tracking-wide">Catégorie</label>
                      <p className="text-sm text-white mt-1">
                        {selectedItem.categoryData?.name || selectedItem.category}
                      </p>
                      {selectedItem.categoryData?.description && (
                        <p className="text-xs text-gray-400 mt-1">
                          {selectedItem.categoryData.description}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Informations supplémentaires pour les consommables */}
                  {selectedItem.type === 'consumable' && (
                    <>
                      {(selectedItem as any).quantite && (
                        <div>
                          <label className="text-xs text-gray-400 uppercase tracking-wide">Quantité disponible</label>
                          <p className="text-sm text-white mt-1">
                            {(selectedItem as any).quantite}
                          </p>
                        </div>
                      )}
                      {(selectedItem as any).categorie && (
                        <div>
                          <label className="text-xs text-gray-400 uppercase tracking-wide">Catégorie</label>
                          <p className="text-sm text-white mt-1">
                            {(selectedItem as any).categorie}
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Description */}
                  {selectedItem.type === 'tool' && selectedItem.description && (
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
                  <p className="text-sm">Sélectionnez un item pour voir les détails</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#323232] flex justify-between items-center">
          <p className="text-sm text-gray-400">
            {filteredItems.length} résultat{filteredItems.length > 1 ? 's' : ''}
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} disabled={isLoading}>
              Annuler
            </Button>
            <Button
              onClick={handleSelect}
              disabled={!selectedItem || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Chargement...
                </>
              ) : (
                'Sélectionner'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
