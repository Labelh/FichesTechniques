import { useAppStore } from '@/store/useAppStore';
import { useCategories } from '@/hooks/useDatabase';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function FilterPanel() {
  const { searchFilters, setSearchFilters, clearFilters } = useAppStore();
  const categories = useCategories();

  const difficulties = [
    'very_easy',
    'easy',
    'medium',
    'hard',
    'very_hard',
    'expert',
  ];

  const statuses = ['draft', 'in_progress', 'in_review', 'completed', 'archived'];

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
              key={status}
              variant={isActive('status', status) ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => toggleFilter('status', status)}
            >
              {status}
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
              key={diff}
              variant={isActive('difficulty', diff) ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => toggleFilter('difficulty', diff)}
            >
              {diff}
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
                  isActive('categories', cat.name) ? 'default' : 'outline'
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
