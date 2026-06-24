import { useState, useMemo } from 'react';
import { BarChart3, Plus, Trash2, CheckCircle2, Circle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { useForecastArticles } from '@/hooks/useForecastArticles';

type FtFilter = 'all' | 'done' | 'todo';
type SortKey = 'reference' | 'quantity' | 'timePerPiece' | 'charge' | 'ft';
type SortDir = 'asc' | 'desc';

export default function ForecastArticles() {
  const { articles, loading, stats, isFtDone, addArticle, removeArticle, toggleFtDone } =
    useForecastArticles();

  const [reference, setReference] = useState('');
  const [quantity, setQuantity] = useState('');
  const [timePerPiece, setTimePerPiece] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [ftFilter, setFtFilter] = useState<FtFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(null); setSortDir('asc'); }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filteredAndSorted = useMemo(() => {
    let list = articles;

    if (ftFilter === 'done') list = list.filter((a) => isFtDone(a));
    else if (ftFilter === 'todo') list = list.filter((a) => !isFtDone(a));

    if (!sortKey) return list;

    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'reference':
          cmp = a.reference.localeCompare(b.reference, 'fr');
          break;
        case 'quantity':
          cmp = a.quantity - b.quantity;
          break;
        case 'timePerPiece':
          cmp = a.timePerPiece - b.timePerPiece;
          break;
        case 'charge':
          cmp = a.quantity * a.timePerPiece - b.quantity * b.timePerPiece;
          break;
        case 'ft':
          cmp = (isFtDone(a) ? 1 : 0) - (isFtDone(b) ? 1 : 0);
          break;
      }
      return cmp;
    });

    return sortDir === 'desc' ? sorted.reverse() : sorted;
  }, [articles, ftFilter, sortKey, sortDir, isFtDone]);

  const handleAdd = async () => {
    const ref = reference.trim();
    if (!ref) { toast.error('Veuillez saisir une référence'); return; }
    const qty = parseFloat(quantity);
    const tpp = parseFloat(timePerPiece);
    if (isNaN(qty) || qty <= 0) { toast.error('Quantité invalide'); return; }
    if (isNaN(tpp) || tpp <= 0) { toast.error('Temps/pièce invalide'); return; }
    try {
      await addArticle(ref, qty, tpp);
      setReference('');
      setQuantity('');
      setTimePerPiece('');
      toast.success('Référence ajoutée');
    } catch {
      toast.error("Erreur lors de l'ajout");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await removeArticle(id);
      setConfirmDeleteId(null);
      toast.success('Référence supprimée');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const SortHeader = ({ label, column, align = 'left' }: { label: string; column: SortKey; align?: 'left' | 'right' | 'center' }) => {
    const active = sortKey === column;
    return (
      <th
        className={`px-4 py-3 text-xs font-medium cursor-pointer select-none hover:text-gray-300 transition-colors ${
          align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
        } ${active ? 'text-white' : 'text-gray-500'}`}
        onClick={() => handleSort(column)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          {active ? (
            sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
          ) : (
            <ArrowUpDown size={12} className="opacity-40" />
          )}
        </span>
      </th>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Prévisionnelles</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Suivi de la complétion des fiches techniques
        </p>
      </div>

      {/* Add Form */}
      <div className="bg-[#1c1c1c] rounded-xl border border-[#272727] p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 min-w-0">
            <label className="block text-xs text-gray-500 mb-1">Référence</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ex: 70645-010"
              className="w-full px-3 py-2 rounded-lg bg-[#161616] border border-[#303030] text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="w-32">
            <label className="block text-xs text-gray-500 mb-1">Quantité</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              min="0"
              step="1"
              className="w-full px-3 py-2 rounded-lg bg-[#161616] border border-[#303030] text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="w-36">
            <label className="block text-xs text-gray-500 mb-1">Temps/pièce (h)</label>
            <input
              type="number"
              value={timePerPiece}
              onChange={(e) => setTimePerPiece(e.target.value)}
              placeholder="0.000"
              min="0"
              step="0.001"
              className="w-full px-3 py-2 rounded-lg bg-[#161616] border border-[#303030] text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors whitespace-nowrap"
          >
            <Plus size={16} />
            Ajouter
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      {!loading && articles.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 mr-1">Filtre :</span>
          {([
            ['all', 'Toutes'],
            ['done', 'Faites'],
            ['todo', 'À faire'],
          ] as [FtFilter, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFtFilter(key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                ftFilter === key
                  ? 'bg-primary text-white'
                  : 'bg-[#1c1c1c] text-gray-400 border border-[#303030] hover:text-white'
              }`}
            >
              {label}
              {key === 'done' && ` (${stats.done})`}
              {key === 'todo' && ` (${stats.remaining})`}
              {key === 'all' && ` (${stats.total})`}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-600">
          <div className="w-8 h-8 border-2 border-[#2a2a2a] border-t-primary rounded-full animate-spin" />
          <span className="text-sm">Chargement…</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && articles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
            <BarChart3 className="h-8 w-8 text-gray-600" />
          </div>
          <div className="text-center">
            <p className="text-gray-400 font-medium">Aucune référence</p>
            <p className="text-gray-600 text-sm mt-1">
              Ajoutez des références prévisionnelles pour suivre la complétion
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      {!loading && filteredAndSorted.length > 0 && (
        <div className="bg-[#1c1c1c] rounded-xl border border-[#272727] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#272727]">
                <SortHeader label="Référence" column="reference" />
                <SortHeader label="Quantité" column="quantity" align="right" />
                <SortHeader label="Temps/pièce" column="timePerPiece" align="right" />
                <SortHeader label="Charge" column="charge" align="right" />
                <SortHeader label="FT" column="ft" align="center" />
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filteredAndSorted.map((a) => {
                const done = isFtDone(a);
                const charge = a.quantity * a.timePerPiece;
                const isConfirming = confirmDeleteId === a.id;

                return (
                  <tr key={a.id} className="border-b border-[#222] last:border-b-0 hover:bg-[#222] transition-colors">
                    <td className="px-4 py-3 font-mono text-white">{a.reference}</td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      {a.quantity.toLocaleString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">{a.timePerPiece}</td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      {formatCharge(charge)} h
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleFtDone(a)}
                        className="inline-flex items-center gap-1.5 group"
                        title={
                          a.ftDone !== null
                            ? 'Statut forcé manuellement — cliquez pour changer'
                            : 'Détecté automatiquement — cliquez pour forcer'
                        }
                      >
                        {done ? (
                          <CheckCircle2 size={18} className="text-green-400" />
                        ) : (
                          <Circle size={18} className="text-gray-600 group-hover:text-gray-400" />
                        )}
                        <span
                          className={`text-xs font-medium ${done ? 'text-green-400' : 'text-gray-600'}`}
                        >
                          {done ? 'Faite' : 'À faire'}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isConfirming ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(a.id)}
                            className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20"
                          >
                            Oui
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-[10px] px-2 py-0.5 rounded bg-[#252525] text-gray-400 hover:bg-[#2e2e2e]"
                          >
                            Non
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(a.id)}
                          className="p-1.5 rounded-md text-gray-700 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty filter result */}
      {!loading && articles.length > 0 && filteredAndSorted.length === 0 && (
        <div className="text-center py-12 text-gray-500 text-sm">
          Aucun article ne correspond au filtre sélectionné.
        </div>
      )}
    </div>
  );
}

function formatCharge(h: number): string {
  return h.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
}
