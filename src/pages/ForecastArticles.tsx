import { useState } from 'react';
import { BarChart3, Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { toast } from 'sonner';
import { useForecastArticles } from '@/hooks/useForecastArticles';

export default function ForecastArticles() {
  const { articles, loading, stats, isFtDone, addArticle, removeArticle, toggleFtDone } =
    useForecastArticles();

  const [reference, setReference] = useState('');
  const [quantity, setQuantity] = useState('');
  const [timePerPiece, setTimePerPiece] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Prévisionnelles</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Suivi de la complétion des fiches techniques
        </p>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Fiches totales" value={stats.total} />
        <MetricCard label="Fiches faites" value={stats.done} color="text-green-400" />
        <MetricCard label="Fiches restantes" value={stats.remaining} color="text-orange-400" />
        <MetricCard
          label="Couverture charge"
          value={`${stats.coveragePercent}%`}
          subtitle={`${formatCharge(stats.coveredCharge)} / ${formatCharge(stats.totalCharge)} h`}
        />
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
      {!loading && articles.length > 0 && (
        <div className="bg-[#1c1c1c] rounded-xl border border-[#272727] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#272727]">
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Référence</th>
                <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">Quantité</th>
                <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">Temps/pièce</th>
                <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">Charge</th>
                <th className="text-center px-4 py-3 text-xs text-gray-500 font-medium">FT</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => {
                const done = isFtDone(a);
                const charge = a.quantity * a.timePerPiece;
                const isConfirming = confirmDeleteId === a.id;
                const isForced = a.ftDone !== null;

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
                          isForced
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
                        {isForced && (
                          <span className="text-[10px] text-gray-600 ml-0.5" title="Forcé manuellement">
                            ✎
                          </span>
                        )}
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
    </div>
  );
}

function MetricCard({
  label,
  value,
  color,
  subtitle,
}: {
  label: string;
  value: string | number;
  color?: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-[#1c1c1c] rounded-xl border border-[#272727] p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color || 'text-white'}`}>{value}</p>
      {subtitle && <p className="text-[11px] text-gray-600 mt-1">{subtitle}</p>}
    </div>
  );
}

function formatCharge(h: number): string {
  return h.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
}
