import { useState, useEffect } from 'react';
import { Trash2, ChevronDown, ChevronUp, Plus, X, Wrench, AlertTriangle, Lightbulb, Save, Cloud, GripVertical, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { updatePhase } from '@/services/procedureService';
import { createPhaseTemplate } from '@/services/templateService';
import { uploadImageToHost } from '@/services/imageHostingService';
import { fetchConsumables } from '@/services/consumablesService';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useTools } from '@/hooks/useTools';
import ImageAnnotator from '@/components/phase/ImageAnnotator';
import type { Phase, DifficultyLevel, SubStep, SafetyNote, AnnotatedImage, Tool, Consumable, Annotation } from '@/types';
import { toast } from 'sonner';

interface PhaseItemProps {
  phase: Phase;
  index: number;
  procedureId: string;
  onDelete: (phaseId: string) => void;
}

export default function PhaseItem({ phase, index, procedureId, onDelete }: PhaseItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState(phase.title);
  const [phaseNumber, setPhaseNumber] = useState(phase.phaseNumber || index + 1);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(phase.difficulty);
  const [estimatedTime, setEstimatedTime] = useState(phase.estimatedTime);
  const [steps, setSteps] = useState<SubStep[]>(phase.steps || []);
  const [consumables, setConsumables] = useState<Consumable[]>([]);

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

  const handleSave = async () => {
    try {
      await updatePhase(procedureId, phase.id, {
        title,
        phaseNumber,
        difficulty,
        estimatedTime,
        steps,
      });
      toast.success('Phase mise à jour');
    } catch (error) {
      console.error('Error updating phase:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // Auto-save avec délai de 2 secondes
  const { isSaving, lastSaved } = useAutoSave(
    {
      onSave: async () => {
        await updatePhase(procedureId, phase.id, {
          title,
          phaseNumber,
          difficulty,
          estimatedTime,
          steps,
        });
      },
      delay: 2000, // 2 secondes
      enabled: true,
    },
    [title, phaseNumber, difficulty, estimatedTime, steps]
  );

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
      toast.success('Template créé avec succès');
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Erreur lors de la création du template');
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

  const getDifficultyColor = (diff: DifficultyLevel) => {
    switch (diff) {
      case 'easy': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'hard': return 'bg-red-500';
      default: return 'bg-gray-500';
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
    <div className="border border-gray-700/50 rounded-lg bg-gray-900/30">
      {/* Header - Collapsible */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-800/30 rounded-t-lg transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1 flex items-center gap-3">
          <GripVertical className="h-5 w-5 text-gray-500 cursor-move" />
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
          {isSaving && (
            <Cloud className="h-4 w-4 text-gray-400 animate-pulse" />
          )}
          {lastSaved && !isSaving && (
            <Cloud className="h-4 w-4 text-green-500" />
          )}
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
        <div className="border-t border-gray-700/50">
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
                  className="w-full rounded-md border border-gray-700/30 bg-transparent px-3 py-2 text-sm text-white"
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
            <div className="border-t border-gray-700/50 pt-6">
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
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-700/50">
              <Button variant="secondary" size="sm" onClick={handleSaveAsTemplate}>
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder comme template
              </Button>

              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Enregistrer les modifications
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
}

function SubStepItem({
  step,
  index,
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
}: SubStepItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageToAnnotate, setImageToAnnotate] = useState<AnnotatedImage | null>(null);

  const handleImageUpload = async (files: File[]) => {
    const validImages: AnnotatedImage[] = [];

    for (const file of files) {
      if (file.size > 15 * 1024 * 1024) {
        toast.error(`${file.name} est trop volumineux (max 15 MB)`);
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
        toast.error(`Erreur pour ${file.name}: ${error.message}`);
      }
    }

    if (validImages.length > 0) {
      onAddImage(validImages);
      toast.success(`${validImages.length} image(s) ajoutée(s)`);
    }
  };

  const handleSaveAnnotations = (annotations: Annotation[], description: string) => {
    if (!imageToAnnotate) return;

    // Mettre à jour l'image avec les nouvelles annotations
    const updatedImages = (step.images || []).map(img =>
      img.imageId === imageToAnnotate.imageId
        ? { ...img, annotations, description }
        : img
    );

    onUpdate({ images: updatedImages });
    setImageToAnnotate(null);
    toast.success('Annotations sauvegardées');
  };

  return (
    <div className="border border-gray-700/30 rounded-lg bg-[#1a1a1a]">
      {/* Header */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-800/20"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 flex-1">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-white text-sm font-bold">
            {index + 1}
          </span>
          <Input
            value={step.title}
            onChange={(e) => {
              e.stopPropagation();
              onUpdate({ title: e.target.value });
            }}
            onClick={(e) => e.stopPropagation()}
            placeholder="Titre de la sous-étape..."
            className="flex-1"
          />
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
        <div className="px-4 pb-4 space-y-4 border-t border-gray-700/30 pt-4">
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
              className="w-full rounded-lg border border-gray-700/30 bg-transparent px-3 py-2 text-sm text-white focus:ring-2 focus:ring-primary focus:border-transparent"
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
                    className="h-16 w-16 object-cover rounded border border-gray-600"
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
              className="border-2 border-dashed border-gray-700/30 rounded-lg p-3 text-center hover:border-primary/50 transition-colors cursor-pointer"
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
              <div className="flex items-center justify-between p-2 bg-gray-800/30 rounded border border-gray-700/30">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-primary" />
                  <div className="text-xs font-medium text-white">{step.toolName}</div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onUpdateTool(null, null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <select
                value={step.toolId || ''}
                onChange={(e) => {
                  const selectedValue = e.target.value;
                  if (!selectedValue) {
                    onUpdateTool(null, null, null, null);
                    return;
                  }

                  // Chercher d'abord dans les outils
                  const tool = availableTools?.find(t => t.id === selectedValue);
                  if (tool) {
                    onUpdateTool(tool.id, tool.name, tool.location, tool.reference);
                    return;
                  }

                  // Sinon chercher dans les consommables
                  const consumable = availableConsumables?.find(c => c.id === selectedValue);
                  if (consumable) {
                    onUpdateTool(consumable.id, consumable.designation, (consumable as any).emplacement || (consumable as any).location, consumable.reference);
                  }
                }}
                className="w-full rounded border border-gray-700/30 bg-transparent px-2 py-1.5 text-xs text-white"
              >
                <option value="">Aucun outil/consommable</option>
                {availableTools && availableTools.length > 0 && (
                  <optgroup label="Outils">
                    {availableTools.map(tool => (
                      <option key={tool.id} value={tool.id}>{tool.name}</option>
                    ))}
                  </optgroup>
                )}
                {availableConsumables && availableConsumables.length > 0 && (
                  <optgroup label="Consommables">
                    {availableConsumables.map(consumable => (
                      <option key={consumable.id} value={consumable.id}>
                        {consumable.designation}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
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
                      className="rounded border border-orange-500/30 bg-transparent px-2 py-1 text-xs text-white"
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
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <ImageAnnotator
              annotatedImage={imageToAnnotate}
              onSave={handleSaveAnnotations}
              onCancel={() => setImageToAnnotate(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
