import { useState } from 'react';
import { Trash2, ChevronDown, ChevronUp, Plus, X, Wrench, Package, List, AlertTriangle, Lightbulb, Save, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { updatePhase } from '@/services/procedureService';
import { createPhaseTemplate } from '@/services/templateService';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useTools } from '@/hooks/useTools';
import type { Phase, DifficultyLevel, Tool, SubStep, SafetyNote, AnnotatedImage, Annotation } from '@/types';
import { toast } from 'sonner';
import ImageAnnotator from '@/components/phase/ImageAnnotator';

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
  const [description, setDescription] = useState(phase.description);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(phase.difficulty);
  const [estimatedTime, setEstimatedTime] = useState(phase.estimatedTime);
  const [steps, setSteps] = useState<SubStep[]>(phase.steps || []);
  const [images, setImages] = useState<AnnotatedImage[]>(phase.images || []);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'steps'>('info');

  // Récupérer tous les outils disponibles depuis Firestore
  const availableTools = useTools();

  const handleSave = async () => {
    try {
      await updatePhase(procedureId, phase.id, {
        title,
        phaseNumber,
        description,
        difficulty,
        estimatedTime,
        steps,
        images,
      });
      toast.success('Phase mise à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // Auto-save
  const { isSaving, lastSaved } = useAutoSave(
    {
      onSave: async () => {
        await updatePhase(procedureId, phase.id, {
          title,
          phaseNumber,
          description,
          difficulty,
          estimatedTime,
          steps,
          images,
        });
      },
      delay: 600000, // 10 minutes (600000 ms)
      enabled: true,
    },
    [title, phaseNumber, description, difficulty, estimatedTime, steps, images]
  );

  const handleSaveAnnotations = (imageId: string, annotations: Annotation[], description: string) => {
    setImages(images.map(img =>
      img.imageId === imageId
        ? { ...img, annotations, description }
        : img
    ));
    setEditingImageId(null);
  };

  const handleSaveAsTemplate = async () => {
    const templateName = prompt('Nom du template:', title || 'Mon template');
    if (!templateName) return;

    const category = prompt('Catégorie du template:', 'Général') || 'Général';

    try {
      // Créer une phase temporaire avec les données actuelles
      const currentPhase: Phase = {
        ...phase,
        title,
        phaseNumber,
        description,
        difficulty,
        estimatedTime,
        steps,
        images,
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
      order: steps.length + 1,
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
    setSteps(steps.filter(s => s.id !== id));
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

  // Gestion des conseils et sécurité au niveau des sous-étapes
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

  const updateStepTool = (stepId: string, tool: Tool | null) => {
    setSteps(steps.map(s =>
      s.id === stepId
        ? { ...s, toolId: tool?.id, tool: tool || undefined }
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
      {/* Header - Collapsed View */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-800/30 rounded-t-lg"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1 flex items-center gap-3">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Phase {phaseNumber}</span>
          <span className="font-semibold text-gray-900 dark:text-white">{phase.title}</span>
          <Badge className={`${getDifficultyColor(phase.difficulty)} text-white text-xs`}>
            {getDifficultyLabel(phase.difficulty)}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
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

      {/* Expanded View - Editor */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          {/* Tabs */}
          <div className="flex overflow-x-auto border-b border-gray-700/50 bg-gray-900/50">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'info'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Package className="h-4 w-4 inline mr-2" />
              Informations
            </button>
            <button
              onClick={() => setActiveTab('steps')}
              className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'steps'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <List className="h-4 w-4 inline mr-2" />
              Sous-étapes ({steps.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-4 space-y-4">
            {activeTab === 'info' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Numéro de phase
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={phaseNumber}
                    onChange={(e) => setPhaseNumber(parseInt(e.target.value) || 1)}
                    placeholder="Numéro de phase..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Titre de la phase *
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Nom de la phase..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description détaillée de la phase..."
                    rows={4}
                    className="w-full rounded-md border border-gray-700/30 bg-transparent px-3 py-2 text-sm text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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

              </>
            )}


            {activeTab === 'steps' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                    Sous-étapes détaillées
                  </label>
                  <div className="space-y-6">
                    {steps.map((step, idx) => (
                      <div key={step.id} className="p-6 bg-transparent rounded-xl border border-gray-700/30 hover:border-gray-600/50 transition-all">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-sm font-bold">
                            {idx + 1}
                          </span>
                          <Input
                            value={step.title}
                            onChange={(e) => updateStep(step.id, { title: e.target.value })}
                            placeholder="Titre de la sous-étape..."
                            className="flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeStep(step.id)}
                            className="hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600"
                          >
                            <X className="h-5 w-5" />
                          </Button>
                        </div>
                        <textarea
                          value={step.description}
                          onChange={(e) => updateStep(step.id, { description: e.target.value })}
                          placeholder="Description détaillée de cette sous-étape..."
                          rows={3}
                          className="w-full rounded-lg border border-gray-700/30 bg-transparent px-4 py-3 text-sm text-white mb-4 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        />

                        {/* Step Images */}
                        <div className="mt-2">
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Images de l'étape
                          </label>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {(step.images || []).map((img) => (
                              <div key={img.imageId} className="relative group">
                                <img
                                  src={URL.createObjectURL(img.image.blob)}
                                  alt={img.description || 'Image'}
                                  className="h-20 w-20 object-cover rounded border border-gray-300 dark:border-gray-600"
                                />
                                <button
                                  onClick={() => removeStepImage(step.id, img.imageId)}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-3 w-3" />
                                </button>
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
                                const validImages: AnnotatedImage[] = [];

                                for (const file of files) {
                                  // Vérifier la taille (15 MB max)
                                  if (file.size > 15 * 1024 * 1024) {
                                    toast.error(`${file.name} est trop volumineux (max 15 MB)`);
                                    continue;
                                  }

                                  const img = new Image();
                                  const url = URL.createObjectURL(file);
                                  await new Promise((resolve) => {
                                    img.onload = resolve;
                                    img.src = url;
                                  });
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
                                      updatedAt: new Date()
                                    },
                                    annotations: [],
                                    description: ''
                                  });
                                }

                                if (validImages.length > 0) {
                                  addStepImage(step.id, validImages);
                                }
                              };
                              input.click();
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={async (e) => {
                              e.preventDefault();
                              const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                              const validImages: AnnotatedImage[] = [];

                              for (const file of files) {
                                // Vérifier la taille (15 MB max)
                                if (file.size > 15 * 1024 * 1024) {
                                  toast.error(`${file.name} est trop volumineux (max 15 MB)`);
                                  continue;
                                }

                                const img = new Image();
                                const url = URL.createObjectURL(file);
                                await new Promise((resolve) => {
                                  img.onload = resolve;
                                  img.src = url;
                                });
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
                                    updatedAt: new Date()
                                  },
                                  annotations: [],
                                  description: ''
                                });
                              }

                              if (validImages.length > 0) {
                                addStepImage(step.id, validImages);
                              }
                            }}
                            className="border-2 border-dashed border-gray-700/30 rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                          >
                            <p className="text-sm text-gray-400">Cliquez ou glissez-déposez des images ici</p>
                          </div>
                        </div>

                        {/* Outil pour cette sous-étape */}
                        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            <Wrench className="h-4 w-4 inline mr-2" />
                            Outil requis (optionnel)
                          </label>
                          {step.tool ? (
                            <div className="flex items-center justify-between p-4 bg-transparent rounded-lg border border-gray-700/30">
                              <div className="flex items-center gap-3">
                                <Wrench className="h-5 w-5 text-primary" />
                                <div>
                                  <div className="text-sm font-semibold text-gray-900 dark:text-white">{step.tool.name}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">{step.tool.category}</div>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => updateStepTool(step.id, null)}
                                className="hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <select
                              value={step.toolId || ''}
                              onChange={(e) => {
                                const toolId = e.target.value;
                                const tool = availableTools?.find(t => t.id === toolId);
                                updateStepTool(step.id, tool || null);
                              }}
                              className="w-full rounded-lg border border-gray-700/30 bg-transparent px-4 py-3 text-sm font-medium text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            >
                              <option value="">Aucun outil</option>
                              {availableTools?.map(tool => (
                                <option key={tool.id} value={tool.id}>{tool.name}</option>
                              ))}
                            </select>
                          )}
                        </div>

                        {/* Conseils pour cette sous-étape */}
                        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            <Lightbulb className="h-4 w-4 inline mr-2 text-yellow-500" />
                            Conseils pratiques
                          </label>
                          <div className="space-y-3">
                            {(step.tips || []).map((tip, tipIdx) => (
                              <div key={tipIdx} className="flex gap-2">
                                <Input
                                  value={tip}
                                  onChange={(e) => updateStepTip(step.id, tipIdx, e.target.value)}
                                  placeholder="Conseil..."
                                  className="text-sm"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeStepTip(step.id, tipIdx)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => addStepTip(step.id)}
                              className="mt-1"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Ajouter un conseil
                            </Button>
                          </div>
                        </div>

                        {/* Consignes de sécurité pour cette sous-étape */}
                        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            <AlertTriangle className="h-4 w-4 inline mr-2 text-orange-500" />
                            Consignes de sécurité
                          </label>
                          <div className="space-y-3">
                            {(step.safetyNotes || []).map((note) => (
                              <div key={note.id} className="p-4 bg-transparent border-2 border-orange-500/30 rounded-lg">
                                <div className="flex gap-3 items-start mb-3">
                                  <select
                                    value={note.type}
                                    onChange={(e) => updateStepSafetyNote(step.id, note.id, { type: e.target.value as any })}
                                    className="rounded-md border border-orange-500/30 bg-transparent px-3 py-2 text-sm font-medium text-white"
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
                                    onClick={() => removeStepSafetyNote(step.id, note.id)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                                <Input
                                  value={note.content}
                                  onChange={(e) => updateStepSafetyNote(step.id, note.id, { content: e.target.value })}
                                  placeholder="Consigne de sécurité..."
                                  className="text-sm"
                                />
                              </div>
                            ))}
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => addStepSafetyNote(step.id)}
                              className="mt-1"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Ajouter une consigne
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="secondary"
                      onClick={addStep}
                      className="w-full mt-4 py-6 border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Ajouter une sous-étape
                    </Button>
                  </div>
                </div>

              </>
            )}
          </div>

          {/* Image Annotator Modal */}
          {editingImageId && (
            <ImageAnnotator
              annotatedImage={images.find(img => img.imageId === editingImageId)!}
              tools={phase.tools || []}
              onSave={(annotations, description) => handleSaveAnnotations(editingImageId, annotations, description)}
              onCancel={() => setEditingImageId(null)}
            />
          )}


          {/* Footer Actions */}
          <div className="flex justify-between gap-2 p-4 bg-gray-900/50 border-t border-gray-700/50">
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" onClick={handleSaveAsTemplate}>
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder comme template
              </Button>
              {/* Auto-save indicator */}
              {isSaving ? (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Cloud className="h-4 w-4 animate-pulse" />
                  <span>Sauvegarde...</span>
                </div>
              ) : lastSaved ? (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Cloud className="h-4 w-4 text-green-500" />
                  <span>Sauvegardé</span>
                </div>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setIsExpanded(false)}>
                Annuler
              </Button>
              <Button onClick={handleSave}>
                <Plus className="h-4 w-4 mr-2" />
                Enregistrer les modifications
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
