import { Link } from 'react-router-dom';
import { Clock, User, Edit, Trash2, Eye } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
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
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="line-clamp-1">{procedure.title}</CardTitle>
            <CardDescription className="line-clamp-2 mt-1">
              {procedure.description || 'Pas de description'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant={getStatusColor(procedure.status) as any}>
            {procedure.status}
          </Badge>
          <Badge variant="outline">{procedure.difficulty}</Badge>
          {procedure.category && (
            <Badge variant="outline">{procedure.category}</Badge>
          )}
        </div>

        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            {formatDuration(procedure.estimatedTotalTime)}
          </div>
          <div className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            {procedure.numberOfPeople} personne(s)
          </div>
        </div>

        {procedure.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {procedure.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded"
              >
                {tag}
              </span>
            ))}
            {procedure.tags.length > 3 && (
              <span className="text-xs text-gray-500">
                +{procedure.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-4 border-t">
        <span className="text-xs text-gray-500">
          {formatRelativeDate(procedure.updatedAt)}
        </span>

        <div className="flex gap-1">
          <Link to={`/procedures/${procedure.id}`}>
            <Button variant="ghost" size="icon" title="Voir">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Link to={`/procedures/${procedure.id}/edit`}>
            <Button variant="ghost" size="icon" title="Modifier">
              <Edit className="h-4 w-4" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
