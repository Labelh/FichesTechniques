import { Link } from 'react-router-dom';
import { Edit, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatRelativeDate } from '@/lib/utils';
import type { Procedure } from '@/types';

interface ProcedureListProps {
  procedures: Procedure[];
}

export default function ProcedureList({ procedures }: ProcedureListProps) {
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
            <tr key={procedure.id}>
              <td className="font-mono text-sm text-gray-400">
                {procedure.reference || 'N/A'}
              </td>
              <td>
                <Link
                  to={`/procedures/${procedure.id}`}
                  className="font-medium text-white hover:text-[rgb(249,55,5)] transition-colors"
                >
                  {procedure.title}
                </Link>
              </td>
              <td className="text-sm text-gray-400">
                {formatRelativeDate(procedure.updatedAt)}
              </td>
              <td>
                <div className="flex items-center justify-end gap-2">
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
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
