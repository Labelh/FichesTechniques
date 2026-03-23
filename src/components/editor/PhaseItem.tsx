import { useState, useEffect, useRef } from 'react';
import { Trash2, ChevronDown, ChevronUp, Plus, X, Wrench, Save, Pencil, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Video as VideoIcon, Bold, Italic, Palette, List, ListOrdered, Smile, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { updatePhase, movePhaseUp, movePhaseDown } from '@/services/procedureService';
import { createPhaseTemplate, createSubStepTemplateFromStep, getAllSubStepTemplates, deleteSubStepTemplate, incrementSubStepTemplateUsage } from '@/services/templateService';
import { uploadImageToHost } from '@/services/imageHostingService';
import { useTools } from '@/hooks/useTools';
import ImageAnnotator from '@/components/phase/ImageAnnotator';
import ToolSelector from '@/components/tools/ToolSelector';
import type { Phase, DifficultyLevel, SubStep, AnnotatedImage, Tool, Annotation, SubStepTemplate } from '@/types';
import { toast } from 'sonner';

const NAS_VIDEO_BASE_KEY = 'fichestechniques_video_base_path';
const NAS_DOCUMENT_BASE_KEY = 'fichestechniques_document_base_path';

interface PhaseItemProps {
  phase: Phase;
  index: number;
  procedureId: string;
  totalPhases: number;
  onDelete: (phaseId: string) => void;
  initiallyExpanded?: boolean;
  initialExpandStepIndex?: number;
}

export default function PhaseItem({ phase, index, procedureId, totalPhases, onDelete, initiallyExpanded, initialExpandStepIndex }: PhaseItemProps) {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded ?? false);
  const phaseRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState(phase.title);
  const [phaseNumber, setPhaseNumber] = useState(phase.phaseNumber || index + 1);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(phase.difficulty);
  const [estimatedTime, setEstimatedTime] = useState(phase.estimatedTime);
  const [steps, setSteps] = useState<SubStep[]>(phase.steps || []);
  const isInitialMount = useRef(true);

  const availableTools = useTools();
  const [showSubStepTemplateModal, setShowSubStepTemplateModal] = useState(false);
  const [subStepTemplates, setSubStepTemplates] = useState<SubStepTemplate[]>([]);
  const [subStepTemplateCategory, setSubStepTemplateCategory] = useState<string>('Tous');

  useEffect(() => {
    if (initiallyExpanded && phaseRef.current) {
      setTimeout(() => phaseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    }
  }, []);

  // Charger les templates de sous-étapes quand le modal s'ouvre
  useEffect(() => {
    if (showSubStepTemplateModal) {
      getAllSubStepTemplates().then(setSubStepTemplates).catch(console.error);
    }
  }, [showSubStepTemplateModal]);

  // Synchroniser le state local avec les props quand la phase change dans Firebase
  useEffect(() => {
    console.log('📥 Synchronisation: Mise à jour du state local avec les nouvelles props');
    setTitle(phase.title);
    setPhaseNumber(phase.phaseNumber || index + 1);
    setDifficulty(phase.difficulty);
    setEstimatedTime(phase.estimatedTime);

    // Enrichir les steps avec les imageUrl depuis availableTools
    console.log('🔧 Enrichment: availableTools loaded?', !!availableTools, availableTools?.length || 0);
    const enrichedSteps = (phase.steps || []).map(step => {
      if (!step.tools || !availableTools) return step;

      const enrichedTools = step.tools.map(tool => {
        // Si l'outil a déjà une imageUrl, la garder
        if (tool.imageUrl) {
          console.log('✅ Tool already has imageUrl:', tool.name, tool.imageUrl.substring(0, 50));
          return tool;
        }

        // Sinon, chercher l'imageUrl dans availableTools
        const fullTool = availableTools.find(t => t.id === tool.id);
        if (fullTool?.image?.url) {
          console.log('✅ Enriching tool with imageUrl:', tool.name, fullTool.image.url.substring(0, 50));
          return { ...tool, imageUrl: fullTool.image.url };
        }

        console.log('❌ No imageUrl found for tool:', tool.name, 'in availableTools');
        return tool;
      });

      return { ...step, tools: enrichedTools };
    });

    setSteps(enrichedSteps);
    // Réinitialiser le flag pour éviter que la synchro déclenche l'auto-save
    isInitialMount.current = true;
  }, [phase.id, phase.title, phase.phaseNumber, phase.difficulty, phase.estimatedTime, phase.steps, index, availableTools]);

  // Raccourci Ctrl+S pour sauvegarde rapide
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        // Utilise savePhaseToFirestore qui nettoie déjà les undefined
        const success = await savePhaseToFirestore();
        if (success) {
          toast.success('Phase sauvegardée');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [procedureId, phase.id, title, phaseNumber, difficulty, estimatedTime, steps]);

  // Sauvegarde automatique après chaque modification (debounce de 2 secondes)
  useEffect(() => {
    // Ignorer le premier rendu pour éviter d'écraser les données fraîches
    if (isInitialMount.current) {
      console.log('⏭️ Auto-save: Premier rendu ignoré');
      isInitialMount.current = false;
      return;
    }

    console.log('🔄 Auto-save: Modification détectée, sauvegarde dans 2 secondes...');
    const timeoutId = setTimeout(async () => {
      console.log('💾 Auto-save: Sauvegarde en cours...');
      const success = await savePhaseToFirestore();
      if (success) {
        console.log('✅ Auto-save: Phase sauvegardée automatiquement');
      }
    }, 2000); // Délai de 2 secondes

    return () => {
      console.log('⏸️ Auto-save: Timer annulé (nouvelle modification)');
      clearTimeout(timeoutId);
    };
  }, [title, phaseNumber, difficulty, estimatedTime, steps]);

  const handleSaveAsTemplate = async () => {
    const templateName = prompt('Nom du template:', title || 'Mon template');
    if (!templateName) return;

    const category = prompt('Catégorie du template:', 'Général') || 'Général';

    try {
      const currentPhase: Phase = {
        ...phase,
        title,
        phaseNumber,
        difficulty,
        estimatedTime,
        steps,
      };

      await createPhaseTemplate(currentPhase, templateName, category);
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };

  const addStepFromTemplate = async (template: SubStepTemplate) => {
    const newStep: SubStep = {
      id: crypto.randomUUID(),
      order: steps.length,
      title: template.subStep.title || '',
      description: template.subStep.description || '',
      estimatedTime: template.subStep.estimatedTime || 0,
      images: [],
      videos: [],
      documents: [],
      tips: template.subStep.tips || [],
      safetyNotes: template.subStep.safetyNotes || [],
      tools: template.subStep.tools || [],
    };
    setSteps([...steps, newStep]);
    setShowSubStepTemplateModal(false);
    toast.success(`Sous-étape créée depuis le template "${template.name}"`);
    // Incrémenter le compteur d'utilisation
    incrementSubStepTemplateUsage(template.id, template.usageCount).catch(console.error);
  };

  const addStep = () => {
    setSteps([...steps, {
      id: crypto.randomUUID(),
      order: steps.length,
      title: '',
      description: '',
      estimatedTime: 0,
      images: [],
      tips: [],
      safetyNotes: []
    }]);
  };

  const updateStep = (id: string, updates: Partial<SubStep>) => {
    const newSteps = steps.map(s => s.id === id ? { ...s, ...updates } : s);
    setSteps(newSteps);
    return newSteps;
  };

  const removeStep = (id: string) => {
    const newSteps = steps
      .filter(s => s.id !== id)
      .map((s, index) => ({ ...s, order: index }));
    setSteps(newSteps);
  };

  const addStepImage = (stepId: string, newImages: AnnotatedImage[]) => {
    setSteps(steps.map(s =>
      s.id === stepId
        ? { ...s, images: [...(s.images || []), ...newImages] }
        : s
    ));
  };

  const removeStepImage = (stepId: string, imageId: string) => {
    setSteps(steps.map(s =>
      s.id === stepId
        ? { ...s, images: (s.images || []).filter(img => img.imageId !== imageId) }
        : s
    ));
  };

  const addStepVideo = (stepId: string, newVideos: any[]) => {
    setSteps(steps.map(s =>
      s.id === stepId
        ? { ...s, videos: [...(s.videos || []), ...newVideos] }
        : s
    ));
  };

  const removeStepVideo = (stepId: string, videoId: string) => {
    setSteps(steps.map(s =>
      s.id === stepId
        ? { ...s, videos: (s.videos || []).filter(vid => vid.id !== videoId) }
        : s
    ));
  };

  const addStepDocument = (stepId: string, newDocuments: any[]) => {
    setSteps(steps.map(s =>
      s.id === stepId
        ? { ...s, documents: [...(s.documents || []), ...newDocuments] }
        : s
    ));
  };

  const removeStepDocument = (stepId: string, documentId: string) => {
    setSteps(steps.map(s =>
      s.id === stepId
        ? { ...s, documents: (s.documents || []).filter(doc => doc.id !== documentId) }
        : s
    ));
  };

  const addStepTool = (stepId: string, toolId: string, toolName: string, toolLocation?: string | null, toolReference?: string | null, toolColor?: string | null, toolImageUrl?: string | null) => {
    console.log('=== addStepTool DEBUG ===');
    console.log('Step ID:', stepId);
    console.log('Tool ID:', toolId);
    console.log('Tool Name:', toolName);

    const updatedSteps = steps.map(s => {
      if (s.id !== stepId) return s;

      // Créer le nouvel outil
      const newTool = {
        id: toolId,
        name: toolName,
        location: toolLocation || null,
        reference: toolReference || null,
        color: toolColor || null,
        imageUrl: toolImageUrl || null,
      };

      // Ajouter à la liste des outils (nouveau format)
      const currentTools = s.tools || [];

      return {
        ...s,
        tools: [...currentTools, newTool],
      };
    });

    console.log('Updated steps with new tool:', updatedSteps.map(s => ({
      id: s.id,
      title: s.title,
      toolsCount: s.tools?.length || 0
    })));

    setSteps(updatedSteps);
  };

  const removeStepTool = (stepId: string, toolId: string) => {
    console.log('=== removeStepTool DEBUG ===');
    console.log('Step ID:', stepId);
    console.log('Tool ID to remove:', toolId);

    const updatedSteps = steps.map(s => {
      if (s.id !== stepId) return s;

      // Filtrer l'outil à supprimer
      const updatedTools = (s.tools || []).filter(t => t.id !== toolId);

      return {
        ...s,
        tools: updatedTools,
      };
    });

    console.log('Updated steps after tool removal:', updatedSteps.map(s => ({
      id: s.id,
      title: s.title,
      toolsCount: s.tools?.length || 0
    })));

    setSteps(updatedSteps);
  };

  const handleMovePhaseUp = async () => {
    try {
      await movePhaseUp(procedureId, phase.id);
      toast.success('Phase déplacée vers le haut');
    } catch (error) {
      toast.error('Erreur lors du déplacement');
    }
  };

  const handleMovePhaseDown = async () => {
    try {
      await movePhaseDown(procedureId, phase.id);
      toast.success('Phase déplacée vers le bas');
    } catch (error) {
      toast.error('Erreur lors du déplacement');
    }
  };

  const moveStepUp = (stepId: string) => {
    const stepIndex = steps.findIndex(s => s.id === stepId);
    if (stepIndex <= 0) return;

    const newSteps = [...steps];
    [newSteps[stepIndex - 1], newSteps[stepIndex]] = [newSteps[stepIndex], newSteps[stepIndex - 1]];
    setSteps(newSteps.map((s, idx) => ({ ...s, order: idx })));
  };

  const moveStepDown = (stepId: string) => {
    const stepIndex = steps.findIndex(s => s.id === stepId);
    if (stepIndex < 0 || stepIndex >= steps.length - 1) return;

    const newSteps = [...steps];
    [newSteps[stepIndex], newSteps[stepIndex + 1]] = [newSteps[stepIndex + 1], newSteps[stepIndex]];
    setSteps(newSteps.map((s, idx) => ({ ...s, order: idx })));
  };

  // Nettoie les valeurs undefined d'un objet (Firestore n'accepte pas undefined)
  // Exclut aussi imageUrl des outils (trop gros pour Firestore en base64)
  const cleanUndefined = (obj: any): any => {
    if (obj === null || obj === undefined) {
      return null;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => cleanUndefined(item));
    }

    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const key in obj) {
        // Détecter si c'est un objet tool (a les champs id, name, et potentiellement imageUrl)
        const isCurrentToolObject = obj.hasOwnProperty('id') && obj.hasOwnProperty('name') &&
                                   (obj.hasOwnProperty('imageUrl') || obj.hasOwnProperty('location') || obj.hasOwnProperty('reference'));

        // Exclure imageUrl des objets tool
        if (isCurrentToolObject && key === 'imageUrl') {
          continue;
        }

        const value = obj[key];
        if (value !== undefined) {
          cleaned[key] = cleanUndefined(value);
        }
      }
      return cleaned;
    }

    return obj;
  };

  const savePhaseToFirestore = async (customSteps?: SubStep[]) => {
    try {
      // Utiliser customSteps si fourni, sinon steps actuels
      const stepsToSave = customSteps || steps;

      console.log('=== savePhaseToFirestore DEBUG ===');
      console.log('Steps AVANT cleanUndefined:', JSON.stringify(stepsToSave.map(s => ({
        id: s.id,
        title: s.title,
        tools: s.tools
      })), null, 2));

      // Nettoyer les valeurs undefined avant de sauvegarder
      const cleanedSteps = cleanUndefined(stepsToSave);

      console.log('Steps APRÈS cleanUndefined:', JSON.stringify(cleanedSteps.map((s: any) => ({
        id: s.id,
        title: s.title,
        tools: s.tools
      })), null, 2));

      await updatePhase(procedureId, phase.id, {
        title,
        phaseNumber,
        difficulty,
        estimatedTime,
        steps: cleanedSteps,
      });

      console.log('=== Phase sauvegardée avec succès dans Firestore ===');
      return true;
    } catch (error) {
      console.error('Error saving phase:', error);
      toast.error('Erreur lors de la sauvegarde');
      return false;
    }
  };

  const handleSaveStepAnnotations = async (stepId: string, imageId: string, annotations: Annotation[], description: string) => {
    console.log('=== handleSaveStepAnnotations ===');
    console.log('Step ID:', stepId);
    console.log('Image ID:', imageId);
    console.log('Annotations count:', annotations.length);
    console.log('Description:', description);

    // Calculer les nouvelles steps avec les annotations mises à jour
    const newSteps = steps.map(s => {
      if (s.id !== stepId) return s;

      const updatedImages = (s.images || []).map(img =>
        img.imageId === imageId
          ? { ...img, annotations, description }
          : img
      );

      return { ...s, images: updatedImages };
    });

    console.log('New steps calculated, total steps:', newSteps.length);
    const stepWithAnnotations = newSteps.find(s => s.id === stepId);
    if (stepWithAnnotations) {
      console.log('Step with annotations:', {
        stepId: stepWithAnnotations.id,
        images: stepWithAnnotations.images?.map(img => ({
          imageId: img.imageId,
          annotationsCount: img.annotations?.length || 0
        }))
      });
    }

    // Sauvegarder immédiatement dans Firestore avec les nouvelles steps
    toast.info('Sauvegarde des annotations...');
    const success = await savePhaseToFirestore(newSteps);

    if (success) {
      console.log('Annotations saved successfully to Firestore');
      // Mettre à jour le state local seulement après la sauvegarde réussie
      setSteps(newSteps);
      toast.success('Annotations sauvegardées avec succès');
    } else {
      console.error('Failed to save annotations to Firestore');
    }
  };

  const getDifficultyColor = (diff: DifficultyLevel) => {
    switch (diff) {
      case 'trainee': return 'bg-blue-500';
      case 'easy': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'hard': return 'bg-red-500';
      case 'control': return 'bg-orange-500';
      default: return 'bg-background-elevated';
    }
  };

  const getDifficultyLabel = (diff: DifficultyLevel) => {
    switch (diff) {
      case 'trainee': return 'Apprenti';
      case 'easy': return 'Facile';
      case 'medium': return 'Moyen';
      case 'hard': return 'Difficile';
      case 'control': return 'Contrôle';
      default: return diff;
    }
  };

  return (
    <div ref={phaseRef} className="border border-[#323232] rounded-lg bg-background-elevated">
      {/* Header - Collapsible */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-background-hover rounded-t-lg transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1 flex items-center gap-3">
          <span className="text-sm font-medium text-gray-400">Phase {phaseNumber}</span>
          <span className="font-semibold text-white">{title || 'Sans titre'}</span>
          <Badge className={`${getDifficultyColor(difficulty)} text-white text-xs`}>
            {getDifficultyLabel(difficulty)}
          </Badge>
          <span className="text-sm text-gray-400">{estimatedTime} min &nbsp;·&nbsp; {(estimatedTime / 60).toFixed(2)} h</span>
          {steps.length > 0 && (
            <span className="text-xs text-gray-500">({steps.length} sous-étape{steps.length > 1 ? 's' : ''})</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleMovePhaseUp();
            }}
            disabled={index === 0}
            title="Déplacer vers le haut"
          >
            <ArrowUp className={`h-4 w-4 ${index === 0 ? 'text-gray-600' : 'text-gray-400'}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleMovePhaseDown();
            }}
            disabled={index >= totalPhases - 1}
            title="Déplacer vers le bas"
          >
            <ArrowDown className={`h-4 w-4 ${index >= totalPhases - 1 ? 'text-gray-600' : 'text-gray-400'}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(phase.id);
            }}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-[#323232]">
          <div className="p-6 space-y-6">
            {/* Informations de base */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Numéro de phase
                </label>
                <Input
                  type="number"
                  min="1"
                  value={phaseNumber}
                  onChange={(e) => setPhaseNumber(parseInt(e.target.value) || 1)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Difficulté
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                  className="w-full rounded-md border border-[#323232] bg-transparent px-3 py-2 text-sm text-white"
                >
                  <option value="trainee">Apprenti</option>
                  <option value="easy">Facile</option>
                  <option value="medium">Moyen</option>
                  <option value="hard">Difficile</option>
                  <option value="control">Contrôle</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Temps estimé (min)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Titre de la phase *
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nom de la phase..."
              />
            </div>

            {/* Sous-étapes */}
            <div className="border-t border-[#323232] pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Sous-étapes ({steps.length})
                </h3>
                <div className="flex gap-2">
                  <Button onClick={addStep} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter une sous-étape
                  </Button>
                  <Button onClick={() => setShowSubStepTemplateModal(true)} size="sm" variant="secondary">
                    <FileText className="h-4 w-4 mr-2" />
                    Depuis un template
                  </Button>
                </div>
              </div>

              {steps.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  Aucune sous-étape. Cliquez sur "Ajouter une sous-étape" pour commencer.
                </p>
              ) : (
                <div className="space-y-4">
                  {steps.map((step, idx) => (
                    <SubStepItem
                      key={step.id}
                      step={step}
                      index={idx}
                      initiallyExpanded={initialExpandStepIndex !== undefined && initialExpandStepIndex === idx}
                      totalSteps={steps.length}
                      availableTools={availableTools}
                      onUpdate={(updates) => updateStep(step.id, updates)}
                      onRemove={() => removeStep(step.id)}
                      onAddImage={(images) => addStepImage(step.id, images)}
                      onRemoveImage={(imageId) => removeStepImage(step.id, imageId)}
                      onAddVideo={(videos) => addStepVideo(step.id, videos)}
                      onRemoveVideo={(videoId) => removeStepVideo(step.id, videoId)}
                      onAddDocument={(documents) => addStepDocument(step.id, documents)}
                      onRemoveDocument={(documentId) => removeStepDocument(step.id, documentId)}
                      onAddTool={(toolId, toolName, toolLocation, toolReference, toolColor, toolImageUrl) => addStepTool(step.id, toolId, toolName, toolLocation, toolReference, toolColor, toolImageUrl)}
                      onRemoveTool={(toolId) => removeStepTool(step.id, toolId)}
                      onMoveUp={() => moveStepUp(step.id)}
                      onMoveDown={() => moveStepDown(step.id)}
                      onSaveAnnotations={(imageId, annotations, description) => handleSaveStepAnnotations(step.id, imageId, annotations, description)}
                      onSaveAsTemplate={async () => {
                        const templateName = prompt('Nom du template de sous-étape:', step.title || 'Mon template');
                        if (!templateName) return;
                        const category = prompt('Catégorie:', 'Général') || 'Général';
                        try {
                          await createSubStepTemplateFromStep(step, templateName, category);
                          toast.success('Template de sous-étape sauvegardé !');
                        } catch (error) {
                          console.error('Error creating substep template:', error);
                          toast.error('Erreur lors de la sauvegarde du template');
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end items-center pt-4 border-t border-[#323232]">
              <Button variant="ghost" size="icon" onClick={handleSaveAsTemplate} title="Sauvegarder comme template">
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de sélection de template de sous-étape */}
      {showSubStepTemplateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-xl border border-[#323232] max-w-lg w-full max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-[#323232] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Templates de sous-étapes</h3>
                <p className="text-xs text-gray-400 mt-1">Sélectionnez un template pour créer une sous-étape</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowSubStepTemplateModal(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Tabs par catégorie */}
            {(() => {
              const categories = ['Tous', ...Array.from(new Set(subStepTemplates.map(t => t.category)))];
              const filtered = subStepTemplateCategory === 'Tous'
                ? subStepTemplates
                : subStepTemplates.filter(t => t.category === subStepTemplateCategory);

              return (
                <>
                  <div className="flex gap-1 p-3 border-b border-[#323232] overflow-x-auto">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSubStepTemplateCategory(cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                          subStepTemplateCategory === cat
                            ? 'bg-primary text-white'
                            : 'bg-[#2a2a2a] text-gray-400 hover:text-white'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Liste des templates */}
                  <div className="flex-1 overflow-y-auto p-4">
                    {filtered.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 mx-auto text-gray-600 mb-3" />
                        <p className="text-gray-400">Aucun template disponible</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Sauvegardez des sous-étapes comme templates pour les réutiliser
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filtered.map(template => (
                          <div
                            key={template.id}
                            className="flex items-center gap-3 p-3 rounded-lg border border-[#323232] hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group"
                            onClick={() => addStepFromTemplate(template)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-white">{template.name}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-[#2a2a2a] text-gray-400">
                                  {template.category}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {template.usageCount} utilisation{template.usageCount !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Supprimer ce template ?')) {
                                  deleteSubStepTemplate(template.id).then(() => {
                                    setSubStepTemplates(prev => prev.filter(t => t.id !== template.id));
                                    toast.success('Template supprimé');
                                  }).catch(() => toast.error('Erreur lors de la suppression'));
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Supprimer ce template"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}

            {/* Footer */}
            <div className="p-4 border-t border-[#323232]">
              <Button
                variant="secondary"
                onClick={() => setShowSubStepTemplateModal(false)}
                className="w-full"
              >
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Composant pour une sous-étape (collapsible)
interface SubStepItemProps {
  step: SubStep;
  index: number;
  totalSteps: number;
  availableTools?: Tool[];
  onUpdate: (updates: Partial<SubStep>) => void;
  onRemove: () => void;
  onAddImage: (images: AnnotatedImage[]) => void;
  onRemoveImage: (imageId: string) => void;
  onAddVideo: (videos: any[]) => void;
  onRemoveVideo: (videoId: string) => void;
  onAddDocument: (documents: any[]) => void;
  onRemoveDocument: (documentId: string) => void;
  onAddTool: (toolId: string, toolName: string, toolLocation?: string | null, toolReference?: string | null, toolColor?: string | null, toolImageUrl?: string | null) => void;
  onRemoveTool: (toolId: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSaveAnnotations: (imageId: string, annotations: Annotation[], description: string) => Promise<void>;
  onSaveAsTemplate: () => void;
  initiallyExpanded?: boolean;
}

function SubStepItem({
  step,
  index,
  totalSteps,
  availableTools,
  onUpdate,
  onRemove,
  onAddImage,
  onRemoveImage,
  onAddVideo,
  onRemoveVideo,
  onAddDocument,
  onRemoveDocument,
  onAddTool,
  onRemoveTool,
  onMoveUp,
  onMoveDown,
  onSaveAnnotations,
  onSaveAsTemplate,
  initiallyExpanded,
}: SubStepItemProps) {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded ?? false);
  const [imageToAnnotate, setImageToAnnotate] = useState<AnnotatedImage | null>(null);
  const [showToolSelector, setShowToolSelector] = useState(false);
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [showDocumentInput, setShowDocumentInput] = useState(false);
  const [documentUrl, setDocumentUrl] = useState('');
  const [documentTitle, setDocumentTitle] = useState('');
  const documentFileInputRef = useRef<HTMLInputElement>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const descriptionRef = useRef<HTMLDivElement>(null);
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // État pour le modal d'insertion des outils dans la description
  const [showToolInsertModal, setShowToolInsertModal] = useState(false);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  const textColors = [
    { name: 'Rouge', value: '#ef4444' },
    { name: 'Orange', value: 'rgb(249, 55, 5)' },
    { name: 'Jaune', value: '#f59e0b' },
    { name: 'Vert', value: '#10b981' },
    { name: 'Bleu', value: '#3b82f6' },
    { name: 'Violet', value: '#8b5cf6' },
    { name: 'Rose', value: '#ec4899' },
    { name: 'Blanc', value: '#ffffff' },
  ];

  const emojis = [
    '✅', '❌', '⚠️', '⚡', '🔧', '🔨', '⚙️', '🛠️',
    '📏', '📐', '✂️', '📌', '📍', '🎯', '💡', '🔥',
    '👍', '👎', '👌', '👉', '☝️', '✋', '👊', '🤝',
    '⭐', '🌟', '💫', '✨', '🔴', '🟠', '🟡', '🟢',
    '🔵', '🟣', '⚫', '⚪', '➡️', '⬅️', '⬆️', '⬇️',
  ];

  // Fonction pour insérer un outil dans la description
  const insertToolInDescription = (tool: { name: string; reference?: string | null; color?: string | null }) => {
    if (!descriptionRef.current) return;

    // Formater le texte de l'outil
    const toolText = tool.reference
      ? `${tool.name} (${tool.reference})`
      : tool.name;
    const toolColor = tool.color || '#10b981';

    // Créer le span avec la couleur
    const span = document.createElement('span');
    span.style.color = toolColor;
    span.style.fontWeight = 'bold';
    span.textContent = toolText;

    // Créer un span avec style reset pour que le texte tapé ensuite soit normal
    const resetSpan = document.createElement('span');
    resetSpan.style.color = 'inherit';
    resetSpan.style.fontWeight = 'normal';
    resetSpan.innerHTML = '&nbsp;';

    // Focus sur l'éditeur
    descriptionRef.current.focus();

    // Obtenir la sélection
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(resetSpan);
      range.insertNode(span);

      // Placer le curseur DANS le resetSpan (après le &nbsp;) pour hériter du style reset
      range.setStart(resetSpan, 1);
      range.setEnd(resetSpan, 1);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // Si pas de sélection, ajouter à la fin
      descriptionRef.current.appendChild(span);
      descriptionRef.current.appendChild(resetSpan);

      // Placer le curseur dans le resetSpan
      const range = document.createRange();
      range.setStart(resetSpan, 1);
      range.setEnd(resetSpan, 1);
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }

    // Mettre à jour le contenu
    const html = descriptionRef.current.innerHTML;
    setLocalDescription(html);
    onUpdate({ description: html });

    // Fermer le modal
    setShowToolInsertModal(false);
  };

  // State local pour conserver le innerHTML entre les collapse/expand
  const [localDescription, setLocalDescription] = useState(step.description || '');

  // Sync localDescription quand step.description change (ex: après save)
  useEffect(() => {
    setLocalDescription(step.description || '');
  }, [step.id, step.description]);

  // Initialiser le contenu du contentEditable
  useEffect(() => {
    if (descriptionRef.current) {
      // Restaurer le contenu local si on réouvre après un collapse
      descriptionRef.current.innerHTML = localDescription;
    }
  }, [step.id, isExpanded]); // Quand on change de step OU qu'on expand

  // Fermer les menus déroulants quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showColorPalette && !target.closest('.relative')) {
        setShowColorPalette(false);
      }
      if (showEmojiPicker && !target.closest('.relative')) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColorPalette, showEmojiPicker]);

  const handleImageUpload = async (files: File[]) => {
    const validImages: AnnotatedImage[] = [];

    for (const file of files) {
      if (file.size > 15 * 1024 * 1024) {
        continue;
      }

      try {
        console.log(`Uploading ${file.name} to ImgBB...`);
        const imageUrl = await uploadImageToHost(file);
        console.log(`Image uploaded successfully: ${imageUrl}`);

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
      }
    }

    if (validImages.length > 0) {
      onAddImage(validImages);
    }
  };

  const handleSaveAnnotations = async (annotations: Annotation[], description: string) => {
    if (!imageToAnnotate) return;

    // Sauvegarder directement dans Firestore via le callback parent
    await onSaveAnnotations(imageToAnnotate.imageId, annotations, description);

    // Fermer le modal d'annotation
    setImageToAnnotate(null);
  };

  // === VIDÉOS ===

  const handleAddVideo = () => {
    if (!videoUrl.trim()) return;

    // Mémoriser le dossier parent pour les prochaines sélections
    const url = videoUrl.trim();
    const lastSep = Math.max(url.lastIndexOf('\\'), url.lastIndexOf('/'));
    if (lastSep > 0) {
      localStorage.setItem(NAS_VIDEO_BASE_KEY, url.substring(0, lastSep + 1));
    }

    const newVideo = {
      id: crypto.randomUUID(),
      name: videoTitle.trim() || 'Vidéo',
      url: url,
      size: 0,
      mimeType: 'video/mp4',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    onAddVideo([newVideo]);
    setVideoUrl('');
    setVideoTitle('');
    setShowVideoInput(false);
  };

  const handleVideoFileSelect = async () => {
    // Utiliser l'input file classique qui donne le chemin complet via webkitRelativePath ou value
    videoFileInputRef.current?.click();
  };

  const handleVideoFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Récupérer le chemin complet depuis l'input file
      const basePath = localStorage.getItem(NAS_VIDEO_BASE_KEY) || '';

      let fullPath: string;
      if (basePath) {
        // Utiliser le chemin de base mémorisé + nom du fichier (priorité au chemin NAS)
        fullPath = basePath + file.name;
      } else {
        // Pas de chemin de base : demander à l'utilisateur
        const folderPath = prompt(
          'Le navigateur ne fournit pas le chemin complet du fichier.\n\n' +
          'Entrez le chemin du dossier contenant la vidéo :\n' +
          '(ex: Y:\\AJUST \'82\\SYSTEME QUALITE\\...\\Vidéo\\)'
        );
        if (folderPath) {
          // S'assurer que le chemin finit par un séparateur
          const sep = folderPath.endsWith('\\') || folderPath.endsWith('/') ? '' : '\\';
          const cleanPath = folderPath + sep;
          localStorage.setItem(NAS_VIDEO_BASE_KEY, cleanPath);
          fullPath = cleanPath + file.name;
        } else {
          // L'utilisateur a annulé
          if (videoFileInputRef.current) videoFileInputRef.current.value = '';
          return;
        }
      }

      setVideoUrl(fullPath);
      if (!videoTitle.trim()) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setVideoTitle(nameWithoutExt);
      }
    }
    if (videoFileInputRef.current) {
      videoFileInputRef.current.value = '';
    }
  };

  // === DOCUMENTS ===

  const handleAddDocument = () => {
    if (!documentUrl.trim()) return;

    // Mémoriser le dossier parent pour les prochaines sélections
    const url = documentUrl.trim();
    const lastSep = Math.max(url.lastIndexOf('\\'), url.lastIndexOf('/'));
    if (lastSep > 0) {
      localStorage.setItem(NAS_DOCUMENT_BASE_KEY, url.substring(0, lastSep + 1));
    }

    const newDocument = {
      id: crypto.randomUUID(),
      name: documentTitle.trim() || 'Document',
      url: url,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    onAddDocument([newDocument]);
    setDocumentUrl('');
    setDocumentTitle('');
    setShowDocumentInput(false);
  };

  const handleDocumentFileSelect = async () => {
    // Utiliser l'input file classique
    documentFileInputRef.current?.click();
  };

  const handleDocumentFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Récupérer le chemin complet depuis l'input file
      const basePath = localStorage.getItem(NAS_DOCUMENT_BASE_KEY) || '';

      let fullPath: string;
      if (basePath) {
        // Utiliser le chemin de base mémorisé + nom du fichier (priorité au chemin NAS)
        fullPath = basePath + file.name;
      } else {
        // Pas de chemin de base : demander à l'utilisateur
        const folderPath = prompt(
          'Le navigateur ne fournit pas le chemin complet du fichier.\n\n' +
          'Entrez le chemin du dossier contenant le document :\n' +
          '(ex: Y:\\AJUST \'82\\SYSTEME QUALITE\\...\\Documents\\)'
        );
        if (folderPath) {
          const sep = folderPath.endsWith('\\') || folderPath.endsWith('/') ? '' : '\\';
          const cleanPath = folderPath + sep;
          localStorage.setItem(NAS_DOCUMENT_BASE_KEY, cleanPath);
          fullPath = cleanPath + file.name;
        } else {
          if (documentFileInputRef.current) documentFileInputRef.current.value = '';
          return;
        }
      }

      setDocumentUrl(fullPath);
      if (!documentTitle.trim()) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setDocumentTitle(nameWithoutExt);
      }
    }
    if (documentFileInputRef.current) {
      documentFileInputRef.current.value = '';
    }
  };

  return (
    <div className="border border-[#323232] rounded-lg bg-background-surface">
      {/* Header */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-background-hover"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 flex-1">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-white text-sm font-bold">
            {index + 1}
          </span>
          <span className="font-semibold text-text-primary">
            {step.title || 'Sans titre'}
          </span>
          {/* Indicateurs rapides */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {(step.images?.length || 0) > 0 && (
              <span className="flex items-center gap-1">
                📷 {step.images?.length}
              </span>
            )}
            {(step.videos?.length || 0) > 0 && (
              <span className="flex items-center gap-1">
                🎥 {step.videos?.length}
              </span>
            )}
            {((step.tools?.length || 0) > 0 || step.toolId) && (
              <span className="flex items-center gap-1">
                🔧 {(step.tools?.length || 0) + (step.toolId ? 1 : 0)}
              </span>
            )}
            {(step.tips?.length || 0) > 0 && (
              <span className="flex items-center gap-1">
                💡 {step.tips?.length}
              </span>
            )}
            {(step.safetyNotes?.length || 0) > 0 && (
              <span className="flex items-center gap-1">
                ⚠️ {step.safetyNotes?.length}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            disabled={index === 0}
            title="Déplacer vers le haut"
          >
            <ArrowUp className={`h-3 w-3 ${index === 0 ? 'text-gray-600' : 'text-gray-400'}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            disabled={index >= totalSteps - 1}
            title="Déplacer vers le bas"
          >
            <ArrowDown className={`h-3 w-3 ${index >= totalSteps - 1 ? 'text-gray-600' : 'text-gray-400'}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onSaveAsTemplate();
            }}
            title="Sauvegarder comme template"
          >
            <Save className="h-3 w-3 text-gray-400" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <X className="h-4 w-4 text-red-500" />
          </Button>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-[#323232] pt-4">
          {/* Titre */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Titre de la sous-étape
            </label>
            <Input
              value={step.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="Titre de la sous-étape..."
            />
          </div>

          {/* Description avec éditeur riche */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Description
            </label>
            <div className="border border-[#323232] rounded-lg overflow-hidden">
              {/* Barre d'outils */}
              <div className="flex gap-1 p-2 bg-[#1a1a1a] border-b border-[#323232]">
                <button
                  type="button"
                  onClick={() => {
                    descriptionRef.current?.focus();
                    document.execCommand('bold', false);
                  }}
                  className="p-1.5 hover:bg-[#323232] rounded text-gray-400 hover:text-white transition"
                  title="Gras"
                >
                  <Bold className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    descriptionRef.current?.focus();
                    document.execCommand('italic', false);
                  }}
                  className="p-1.5 hover:bg-[#323232] rounded text-gray-400 hover:text-white transition"
                  title="Italique"
                >
                  <Italic className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (descriptionRef.current) {
                      descriptionRef.current.focus();
                      document.execCommand('insertUnorderedList', false);
                      // Mettre à jour après que le DOM soit modifié
                      setTimeout(() => {
                        if (descriptionRef.current) {
                          const html = descriptionRef.current.innerHTML;
                          setLocalDescription(html);
                          onUpdate({ description: html });
                        }
                      }, 10);
                    }
                  }}
                  className="p-1.5 hover:bg-[#323232] rounded text-gray-400 hover:text-white transition"
                  title="Liste à puces"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (descriptionRef.current) {
                      descriptionRef.current.focus();
                      document.execCommand('insertOrderedList', false);
                      // Mettre à jour après que le DOM soit modifié
                      setTimeout(() => {
                        if (descriptionRef.current) {
                          const html = descriptionRef.current.innerHTML;
                          setLocalDescription(html);
                          onUpdate({ description: html });
                        }
                      }, 10);
                    }
                  }}
                  className="p-1.5 hover:bg-[#323232] rounded text-gray-400 hover:text-white transition"
                  title="Liste numérotée"
                >
                  <ListOrdered className="h-4 w-4" />
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowColorPalette(!showColorPalette)}
                    className="p-1.5 hover:bg-[#323232] rounded text-gray-400 hover:text-white transition"
                    title="Couleur du texte"
                  >
                    <Palette className="h-4 w-4" />
                  </button>
                  {showColorPalette && (
                    <div className="absolute top-full left-0 mt-1 p-2 bg-[#1a1a1a] border border-[#323232] rounded-lg shadow-lg z-50 flex flex-nowrap gap-1">
                      {textColors.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => {
                            descriptionRef.current?.focus();
                            document.execCommand('foreColor', false, color.value);
                            setShowColorPalette(false);
                          }}
                          className="w-7 h-7 rounded border-2 border-[#323232] hover:border-primary transition flex-shrink-0"
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-1.5 hover:bg-[#323232] rounded text-gray-400 hover:text-white transition"
                    title="Insérer un émoji"
                  >
                    <Smile className="h-4 w-4" />
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute top-full left-0 mt-1 p-2 bg-[#1a1a1a] border border-[#323232] rounded-lg shadow-lg z-50 grid grid-cols-8 gap-2 w-[300px]">
                      {emojis.map((emoji, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            if (descriptionRef.current) {
                              descriptionRef.current.focus();
                              document.execCommand('insertText', false, emoji);
                              setTimeout(() => {
                                if (descriptionRef.current) {
                                  const html = descriptionRef.current.innerHTML;
                                  setLocalDescription(html);
                                  onUpdate({ description: html });
                                }
                              }, 10);
                            }
                            setShowEmojiPicker(false);
                          }}
                          className="w-9 h-9 rounded hover:bg-[#323232] transition flex items-center justify-center text-xl flex-shrink-0"
                          title={emoji}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Séparateur */}
                <div className="w-px h-6 bg-[#323232] mx-1" />

                {/* Bouton pour insérer un outil */}
                <button
                  type="button"
                  onClick={() => setShowToolInsertModal(true)}
                  className={`p-1.5 hover:bg-[#323232] rounded transition flex items-center gap-1 ${
                    (step.tools?.length || 0) > 0
                      ? 'text-primary hover:text-primary'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title="Insérer un outil requis"
                >
                  <Wrench className="h-4 w-4" />
                  {(step.tools?.length || 0) > 0 && (
                    <span className="text-xs">{step.tools?.length}</span>
                  )}
                </button>
              </div>
              {/* Zone de texte éditable */}
              <div
                ref={descriptionRef}
                contentEditable
                onInput={(e) => {
                  const target = e.target as HTMLDivElement;
                  const html = target.innerHTML;
                  setLocalDescription(html);
                  onUpdate({ description: html });
                }}
                className="min-h-[150px] max-h-[400px] w-full px-3 py-2 text-sm text-white focus:outline-none bg-transparent border-0 overflow-y-auto [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6"
                style={{ wordBreak: 'break-word' }}
                data-placeholder="Description détaillée de cette sous-étape..."
              />
            </div>
          </div>

          {/* Images */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">
              Images ({step.images?.length || 0})
            </label>
            <div className="flex flex-wrap gap-3 mb-2">
              {(step.images || []).map((img, imgIndex) => (
                <div key={img.imageId} className="flex flex-col gap-1">
                  <div className="relative group">
                    <img
                      src={img.image.url || URL.createObjectURL(img.image.blob)}
                      alt={img.description || 'Image'}
                      className="h-24 w-24 object-cover rounded border border-[#323232]"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <button
                        disabled={imgIndex === 0}
                        onClick={() => {
                          const newImages = [...(step.images || [])];
                          [newImages[imgIndex - 1], newImages[imgIndex]] = [newImages[imgIndex], newImages[imgIndex - 1]];
                          onUpdate({ images: newImages });
                        }}
                        className="bg-gray-600 text-white rounded p-1 hover:bg-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Déplacer à gauche"
                      >
                        <ArrowLeft className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => setImageToAnnotate(img)}
                        className="bg-primary text-white rounded p-1 hover:bg-primary/80"
                        title="Annoter l'image"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => onRemoveImage(img.imageId)}
                        className="bg-red-500 text-white rounded p-1 hover:bg-red-600"
                        title="Supprimer l'image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <button
                        disabled={imgIndex === (step.images || []).length - 1}
                        onClick={() => {
                          const newImages = [...(step.images || [])];
                          [newImages[imgIndex], newImages[imgIndex + 1]] = [newImages[imgIndex + 1], newImages[imgIndex]];
                          onUpdate({ images: newImages });
                        }}
                        className="bg-gray-600 text-white rounded p-1 hover:bg-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Déplacer à droite"
                      >
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
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
                  await handleImageUpload(files);
                };
                input.click();
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={async (e) => {
                e.preventDefault();
                const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                await handleImageUpload(files);
              }}
              className="border-2 border-dashed border-[#323232] rounded-lg p-3 text-center cursor-pointer bg-background-elevated"
            >
              <p className="text-xs text-gray-500">Cliquez ou glissez-déposez des images</p>
            </div>
          </div>

          {/* Vidéos */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">
              Vidéos ({step.videos?.length || 0})
            </label>
            <div className="flex flex-wrap gap-3 mb-2">
              {(step.videos || []).map((video) => {
                const hasFullPath = video.url.includes('\\') || video.url.includes('/');
                return (
                <div key={video.id} className="relative group flex items-center gap-2 p-2 bg-background-elevated rounded border border-[#323232]">
                  <VideoIcon className="h-5 w-5 text-text-muted flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <input
                      className="text-sm font-medium text-white bg-transparent border-none outline-none w-full hover:bg-[#2a2a2a] focus:bg-[#2a2a2a] rounded px-1 -mx-1 truncate"
                      value={video.name}
                      onChange={(e) => {
                        const updatedVideos = (step.videos || []).map(v =>
                          v.id === video.id ? { ...v, name: e.target.value } : v
                        );
                        onUpdate({ videos: updatedVideos });
                      }}
                      title="Cliquer pour modifier le titre"
                    />
                    <div
                      className={`text-xs truncate cursor-pointer hover:underline ${hasFullPath ? 'text-gray-500' : 'text-orange-400'}`}
                      title={hasFullPath ? video.url : 'Chemin incomplet ! Cliquez pour corriger.'}
                      onClick={() => {
                        const newPath = prompt(
                          'Chemin complet de la vidéo :',
                          video.url
                        );
                        if (newPath && newPath !== video.url) {
                          // Mémoriser le dossier parent
                          const lastSep = Math.max(newPath.lastIndexOf('\\'), newPath.lastIndexOf('/'));
                          if (lastSep > 0) {
                            localStorage.setItem(NAS_VIDEO_BASE_KEY, newPath.substring(0, lastSep + 1));
                          }
                          const updatedVideos = (step.videos || []).map(v =>
                            v.id === video.id ? { ...v, url: newPath } : v
                          );
                          onUpdate({ videos: updatedVideos });
                        }
                      }}
                    >
                      {hasFullPath ? video.url : `⚠ ${video.url} (chemin incomplet)`}
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveVideo(video.id)}
                    className="bg-red-500 text-white rounded p-1 hover:bg-red-600 flex-shrink-0"
                    title="Supprimer la vidéo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                );
              })}
            </div>
            {showVideoInput ? (
              <div className="space-y-2">
                <Input
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Titre de la vidéo"
                  className="text-xs"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleVideoFileSelect}
                    className="flex-shrink-0"
                    title="Sélectionner un fichier vidéo"
                  >
                    <VideoIcon className="h-4 w-4" />
                  </Button>
                  <Input
                    type="text"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="Chemin d'accès NAS (ex: \\NAS\Videos\procedure.mp4)"
                    className="text-xs flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddVideo();
                      } else if (e.key === 'Escape') {
                        setShowVideoInput(false);
                        setVideoUrl('');
                        setVideoTitle('');
                      }
                    }}
                  />
                </div>
                {/* Input file caché pour le fallback */}
                <input
                  ref={videoFileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoFileInputChange}
                  className="hidden"
                />
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleAddVideo}
                    className="text-xs"
                  >
                    Ajouter
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowVideoInput(false);
                      setVideoUrl('');
                      setVideoTitle('');
                    }}
                    className="text-xs"
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowVideoInput(true)}
                className="w-full justify-start text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Ajouter une vidéo
              </Button>
            )}
          </div>

          {/* Documents */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">
              Documents ({step.documents?.length || 0})
            </label>
            <div className="flex flex-wrap gap-3 mb-2">
              {(step.documents || []).map((doc) => {
                const hasFullPath = doc.url.includes('\\') || doc.url.includes('/');
                return (
                <div key={doc.id} className="relative group flex items-center gap-2 p-2 bg-background-elevated rounded border border-[#323232]">
                  <FileText className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <input
                      className="text-sm font-medium text-white bg-transparent border-none outline-none w-full hover:bg-[#2a2a2a] focus:bg-[#2a2a2a] rounded px-1 -mx-1 truncate"
                      value={doc.name}
                      onChange={(e) => {
                        const updatedDocs = (step.documents || []).map(d =>
                          d.id === doc.id ? { ...d, name: e.target.value } : d
                        );
                        onUpdate({ documents: updatedDocs });
                      }}
                      title="Cliquer pour modifier le titre"
                    />
                    <div
                      className={`text-xs truncate cursor-pointer hover:underline ${hasFullPath ? 'text-gray-500' : 'text-orange-400'}`}
                      title={hasFullPath ? doc.url : 'Chemin incomplet ! Cliquez pour corriger.'}
                      onClick={() => {
                        const newPath = prompt(
                          'Chemin complet du document :',
                          doc.url
                        );
                        if (newPath && newPath !== doc.url) {
                          const lastSep = Math.max(newPath.lastIndexOf('\\'), newPath.lastIndexOf('/'));
                          if (lastSep > 0) {
                            localStorage.setItem(NAS_DOCUMENT_BASE_KEY, newPath.substring(0, lastSep + 1));
                          }
                          const updatedDocs = (step.documents || []).map(d =>
                            d.id === doc.id ? { ...d, url: newPath } : d
                          );
                          onUpdate({ documents: updatedDocs });
                        }
                      }}
                    >
                      {hasFullPath ? doc.url : `⚠ ${doc.url} (chemin incomplet)`}
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveDocument(doc.id)}
                    className="bg-red-500 text-white rounded p-1 hover:bg-red-600 flex-shrink-0"
                    title="Supprimer le document"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                );
              })}
            </div>
            {showDocumentInput ? (
              <div className="space-y-2">
                <Input
                  type="text"
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  placeholder="Titre du document"
                  className="text-xs"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleDocumentFileSelect}
                    className="flex-shrink-0"
                    title="Sélectionner un fichier PDF"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Input
                    type="text"
                    value={documentUrl}
                    onChange={(e) => setDocumentUrl(e.target.value)}
                    placeholder="Chemin d'accès (ex: \\NAS\Documents\fichier.pdf)"
                    className="text-xs flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddDocument();
                      } else if (e.key === 'Escape') {
                        setShowDocumentInput(false);
                        setDocumentUrl('');
                        setDocumentTitle('');
                      }
                    }}
                  />
                </div>
                <input
                  ref={documentFileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleDocumentFileInputChange}
                  className="hidden"
                />
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleAddDocument}
                    className="text-xs"
                  >
                    Ajouter
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowDocumentInput(false);
                      setDocumentUrl('');
                      setDocumentTitle('');
                    }}
                    className="text-xs"
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowDocumentInput(true)}
                className="w-full justify-start text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Ajouter un document
              </Button>
            )}
          </div>

          {/* Outils */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">
              <Wrench className="h-3 w-3 inline mr-1" />
              Outils requis ({(step.tools?.length || 0) + (step.toolId && step.toolName ? 1 : 0)})
            </label>
            <div className="space-y-2">
              {/* Afficher les outils du nouveau format */}
              {(step.tools || []).map((tool) => (
                <div
                  key={tool.id}
                  className="p-3 bg-background-elevated rounded border border-[#2a2a2a]"
                  style={{ borderLeft: `4px solid ${tool.color || '#10b981'}` }}
                >
                  <div className="flex items-start gap-3">
                    {/* Image de l'outil */}
                    {tool.imageUrl ? (
                      <img
                        src={tool.imageUrl}
                        alt={tool.name}
                        className="h-16 w-16 object-cover rounded border border-[#323232] flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="h-16 w-16 bg-background-elevated rounded border border-[#323232] flex items-center justify-center flex-shrink-0">
                        <Wrench className="h-6 w-6 text-text-muted" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white mb-1">{tool.name}</div>
                      {tool.reference && (
                        <div className="text-xs text-gray-400 mb-1">
                          {tool.reference}
                        </div>
                      )}
                      {tool.location && (
                        <div className="text-xs text-gray-400">
                          {tool.location}
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveTool(tool.id)}
                      className="flex-shrink-0"
                      title="Supprimer cet outil"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Afficher l'ancien format pour compatibilité */}
              {step.toolId && step.toolName && (
                <div
                  className="p-3 bg-background-elevated rounded border border-[#2a2a2a]"
                  style={{ borderLeft: `4px solid ${step.toolColor || '#10b981'}` }}
                >
                  <div className="flex items-start gap-3">
                    {/* Image de l'outil (ancien format) */}
                    {step.toolImageUrl ? (
                      <img
                        src={step.toolImageUrl}
                        alt={step.toolName}
                        className="h-16 w-16 object-cover rounded border border-[#323232] flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="h-16 w-16 bg-background-elevated rounded border border-[#323232] flex items-center justify-center flex-shrink-0">
                        <Wrench className="h-6 w-6 text-text-muted" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white mb-1">{step.toolName}</div>
                      <div className="text-xs text-orange-400 mb-1">(Ancien format)</div>
                      {step.toolReference && (
                        <div className="text-xs text-gray-400 mb-1">
                          {step.toolReference}
                        </div>
                      )}
                      {step.toolLocation && (
                        <div className="text-xs text-gray-400">
                          {step.toolLocation}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          // Migrer vers le nouveau format
                          if (step.toolId && step.toolName) {
                            onAddTool(
                              step.toolId,
                              step.toolName,
                              step.toolLocation,
                              step.toolReference,
                              step.toolColor,
                              step.toolImageUrl
                            );
                            // On ne peut pas supprimer l'ancien format ici car on n'a pas de fonction pour ça
                            // L'utilisateur devra le faire manuellement ou on le supprime lors de la sauvegarde
                          }
                        }}
                        className="flex-shrink-0 text-xs"
                        title="Migrer vers le nouveau format"
                      >
                        ✓
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Bouton pour ajouter un outil */}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowToolSelector(true)}
                className="w-full justify-start"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un outil ou consommable
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ImageAnnotator Modal */}
      {imageToAnnotate && (
        <ImageAnnotator
          annotatedImage={imageToAnnotate}
          onSave={handleSaveAnnotations}
          onCancel={() => setImageToAnnotate(null)}
        />
      )}

      {/* ToolSelector Modal */}
      {showToolSelector && (
        <ToolSelector
          availableTools={availableTools || []}
          availableConsumables={[]}
          onSelect={(toolId, toolName, toolLocation, toolReference, _type, color, imageUrl) => {
            onAddTool(toolId, toolName, toolLocation, toolReference, color, imageUrl);
            setShowToolSelector(false);
          }}
          onClose={() => setShowToolSelector(false)}
        />
      )}

      {/* Modal pour insérer un outil dans la description */}
      {showToolInsertModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-xl border border-[#323232] max-w-md w-full max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-[#323232] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Insérer un outil</h3>
                <p className="text-xs text-gray-400 mt-1">Sélectionnez un outil à insérer dans la description</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowToolInsertModal(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {(step.tools?.length || 0) > 0 ? (
                <div className="space-y-2">
                  {step.tools?.map((tool) => (
                    <button
                      key={tool.id}
                      type="button"
                      className="w-full text-left p-3 rounded-lg border border-[#323232] hover:border-primary hover:bg-primary/10 transition-all flex items-center gap-3"
                      onClick={() => insertToolInDescription(tool)}
                    >
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tool.color || '#10b981' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white">{tool.name}</div>
                        {tool.reference && (
                          <div className="text-xs text-gray-400">{tool.reference}</div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        Cliquer pour insérer
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Wrench className="h-12 w-12 mx-auto text-gray-600 mb-3" />
                  <p className="text-gray-400 mb-2">Aucun outil requis pour cette étape</p>
                  <p className="text-xs text-gray-500">
                    Ajoutez d'abord des outils dans la section "Outils requis" ci-dessous
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#323232]">
              <Button
                variant="secondary"
                onClick={() => setShowToolInsertModal(false)}
                className="w-full"
              >
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
