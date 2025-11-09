import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Grid, List, Kanban, Filter, SortAsc, FileText } from 'lucide-react';
import { useProcedures } from '@/hooks/useProcedures';
import { useAppStore } from '@/store/useAppStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import ProcedureCard from '@/components/dashboard/ProcedureCard';
import ProcedureList from '@/components/dashboard/ProcedureList';
import ProcedureKanban from '@/components/dashboard/ProcedureKanban';
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

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4">
        <h1 className="display-6 fw-bold mb-1" style={{ letterSpacing: '-0.02em' }}>
          Tableau de bord
        </h1>
        <p className="text-muted mb-0">
          Gérez vos procédures techniques
        </p>
      </div>

      {/* Search & Filters Bar */}
      <div className="card shadow-sm mb-4 border-0" style={{ backgroundColor: 'rgba(23, 23, 23, 0.5)' }}>
        <div className="card-body p-4">
          <div className="row g-3 align-items-center">
            {/* Search */}
            <div className="col-12 col-lg-6">
              <div className="position-relative">
                <Search className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={20} />
                <Input
                  type="text"
                  placeholder="Rechercher une procédure..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ps-5"
                />
              </div>
            </div>

            {/* Right side: Filters, Sort & View Mode */}
            <div className="col-12 col-lg-6">
              <div className="d-flex align-items-center justify-content-lg-end gap-2 flex-wrap">
                {/* Filters & Sort */}
                <Button
                  variant={showFilters ? 'default' : 'outline'}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className={showFilters ? 'me-2' : 'me-2 text-muted'} size={18} />
                  Filtres
                </Button>
                <Button variant="outline">
                  <SortAsc className="me-2 text-muted" size={18} />
                  Trier
                </Button>

                {/* Divider */}
                <div className="vr d-none d-lg-block" style={{ height: '32px' }}></div>

                {/* View Mode */}
                <div className="btn-group" role="group">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setViewMode('grid' as any)}
                    title="Vue grille"
                  >
                    <Grid className={viewMode === 'grid' ? '' : 'text-muted'} size={18} />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setViewMode('list' as any)}
                    title="Vue liste"
                  >
                    <List className={viewMode === 'list' ? '' : 'text-muted'} size={18} />
                  </Button>
                  <Button
                    variant={viewMode === 'kanban' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setViewMode('kanban' as any)}
                    title="Vue kanban"
                  >
                    <Kanban className={viewMode === 'kanban' ? '' : 'text-muted'} size={18} />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-top border-secondary border-opacity-10">
              <FilterPanel />
            </div>
          )}
        </div>
      </div>

      {/* Procedures */}
      {!procedures || procedures.length === 0 ? (
        <div className="text-center py-5">
          <FileText className="mx-auto text-muted mb-4" size={64} />
          <h3 className="h5 fw-medium mb-2">
            Aucune procédure
          </h3>
          <p className="text-muted mb-4">
            Commencez par créer votre première procédure technique
          </p>
          <Link to="/procedures/new">
            <Button>Créer une procédure</Button>
          </Link>
        </div>
      ) : (
        <>
          {viewMode === 'grid' && (
            <div className="row g-4">
              {procedures.map((procedure) => (
                <div key={procedure.id} className="col-12 col-md-6 col-lg-4">
                  <ProcedureCard procedure={procedure} />
                </div>
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
