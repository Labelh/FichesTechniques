import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/Button';

export default function FilterPanel() {
  const { searchFilters, setSearchFilters, clearFilters } = useAppStore();

  const statuses = [
    { value: '', label: 'Tous les statuts' },
    { value: 'en_cours', label: 'En cours' },
    { value: 'verification', label: 'Vérification Technique' },
    { value: 'relecture', label: 'Relecture et Correction' },
    { value: 'mise_a_jour_timetonic', label: 'Mise à jour Timetonic' },
    { value: 'completed', label: 'Terminée' },
  ];

  const currentStatus = ((searchFilters as any).status || [])[0] || '';

  const handleStatusChange = (value: string) => {
    setSearchFilters({ ...searchFilters, status: value ? [value] : [] });
  };

  return (
    <div className="space-y-4">
      {/* Status */}
      <div>
        <h4 className="text-sm font-medium mb-2">Statut</h4>
        <select
          value={currentStatus}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="w-full rounded-md border border-[#323232] bg-transparent px-3 py-2 text-sm text-white"
        >
          {statuses.map((status) => (
            <option key={status.value} value={status.value} className="bg-[#1a1a1a]">
              {status.label}
            </option>
          ))}
        </select>
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
