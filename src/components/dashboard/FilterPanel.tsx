import { useAppStore } from '@/store/useAppStore';
import { useCategories } from '@/hooks/useDatabase';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function FilterPanel() {
  const { searchFilters, setSearchFilters, clearFilters } = useAppStore();
  const categories = useCategories();

  const difficulties = [
    { value: 'trainee', label: 'Stagiaire', color: 'bg-blue-500' },
    { value: 'easy', label: 'Facile', color: 'bg-green-500' },
    { value: 'medium', label: 'Moyen', color: 'bg-yellow-500' },
    { value: 'hard', label: 'Difficile', color: 'bg-red-500' },
  ];

  const statuses = [
    { value: 'draft', label: 'Brouillon' },
    { value: 'in_progress', label: 'En cours' },
    { value: 'in_review', label: 'En révision' },
    { value: 'completed', label: 'Terminé' },
    { value: 'archived', label: 'Archivé' },
  ];

  const toggleFilter = (key: string, value: any) => {
    const current = (searchFilters as any)[key] || [];
    const newFilters = current.includes(value)
      ? current.filter((v: any) => v !== value)
      : [...current, value];

    setSearchFilters({ ...searchFilters, [key]: newFilters });
  };

  const isActive = (key: string, value: any) => {
    return ((searchFilters as any)[key] || []).includes(value);
  };

  return (
    <div className="space-y-4">
      {/* Status */}
      <div>
        <h4 className="text-sm font-medium mb-2">Statut</h4>
        <div className="flex flex-wrap gap-2">
          {statuses.map((status) => (
            <Badge
              key={status.value}
              variant={isActive('status', status.value) ? 'default' : 'secondary'}
              className="cursor-pointer"
              onClick={() => toggleFilter('status', status.value)}
            >
              {status.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Difficulty */}
      <div>
        <h4 className="text-sm font-medium mb-2">Difficulté</h4>
        <div className="flex flex-wrap gap-2">
          {difficulties.map((diff) => (
            <Badge
              key={diff.value}
              variant={isActive('difficulty', diff.value) ? 'default' : 'secondary'}
              className="cursor-pointer flex items-center gap-1"
              onClick={() => toggleFilter('difficulty', diff.value)}
            >
              <div className={`w-2 h-2 rounded-full ${diff.color}`}></div>
              {diff.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Categories */}
      {categories && categories.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Catégories</h4>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Badge
                key={cat.id}
                variant={
                  isActive('categories', cat.name) ? 'default' : 'secondary'
                }
                className="cursor-pointer"
                onClick={() => toggleFilter('categories', cat.name)}
              >
                {cat.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Clear Filters */}
      <div className="pt-2">
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          Réinitialiser les filtres
        </Button>
      </div>
    </div>
  );
}
