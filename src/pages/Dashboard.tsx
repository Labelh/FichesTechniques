import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, SortAsc, FileText } from 'lucide-react';
import { useProcedures } from '@/hooks/useProcedures';
import { useAppStore } from '@/store/useAppStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import ProcedureList from '@/components/dashboard/ProcedureList';
import FilterPanel from '@/components/dashboard/FilterPanel';

export default function Dashboard() {
  const {
    searchQuery,
    setSearchQuery,
    searchFilters,
    sortOption,
  } = useAppStore();

  const [showFilters, setShowFilters] = useState(false);

  const procedures = useProcedures(
    { ...searchFilters, query: searchQuery },
    sortOption
  );

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-1 tracking-tight">
          Tableau de bord
        </h1>
        <p className="text-gray-400 text-sm">
          Gérez vos procédures techniques
        </p>
      </div>

      {/* Search & Filters Bar */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                type="text"
                placeholder="Rechercher une procédure..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Buttons on the right */}
            <div className="flex items-center gap-2">
              <Button
                variant={showFilters ? 'default' : 'secondary'}
                onClick={() => setShowFilters(!showFilters)}
                size="sm"
              >
                <Filter className="mr-2" size={16} />
                Filtres
              </Button>
              <Button variant="secondary" size="sm">
                <SortAsc className="mr-2" size={16} />
                Trier
              </Button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-[#3a3a3a]">
              <FilterPanel />
            </div>
          )}
        </div>
      </div>

      {/* Procedures - Vue Liste Uniquement */}
      {!procedures || procedures.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="mx-auto text-gray-400 mb-4" size={64} />
          <h3 className="text-lg font-medium mb-2 text-white">
            Aucune procédure
          </h3>
          <p className="text-gray-400 mb-4">
            Commencez par créer votre première procédure technique
          </p>
          <Link to="/procedures/new">
            <Button>Créer une procédure</Button>
          </Link>
        </div>
      ) : (
        <ProcedureList procedures={procedures} />
      )}
    </div>
  );
}
