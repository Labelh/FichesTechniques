import ProcedureCard from './ProcedureCard';
import type { Procedure, ProcedureStatus } from '@/types';

interface ProcedureKanbanProps {
  procedures: Procedure[];
}

export default function ProcedureKanban({ procedures }: ProcedureKanbanProps) {
  const columns: { status: ProcedureStatus; label: string; color: string }[] = [
    { status: 'draft' as ProcedureStatus, label: 'Brouillons', color: 'bg-gray-100 dark:bg-gray-800' },
    { status: 'in_progress' as ProcedureStatus, label: 'En cours', color: 'bg-blue-100 dark:bg-blue-900' },
    { status: 'in_review' as ProcedureStatus, label: 'En révision', color: 'bg-yellow-100 dark:bg-yellow-900' },
    { status: 'completed' as ProcedureStatus, label: 'Terminées', color: 'bg-green-100 dark:bg-green-900' },
  ];

  const getProceduresByStatus = (status: ProcedureStatus) => {
    return procedures.filter((p) => p.status === status);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {columns.map((column) => {
        const columnProcedures = getProceduresByStatus(column.status);

        return (
          <div key={column.status} className="flex flex-col">
            <div className={`rounded-t-lg p-3 ${column.color}`}>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {column.label}
                <span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-400">
                  ({columnProcedures.length})
                </span>
              </h3>
            </div>

            <div className="flex-1 bg-gray-50 dark:bg-gray-900 rounded-b-lg p-3 space-y-3 min-h-[400px]">
              {columnProcedures.map((procedure) => (
                <ProcedureCard key={procedure.id} procedure={procedure} />
              ))}

              {columnProcedures.length === 0 && (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
                  Aucune procédure
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
