import { Link } from 'react-router-dom';
import { Clock, Edit, Trash2, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDuration, formatRelativeDate } from '@/lib/utils';
import { deleteProcedure } from '@/services/procedureService';
import { toast } from 'sonner';
import type { Procedure } from '@/types';

interface ProcedureCardProps {
  procedure: Procedure;
}

export default function ProcedureCard({ procedure }: ProcedureCardProps) {
  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm('Supprimer cette procédure ?')) return;

    try {
      await deleteProcedure(procedure.id);
      toast.success('Procédure supprimée');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'default';
      case 'in_review':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="card h-100 shadow-sm hover-shadow-lg transition">
      <div className="card-body">
        <h5 className="card-title text-truncate mb-2">{procedure.title}</h5>
        <p className="card-text text-muted small line-clamp-2 mb-3">
          {procedure.description || 'Pas de description'}
        </p>

        <div className="d-flex flex-wrap gap-2 mb-3">
          <Badge variant={getStatusColor(procedure.status) as any}>
            {procedure.status}
          </Badge>
          {procedure.category && (
            <Badge variant="outline">{procedure.category}</Badge>
          )}
        </div>

        <div className="d-flex align-items-center text-muted small mb-3">
          <Clock className="me-2 text-muted" size={16} />
          {formatDuration(procedure.estimatedTotalTime)}
        </div>

        {procedure.tags.length > 0 && (
          <div className="d-flex flex-wrap gap-1 mb-3">
            {procedure.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="badge bg-secondary bg-opacity-25 text-secondary"
              >
                {tag}
              </span>
            ))}
            {procedure.tags.length > 3 && (
              <span className="badge bg-secondary bg-opacity-10 text-muted">
                +{procedure.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="card-footer bg-transparent border-top d-flex align-items-center justify-content-between">
        <small className="text-muted">
          {formatRelativeDate(procedure.updatedAt)}
        </small>

        <div className="d-flex gap-1">
          <Link to={`/procedures/${procedure.id}`}>
            <Button variant="ghost" size="icon" title="Voir">
              <Eye className="text-muted" size={16} />
            </Button>
          </Link>
          <Link to={`/procedures/${procedure.id}/edit`}>
            <Button variant="ghost" size="icon" title="Modifier">
              <Edit className="text-muted" size={16} />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            title="Supprimer"
          >
            <Trash2 className="text-danger" size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
