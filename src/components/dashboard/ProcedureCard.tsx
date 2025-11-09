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
    <div
      className="card h-100 border-0 hover-shadow-lg"
      style={{
        backgroundColor: 'rgba(23, 23, 23, 0.5)',
        borderRadius: '12px',
        transition: 'all 0.3s ease',
        cursor: 'pointer'
      }}
    >
      <div className="card-body p-4">
        <div className="d-flex align-items-start justify-content-between mb-3">
          <h5 className="card-title mb-0 fw-bold text-truncate flex-grow-1" style={{ fontSize: '1.1rem' }}>
            {procedure.title}
          </h5>
        </div>

        <p className="card-text text-muted small line-clamp-2 mb-3" style={{ minHeight: '40px' }}>
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
          <span>{formatDuration(procedure.estimatedTotalTime)}</span>
        </div>

        {procedure.tags.length > 0 && (
          <div className="d-flex flex-wrap gap-1">
            {procedure.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="badge rounded-pill"
                style={{
                  backgroundColor: 'rgba(108, 117, 125, 0.15)',
                  color: '#a8a8a8',
                  fontSize: '0.7rem',
                  padding: '0.25rem 0.5rem'
                }}
              >
                {tag}
              </span>
            ))}
            {procedure.tags.length > 3 && (
              <span className="badge rounded-pill bg-secondary bg-opacity-10 text-muted">
                +{procedure.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      <div
        className="card-footer bg-transparent d-flex align-items-center justify-content-between py-3 px-4"
        style={{ borderTop: '1px solid rgba(64, 64, 64, 0.3)' }}
      >
        <small className="text-muted" style={{ fontSize: '0.75rem' }}>
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
