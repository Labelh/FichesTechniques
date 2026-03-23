import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, RefreshCw, Trash2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import {
  getAllVerificationRequests,
  updateVerificationRequestStatus,
  deleteVerificationRequest,
  type VerificationRequest,
  type VerifStatus,
} from '@/services/verificationRequestService';

const STATUS_CONFIG: Record<VerifStatus, { label: string; dot: string; bg: string; text: string }> = {
  nouveau:  { label: 'Nouveau',   dot: 'bg-blue-400',   bg: 'bg-blue-400/10',   text: 'text-blue-400'   },
  en_cours: { label: 'En cours',  dot: 'bg-yellow-400', bg: 'bg-yellow-400/10', text: 'text-yellow-400' },
  traité:   { label: 'Traité',    dot: 'bg-green-400',  bg: 'bg-green-400/10',  text: 'text-green-400'  },
  rejeté:   { label: 'Rejeté',    dot: 'bg-red-400',    bg: 'bg-red-400/10',    text: 'text-red-400'    },
};

const ALL_STATUSES: VerifStatus[] = ['nouveau', 'en_cours', 'traité', 'rejeté'];

function formatDate(d: Date) {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function VerificationRequests() {
  const navigate = useNavigate();
  const [requests, setRequests]         = useState<VerificationRequest[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filterStatus, setFilterStatus] = useState<VerifStatus | 'all'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [openStatusId, setOpenStatusId] = useState<string | null>(null);

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await getAllVerificationRequests();
      setRequests(data);
    } catch {
      toast.error('Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: VerifStatus) => {
    try {
      await updateVerificationRequestStatus(id, status);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      setOpenStatusId(null);
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVerificationRequest(id);
      setRequests(prev => prev.filter(r => r.id !== id));
      setConfirmDeleteId(null);
      toast.success('Demande supprimée');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const filtered = filterStatus === 'all' ? requests : requests.filter(r => r.status === filterStatus);

  const counts = requests.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6" onClick={() => setOpenStatusId(null)}>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Demandes de modification</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Chargement…' : `${filtered.length} demande${filtered.length !== 1 ? 's' : ''}${filterStatus !== 'all' ? ' filtrées' : ''}`}
          </p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); fetchRequests(); }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:text-white hover:border-[#3a3a3a] transition-colors text-sm"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', ...ALL_STATUSES] as (VerifStatus | 'all')[]).map(s => {
          const isActive = filterStatus === s;
          const count = s === 'all' ? requests.length : (counts[s] || 0);
          const cfg = s !== 'all' ? STATUS_CONFIG[s] : null;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                isActive ? 'border-primary bg-primary/10 text-primary' : 'border-[#2a2a2a] text-gray-500 hover:border-[#3a3a3a] hover:text-gray-300'
              }`}
            >
              {cfg && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />}
              {s === 'all' ? 'Toutes' : cfg!.label}
              {count > 0 && <span className="opacity-60">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-600">
          <div className="w-8 h-8 border-2 border-[#2a2a2a] border-t-primary rounded-full animate-spin" />
          <span className="text-sm">Chargement…</span>
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
            <MessageSquare className="h-8 w-8 text-gray-600" />
          </div>
          <div className="text-center">
            <p className="text-gray-400 font-medium">Aucune demande</p>
            <p className="text-gray-600 text-sm mt-1">
              {filterStatus !== 'all' ? 'Aucune demande avec ce statut' : 'Les demandes envoyées depuis les fichiers HTML apparaîtront ici'}
            </p>
          </div>
        </div>
      )}

      {/* List */}
      {!loading && filtered.length > 0 && (
        <div className="flex flex-col gap-3">
          {filtered.map(req => {
            const cfg = STATUS_CONFIG[req.status];
            const isConfirming = confirmDeleteId === req.id;
            const isStatusOpen = openStatusId === req.id;

            return (
              <div
                key={req.id}
                className="bg-[#1c1c1c] rounded-xl border border-[#272727] hover:border-[#353535] transition-colors overflow-hidden"
              >
                {/* Top accent */}
                <div className={`h-0.5 w-full ${cfg.dot}`} />

                <div className="p-5">
                  <div className="flex items-start gap-4">

                    {/* Icon */}
                    <div className="w-9 h-9 rounded-lg bg-[#252525] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MessageSquare className="h-4 w-4 text-gray-500" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">

                      {/* Row 1: procedure + status */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <span className="font-semibold text-white text-sm">{req.procedureName}</span>
                          {req.procedureRef && (
                            <span className="ml-2 text-xs text-gray-500 font-mono">{req.procedureRef}</span>
                          )}
                        </div>

                        {/* Status dropdown */}
                        <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setOpenStatusId(isStatusOpen ? null : req.id)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} border-transparent hover:opacity-80 transition-opacity`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                            <ChevronDown className="h-3 w-3" />
                          </button>
                          {isStatusOpen && (
                            <div className="absolute right-0 top-full mt-1 bg-[#252525] border border-[#353535] rounded-lg shadow-xl z-20 overflow-hidden min-w-[140px]">
                              {ALL_STATUSES.map(s => {
                                const c = STATUS_CONFIG[s];
                                return (
                                  <button
                                    key={s}
                                    onClick={() => handleStatusChange(req.id, s)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-[#2e2e2e] ${req.status === s ? c.text + ' font-semibold' : 'text-gray-400'}`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                                    {c.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Row 2: phase + step + element */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <span className="px-2 py-0.5 rounded-full bg-[#252525] text-[10px] text-gray-400 border border-[#303030]">{req.phase}</span>
                        {req.step && <span className="px-2 py-0.5 rounded-full bg-[#252525] text-[10px] text-gray-400 border border-[#303030]">{req.step}</span>}
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-[10px] text-primary border border-primary/20">{req.element}</span>
                      </div>

                      {/* Comment */}
                      <p className="text-sm text-gray-300 leading-relaxed mb-3 bg-[#161616] rounded-lg p-3 border border-[#222]">
                        {req.comment}
                      </p>

                      {/* Footer row */}
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] text-gray-600">
                          {req.requester && <span className="text-gray-500 mr-3">👤 {req.requester}</span>}
                          <span>{formatDate(req.createdAt)}</span>
                        </div>

                        {/* Open in editor + Delete */}
                        <div className="flex items-center gap-2">
                        {req.procedureId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/procedures/${req.procedureId}/edit`, {
                                state: { expandPhaseIndex: req.phaseIndex, expandStepIndex: req.stepIndex }
                              });
                            }}
                            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary hover:bg-primary/10 px-2.5 py-1 rounded-md transition-colors"
                            title="Ouvrir dans l'éditeur"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            Ouvrir dans l'éditeur
                          </button>
                        )}
                        {/* Delete */}
                        {isConfirming ? (
                          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            <span className="text-xs text-red-400">Supprimer ?</span>
                            <button onClick={() => handleDelete(req.id)}
                              className="text-xs px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">Oui</button>
                            <button onClick={() => setConfirmDeleteId(null)}
                              className="text-xs px-2.5 py-1 rounded-md bg-[#252525] text-gray-400 hover:bg-[#2e2e2e] transition-colors">Non</button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(req.id); }}
                            className="p-1.5 rounded-md text-gray-700 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
