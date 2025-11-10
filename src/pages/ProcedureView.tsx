import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Download, Copy } from 'lucide-react';
import { useProcedure } from '@/hooks/useProcedures';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatDuration, formatDate } from '@/lib/utils';
import { deleteProcedure } from '@/services/procedureService';
import { generatePDF } from '@/lib/pdfGenerator';
import { toast } from 'sonner';

export default function ProcedureView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const procedure = useProcedure(id);

  if (!procedure) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Procédure introuvable
        </h2>
        <Link to="/">
          <Button className="mt-4">Retour au tableau de bord</Button>
        </Link>
      </div>
    );
  }

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette procédure ?')) {
      return;
    }

    try {
      await deleteProcedure(procedure.id);
      toast.success('Procédure supprimée');
      navigate('/');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleDuplicate = async () => {
    toast.info('Fonction de duplication temporairement désactivée');
    // TODO: Réimplémenter la duplication avec Firestore
  };

  const handleExportPDF = async () => {
    const toastId = toast.loading('Génération du PDF en cours...');
    try {
      await generatePDF(procedure, procedure.phases, {
        includeCoverPage: true,
        includeTableOfContents: true,
        includeToolList: true,
        includeMaterialList: true,
      });
      toast.dismiss(toastId);
      toast.success('PDF généré avec succès');
    } catch (error) {
      toast.dismiss(toastId);
      console.error('Error generating PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link to="/">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {procedure.title}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {procedure.description}
            </p>
          </div>

          <div className="flex gap-2">
            <Link to={`/procedures/${procedure.id}/edit`}>
              <Button variant="secondary">
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
            </Link>
            <Button variant="secondary" onClick={handleDuplicate}>
              <Copy className="h-4 w-4 mr-2" />
              Dupliquer
            </Button>
            <Button variant="secondary" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap gap-2 mt-4">
          {procedure.category && (
            <Badge variant="secondary">{procedure.category}</Badge>
          )}
          <Badge variant="secondary">
            {formatDuration(procedure.estimatedTotalTime)}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="bg-[#2a2a2a] rounded-lg border border-[#3a3a3a] p-6">
        <h2 className="text-xl font-bold mb-4">Phases</h2>

        {procedure.phases.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">
            Aucune phase définie
          </p>
        ) : (
          <div className="space-y-6">
            {procedure.phases.map((phase, index) => (
              <div
                key={phase.id}
                className="border-l-4 border-primary pl-4 py-2"
              >
                <h3 className="text-lg font-semibold mb-2">
                  Phase {index + 1}: {phase.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  {phase.description}
                </p>
                <div className="flex gap-2 text-sm">
                  <Badge variant="secondary">{phase.difficulty}</Badge>
                  <Badge variant="secondary">
                    {formatDuration(phase.estimatedTime)}
                  </Badge>
                </div>

                {phase.tools.length > 0 && (
                  <div className="mt-3">
                    <strong className="text-sm">Outils: </strong>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {phase.tools.map((t) => t.name).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
        <p>Créée le {formatDate(procedure.createdAt)}</p>
        <p>Dernière modification le {formatDate(procedure.updatedAt)}</p>
      </div>
    </div>
  );
}
