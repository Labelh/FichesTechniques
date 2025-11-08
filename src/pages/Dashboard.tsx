import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Grid, List, Kanban, Filter, SortAsc, FileText } from 'lucide-react';
import { useProcedures, useProcedureStats } from '@/hooks/useProcedures';
import { useAppStore } from '@/store/useAppStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import ProcedureCard from '@/components/dashboard/ProcedureCard';
import ProcedureList from '@/components/dashboard/ProcedureList';
import ProcedureKanban from '@/components/dashboard/ProcedureKanban';
import StatsOverview from '@/components/dashboard/StatsOverview';
import FilterPanel from '@/components/dashboard/FilterPanel';

export default function Dashboard() {
  const {
    viewMode,
    setViewMode,
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
  const stats = useProcedureStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Tableau de bord
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Gérez vos procédures techniques
        </p>
      </div>

      {/* Statistics */}
      <StatsOverview stats={stats} />

      {/* Search & Filters Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Rechercher une procédure..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* View Mode */}
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('grid' as any)}
              title="Vue grille"
            >
              <Grid className="h-5 w-5" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('list' as any)}
              title="Vue liste"
            >
              <List className="h-5 w-5" />
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('kanban' as any)}
              title="Vue kanban"
            >
              <Kanban className="h-5 w-5" />
            </Button>
          </div>

          {/* Filters & Sort */}
          <div className="flex gap-2">
            <Button
              variant={showFilters ? 'default' : 'outline'}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-5 w-5 mr-2" />
              Filtres
            </Button>
            <Button variant="outline">
              <SortAsc className="h-5 w-5 mr-2" />
              Trier
            </Button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <FilterPanel />
          </div>
        )}
      </div>

      {/* Procedures */}
      {!procedures || procedures.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Aucune procédure
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Commencez par créer votre première procédure technique
          </p>
          <Link to="/procedures/new">
            <Button>Créer une procédure</Button>
          </Link>
        </div>
      ) : (
        <>
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {procedures.map((procedure) => (
                <ProcedureCard key={procedure.id} procedure={procedure} />
              ))}
            </div>
          )}

          {viewMode === 'list' && (
            <ProcedureList procedures={procedures} />
          )}

          {viewMode === 'kanban' && (
            <ProcedureKanban procedures={procedures} />
          )}
        </>
      )}
    </div>
  );
}
