import { useState, useEffect, useRef } from 'react';
import { Trash2, ChevronDown, ChevronUp, Plus, X, Wrench, AlertTriangle, Lightbulb, Save, Pencil, ArrowUp, ArrowDown, Video as VideoIcon, Play, Bold, Italic, Palette } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { updatePhase, movePhaseUp, movePhaseDown } from '@/services/procedureService';
import { createPhaseTemplate } from '@/services/templateService';
import { uploadImageToHost } from '@/services/imageHostingService';
import { fetchConsumables } from '@/services/consumablesService';
import { useTools } from '@/hooks/useTools';
import ImageAnnotator from '@/components/phase/ImageAnnotator';
import ToolSelector from '@/components/tools/ToolSelector';
import type { Phase, DifficultyLevel, SubStep, SafetyNote, AnnotatedImage, Tool, Consumable, Annotation, StepTool } from '@/types';
import { toast } from 'sonner';

interface PhaseItemProps {
  phase: Phase;
  index: number;
  procedureId: string;
  totalPhases: number;
  onDelete: (phaseId: string) => void;
}

export default function PhaseItem({ phase, index, procedureId, totalPhases, onDelete }: PhaseItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState(phase.title);
  const [phaseNumber, setPhaseNumber] = useState(phase.phaseNumber || index + 1);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(phase.difficulty);
  const [estimatedTime, setEstimatedTime] = useState(phase.estimatedTime);
  const [steps, setSteps] = useState<SubStep[]>(phase.steps || []);
  const [consumables, setConsumables] = useState<Consumable[]>([]);
  const isInitialMount = useRef(true);

  const availableTools = useTools();

  // Synchroniser le state local avec les props quand la phase change dans Firebase
  useEffect(() => {
    console.log('📥 Synchronisation: Mise à jour du state local avec les nouvelles props');
    setTitle(phase.title);
    setPhaseNumber(phase.phaseNumber || index + 1);
    setDifficulty(phase.difficulty);
    setEstimatedTime(phase.estimatedTime);
    setSteps(phase.steps || []);
    // Réinitialiser le flag pour éviter que la synchro déclenche l'auto-save
    isInitialMount.current = true;
  }, [phase.id, phase.title, phase.phaseNumber, phase.difficulty, phase.estimatedTime, phase.steps, index]);

  // Charger les consommables
  useEffect(() => {
    const loadConsumables = async () => {
      try {
        const data = await fetchConsumables();
        setConsumables(data);
      } catch (error) {
        console.error('Error loading consumables:', error);
      }
    };
    loadConsumables();
  }, []);

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

  const addStepTip = (stepId: string) => {
    setSteps(steps.map(s =>
      s.id === stepId
        ? { ...s, tips: [...(s.tips || []), ''] }
        : s
    ));
  };

  const updateStepTip = (stepId: string, index: number, value: string) => {
    setSteps(steps.map(s => {
      if (s.id === stepId) {
        const newTips = [...(s.tips || [])];
        newTips[index] = value;
        return { ...s, tips: newTips };
      }
      return s;
    }));
  };

  const removeStepTip = (stepId: string, index: number) => {
    setSteps(steps.map(s =>
      s.id === stepId
        ? { ...s, tips: (s.tips || []).filter((_, i) => i !== index) }
        : s
    ));
  };

  const addStepSafetyNote = (stepId: string) => {
    setSteps(steps.map(s =>
      s.id === stepId
        ? { ...s, safetyNotes: [...(s.safetyNotes || []), { id: crypto.randomUUID(), type: 'warning', content: '' }] }
        : s
    ));
  };

  const updateStepSafetyNote = (stepId: string, noteId: string, updates: Partial<SafetyNote>) => {
    setSteps(steps.map(s => {
      if (s.id === stepId) {
        return {
          ...s,
          safetyNotes: (s.safetyNotes || []).map(n => n.id === noteId ? { ...n, ...updates } : n)
        };
      }
      return s;
    }));
  };

  const removeStepSafetyNote = (stepId: string, noteId: string) => {
    setSteps(steps.map(s =>
      s.id === stepId
        ? { ...s, safetyNotes: (s.safetyNotes || []).filter(n => n.id !== noteId) }
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
        toolId: s.toolId,
        toolName: s.toolName,
        toolLocation: s.toolLocation,
        toolReference: s.toolReference
      })), null, 2));

      // Nettoyer les valeurs undefined avant de sauvegarder
      const cleanedSteps = cleanUndefined(stepsToSave);

      console.log('Steps APRÈS cleanUndefined:', JSON.stringify(cleanedSteps.map((s: any) => ({
        id: s.id,
        title: s.title,
        toolId: s.toolId,
        toolName: s.toolName,
        toolLocation: s.toolLocation,
        toolReference: s.toolReference
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
      default: return 'bg-background-elevated';
    }
  };

  const getDifficultyLabel = (diff: DifficultyLevel) => {
    switch (diff) {
      case 'trainee': return 'Stagiaire';
      case 'easy': return 'Facile';
      case 'medium': return 'Moyen';
      case 'hard': return 'Difficile';
      default: return diff;
    }
  };

  return (
    <div className="border border-[#323232] rounded-lg bg-background-elevated">
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
          <span className="text-sm text-gray-400">{estimatedTime} min</span>
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
                  <option value="trainee">Stagiaire</option>
                  <option value="easy">Facile</option>
                  <option value="medium">Moyen</option>
                  <option value="hard">Difficile</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Temps estimé (min)
                </label>
                <Input
                  type="number"
                  min="1"
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(parseInt(e.target.value) || 0)}
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
                <Button onClick={addStep} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une sous-étape
                </Button>
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
                      totalSteps={steps.length}
                      availableTools={availableTools}
                      availableConsumables={consumables}
                      onUpdate={(updates) => updateStep(step.id, updates)}
                      onRemove={() => removeStep(step.id)}
                      onAddImage={(images) => addStepImage(step.id, images)}
                      onRemoveImage={(imageId) => removeStepImage(step.id, imageId)}
                      onAddVideo={(videos) => addStepVideo(step.id, videos)}
                      onRemoveVideo={(videoId) => removeStepVideo(step.id, videoId)}
                      onAddTip={() => addStepTip(step.id)}
                      onUpdateTip={(tipIdx, value) => updateStepTip(step.id, tipIdx, value)}
                      onRemoveTip={(tipIdx) => removeStepTip(step.id, tipIdx)}
                      onAddSafetyNote={() => addStepSafetyNote(step.id)}
                      onUpdateSafetyNote={(noteId, updates) => updateStepSafetyNote(step.id, noteId, updates)}
                      onRemoveSafetyNote={(noteId) => removeStepSafetyNote(step.id, noteId)}
                      onAddTool={(toolId, toolName, toolLocation, toolReference, toolColor, toolImageUrl) => addStepTool(step.id, toolId, toolName, toolLocation, toolReference, toolColor, toolImageUrl)}
                      onRemoveTool={(toolId) => removeStepTool(step.id, toolId)}
                      onMoveUp={() => moveStepUp(step.id)}
                      onMoveDown={() => moveStepDown(step.id)}
                      onSaveAnnotations={(imageId, annotations, description) => handleSaveStepAnnotations(step.id, imageId, annotations, description)}
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
    </div>
  );
}

// Composant pour une sous-étape (collapsible)
interface SubStepItemProps {
  step: SubStep;
  index: number;
  totalSteps: number;
  availableTools?: Tool[];
  availableConsumables?: Consumable[];
  onUpdate: (updates: Partial<SubStep>) => void;
  onRemove: () => void;
  onAddImage: (images: AnnotatedImage[]) => void;
  onRemoveImage: (imageId: string) => void;
  onAddVideo: (videos: any[]) => void;
  onRemoveVideo: (videoId: string) => void;
  onAddTip: () => void;
  onUpdateTip: (index: number, value: string) => void;
  onRemoveTip: (index: number) => void;
  onAddSafetyNote: () => void;
  onUpdateSafetyNote: (noteId: string, updates: Partial<SafetyNote>) => void;
  onRemoveSafetyNote: (noteId: string) => void;
  onAddTool: (toolId: string, toolName: string, toolLocation?: string | null, toolReference?: string | null, toolColor?: string | null, toolImageUrl?: string | null) => void;
  onRemoveTool: (toolId: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSaveAnnotations: (imageId: string, annotations: Annotation[], description: string) => Promise<void>;
}

function SubStepItem({
  step,
  index,
  totalSteps,
  availableTools,
  availableConsumables,
  onUpdate,
  onRemove,
  onAddImage,
  onRemoveImage,
  onAddVideo,
  onRemoveVideo,
  onAddTip,
  onUpdateTip,
  onRemoveTip,
  onAddSafetyNote,
  onUpdateSafetyNote,
  onRemoveSafetyNote,
  onAddTool,
  onRemoveTool,
  onMoveUp,
  onMoveDown,
  onSaveAnnotations,
}: SubStepItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageToAnnotate, setImageToAnnotate] = useState<AnnotatedImage | null>(null);
  const [showToolSelector, setShowToolSelector] = useState(false);
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const descriptionRef = useRef<HTMLDivElement>(null);
  const [showColorPalette, setShowColorPalette] = useState(false);

  const textColors = [
    { name: 'Orange-rouge', value: '#ff5722' },
    { name: 'Rouge', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Jaune', value: '#eab308' },
    { name: 'Vert', value: '#22c55e' },
    { name: 'Bleu', value: '#3b82f6' },
    { name: 'Violet', value: '#a855f7' },
    { name: 'Rose', value: '#ec4899' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Blanc', value: '#ffffff' },
  ];

  // Initialiser le contenu du contentEditable
  useEffect(() => {
    if (descriptionRef.current && descriptionRef.current.innerHTML !== step.description) {
      descriptionRef.current.innerHTML = step.description || '';
    }
  }, [step.id]); // Seulement quand on change de step

  // Fermer la palette de couleurs quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showColorPalette && !(e.target as HTMLElement).closest('.relative')) {
        setShowColorPalette(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColorPalette]);

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

  const handleAddVideo = () => {
    if (!videoUrl.trim()) return;

    const newVideo = {
      id: crypto.randomUUID(),
      name: videoTitle.trim() || extractVideoTitle(videoUrl),
      url: videoUrl,
      thumbnail: extractVideoThumbnail(videoUrl),
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

  const extractVideoTitle = (url: string): string => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
        return 'Vidéo YouTube';
      } else if (urlObj.hostname.includes('vimeo.com')) {
        return 'Vidéo Vimeo';
      }
      return 'Vidéo';
    } catch {
      return 'Vidéo';
    }
  };

  const extractVideoThumbnail = (url: string): string | undefined => {
    try {
      const urlObj = new URL(url);

      // YouTube
      if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
        let videoId = '';
        if (urlObj.hostname.includes('youtu.be')) {
          videoId = urlObj.pathname.slice(1);
        } else {
          videoId = urlObj.searchParams.get('v') || '';
        }
        if (videoId) {
          return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
        }
      }

      // Vimeo (nécessiterait une API call, on laisse undefined pour l'instant)

      return undefined;
    } catch {
      return undefined;
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
                    <div className="absolute top-full left-0 mt-1 p-2 bg-[#1a1a1a] border border-[#323232] rounded-lg shadow-lg z-50 flex flex-wrap gap-1" style={{ maxWidth: '280px' }}>
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
              </div>
              {/* Zone de texte éditable */}
              <div
                ref={descriptionRef}
                contentEditable
                onInput={(e) => {
                  const target = e.target as HTMLDivElement;
                  onUpdate({ description: target.innerHTML });
                }}
                className="min-h-[150px] max-h-[400px] w-full px-3 py-2 text-sm text-white focus:outline-none bg-transparent border-0 overflow-y-auto"
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
              {(step.images || []).map((img) => (
                <div key={img.imageId} className="flex flex-col gap-1">
                  <div className="relative group">
                    <img
                      src={img.image.url || URL.createObjectURL(img.image.blob)}
                      alt={img.description || 'Image'}
                      className="h-16 w-16 object-cover rounded border border-[#323232]"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
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
                    </div>
                  </div>
                  {img.annotations && img.annotations.length > 0 && (
                    <div className="flex justify-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30">
                        {img.annotations.length} annotation{img.annotations.length > 1 ? 's' : ''}
                      </span>
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
              <VideoIcon className="h-3 w-3 inline mr-1" />
              Vidéos ({step.videos?.length || 0})
            </label>
            <div className="flex flex-wrap gap-3 mb-2">
              {(step.videos || []).map((video) => (
                <div key={video.id} className="relative group">
                  {video.thumbnail ? (
                    <div className="relative h-16 w-24 rounded border border-[#323232] overflow-hidden">
                      <img
                        src={video.thumbnail}
                        alt={video.name}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Play className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="h-16 w-24 bg-background-elevated rounded border border-[#323232] flex items-center justify-center">
                      <VideoIcon className="h-6 w-6 text-text-muted" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-primary text-white rounded p-1 hover:bg-primary/80"
                      title="Ouvrir la vidéo"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Play className="h-3 w-3" />
                    </a>
                    <button
                      onClick={() => onRemoveVideo(video.id)}
                      className="bg-red-500 text-white rounded p-1 hover:bg-red-600"
                      title="Supprimer la vidéo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {showVideoInput ? (
              <div className="space-y-2">
                <Input
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Titre de la vidéo (optionnel)"
                  className="text-xs"
                />
                <Input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="URL de la vidéo (YouTube, Vimeo, etc.)"
                  className="text-xs"
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

          {/* Conseils */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">
              <Lightbulb className="h-3 w-3 inline mr-1 text-yellow-500" />
              Conseils pratiques
            </label>
            <div className="space-y-2">
              {(step.tips || []).map((tip, tipIdx) => (
                <div key={tipIdx} className="flex gap-2">
                  <Input
                    value={tip}
                    onChange={(e) => onUpdateTip(tipIdx, e.target.value)}
                    placeholder="Conseil..."
                    className="text-xs"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveTip(tipIdx)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button
                variant="secondary"
                size="sm"
                onClick={onAddTip}
                className="text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Ajouter un conseil
              </Button>
            </div>
          </div>

          {/* Sécurité */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">
              <AlertTriangle className="h-3 w-3 inline mr-1 text-orange-500" />
              Consignes de sécurité
            </label>
            <div className="space-y-2">
              {(step.safetyNotes || []).map((note) => (
                <div key={note.id} className="p-2 bg-orange-500/10 border border-orange-500/30 rounded">
                  <div className="flex gap-2 items-start mb-2">
                    <select
                      value={note.type}
                      onChange={(e) => onUpdateSafetyNote(note.id, { type: e.target.value as any })}
                      className="rounded border border-[#323232] bg-transparent px-2 py-1 text-xs text-white"
                    >
                      <option value="info">Information</option>
                      <option value="warning">Attention</option>
                      <option value="danger">Danger</option>
                      <option value="mandatory">Obligatoire</option>
                      <option value="forbidden">Interdit</option>
                    </select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveSafetyNote(note.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <Input
                    value={note.content}
                    onChange={(e) => onUpdateSafetyNote(note.id, { content: e.target.value })}
                    placeholder="Consigne de sécurité..."
                    className="text-xs"
                  />
                </div>
              ))}
              <Button
                variant="secondary"
                size="sm"
                onClick={onAddSafetyNote}
                className="text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Ajouter une consigne
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
          availableConsumables={availableConsumables || []}
          onSelect={(toolId, toolName, toolLocation, toolReference, _type, color, imageUrl) => {
            onAddTool(toolId, toolName, toolLocation, toolReference, color, imageUrl);
            setShowToolSelector(false);
          }}
          onClose={() => setShowToolSelector(false)}
        />
      )}
    </div>
  );
}
