import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, SortAsc, FileText, Plus, Download } from 'lucide-react';
import { useProcedures, useProcedureStats } from '@/hooks/useProcedures';
import { useForecastArticles } from '@/hooks/useForecastArticles';
import { useDebounce } from '@/hooks/useDebounce';
import { useAppStore } from '@/store/useAppStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import ProcedureList from '@/components/dashboard/ProcedureList';
import FilterPanel from '@/components/dashboard/FilterPanel';
import { exportProceduresToPDF } from '@/lib/pdfExport';
import { toast } from 'sonner';

function formatCharge(h: number): string {
  return h.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
}

export default function Dashboard() {
  const {
    searchQuery,
    setSearchQuery,
    searchFilters,
    sortOption,
  } = useAppStore();

  const { stats: forecastStats } = useForecastArticles();
  const procedureStats = useProcedureStats();

  const [showFilters, setShowFilters] = useState(false);

  // État local pour le champ de recherche (mis à jour immédiatement)
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  // Valeur debounced (mise à jour après 300ms sans changement)
  const debouncedSearchQuery = useDebounce(localSearchQuery, 300);

  // Synchroniser la valeur debounced avec le store
  useEffect(() => {
    setSearchQuery(debouncedSearchQuery);
  }, [debouncedSearchQuery, setSearchQuery]);

  // Synchroniser l'état local avec le store (pour les changements externes)
  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  const procedures = useProcedures(
    { ...searchFilters, query: searchQuery },
    sortOption
  );

  const handleExportPDF = () => {
    if (!procedures || procedures.length === 0) {
      toast.error('Aucune procédure à exporter');
      return;
    }
    exportProceduresToPDF(procedures);
    toast.success('PDF exporté avec succès');
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1 tracking-tight">
            Tableau de bord
          </h1>
          <p className="text-gray-400 text-sm">
            Gérez vos procédures techniques
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" size="lg" onClick={handleExportPDF}>
            <Download className="mr-2" size={20} />
            Exporter PDF
          </Button>
          <Link to="/procedures/new">
            <Button size="lg">
              <Plus className="mr-2" size={20} />
              Nouvelle Procédure
            </Button>
          </Link>
        </div>
      </div>

      {/* Forecast Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="bg-[#1c1c1c] rounded-xl border border-[#272727] p-4">
          <p className="text-xs text-gray-500 mb-1">Fiches totales</p>
          <p className="text-2xl font-bold text-white">{forecastStats.total}</p>
        </div>
        <div className="bg-[#1c1c1c] rounded-xl border border-[#272727] p-4">
          <p className="text-xs text-gray-500 mb-1">Fiches faites</p>
          <p className="text-2xl font-bold text-green-400">{procedureStats.total}</p>
        </div>
        <div className="bg-[#1c1c1c] rounded-xl border border-[#272727] p-4">
          <p className="text-xs text-gray-500 mb-1">Fiches restantes</p>
          <p className="text-2xl font-bold text-orange-400">{forecastStats.total - procedureStats.total}</p>
        </div>
        <div className="bg-[#1c1c1c] rounded-xl border border-[#272727] p-4">
          <p className="text-xs text-gray-500 mb-1">Couverture charge</p>
          <p className="text-2xl font-bold text-white">{forecastStats.coveragePercent}%</p>
          <p className="text-[11px] text-gray-600 mt-1">
            {formatCharge(forecastStats.coveredCharge)} / {formatCharge(forecastStats.totalCharge)} h
          </p>
        </div>
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
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
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
            <div className="mt-4 pt-4 border-t border-[#323232]">
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
