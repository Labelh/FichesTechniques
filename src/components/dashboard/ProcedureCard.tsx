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
    <div className="card h-100 hover-lift">
      <div className="card-body">
        <h5 className="card-title mb-2 fw-semibold">{procedure.title}</h5>

        <p className="card-text text-muted small mb-3" style={{ minHeight: '40px' }}>
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
          <Clock className="me-2" size={14} />
          <span>{formatDuration(procedure.estimatedTotalTime)}</span>
        </div>

        {procedure.tags.length > 0 && (
          <div className="d-flex flex-wrap gap-1">
            {procedure.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="badge bg-secondary">
                {tag}
              </span>
            ))}
            {procedure.tags.length > 3 && (
              <span className="badge bg-secondary">
                +{procedure.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="card-footer">
        <div className="d-flex align-items-center justify-content-between">
          <small className="text-muted">
            {formatRelativeDate(procedure.updatedAt)}
          </small>

          <div className="d-flex gap-1">
            <Link to={`/procedures/${procedure.id}`}>
              <Button variant="ghost" size="icon" title="Voir">
                <Eye size={16} />
              </Button>
            </Link>
            <Link to={`/procedures/${procedure.id}/edit`}>
              <Button variant="ghost" size="icon" title="Modifier">
                <Edit size={16} />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              title="Supprimer"
              className="text-danger"
            >
              <Trash2 size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
