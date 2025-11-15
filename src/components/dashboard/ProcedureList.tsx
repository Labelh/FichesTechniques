import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatRelativeDate } from '@/lib/utils';
import { deleteProcedure } from '@/services/procedureService';
import { toast } from 'sonner';
import type { Procedure } from '@/types';

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

  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-gray-700 overflow-hidden">
      <table className="table">
        <thead>
          <tr>
            <th>Référence</th>
            <th>Désignation</th>
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
