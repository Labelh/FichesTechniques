import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Image as ImageIcon, X, Download, AlertTriangle, Pencil, CheckCircle } from 'lucide-react';
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
  const [initialSnapshot, setInitialSnapshot] = useState<{ phaseCount: number, stepCounts: number[] } | null>(null);
  const [quickSaveSuccess, setQuickSaveSuccess] = useState(false);
  const [versionSaveSuccess, setVersionSaveSuccess] = useState(false);

  useEffect(() => {
    if (existingProcedure) {
      setReference(existingProcedure.reference || '');
      setDesignation(existingProcedure.designation || existingProcedure.title || '');
      setDefects(existingProcedure.defects || []);
      setVersionString(existingProcedure.versionString || '1.0');
      setChangelog(existingProcedure.changelog || []);

      // Sauvegarder le snapshot initial pour la détection des changements
      if (!initialSnapshot && existingProcedure.phases) {
        setInitialSnapshot({
          phaseCount: existingProcedure.phases.length,
          stepCounts: existingProcedure.phases.map(p => p.steps?.length || 0)
        });
      }

      if (existingProcedure.coverImage) {
        setCoverImage(existingProcedure.coverImage);
        setCoverImagePreview(existingProcedure.coverImage);
      }
    }
  }, [existingProcedure, initialSnapshot]);

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
    if (!existingProcedure || !initialSnapshot) return null;

    const changes: string[] = [];
    let isMajor = false;

    // MAJEUR: Changements de phases
    const currentPhaseCount = existingProcedure.phases?.length || 0;
    if (currentPhaseCount !== initialSnapshot.phaseCount) {
      const diff = currentPhaseCount - initialSnapshot.phaseCount;
      if (diff > 0) {
        changes.push(`Ajout de ${diff} phase(s)`);
      } else {
        changes.push(`Suppression de ${Math.abs(diff)} phase(s)`);
      }
      isMajor = true;
    }

    // MAJEUR: Changements de sous-étapes
    const currentStepCounts = existingProcedure.phases?.map(p => p.steps?.length || 0) || [];
    for (let i = 0; i < Math.max(currentStepCounts.length, initialSnapshot.stepCounts.length); i++) {
      const currentCount = currentStepCounts[i] || 0;
      const initialCount = initialSnapshot.stepCounts[i] || 0;
      if (currentCount !== initialCount) {
        const diff = currentCount - initialCount;
        if (diff > 0) {
          changes.push(`Ajout de ${diff} sous-étape(s) dans phase ${i + 1}`);
        } else {
          changes.push(`Suppression de ${Math.abs(diff)} sous-étape(s) dans phase ${i + 1}`);
        }
        isMajor = true;
      }
    }

    // MINEUR: Changements de référence ou désignation
    if (reference.trim() !== (existingProcedure.reference || '').trim()) {
      changes.push('Modification de la référence');
    }
    if (designation.trim() !== (existingProcedure.designation || existingProcedure.title || '').trim()) {
      changes.push('Modification de la désignation');
    }

    // MINEUR: Changements de défauts
    const existingDefectsCount = existingProcedure.defects?.length || 0;
    const currentDefectsCount = defects.length;
    if (currentDefectsCount !== existingDefectsCount) {
      const diff = currentDefectsCount - existingDefectsCount;
      if (diff > 0) {
        changes.push(`Ajout de ${diff} défaut(s)`);
      } else {
        changes.push(`Suppression de ${Math.abs(diff)} défaut(s)`);
      }
    }

    // MINEUR: Changement d'image de couverture
    if (coverImage !== existingProcedure.coverImage) {
      changes.push("Modification de l'image de couverture");
    }

    // MINEUR: Changements dans les descriptions de défauts
    const existingDefects = existingProcedure.defects || [];
    const defectDescChanged = defects.some((def, idx) => {
      const existingDef = existingDefects[idx];
      return existingDef && def.description !== existingDef.description;
    });
    if (defectDescChanged) {
      changes.push("Modification de descriptions de défauts");
    }

    // MINEUR: Changements dans les images de défauts
    const defectImagesChanged = defects.some((def, idx) => {
      const existingDef = existingDefects[idx];
      if (!existingDef) return false;
      const existingImgCount = existingDef.images?.length || 0;
      const currentImgCount = def.images?.length || 0;
      return existingImgCount !== currentImgCount;
    });
    if (defectImagesChanged) {
      changes.push("Modification des images de défauts");
    }

    // Si aucun changement détecté, on crée quand même une version mineure
    if (changes.length === 0) {
      changes.push("Modifications diverses");
    }

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
        toast.success('✅ Sauvegarde rapide effectuée !', {
          duration: 3000,
          position: 'top-right',
        });
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
        toast.success('✅ Procédure créée avec succès !', {
          duration: 3000,
          position: 'top-right',
        });
        navigate(`/procedures/${newId}/edit`);
      }

      // Feedback visuel vert
      setQuickSaveSuccess(true);
      setTimeout(() => setQuickSaveSuccess(false), 3000);
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

    if (!id || !existingProcedure) {
      // Pour une nouvelle procédure, utiliser sauvegarde rapide
      return handleQuickSave();
    }

    try {
      // Détection automatique des changements
      const changeDetection = detectChangeType();

      if (!changeDetection) {
        toast.error('Erreur lors de la détection des changements');
        return;
      }

      const { type: versionType, description } = changeDetection;

      // Calculer la nouvelle version
      const nextVersion = calculateNextVersion(versionString, versionType);

      // Créer le nouveau log
      const newLog: VersionLog = {
        id: crypto.randomUUID(),
        version: nextVersion,
        type: versionType,
        description: description,
        date: new Date(),
      };

      const updatedVersionString = nextVersion;
      const updatedChangelog = [newLog, ...changelog];

      // Sauvegarder
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

      // Réinitialiser le snapshot pour la prochaine détection
      if (existingProcedure.phases) {
        setInitialSnapshot({
          phaseCount: existingProcedure.phases.length,
          stepCounts: existingProcedure.phases.map(p => p.steps?.length || 0)
        });
      }

      // Feedback visuel vert
      setVersionSaveSuccess(true);
      setTimeout(() => setVersionSaveSuccess(false), 3000);

      toast.success(`✅ Version ${nextVersion} créée (${versionType === 'major' ? 'Majeure' : 'Mineure'}) !\n${description}`, {
        duration: 5000,
        position: 'top-right',
      });
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
            <Button
              onClick={handleQuickSave}
              variant="secondary"
              title="Ctrl+S"
              className={quickSaveSuccess ? 'bg-green-600 hover:bg-green-700 border-green-600' : ''}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Sauvegarde rapide
            </Button>
            <Button
              onClick={handleSave}
              className={versionSaveSuccess ? 'bg-green-600 hover:bg-green-700' : ''}
            >
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
              <div className="mb-4">
                <h2 className="text-xl font-bold mb-2">
                  Historique des versions
                </h2>
                <span className="text-xs text-text-muted">
                  Versions créées automatiquement à chaque sauvegarde
                </span>
              </div>

              {/* Changelog Table */}
              {changelog.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  Aucune modification enregistrée. La procédure est en version initiale {versionString}.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ width: '15%' }}>Version</th>
                        <th style={{ width: '12%' }}>Type</th>
                        <th style={{ width: '18%' }}>Date</th>
                        <th>Modifications</th>
                      </tr>
                    </thead>
                    <tbody>
                      {changelog.map((log) => (
                        <tr key={log.id}>
                          <td>
                            <span className="px-2 py-1 rounded text-xs font-semibold bg-primary/20 text-primary border border-primary/30">
                              v{log.version}
                            </span>
                          </td>
                          <td>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              log.type === 'major'
                                ? 'bg-primary/20 text-primary border border-primary/30'
                                : 'bg-green-500/20 text-green-300 border border-green-500/30'
                            }`}>
                              {log.type === 'major' ? 'Majeure' : 'Mineure'}
                            </span>
                          </td>
                          <td className="text-xs text-text-muted">
                            {(() => {
                              if (log.date && typeof log.date === 'object' && 'toDate' in log.date) {
                                return ((log.date as any).toDate() as Date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
                              } else if (log.date instanceof Date) {
                                return log.date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
                              } else {
                                return new Date(log.date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
                              }
                            })()}
                          </td>
                          <td className="text-sm text-text-primary">{log.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
