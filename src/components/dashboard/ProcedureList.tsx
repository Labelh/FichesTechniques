import { Link } from 'react-router-dom';
import { Edit, Eye, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatDuration, formatRelativeDate } from '@/lib/utils';
import type { Procedure } from '@/types';

interface ProcedureListProps {
  procedures: Procedure[];
}

export default function ProcedureList({ procedures }: ProcedureListProps) {
  return (
    <div className="bg-gray-900/30 rounded-lg border border-gray-700/50 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-700/50">
        <thead className="bg-gray-900/50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Titre
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Statut
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Temps
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Modifié
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-transparent divide-y divide-gray-700/50">
          {procedures.map((procedure) => (
            <tr
              key={procedure.id}
              className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <td className="px-6 py-4">
                <div>
                  <Link
                    to={`/procedures/${procedure.id}`}
                    className="font-medium text-gray-900 dark:text-white hover:text-primary"
                  >
                    {procedure.title}
                  </Link>
                  {procedure.category && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {procedure.category}
                    </p>
                  )}
                </div>
              </td>
              <td className="px-6 py-4">
                <Badge variant="outline">{procedure.status}</Badge>
              </td>
              <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {formatDuration(procedure.estimatedTotalTime)}
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                {formatRelativeDate(procedure.updatedAt)}
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Link to={`/procedures/${procedure.id}`}>
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to={`/procedures/${procedure.id}/edit`}>
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
