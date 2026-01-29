import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatRelativeDate } from '@/lib/utils';
import { deleteProcedure } from '@/services/procedureService';
import { toast } from 'sonner';
import type { Procedure, DifficultyLevel } from '@/types';

interface ProcedureListProps {
  procedures: Procedure[];
}

export default function ProcedureList({ procedures }: ProcedureListProps) {
  const navigate = useNavigate();

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
    <div className="bg-background-surface rounded-xl border border-[#323232] overflow-hidden">
      <table className="table">
        <thead>
          <tr>
            <th>Référence</th>
            <th>Désignation</th>
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
  );
}
