import { useState, useEffect } from 'react';
import {
  Search,
  RefreshCw,
  Package,
  DollarSign
} from 'lucide-react';
import { fetchConsumables } from '@/services/consumablesService';
import { Consumable } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { toast } from 'sonner';

export default function ToolsLibrary() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [consumables, setConsumables] = useState<Consumable[]>([]);
  const [isLoadingConsumables, setIsLoadingConsumables] = useState(false);

  // Récupération des consommables depuis Supabase (avec filtrage deleted_at)
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

  // Filtrage des consommables
  const filteredConsumables = consumables.filter(consumable => {
    const matchesSearch = consumable.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (consumable.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                         (consumable.reference?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    const matchesCategory = selectedCategory === 'all' || consumable.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Récupération des catégories uniques
  const categories = Array.from(new Set(consumables.map(c => c.category).filter(Boolean) as string[]));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Bibliothèque d'outils
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {filteredConsumables.length} outil{filteredConsumables.length > 1 ? 's' : ''}
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
      <div className="bg-[#2a2a2a] rounded-lg border border-[#3a3a3a] p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher un outil..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent text-gray-900 dark:text-white"
          >
            <option value="all">Toutes les catégories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Consumables Grid */}
      <div>
          {isLoadingConsumables ? (
            <div className="text-center py-12 bg-[#2a2a2a] rounded-lg border border-[#3a3a3a]">
              <RefreshCw className="h-16 w-16 mx-auto text-gray-400 mb-4 animate-spin" />
              <p className="text-gray-500 dark:text-gray-400">
                Chargement des consommables...
              </p>
            </div>
          ) : filteredConsumables.length === 0 ? (
            <div className="text-center py-12 bg-[#2a2a2a] rounded-lg border border-[#3a3a3a]">
              <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchTerm || selectedCategory !== 'all'
                  ? 'Aucun consommable trouvé'
                  : 'Aucun consommable disponible'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm || selectedCategory !== 'all'
                  ? 'Essayez de modifier vos filtres'
                  : 'Cliquez sur Rafraîchir pour charger les consommables'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredConsumables.map((consumable) => {
                const imageUrl = consumable.image_url || consumable.photo_url;
                return (
                  <div
                    key={consumable.id}
                    className="bg-[#2a2a2a] rounded-lg border border-[#3a3a3a] p-4 relative"
                  >
                    {/* Header: Référence et Location */}
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm font-medium" style={{ color: 'rgb(249, 55, 5)' }}>
                        {consumable.reference || 'Sans référence'}
                      </div>
                      {(consumable as any).emplacement || (consumable as any).location ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                          📍 {(consumable as any).emplacement || (consumable as any).location}
                        </span>
                      ) : null}
                    </div>

                    {/* Image */}
                    {imageUrl && (
                      <div className="mb-3">
                        <img
                          src={imageUrl}
                          alt={consumable.designation}
                          className="w-full h-48 object-cover rounded-lg border border-[#3a3a3a]"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    {/* Désignation */}
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      {consumable.designation}
                    </h3>

                    {/* Catégorie */}
                    {consumable.category && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 mb-3">
                        {consumable.category}
                      </span>
                    )}

                    {/* Description */}
                    {consumable.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2 mt-2">
                        {consumable.description}
                      </p>
                    )}

                    {/* Quantité et Prix */}
                    <div className="space-y-2 mt-3">
                      {consumable.quantity !== undefined && (
                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                          <Package className="h-4 w-4" />
                          {consumable.quantity} {consumable.unit || ''}
                        </div>
                      )}
                      {consumable.price && (
                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                          <DollarSign className="h-4 w-4" />
                          {consumable.price} €
                        </div>
                      )}
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
