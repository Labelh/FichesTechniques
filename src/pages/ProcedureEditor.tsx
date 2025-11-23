import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Image as ImageIcon, X, Download, AlertTriangle, Pencil, GitBranch, Clock, CheckCircle } from 'lucide-react';
import { useProcedure } from '@/hooks/useProcedures';
import { createProcedure, updateProcedure, addPhase, deletePhase } from '@/services/procedureService';
import { uploadImageToHost } from '@/services/imageHostingService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import PhaseItem from '@/components/editor/PhaseItem';
import PhaseTemplateSelector from '@/components/editor/PhaseTemplateSelector';
import ImageAnnotator from '@/components/phase/ImageAnnotator';
import { toast } from 'sonner';
import { generateHTML } from '@/lib/htmlGenerator';
import type { DefectItem, AnnotatedImage, Annotation, VersionLog } from '@/types';

export default function ProcedureEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const existingProcedure = useProcedure(id);

  const [reference, setReference] = useState('');
  const [designation, setDesignation] = useState('');
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [defects, setDefects] = useState<DefectItem[]>([]);
  const [imageToAnnotate, setImageToAnnotate] = useState<{ defectId: string, image: AnnotatedImage } | null>(null);
  const [versionString, setVersionString] = useState('1.0');
  const [changelog, setChangelog] = useState<VersionLog[]>([]);

  useEffect(() => {
    if (existingProcedure) {
      setReference(existingProcedure.reference || '');
      setDesignation(existingProcedure.designation || existingProcedure.title || '');
      setDefects(existingProcedure.defects || []);
      setVersionString(existingProcedure.versionString || '1.0');
      setChangelog(existingProcedure.changelog || []);

      if (existingProcedure.coverImage) {
        setCoverImage(existingProcedure.coverImage);
        setCoverImagePreview(existingProcedure.coverImage);
      }
    }
  }, [existingProcedure]);

  // Raccourci Ctrl+S pour sauvegarde rapide
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleQuickSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [reference, designation, coverImage, defects, versionString, changelog, id, existingProcedure]);

  const calculateNextVersion = (current: string, type: 'major' | 'minor'): string => {
    const [major, minor] = current.split('.').map(Number);
    if (type === 'major') {
      return `${major + 1}.0`;
    } else {
      return `${major}.${minor + 1}`;
    }
  };

  const detectChangeType = (): { type: 'major' | 'minor', description: string } | null => {
    if (!existingProcedure) return null;

    const changes: string[] = [];
    let isMajor = false;

    // Changements de référence ou désignation (majeur)
    if (reference !== (existingProcedure.reference || '')) {
      changes.push('Modification de la référence');
      isMajor = true;
    }
    if (designation !== (existingProcedure.designation || existingProcedure.title || '')) {
      changes.push('Modification de la désignation');
      isMajor = true;
    }

    // Changements d'image de couverture (mineur)
    if (coverImage !== existingProcedure.coverImage) {
      changes.push("Modification de l'image de couverture");
    }

    // Changements dans les défauts (mineur)
    const existingDefectsCount = existingProcedure.defects?.length || 0;
    const currentDefectsCount = defects.length;
    if (currentDefectsCount > existingDefectsCount) {
      changes.push(`Ajout de ${currentDefectsCount - existingDefectsCount} défaut(s)`);
    } else if (currentDefectsCount < existingDefectsCount) {
      changes.push(`Suppression de ${existingDefectsCount - currentDefectsCount} défaut(s)`);
      isMajor = true;
    }

    if (changes.length === 0) return null;

    return {
      type: isMajor ? 'major' : 'minor',
      description: changes.join(', ')
    };
  };

  // Sauvegarde simple sans versioning (pour sauvegardes fréquentes)
  const handleQuickSave = async () => {
    if (!reference.trim() && !designation.trim()) {
      toast.error('La référence ou la désignation est requise');
      return;
    }

    try {
      if (id && existingProcedure) {
        await updateProcedure(id, {
          reference: reference.trim() || undefined,
          designation: designation.trim() || undefined,
          title: designation.trim() || reference.trim() || 'Sans titre',
          description: '',
          coverImage: coverImage || undefined,
          defects: defects,
          versionString: versionString,
          changelog: changelog,
        });
        toast.success('Sauvegarde rapide effectuée');
      } else {
        // Pour une nouvelle procédure, on crée la version 1.0
        const newId = await createProcedure({
          reference: reference.trim() || undefined,
          designation: designation.trim() || undefined,
          title: designation.trim() || reference.trim() || 'Nouvelle procédure',
          description: '',
          coverImage: coverImage || undefined,
          defects: defects,
          versionString: '1.0',
          changelog: [{
            id: crypto.randomUUID(),
            version: '1.0',
            type: 'major',
            description: 'Création initiale de la procédure',
            date: new Date(),
          }],
        });
        toast.success('Procédure créée');
        navigate(`/procedures/${newId}/edit`);
      }
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  // Sauvegarde avec versioning automatique
  const handleSave = async () => {
    if (!reference.trim() && !designation.trim()) {
      toast.error('La référence ou la désignation est requise');
      return;
    }

    try {
      let updatedVersionString = versionString;
      let updatedChangelog = changelog;

      // Détection automatique des changements pour procédures existantes
      if (id && existingProcedure) {
        const changeDetection = detectChangeType();
        if (changeDetection) {
          const nextVersion = calculateNextVersion(versionString, changeDetection.type);
          const newLog: VersionLog = {
            id: crypto.randomUUID(),
            version: nextVersion,
            type: changeDetection.type,
            description: changeDetection.description,
            date: new Date(),
          };
          updatedVersionString = nextVersion;
          updatedChangelog = [newLog, ...changelog];
          toast.success(`Version ${nextVersion} créée automatiquement (${changeDetection.type === 'major' ? 'Majeure' : 'Mineure'})`);
        }

        await updateProcedure(id, {
          reference: reference.trim() || undefined,
          designation: designation.trim() || undefined,
          title: designation.trim() || reference.trim() || 'Sans titre',
          description: '',
          coverImage: coverImage || undefined,
          defects: defects,
          versionString: updatedVersionString,
          changelog: updatedChangelog,
        });

        // Mettre à jour l'état local
        setVersionString(updatedVersionString);
        setChangelog(updatedChangelog);

        toast.success('Procédure mise à jour');
      } else {
        const newId = await createProcedure({
          reference: reference.trim() || undefined,
          designation: designation.trim() || undefined,
          title: designation.trim() || reference.trim() || 'Nouvelle procédure',
          description: '',
          coverImage: coverImage || undefined,
          defects: defects,
          versionString: '1.0',
          changelog: [{
            id: crypto.randomUUID(),
            version: '1.0',
            type: 'major',
            description: 'Création initiale de la procédure',
            date: new Date(),
          }],
        });
        toast.success('Procédure créée');
        navigate(`/procedures/${newId}/edit`);
      }
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleAddDefect = () => {
    setDefects([...defects, {
      id: crypto.randomUUID(),
      description: '',
      images: []
    }]);
  };

  const handleUpdateDefect = (id: string, description: string) => {
    setDefects(defects.map(d => d.id === id ? { ...d, description } : d));
  };

  const handleRemoveDefect = (id: string) => {
    setDefects(defects.filter(d => d.id !== id));
  };

  const handleAddDefectImage = async (defectId: string, files: File[]) => {
    const validImages: AnnotatedImage[] = [];

    for (const file of files) {
      if (file.size > 15 * 1024 * 1024) {
        toast.error(`${file.name} est trop volumineux (max 15 MB)`);
        continue;
      }

      try {
        const imageUrl = await uploadImageToHost(file);

        const img = new Image();
        const url = URL.createObjectURL(file);
        await new Promise((resolve) => {
          img.onload = resolve;
          img.src = url;
        });
        URL.revokeObjectURL(url);

        validImages.push({
          imageId: crypto.randomUUID(),
          image: {
            id: crypto.randomUUID(),
            name: file.name,
            blob: file,
            size: file.size,
            mimeType: file.type,
            width: img.width,
            height: img.height,
            createdAt: new Date(),
            updatedAt: new Date(),
            url: imageUrl,
          },
          annotations: [],
          description: ''
        });
      } catch (error: any) {
        console.error(`Error uploading ${file.name}:`, error);
        toast.error(`Erreur pour ${file.name}: ${error.message}`);
      }
    }

    if (validImages.length > 0) {
      setDefects(defects.map(d =>
        d.id === defectId
          ? { ...d, images: [...(d.images || []), ...validImages] }
          : d
      ));
      toast.success(`${validImages.length} image(s) ajoutée(s)`);
    }
  };

  const handleRemoveDefectImage = (defectId: string, imageId: string) => {
    setDefects(defects.map(d =>
      d.id === defectId
        ? { ...d, images: (d.images || []).filter(img => img.imageId !== imageId) }
        : d
    ));
  };

  const handleSaveDefectAnnotations = (annotations: Annotation[], description: string) => {
    if (!imageToAnnotate) return;

    setDefects(defects.map(d =>
      d.id === imageToAnnotate.defectId
        ? {
            ...d,
            images: (d.images || []).map(img =>
              img.imageId === imageToAnnotate.image.imageId
                ? { ...img, annotations, description }
                : img
            )
          }
        : d
    ));
    setImageToAnnotate(null);
    toast.success('Annotations sauvegardées');
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

    if (file.size > 15 * 1024 * 1024) {
      toast.error('L\'image est trop volumineuse (max 15 MB)');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      toast.info('Upload de l\'image en cours...');
      const imageUrl = await uploadImageToHost(file);

      setCoverImage(imageUrl);
      setCoverImagePreview(imageUrl);
      toast.success('Image de couverture ajoutée');
    } catch (error: any) {
      console.error('Error uploading cover image:', error);
      toast.error(`Erreur: ${error.message}`);
      setCoverImagePreview(null);
    }
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
    setCoverImagePreview(null);
    toast.success('Image de couverture supprimée');
  };

  const handleExportHTML = async () => {
    if (!existingProcedure) {
      toast.error('Aucune procédure à exporter');
      return;
    }

    try {
      await generateHTML(existingProcedure, existingProcedure.phases || []);
      toast.success('Procédure exportée en HTML');
    } catch (error) {
      console.error('Error exporting HTML:', error);
      toast.error('Erreur lors de l\'export HTML');
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Link to="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            {id && existingProcedure && (
              <Button variant="secondary" onClick={handleExportHTML}>
                <Download className="h-4 w-4 mr-2" />
                Exporter HTML
              </Button>
            )}
            <Button onClick={handleQuickSave} variant="secondary" title="Ctrl+S">
              <CheckCircle className="h-4 w-4 mr-2" />
              Sauvegarde rapide
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder + Version
            </Button>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <div className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    Référence <span className="text-gray-500 font-normal">(optionnel)</span>
                  </label>
                  <Input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Ex: PROC-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    Désignation *
                  </label>
                  <Input
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="Ex: Procédure de montage échafaudage"
                  />
                </div>
              </div>

              {/* Cover Image Upload */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Image de couverture (PDF)
                </label>

                {coverImagePreview ? (
                  <div className="relative border-2 border-[#323232] rounded-lg p-4 bg-background-elevated">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <img
                          src={coverImagePreview}
                          alt="Couverture"
                          className="h-24 w-24 object-cover rounded-lg border border-[#323232]"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-300 truncate">
                          Image de couverture
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {coverImage ? 'Hébergée sur ImgBB' : 'Upload en cours...'}
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
                    className="border-2 border-dashed border-[#323232] rounded-lg p-8 text-center cursor-pointer bg-background-elevated"
                    onClick={() => document.getElementById('cover-image-input')?.click()}
                  >
                    <ImageIcon className="h-12 w-12 mx-auto mb-3 text-gray-600" />
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

        {/* Défauthèque */}
        {id && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Défauthèque
                  </h2>
                </div>
                <Button onClick={handleAddDefect} variant="secondary">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un défaut
                </Button>
              </div>

              {defects.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  Aucun défaut répertorié. Cliquez sur "Ajouter un défaut" pour commencer.
                </p>
              ) : (
                <div className="space-y-3">
                  {defects.map((defect) => (
                    <div key={defect.id} className="border border-[#323232] rounded-lg bg-background-elevated p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-3">
                          <textarea
                            value={defect.description}
                            onChange={(e) => handleUpdateDefect(defect.id, e.target.value)}
                            placeholder="Description du défaut..."
                            rows={3}
                            className="w-full rounded-lg border border-[#323232] bg-transparent px-3 py-2 text-sm text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                          />

                          {/* Images */}
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-2">
                              Images ({defect.images?.length || 0})
                            </label>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {(defect.images || []).map((img) => (
                                <div key={img.imageId} className="relative group">
                                  <img
                                    src={img.image.url || URL.createObjectURL(img.image.blob)}
                                    alt={img.description || 'Image du défaut'}
                                    className="h-16 w-16 object-cover rounded border border-[#323232]"
                                  />
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => setImageToAnnotate({ defectId: defect.id, image: img })}
                                      className="bg-primary text-white rounded p-1 hover:bg-primary/80"
                                      title="Annoter l'image"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => handleRemoveDefectImage(defect.id, img.imageId)}
                                      className="bg-red-500 text-white rounded p-1 hover:bg-red-600"
                                      title="Supprimer l'image"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                  {img.annotations && img.annotations.length > 0 && (
                                    <div className="absolute bottom-0 left-0 right-0 bg-primary/80 text-white text-xs px-1 text-center">
                                      {img.annotations.length} annotation{img.annotations.length > 1 ? 's' : ''}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                            <div
                              onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/*';
                                input.multiple = true;
                                input.onchange = async (e) => {
                                  const files = Array.from((e.target as HTMLInputElement).files || []);
                                  await handleAddDefectImage(defect.id, files);
                                };
                                input.click();
                              }}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={async (e) => {
                                e.preventDefault();
                                const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                                await handleAddDefectImage(defect.id, files);
                              }}
                              className="border-2 border-dashed border-[#323232] rounded-lg p-3 text-center cursor-pointer bg-background-elevated"
                            >
                              <p className="text-xs text-gray-500">Cliquez ou glissez-déposez des images</p>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveDefect(defect.id)}
                          className="flex-shrink-0"
                        >
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
                      totalPhases={existingProcedure.phases.length}
                      onDelete={handleDeletePhase}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Versioning */}
        {id && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-primary" />
                  Historique des versions
                </h2>
                <span className="px-3 py-1 bg-primary/20 border border-primary/30 rounded-lg text-sm font-semibold text-primary">
                  v{versionString}
                </span>
                <span className="text-xs text-text-muted ml-auto">
                  Versions créées automatiquement à chaque sauvegarde
                </span>
              </div>

              {/* Changelog */}
              {changelog.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  Aucune modification enregistrée. La procédure est en version initiale {versionString}.
                </p>
              ) : (
                <div className="space-y-3">
                  {changelog.map((log) => (
                    <div key={log.id} className="border border-[#323232] rounded-lg bg-background-elevated p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-status-info/20 text-blue-400 border border-blue-400/30">
                            v{log.version}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            log.type === 'major'
                              ? 'bg-orange-500/20 text-orange-300'
                              : 'bg-green-500/20 text-green-300'
                          }`}>
                            {log.type === 'major' ? 'Majeure' : 'Mineure'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-text-muted">
                          <Clock className="h-3 w-3" />
                          {new Date(log.date).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                      <p className="text-sm text-text-primary">{log.description}</p>
                    </div>
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

      {/* ImageAnnotator Modal for Defects */}
      {imageToAnnotate && (
        <ImageAnnotator
          annotatedImage={imageToAnnotate.image}
          onSave={handleSaveDefectAnnotations}
          onCancel={() => setImageToAnnotate(null)}
        />
      )}

    </div>
  );
}
