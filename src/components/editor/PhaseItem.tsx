import { useState, useEffect, useRef } from 'react';
import { Trash2, ChevronDown, ChevronUp, Plus, X, Wrench, AlertTriangle, Lightbulb, Save, Pencil, ArrowUp, ArrowDown } from 'lucide-react';
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
import type { Phase, DifficultyLevel, SubStep, SafetyNote, AnnotatedImage, Tool, Consumable, Annotation } from '@/types';
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

  // Ref pour stocker la dernière valeur de steps (pour éviter les problèmes de closure)
  const stepsRef = useRef(steps);
  useEffect(() => {
    stepsRef.current = steps;
  }, [steps]);

  const availableTools = useTools();

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
        try {
          await updatePhase(procedureId, phase.id, {
            title,
            phaseNumber,
            difficulty,
            estimatedTime,
            steps,
          });
          toast.success('Phase sauvegardée');
        } catch (error) {
          console.error('Error updating phase:', error);
          toast.error('Erreur lors de la sauvegarde');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [procedureId, phase.id, title, phaseNumber, difficulty, estimatedTime, steps]);

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
    setSteps(steps.map(s => s.id === id ? { ...s, ...updates } : s));
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

  const updateStepTool = (stepId: string, toolId: string | null, toolName: string | null, toolLocation?: string | null, toolReference?: string | null) => {
    setSteps(steps.map(s =>
      s.id === stepId
        ? {
            ...s,
            toolId: toolId || undefined,
            toolName: toolName || undefined,
            toolLocation: toolLocation || undefined,
            toolReference: toolReference || undefined,
            tool: undefined // On ne stocke plus l'objet complet
          }
        : s
    ));
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

  const savePhaseToFirestore = async () => {
    try {
      // Utiliser stepsRef.current pour obtenir la dernière valeur
      await updatePhase(procedureId, phase.id, {
        title,
        phaseNumber,
        difficulty,
        estimatedTime,
        steps: stepsRef.current,
      });
      return true;
    } catch (error) {
      console.error('Error saving phase:', error);
      toast.error('Erreur lors de la sauvegarde');
      return false;
    }
  };

  const getDifficultyColor = (diff: DifficultyLevel) => {
    switch (diff) {
      case 'easy': return 'bg-status-success';
      case 'medium': return 'bg-status-warning';
      case 'hard': return 'bg-status-danger';
      default: return 'bg-background-elevated';
    }
  };

  const getDifficultyLabel = (diff: DifficultyLevel) => {
    switch (diff) {
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
                      onAddTip={() => addStepTip(step.id)}
                      onUpdateTip={(tipIdx, value) => updateStepTip(step.id, tipIdx, value)}
                      onRemoveTip={(tipIdx) => removeStepTip(step.id, tipIdx)}
                      onAddSafetyNote={() => addStepSafetyNote(step.id)}
                      onUpdateSafetyNote={(noteId, updates) => updateStepSafetyNote(step.id, noteId, updates)}
                      onRemoveSafetyNote={(noteId) => removeStepSafetyNote(step.id, noteId)}
                      onUpdateTool={(toolId, toolName, toolLocation, toolReference) => updateStepTool(step.id, toolId, toolName, toolLocation, toolReference)}
                      onMoveUp={() => moveStepUp(step.id)}
                      onMoveDown={() => moveStepDown(step.id)}
                      onSaveToFirestore={savePhaseToFirestore}
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
  onAddTip: () => void;
  onUpdateTip: (index: number, value: string) => void;
  onRemoveTip: (index: number) => void;
  onAddSafetyNote: () => void;
  onUpdateSafetyNote: (noteId: string, updates: Partial<SafetyNote>) => void;
  onRemoveSafetyNote: (noteId: string) => void;
  onUpdateTool: (toolId: string | null, toolName: string | null, toolLocation?: string | null, toolReference?: string | null) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSaveToFirestore: () => Promise<boolean>;
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
  onAddTip,
  onUpdateTip,
  onRemoveTip,
  onAddSafetyNote,
  onUpdateSafetyNote,
  onRemoveSafetyNote,
  onUpdateTool,
  onMoveUp,
  onMoveDown,
  onSaveToFirestore,
}: SubStepItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageToAnnotate, setImageToAnnotate] = useState<AnnotatedImage | null>(null);
  const [showToolSelector, setShowToolSelector] = useState(false);

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

    // Mettre à jour l'image avec les nouvelles annotations
    const updatedImages = (step.images || []).map(img =>
      img.imageId === imageToAnnotate.imageId
        ? { ...img, annotations, description }
        : img
    );

    // Mettre à jour l'état local immédiatement pour l'UI
    onUpdate({ images: updatedImages });

    // Fermer le modal d'annotation
    setImageToAnnotate(null);

    // Sauvegarder automatiquement dans Firestore
    toast.info('Sauvegarde des annotations...');

    // Petit délai pour s'assurer que le state est à jour
    setTimeout(async () => {
      const success = await onSaveToFirestore();
      if (success) {
        toast.success('Annotations sauvegardées avec succès');
      }
    }, 100);
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
            {step.toolId && (
              <span className="flex items-center gap-1">
                🔧
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

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Description
            </label>
            <textarea
              value={step.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="Description détaillée de cette sous-étape..."
              rows={3}
              className="w-full rounded-lg border border-[#323232] bg-transparent px-3 py-2 text-sm text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Images */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">
              Images ({step.images?.length || 0})
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(step.images || []).map((img) => (
                <div key={img.imageId} className="relative group">
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

          {/* Outil */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">
              <Wrench className="h-3 w-3 inline mr-1" />
              Outil requis
            </label>
            {step.toolId && step.toolName ? (
              <div className="p-3 bg-background-elevated rounded border border-[#2a2a2a]">
                <div className="flex items-start gap-3">
                  {/* Image de l'outil */}
                  {(() => {
                    const tool = availableTools?.find(t => t.id === step.toolId);
                    const consumable = availableConsumables?.find(c => c.id === step.toolId);
                    const imageUrl = tool?.image?.url || (consumable as any)?.image_url || (consumable as any)?.photo_url;

                    return imageUrl ? (
                      <img
                        src={imageUrl}
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
                    );
                  })()}

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white mb-1">{step.toolName}</div>
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

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onUpdateTool(null, null)}
                    className="flex-shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowToolSelector(true)}
                className="w-full justify-start"
              >
                <Wrench className="h-4 w-4 mr-2" />
                Sélectionner un outil ou consommable
              </Button>
            )}
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
          onSelect={(toolId, toolName, toolLocation, toolReference) => {
            onUpdateTool(toolId, toolName, toolLocation, toolReference);
            setShowToolSelector(false);
          }}
          onClose={() => setShowToolSelector(false)}
        />
      )}
    </div>
  );
}
