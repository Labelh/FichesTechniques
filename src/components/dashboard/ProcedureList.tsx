import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatRelativeDate } from '@/lib/utils';
import { deleteProcedure, duplicateProcedure } from '@/services/procedureService';
import { toast } from 'sonner';
import type { Procedure, DifficultyLevel } from '@/types';

interface ProcedureListProps {
  procedures: Procedure[];
}

interface DuplicateTarget {
  id: string;
  designation: string;
  reference: string;
}

export default function ProcedureList({ procedures }: ProcedureListProps) {
  const navigate = useNavigate();
  const [duplicateTarget, setDuplicateTarget] = useState<DuplicateTarget | null>(null);
  const [newDesignation, setNewDesignation] = useState('');
  const [newReference, setNewReference] = useState('');
  const [isDuplicating, setIsDuplicating] = useState(false);

  const handleDelete = async (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();

    if (!confirm(`Êtes-vous sûr de vouloir supprimer la procédure "${title}" ?`)) {
      return;
    }

    try {
      await deleteProcedure(id);
      toast.success('Procédure supprimée avec succès');
    } catch (error) {
      console.error('Error deleting procedure:', error);
      toast.error('Erreur lors de la suppression de la procédure');
    }
  };

  const openDuplicateModal = (e: React.MouseEvent, procedure: Procedure) => {
    e.stopPropagation();
    setDuplicateTarget({
      id: procedure.id,
      designation: procedure.designation || procedure.title,
      reference: procedure.reference || '',
    });
    setNewDesignation(`${procedure.designation || procedure.title} (copie)`);
    setNewReference(procedure.reference ? `${procedure.reference}-COPIE` : '');
  };

  const handleDuplicate = async () => {
    if (!duplicateTarget) return;
    if (!newDesignation.trim()) {
      toast.error('La désignation est requise');
      return;
    }

    setIsDuplicating(true);
    try {
      const newId = await duplicateProcedure(duplicateTarget.id, newDesignation.trim(), newReference.trim());
      toast.success('Procédure dupliquée avec succès');
      setDuplicateTarget(null);
      navigate(`/procedures/${newId}/edit`);
    } catch (error) {
      console.error('Error duplicating procedure:', error);
      toast.error('Erreur lors de la duplication');
    } finally {
      setIsDuplicating(false);
    }
  };

  // Calculer le temps total par pièce (somme des temps des phases) en centièmes de minutes
  const getTotalTime = (procedure: Procedure): string => {
    if (!procedure.phases || procedure.phases.length === 0) {
      return '-';
    }
    const totalMinutes = procedure.phases.reduce((sum, phase) => sum + (phase.estimatedTime || 0), 0);
    if (totalMinutes === 0) return '-';

    return totalMinutes.toFixed(2);
  };

  // Obtenir la couleur de difficulté
  const getDifficultyColor = (difficulty: DifficultyLevel): string => {
    switch (difficulty) {
      case 'trainee': return 'bg-blue-500';
      case 'easy': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'hard': return 'bg-red-500';
      case 'control': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };


  return (
    <>
      <div className="bg-background-surface rounded-xl border border-[#323232] overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Référence</th>
              <th>Désignation</th>
              <th>Statut</th>
              <th>Temps par pièce</th>
              <th>Difficulté</th>
              <th>Modifié</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {procedures.map((procedure) => (
              <tr
                key={procedure.id}
                onClick={() => navigate(`/procedures/${procedure.id}/edit`)}
                className="cursor-pointer hover:bg-[#242424] transition-colors"
              >
                <td className="font-mono text-sm text-gray-400">
                  {procedure.reference || '-'}
                </td>
                <td className="font-medium text-white">
                  {procedure.designation || procedure.title}
                </td>
                <td>
                  {procedure.status === 'completed' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-900 text-green-300">
                      Terminée
                    </span>
                  ) : procedure.status === 'verification' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-900 text-orange-300">
                      Vérification Technique
                    </span>
                  ) : procedure.status === 'relecture' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-900 text-red-300">
                      Relecture et Correction
                    </span>
                  ) : procedure.status === 'mise_a_jour_timetonic' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-900 text-purple-300">
                      Mise à jour Timetonic
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-900 text-yellow-300">
                      En cours
                    </span>
                  )}
                </td>
                <td className="text-sm text-gray-400">
                  {getTotalTime(procedure)}
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    {procedure.phases && procedure.phases.length > 0 ? (
                      procedure.phases.map((phase, idx) => (
                        <div
                          key={idx}
                          className={`w-3 h-5 rounded-sm ${getDifficultyColor(phase.difficulty)}`}
                          title={`Phase ${idx + 1}: ${phase.difficulty}`}
                        />
                      ))
                    ) : (
                      <span className="text-gray-500 text-sm">-</span>
                    )}
                  </div>
                </td>
                <td className="text-sm text-gray-400">
                  {formatRelativeDate(procedure.updatedAt)}
                </td>
                <td>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Dupliquer"
                      onClick={(e) => openDuplicateModal(e, procedure)}
                    >
                      <Copy className="h-4 w-4 text-gray-400" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Supprimer"
                      onClick={(e) => handleDelete(e, procedure.id, procedure.designation || procedure.title)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modale de duplication */}
      {duplicateTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setDuplicateTarget(null)}
        >
          <div
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Copy className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <h2 className="text-white font-semibold text-base">Dupliquer la procédure</h2>
                <p className="text-gray-500 text-xs mt-0.5">Choisissez un nouveau nom pour la copie</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Désignation <span className="text-red-400">*</span>
                </label>
                <Input
                  value={newDesignation}
                  onChange={(e) => setNewDesignation(e.target.value)}
                  placeholder="Désignation de la copie"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleDuplicate()}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Référence
                </label>
                <Input
                  value={newReference}
                  onChange={(e) => setNewReference(e.target.value)}
                  placeholder="Référence de la copie (optionnel)"
                  onKeyDown={(e) => e.key === 'Enter' && handleDuplicate()}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setDuplicateTarget(null)}
                disabled={isDuplicating}
              >
                Annuler
              </Button>
              <Button
                className="flex-1"
                onClick={handleDuplicate}
                disabled={isDuplicating || !newDesignation.trim()}
              >
                {isDuplicating ? 'Duplication...' : 'Dupliquer'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
