import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Eye, Plus, Image, X } from 'lucide-react';
import { useProcedure } from '@/hooks/useProcedures';
import { createProcedure, updateProcedure, addPhase, deletePhase } from '@/services/procedureService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import PhaseItem from '@/components/editor/PhaseItem';
import PhaseTemplateSelector from '@/components/editor/PhaseTemplateSelector';
import { toast } from 'sonner';

export default function ProcedureEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const existingProcedure = useProcedure(id);

  const [reference, setReference] = useState('');
  const [designation, setDesignation] = useState('');
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [coverImage, setCoverImage] = useState<any>(null);

  useEffect(() => {
    if (existingProcedure) {
      setReference(existingProcedure.title);
      setDesignation(existingProcedure.description);
      setCoverImage(existingProcedure.coverImage || null);
    }
  }, [existingProcedure]);

  const handleSave = async () => {
    if (!reference.trim()) {
      toast.error('La référence est requise');
      return;
    }

    try {
      if (id && existingProcedure) {
        await updateProcedure(id, {
          title: reference,
          description: designation,
          coverImage: coverImage,
        });
        toast.success('Procédure mise à jour');
      } else {
        const newId = await createProcedure({
          title: reference,
          description: designation,
          coverImage: coverImage,
        });
        toast.success('Procédure créée');
        navigate(`/procedures/${newId}/edit`);
      }
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleAddPhase = () => {
    if (!id) {
      toast.error('Veuillez d\'abord sauvegarder la procédure');
      return;
    }
    setShowTemplateSelector(true);
  };

  const handleAddBlankPhase = async () => {
    if (!id) return;

    try {
      await addPhase(id, {
        title: 'Nouvelle phase',
        description: '',
      });
      toast.success('Phase ajoutée');
    } catch (error) {
      toast.error('Erreur lors de l\'ajout de la phase');
    }
  };

  const handleDeletePhase = async (phaseId: string) => {
    if (!id || !confirm('Supprimer cette phase ?')) return;

    try {
      await deletePhase(id, phaseId);
      toast.success('Phase supprimée');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleCoverImageChange = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverImage({
        data: reader.result,
        name: file.name,
        type: file.type,
      });
      toast.success('Image de couverture ajoutée');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleCoverImageChange(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleCoverImageChange(file);
    }
  };

  const handleRemoveCoverImage = () => {
    setCoverImage(null);
    toast.success('Image de couverture supprimée');
  };

  return (
    <div className="max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Link to={id ? `/procedures/${id}` : '/'}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>

        <div className="flex gap-2">
          {id && (
            <Link to={`/procedures/${id}`}>
              <Button variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                Aperçu
              </Button>
            </Link>
          )}
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Sauvegarder
          </Button>
        </div>
      </div>

      {/* Main Form */}
      <div className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Référence *
                </label>
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Référence de la procédure..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Désignation
                </label>
                <Input
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="Désignation de la procédure..."
                />
              </div>

              {/* Cover Image Upload */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Image de couverture (PDF)
                </label>

                {coverImage ? (
                  <div className="relative border-2 border-gray-700/30 rounded-lg p-4 bg-gray-900/30">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <img
                          src={coverImage.data}
                          alt="Couverture"
                          className="h-24 w-24 object-cover rounded-lg border border-gray-700/50"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-300 truncate">
                          {coverImage.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Image de couverture pour le PDF
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleRemoveCoverImage}
                        className="flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="border-2 border-dashed border-gray-700/30 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer bg-gray-900/30"
                    onClick={() => document.getElementById('cover-image-input')?.click()}
                  >
                    <Image className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                    <p className="text-sm text-gray-400 mb-1">
                      Glissez-déposez une image ici
                    </p>
                    <p className="text-xs text-gray-500">
                      ou cliquez pour sélectionner un fichier
                    </p>
                    <input
                      id="cover-image-input"
                      type="file"
                      accept="image/*"
                      onChange={handleFileInput}
                      className="hidden"
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Phases */}
        {id && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Phases</h2>
                <Button onClick={handleAddPhase}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une phase
                </Button>
              </div>

              {existingProcedure?.phases.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  Aucune phase. Cliquez sur "Ajouter une phase" pour commencer.
                </p>
              ) : (
                <div className="space-y-3">
                  {existingProcedure?.phases.map((phase, index) => (
                    <PhaseItem
                      key={phase.id}
                      phase={phase}
                      index={index}
                      procedureId={id!}
                      onDelete={handleDeletePhase}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Template Selector Modal */}
      {showTemplateSelector && id && (
        <PhaseTemplateSelector
          procedureId={id}
          onClose={() => setShowTemplateSelector(false)}
          onAddBlank={handleAddBlankPhase}
        />
      )}
    </div>
  );
}
