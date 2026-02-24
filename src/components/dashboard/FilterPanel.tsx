import { useAppStore } from '@/store/useAppStore';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function FilterPanel() {
  const { searchFilters, setSearchFilters, clearFilters } = useAppStore();

  const statuses = [
    { value: 'en_cours', label: 'En cours' },
    { value: 'verification', label: 'Vérification Technique' },
    { value: 'relecture', label: 'Relecture et Correction' },
    { value: 'mise_a_jour_timetonic', label: 'Mise à jour Timetonic' },
    { value: 'completed', label: 'Terminée' },
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

      {/* Clear Filters */}
      <div className="pt-2">
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          Réinitialiser les filtres
        </Button>
      </div>
    </div>
  );
}
