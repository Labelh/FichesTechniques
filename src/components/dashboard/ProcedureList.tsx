import { Link, useNavigate } from 'react-router-dom';
import { Edit, Eye, Trash2 } from 'lucide-react';
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
    <div className="bg-[#2a2a2a] rounded-xl border border-[#3a3a3a] overflow-hidden">
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
              onClick={() => navigate(`/procedures/${procedure.id}`)}
              className="cursor-pointer hover:bg-[#303030] transition-colors"
            >
              <td className="font-mono text-sm text-gray-400">
                {procedure.reference || 'N/A'}
              </td>
              <td className="font-medium text-white">
                {procedure.title}
              </td>
              <td className="text-sm text-gray-400">
                {formatRelativeDate(procedure.updatedAt)}
              </td>
              <td>
                <div className="flex items-center justify-end gap-2">
                  <Link to={`/procedures/${procedure.id}`} onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" title="Voir">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to={`/procedures/${procedure.id}/edit`} onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" title="Modifier">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Supprimer"
                    onClick={(e) => handleDelete(e, procedure.id, procedure.title)}
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
