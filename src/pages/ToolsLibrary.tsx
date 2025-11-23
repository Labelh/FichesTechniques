import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  Package,
  Wrench,
  MapPin,
  Tag
} from 'lucide-react';
import { fetchConsumables } from '@/services/consumablesService';
import { useTools } from '@/hooks/useTools';
import { Consumable, Tool } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { toast } from 'sonner';

type ItemType = 'tool' | 'consumable';
type LibraryItem = (Tool & { itemType: 'tool' }) | (Consumable & { itemType: 'consumable' });

export default function ToolsLibrary() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | ItemType>('all');
  const [consumables, setConsumables] = useState<Consumable[]>([]);
  const [isLoadingConsumables, setIsLoadingConsumables] = useState(false);

  // Récupérer les outils depuis Firebase (enrichis avec Supabase)
  const tools = useTools();

  // Récupération des consommables depuis Supabase
  const loadConsumables = async () => {
    setIsLoadingConsumables(true);
    try {
      const data = await fetchConsumables();
      setConsumables(data);
      toast.success(`${data.length} consommables chargés`);
    } catch (error: any) {
      console.error('Error loading consumables:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setIsLoadingConsumables(false);
    }
  };

  useEffect(() => {
    loadConsumables();
  }, []);

  // Combiner outils et consommables
  const allItems: LibraryItem[] = useMemo(() => {
    const toolItems: LibraryItem[] = (tools || []).map(tool => ({
      ...tool,
      itemType: 'tool' as const
    }));

    const consumableItems: LibraryItem[] = consumables.map(consumable => ({
      ...consumable,
      itemType: 'consumable' as const
    }));

    return [...toolItems, ...consumableItems];
  }, [tools, consumables]);

  // Filtrage des items
  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      // Filtre par type
      if (selectedType !== 'all' && item.itemType !== selectedType) return false;

      // Filtre par recherche
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const name = item.itemType === 'tool' ? item.name : item.designation;
        const reference = item.reference || '';
        const description = item.itemType === 'tool' ? (item.description || '') : (item.description || '');
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

      // Filtre par catégorie
      if (selectedCategory !== 'all') {
        const itemCategory = item.itemType === 'tool'
          ? (item.categoryData?.name || item.category)
          : item.category;
        if (itemCategory !== selectedCategory) return false;
      }

      // Filtre par zone de stockage
      if (selectedZone !== 'all') {
        if (item.itemType === 'tool') {
          const zoneName = item.storageZoneData?.name || item.storage_zone_id || '';
          if (zoneName !== selectedZone) return false;
        } else {
          const location = (item as any).emplacement || (item as any).location || '';
          if (!location.includes(selectedZone)) return false;
        }
      }

      return true;
    });
  }, [allItems, searchTerm, selectedCategory, selectedZone, selectedType]);

  // Récupération des catégories uniques
  const categories = useMemo(() => {
    const cats = new Set<string>();
    allItems.forEach(item => {
      if (item.itemType === 'tool') {
        const catName = item.categoryData?.name || item.category;
        if (catName) cats.add(catName);
      } else {
        if (item.category) cats.add(item.category);
      }
    });
    return Array.from(cats).sort();
  }, [allItems]);

  // Récupération des zones de stockage uniques
  const storageZones = useMemo(() => {
    const zones = new Set<string>();
    allItems.forEach(item => {
      if (item.itemType === 'tool') {
        const zoneName = item.storageZoneData?.name || item.storage_zone_id;
        if (zoneName) zones.add(zoneName);
      } else {
        const location = (item as any).emplacement || (item as any).location;
        if (location) {
          // Extraire la zone (ex: "Zone B.1.5" -> "Zone B")
          const match = location.match(/Zone\s+[A-Z]/i);
          if (match) zones.add(match[0]);
        }
      }
    });
    return Array.from(zones).sort();
  }, [allItems]);

  const isLoading = !tools || isLoadingConsumables;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">
            Bibliothèque d'outils et consommables
          </h1>
          <p className="text-text-secondary mt-1">
            {filteredItems.length} élément{filteredItems.length > 1 ? 's' : ''}
            {' '}
            ({filteredItems.filter(i => i.itemType === 'tool').length} outils,{' '}
            {filteredItems.filter(i => i.itemType === 'consumable').length} consommables)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={loadConsumables}
            disabled={isLoadingConsumables}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingConsumables ? 'animate-spin' : ''}`} />
            Rafraîchir
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-background-surface rounded-card border border-[#323232] p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as 'all' | ItemType)}
            className="px-3 py-2 border border-[#323232] rounded-lg bg-background-elevated text-text-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          >
            <option value="all">Tous les types</option>
            <option value="tool">Outils uniquement</option>
            <option value="consumable">Consommables uniquement</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-[#323232] rounded-lg bg-background-elevated text-text-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          >
            <option value="all">Toutes les catégories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="px-3 py-2 border border-[#323232] rounded-lg bg-background-elevated text-text-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          >
            <option value="all">Toutes les zones</option>
            {storageZones.map(zone => (
              <option key={zone} value={zone}>{zone}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Items Grid */}
      <div>
        {isLoading ? (
          <div className="text-center py-12 bg-background-surface rounded-card border border-[#323232]">
            <RefreshCw className="h-16 w-16 mx-auto text-text-muted mb-4 animate-spin" />
            <p className="text-text-secondary">
              Chargement des outils et consommables...
            </p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-background-surface rounded-card border border-[#323232]">
            <Package className="h-16 w-16 mx-auto text-text-muted mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">
              Aucun élément trouvé
            </h3>
            <p className="text-text-secondary">
              Essayez de modifier vos filtres
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const isToolItem = item.itemType === 'tool';
              const imageUrl = isToolItem
                ? item.image?.url
                : (item.image_url || item.photo_url);
              const name = isToolItem ? item.name : item.designation;
              const categoryName = isToolItem
                ? (item.categoryData?.name || item.category)
                : item.category;
              const location = isToolItem
                ? (item.storageZoneData?.name || item.storage_zone_id || item.location)
                : ((item as any).emplacement || (item as any).location);

              return (
                <div
                  key={`${item.itemType}-${item.id}`}
                  className="bg-background-elevated rounded-lg border border-[#323232] p-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex gap-4">
                    {/* Image à gauche */}
                    {imageUrl ? (
                      <div className="bg-background rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={imageUrl}
                          alt={name}
                          className="w-24 h-24 object-contain p-2"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="bg-background rounded-lg w-24 h-24 flex items-center justify-center flex-shrink-0">
                        {isToolItem ? (
                          <Wrench className="h-8 w-8 text-text-muted" />
                        ) : (
                          <Package className="h-8 w-8 text-text-muted" />
                        )}
                      </div>
                    )}

                    {/* Détails à droite */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Badges et infos supérieures */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Badge type */}
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          isToolItem
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-green-500/20 text-green-400'
                        }`}>
                          {isToolItem ? 'Outil' : 'Consommable'}
                        </span>

                        {/* Badge catégorie */}
                        {categoryName && (
                          <span className="px-2 py-1 bg-background-surface border border-[#323232] rounded text-xs text-text-secondary flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {categoryName}
                          </span>
                        )}

                        {/* Badge zone de stockage */}
                        {location && (
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {location}
                          </span>
                        )}

                        {/* Référence */}
                        {item.reference && (
                          <div className="text-sm font-semibold text-primary ml-auto">
                            Réf: {item.reference}
                          </div>
                        )}
                      </div>

                      {/* Nom */}
                      <h3 className="font-semibold text-text-primary text-base">
                        {name}
                      </h3>

                      {/* Description de la catégorie (pour les outils) */}
                      {isToolItem && item.categoryData?.description && (
                        <p className="text-xs text-text-muted italic">
                          {item.categoryData.description}
                        </p>
                      )}

                      {/* Description de l'item */}
                      {item.description && (
                        <p className="text-sm text-text-secondary line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      {/* Informations supplémentaires */}
                      <div className="flex items-center gap-4 text-xs text-text-muted">
                        {/* Localisation de la zone (pour les outils) */}
                        {isToolItem && item.storageZoneData?.location && (
                          <span>
                            📍 {item.storageZoneData.location}
                          </span>
                        )}

                        {/* Quantité (pour les consommables) */}
                        {!isToolItem && (item as any).quantite && (
                          <span>
                            Stock: {(item as any).quantite}
                          </span>
                        )}

                        {/* Prix */}
                        {isToolItem && item.price && (
                          <span>
                            💰 {item.price}€
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
