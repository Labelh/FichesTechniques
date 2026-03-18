import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Image as ImageIcon, X, Download, AlertTriangle, Pencil, CheckCircle, ChevronDown, ChevronUp, Trash2, FileText, Layers, GitBranch, Shield, Tag } from 'lucide-react';
import { useProcedure } from '@/hooks/useProcedures';
import { useTools } from '@/hooks/useTools';
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
  const availableTools = useTools();

  const [reference, setReference] = useState('');
  const [designation, setDesignation] = useState('');
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [defects, setDefects] = useState<DefectItem[]>([]);
  const [imageToAnnotate, setImageToAnnotate] = useState<{ defectId: string, image: AnnotatedImage } | null>(null);
  const [versionString, setVersionString] = useState('1.0');
  const [changelog, setChangelog] = useState<VersionLog[]>([]);
  const [quickSaveSuccess, setQuickSaveSuccess] = useState(false);
  const [showAllVersions, setShowAllVersions] = useState(false);
  const [showDefects, setShowDefects] = useState(true);
  const [showVersionForm, setShowVersionForm] = useState(false);
  const [newVersionType, setNewVersionType] = useState<'major' | 'minor'>('minor');
  const [newVersionDescription, setNewVersionDescription] = useState('');
  const [status, setStatus] = useState<'en_cours' | 'verification' | 'relecture' | 'mise_a_jour_timetonic' | 'completed'>('en_cours');

  useEffect(() => {
    if (existingProcedure) {
      setReference(existingProcedure.reference || '');
      setDesignation(existingProcedure.designation || existingProcedure.title || '');
      setDefects(existingProcedure.defects || []);
      setVersionString(existingProcedure.versionString || '1.0');
      setChangelog(existingProcedure.changelog || []);
      const s = existingProcedure.status as string;
      setStatus((['en_cours', 'verification', 'relecture', 'mise_a_jour_timetonic', 'completed'].includes(s) ? s : 'en_cours') as 'en_cours' | 'verification' | 'relecture' | 'mise_a_jour_timetonic' | 'completed');

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
  }, [reference, designation, coverImage, defects, versionString, changelog, status, id, existingProcedure]);

  const calculateNextVersion = (current: string, type: 'major' | 'minor'): string => {
    const [major, minor] = current.split('.').map(Number);
    if (type === 'major') {
      return `${major + 1}.0`;
    } else {
      return `${major}.${minor + 1}`;
    }
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
          status: status as any,
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
          status: status as any,
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

  // Création manuelle d'une nouvelle version
  const handleManualVersion = async () => {
    if (!id || !existingProcedure) {
      toast.error('Impossible de créer une version pour une procédure non sauvegardée');
      return;
    }

    if (!newVersionDescription.trim()) {
      toast.error('Veuillez entrer une description pour cette version');
      return;
    }

    try {
      // Calculer la nouvelle version
      const nextVersion = calculateNextVersion(versionString, newVersionType);

      // Créer le nouveau log
      const newLog: VersionLog = {
        id: crypto.randomUUID(),
        version: nextVersion,
        type: newVersionType,
        description: newVersionDescription.trim(),
        date: new Date(),
      };

      const updatedVersionString = nextVersion;
      const updatedChangelog = [newLog, ...changelog];

      // Sauvegarder
      await updateProcedure(id, {
        versionString: updatedVersionString,
        changelog: updatedChangelog,
      });

      // Mettre à jour l'état local
      setVersionString(updatedVersionString);
      setChangelog(updatedChangelog);

      // Réinitialiser le formulaire
      setShowVersionForm(false);
      setNewVersionDescription('');
      setNewVersionType('minor');

      toast.success(`✅ Version ${nextVersion} créée (${newVersionType === 'major' ? 'Majeure' : 'Mineure'})`, {
        duration: 3000,
        position: 'top-right',
      });
    } catch (error) {
      console.error('Error creating version:', error);
      toast.error('Erreur lors de la création de la version');
    }
  };

  const handleAddDefect = () => {
    setDefects([...defects, {
      id: crypto.randomUUID(),
      description: '',
      defect: '',
      whatToDo: '',
      criteria: undefined,
      images: []
    }]);
  };

  const handleUpdateDefect = (id: string, field: 'description' | 'defect' | 'whatToDo' | 'criteria', value: string) => {
    setDefects(defects.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const handleRemoveDefect = (id: string) => {
    setDefects(defects.filter(d => d.id !== id));
  };

  const handleDeleteVersion = async (versionId: string) => {
    if (!id || !confirm('Supprimer cette version de l\'historique ?')) return;

    try {
      const updatedChangelog = changelog.filter(log => log.id !== versionId);

      await updateProcedure(id, {
        changelog: updatedChangelog,
      });

      setChangelog(updatedChangelog);
      toast.success('Version supprimée de l\'historique');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
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
    if (!id || !existingProcedure) {
      toast.error('Aucune procédure à exporter');
      return;
    }

    // Avertir l'utilisateur et attendre que Firestore se synchronise
    toast.info('⏱️ Synchronisation en cours... Veuillez patienter');

    // Attendre 3 secondes pour laisser Firestore se synchroniser
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
      toast.info('📄 Génération du HTML...');

      // Utiliser directement existingProcedure qui contient les données à jour
      const phases = existingProcedure.phases || [];

      console.log('=== HTML EXPORT DEBUG - DONNÉES COMPLÈTES ===');
      console.log('PROCÉDURE COMPLÈTE:', JSON.stringify(existingProcedure, null, 2));
      console.log('\n--- Résumé procédure ---');
      console.log('ID:', existingProcedure.id);
      console.log('Titre:', existingProcedure.title);
      console.log('Désignation:', existingProcedure.designation);
      console.log('Référence:', existingProcedure.reference);
      console.log('Description:', existingProcedure.description);
      console.log('Catégorie:', existingProcedure.category);
      console.log('Tags:', existingProcedure.tags);
      console.log('Image couverture:', existingProcedure.coverImage ? 'OUI' : 'NON');
      console.log('Outils globaux:', existingProcedure.globalTools?.length || 0);
      console.log('Matériaux globaux:', existingProcedure.globalMaterials?.length || 0);
      console.log('Défauts:', existingProcedure.defects?.length || 0);
      console.log('Changelog:', existingProcedure.changelog?.length || 0);
      console.log('Version:', existingProcedure.versionString);

      console.log('\n--- Phases détaillées ---');
      console.log('Nombre de phases:', phases.length);
      phases.forEach((phase: any, idx: number) => {
        console.log(`\nPhase ${idx + 1}:`, phase.title);
        console.log('  Difficulté:', phase.difficulty);
        console.log('  Temps estimé:', phase.estimatedTime);
        console.log('  Étapes:', phase.steps?.length || 0);

        if (phase.steps) {
          phase.steps.forEach((step: any, stepIdx: number) => {
            console.log(`\n  Étape ${stepIdx + 1}:`, step.title || 'Sans titre');
            console.log('    Description:', step.description ? 'OUI' : 'NON');
            console.log('    Outil:', step.toolId && step.toolName ? `${step.toolName} (${step.toolReference || 'no ref'})` : 'AUCUN');
            console.log('    Emplacement outil:', step.toolLocation || 'N/A');
            console.log('    Images:', step.images?.length || 0);
            console.log('    Vidéos:', step.videos?.length || 0);
            console.log('    Conseils:', step.tips?.length || 0);
            console.log('    Consignes sécurité:', step.safetyNotes?.length || 0);
            console.log('    Temps estimé:', step.estimatedTime || 'N/A');
          });
        }
      });

      // Attendre que les outils soient chargés
      if (!availableTools) {
        toast.error('⏳ Les outils sont en cours de chargement, veuillez réessayer dans un instant');
        console.log('=== FIN HTML EXPORT DEBUG ===');
        return;
      }

      console.log('📦 Available tools for HTML export:', availableTools.length);
      await generateHTML(existingProcedure, phases, availableTools);
      toast.success('✅ Procédure exportée en HTML avec succès !');
      console.log('=== FIN HTML EXPORT DEBUG ===');
    } catch (error) {
      console.error('Error exporting HTML:', error);
      toast.error('Erreur lors de l\'export HTML');
    }
  };

  const statusConfig: Record<string, { label: string; dot: string; text: string }> = {
    en_cours:              { label: 'En cours',              dot: 'bg-blue-400',   text: 'text-blue-400'   },
    verification:          { label: 'Vérification Technique', dot: 'bg-yellow-400', text: 'text-yellow-400' },
    relecture:             { label: 'Relecture et Correction',dot: 'bg-purple-400', text: 'text-purple-400' },
    mise_a_jour_timetonic: { label: 'Mise à jour Timetonic', dot: 'bg-orange-400', text: 'text-orange-400' },
    completed:             { label: 'Terminée',               dot: 'bg-green-400',  text: 'text-green-400'  },
  };
  const currentStatus = statusConfig[status] ?? statusConfig['en_cours'];

  return (
    <div className="max-w-5xl mx-auto pb-20">
      {/* Header sticky */}
      <div className="sticky top-0 z-20 -mx-6 px-6 py-3 mb-6 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-[#1c1c1c] flex items-center justify-between gap-4">
        <Link to="/">
          <Button variant="ghost" size="sm" className="shrink-0">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>

        {designation && (
          <p className="text-sm font-semibold text-gray-300 truncate max-w-xs hidden sm:block">
            {reference && <span className="text-primary mr-2">{reference}</span>}
            {designation}
          </p>
        )}

        <div className="flex items-center gap-2 ml-auto shrink-0">
          {/* Status avec dot coloré */}
          <div className="relative flex items-center gap-2 rounded-lg border border-[#2a2a2a] bg-[#111] px-3 py-1.5">
            <span className={`h-2 w-2 rounded-full shrink-0 ${currentStatus.dot}`} />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'en_cours' | 'verification' | 'relecture' | 'mise_a_jour_timetonic' | 'completed')}
              className={`bg-transparent border-none outline-none text-sm font-medium ${currentStatus.text} cursor-pointer pr-1`}
            >
              <option value="en_cours">En cours</option>
              <option value="verification">Vérification Technique</option>
              <option value="relecture">Relecture et Correction</option>
              <option value="mise_a_jour_timetonic">Mise à jour Timetonic</option>
              <option value="completed">Terminée</option>
            </select>
          </div>

          {id && existingProcedure && (
            <Button variant="secondary" onClick={handleExportHTML} size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exporter HTML
            </Button>
          )}
          <Button
            onClick={handleQuickSave}
            size="sm"
            title="Ctrl+S"
            className={quickSaveSuccess ? 'bg-green-600 hover:bg-green-700 border-green-600' : ''}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Sauvegarder
          </Button>
        </div>
      </div>

      {/* Main Form */}
      <div className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardContent className="pt-0">
            <div className="flex items-center gap-3 px-1 py-4 mb-4 border-b border-[#1e1e1e]">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 border border-primary/20">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold leading-none">Informations générales</h2>
                <p className="text-xs text-gray-500 mt-0.5">Référence, désignation et image de couverture</p>
              </div>
            </div>
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
            <CardContent className="pt-0">
              <div className="flex items-center justify-between px-1 py-4 mb-4 border-b border-[#1e1e1e]">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-red-500/10 border border-red-500/20">
                    <Shield className="h-4 w-4 text-red-400" />
                  </div>
                  <button
                    onClick={() => setShowDefects(!showDefects)}
                    className="flex items-center gap-2 hover:text-primary transition-colors"
                  >
                    <span className="text-base font-bold">Défauthèque</span>
                    {defects.length > 0 && (
                      <span className="text-xs font-normal text-gray-500 bg-[#1e1e1e] px-2 py-0.5 rounded-full border border-[#2a2a2a]">{defects.length}</span>
                    )}
                    {showDefects ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                  </button>
                </div>
                <Button onClick={handleAddDefect} variant="secondary" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un défaut
                </Button>
              </div>

              {showDefects && (
                <>
                  {defects.length === 0 ? (
                    <div className="text-center py-10">
                      <Shield className="h-8 w-8 text-gray-700 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">Aucun défaut répertorié.</p>
                      <p className="text-gray-600 text-xs mt-1">Cliquez sur "Ajouter un défaut" pour commencer.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {defects.map((defect, defectIndex) => (
                        <div key={defect.id} className="rounded-xl border border-[#2a2a2a] bg-[#0d0d0d] overflow-hidden" style={{ borderLeft: '3px solid #ef4444' }}>
                          {/* En-tête de la carte */}
                          <div className="flex items-center justify-between px-4 py-2.5 bg-[#141414] border-b border-[#222]">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Défaut #{defectIndex + 1}</span>
                            </div>
                            <button
                              onClick={() => handleRemoveDefect(defect.id)}
                              className="h-6 w-6 flex items-center justify-center rounded-md text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="p-4 space-y-3">
                            {/* Critère — sélecteur pills en haut */}
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                <Tag className="inline h-3 w-3 mr-1 -mt-0.5" />Critère
                              </label>
                              <div className="flex gap-2 flex-wrap">
                                {([
                                  { value: '',              label: 'Non défini' },
                                  { value: 'non_acceptable', label: 'Non-acceptable' },
                                  { value: 'a_retoucher',    label: 'À retoucher' },
                                ] as const).map(opt => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => handleUpdateDefect(defect.id, 'criteria', opt.value)}
                                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                                      defect.criteria === opt.value
                                        ? opt.value === 'non_acceptable'
                                          ? 'bg-red-500/20 border-red-500/50 text-red-400'
                                          : opt.value === 'a_retoucher'
                                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                                          : 'bg-[#2a2a2a] border-[#444] text-gray-300'
                                        : 'bg-transparent border-[#2a2a2a] text-gray-600 hover:border-[#3a3a3a] hover:text-gray-400'
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Défaut + Intervention côte à côte */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-semibold text-red-400 uppercase tracking-wide mb-1.5">
                                  Défaut
                                </label>
                                <textarea
                                  value={defect.defect || ''}
                                  onChange={(e) => handleUpdateDefect(defect.id, 'defect', e.target.value)}
                                  placeholder="Description du défaut observé..."
                                  rows={3}
                                  className="w-full rounded-lg border border-[#323232] bg-[#0a0a0a] px-3 py-2 text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-red-500/40 focus:border-red-500/40 resize-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-green-400 uppercase tracking-wide mb-1.5">
                                  Intervention
                                </label>
                                <textarea
                                  value={defect.whatToDo || ''}
                                  onChange={(e) => handleUpdateDefect(defect.id, 'whatToDo', e.target.value)}
                                  placeholder="Action corrective à mener..."
                                  rows={3}
                                  className="w-full rounded-lg border border-[#323232] bg-[#0a0a0a] px-3 py-2 text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-green-500/40 focus:border-green-500/40 resize-none"
                                />
                              </div>
                            </div>

                            {/* Images */}
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                Photos {defect.images && defect.images.length > 0 && <span className="text-gray-600 normal-case font-normal">({defect.images.length})</span>}
                              </label>
                              {(defect.images || []).length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {(defect.images || []).map((img) => (
                                    <div key={img.imageId} className="relative group w-20 h-20">
                                      <img
                                        src={img.image.url || URL.createObjectURL(img.image.blob)}
                                        alt={img.description || 'Image du défaut'}
                                        className="w-full h-full object-cover rounded-lg border border-[#323232]"
                                      />
                                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1.5">
                                        <button
                                          onClick={() => setImageToAnnotate({ defectId: defect.id, image: img })}
                                          className="bg-primary text-white rounded-md p-1.5 hover:bg-primary/80"
                                          title="Annoter"
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </button>
                                        <button
                                          onClick={() => handleRemoveDefectImage(defect.id, img.imageId)}
                                          className="bg-red-500 text-white rounded-md p-1.5 hover:bg-red-600"
                                          title="Supprimer"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                      {img.annotations && img.annotations.length > 0 && (
                                        <div className="absolute bottom-0 left-0 right-0 bg-primary/80 text-white text-xs px-1 py-0.5 text-center rounded-b-lg">
                                          {img.annotations.length} ann.
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
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
                                className="border-2 border-dashed border-[#2a2a2a] hover:border-[#444] rounded-lg p-4 text-center cursor-pointer transition-colors"
                              >
                                <ImageIcon className="h-5 w-5 text-gray-600 mx-auto mb-1" />
                                <p className="text-xs text-gray-600">Cliquez ou glissez des photos</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Phases */}
        {id && (
          <Card>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between px-1 py-4 mb-4 border-b border-[#1e1e1e]">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <Layers className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold leading-none">Phases</h2>
                    {existingProcedure && existingProcedure.phases.length > 0 && (() => {
                      const totalMin = existingProcedure.phases.reduce((sum, p) => sum + (p.estimatedTime || 0), 0);
                      return (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {existingProcedure.phases.length} phase{existingProcedure.phases.length > 1 ? 's' : ''} · {totalMin} min · {(totalMin / 60).toFixed(2)} h
                        </p>
                      );
                    })()}
                  </div>
                </div>
                <Button onClick={handleAddPhase} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une phase
                </Button>
              </div>

              {existingProcedure?.phases.length === 0 ? (
                <div className="text-center py-10">
                  <Layers className="h-8 w-8 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Aucune phase pour l'instant.</p>
                  <p className="text-gray-600 text-xs mt-1">Cliquez sur "Ajouter une phase" pour commencer.</p>
                </div>
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

        {/* Versioning Manuel */}
        {id && (
          <Card>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between px-1 py-4 mb-4 border-b border-[#1e1e1e]">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-green-500/10 border border-green-500/20">
                    <GitBranch className="h-4 w-4 text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold leading-none">Versioning</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Version actuelle : <span className="text-primary font-semibold">v{versionString}</span></p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowVersionForm(!showVersionForm)}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle version
                </Button>
              </div>

              {/* Formulaire de création de version */}
              {showVersionForm && (
                <div className="mb-6 p-4 border border-[#323232] rounded-lg bg-background-elevated">
                  <h3 className="font-semibold mb-3">Créer une nouvelle version</h3>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">Type de version</label>
                      <div className="flex gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="versionType"
                            value="minor"
                            checked={newVersionType === 'minor'}
                            onChange={(e) => setNewVersionType(e.target.value as 'major' | 'minor')}
                            className="text-primary"
                          />
                          <span className="text-sm">Mineure (corrections, ajustements)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="versionType"
                            value="major"
                            checked={newVersionType === 'major'}
                            onChange={(e) => setNewVersionType(e.target.value as 'major' | 'minor')}
                            className="text-primary"
                          />
                          <span className="text-sm">Majeure (changements importants)</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Description des modifications *
                      </label>
                      <textarea
                        value={newVersionDescription}
                        onChange={(e) => setNewVersionDescription(e.target.value)}
                        placeholder="Ex: Ajout de 2 nouvelles phases, modification des images..."
                        className="w-full px-3 py-2 bg-background-elevated border border-[#323232] rounded-md text-sm"
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleManualVersion} size="sm">
                        Créer version {calculateNextVersion(versionString, newVersionType)}
                      </Button>
                      <Button
                        onClick={() => {
                          setShowVersionForm(false);
                          setNewVersionDescription('');
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Historique des versions */}
              {changelog.length === 0 ? (
                <div className="text-center py-10">
                  <GitBranch className="h-8 w-8 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Aucune version enregistrée.</p>
                  <p className="text-gray-600 text-xs mt-1">Version actuelle : v{versionString}</p>
                </div>
              ) : (
                <>
                  {/* Dernière version */}
                  <div className="mb-4 border border-[#323232] rounded-lg bg-background-elevated p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-primary/20 text-primary border border-primary/30">
                          v{changelog[0].version}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          changelog[0].type === 'major'
                            ? 'bg-primary/20 text-primary border border-primary/30'
                            : 'bg-green-500/20 text-green-300 border border-green-500/30'
                        }`}>
                          {changelog[0].type === 'major' ? 'Majeure' : 'Mineure'}
                        </span>
                        <span className="text-xs text-text-muted">
                          {(() => {
                            if (changelog[0].date && typeof changelog[0].date === 'object' && 'toDate' in changelog[0].date) {
                              return ((changelog[0].date as any).toDate() as Date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
                            } else if (changelog[0].date instanceof Date) {
                              return changelog[0].date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
                            } else {
                              return new Date(changelog[0].date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
                            }
                          })()}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteVersion(changelog[0].id)}
                        className="text-red-500 hover:text-red-400 p-1"
                        title="Supprimer cette version"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-sm text-text-primary">{changelog[0].description}</p>
                  </div>

                  {/* Versions précédentes */}
                  {changelog.length > 1 && (
                    <>
                      <button
                        onClick={() => setShowAllVersions(!showAllVersions)}
                        className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary mb-4"
                      >
                        {showAllVersions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        {showAllVersions ? 'Masquer' : 'Afficher'} les versions précédentes ({changelog.length - 1})
                      </button>

                      {showAllVersions && (
                        <div className="space-y-3">
                          {changelog.slice(1).map((log) => (
                            <div key={log.id} className="border border-[#323232] rounded-lg bg-background-elevated p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-1 rounded text-xs font-semibold bg-primary/20 text-primary border border-primary/30">
                                    v{log.version}
                                  </span>
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                    log.type === 'major'
                                      ? 'bg-primary/20 text-primary border border-primary/30'
                                      : 'bg-green-500/20 text-green-300 border border-green-500/30'
                                  }`}>
                                    {log.type === 'major' ? 'Majeure' : 'Mineure'}
                                  </span>
                                  <span className="text-xs text-text-muted">
                                    {(() => {
                                      if (log.date && typeof log.date === 'object' && 'toDate' in log.date) {
                                        return ((log.date as any).toDate() as Date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
                                      } else if (log.date instanceof Date) {
                                        return log.date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
                                      } else {
                                        return new Date(log.date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
                                      }
                                    })()}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleDeleteVersion(log.id)}
                                  className="text-red-500 hover:text-red-400 p-1"
                                  title="Supprimer cette version"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                              <p className="text-sm text-text-primary">{log.description}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </>
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
