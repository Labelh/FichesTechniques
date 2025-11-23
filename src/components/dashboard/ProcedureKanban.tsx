import ProcedureCard from './ProcedureCard';
import type { Procedure, ProcedureStatus } from '@/types';

interface ProcedureKanbanProps {
  procedures: Procedure[];
}

export default function ProcedureKanban({ procedures }: ProcedureKanbanProps) {
  const columns: { status: ProcedureStatus; label: string; color: string; borderColor: string }[] = [
    { status: 'draft' as ProcedureStatus, label: 'Brouillons', color: 'bg-background-elevated', borderColor: 'border-[#323232]' },
    { status: 'en_cours' as ProcedureStatus, label: 'En cours', color: 'bg-gradient-to-r from-orange-600 to-red-600', borderColor: 'border-orange-500' },
    { status: 'in_review' as ProcedureStatus, label: 'En révision', color: 'bg-background-surface', borderColor: 'border-[#323232]' },
    { status: 'completed' as ProcedureStatus, label: 'Terminées', color: 'bg-background', borderColor: 'border-[#323232]' },
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
            <div className={`rounded-t-lg p-3 border-2 ${column.borderColor} ${column.color}`}>
              <h3 className="font-semibold text-white">
                {column.label}
                <span className="ml-2 text-sm font-normal text-gray-300">
                  ({columnProcedures.length})
                </span>
              </h3>
            </div>

            <div className="flex-1 bg-background border-2 border-t-0 border-[#323232] rounded-b-lg p-3 space-y-3 min-h-[400px]">
              {columnProcedures.map((procedure) => (
                <ProcedureCard key={procedure.id} procedure={procedure} />
              ))}

              {columnProcedures.length === 0 && (
                <p className="text-center text-sm text-gray-500 py-8">
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
