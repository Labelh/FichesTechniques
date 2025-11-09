import { useState } from 'react';
import { Trash2, ChevronDown, ChevronUp, Plus, X, Wrench, Package, List, AlertTriangle, Lightbulb, Image as ImageIcon, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { updatePhase } from '@/services/procedureService';
import { createPhaseTemplate } from '@/services/templateService';
import { db } from '@/db/database';
import type { Phase, DifficultyLevel, Tool, Material, SubStep, SafetyNote, AnnotatedImage, Annotation } from '@/types';
import { toast } from 'sonner';
import { useLiveQuery } from 'dexie-react-hooks';
import ImageUploader from '@/components/phase/ImageUploader';
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
  const [description, setDescription] = useState(phase.description);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(phase.difficulty);
  const [estimatedTime, setEstimatedTime] = useState(phase.estimatedTime);
  const [selectedTools, setSelectedTools] = useState<Tool[]>(phase.tools || []);
  const [materials, setMaterials] = useState<Material[]>(phase.materials || []);
  const [steps, setSteps] = useState<SubStep[]>(phase.steps || []);
  const [safetyNotes, setSafetyNotes] = useState<SafetyNote[]>(phase.safetyNotes || []);
  const [tips, setTips] = useState<string[]>(phase.tips || []);
  const [images, setImages] = useState<AnnotatedImage[]>(phase.images || []);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'tools' | 'materials' | 'steps' | 'safety' | 'photos'>('info');

  // Récupérer tous les outils disponibles
  const availableTools = useLiveQuery(() => db.tools.toArray(), []);

  const handleSave = async () => {
    try {
      await updatePhase(procedureId, phase.id, {
        title,
        description,
        difficulty,
        estimatedTime,
        tools: selectedTools,
        toolIds: selectedTools.map(t => t.id),
        materials,
        steps,
        safetyNotes,
        tips,
        images,
      });
      toast.success('Phase mise à jour');
      setIsExpanded(false);
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

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
        description,
        difficulty,
        estimatedTime,
        tools: selectedTools,
        toolIds: selectedTools.map(t => t.id),
        materials,
        steps,
        safetyNotes,
        tips,
        images,
      };

      await createPhaseTemplate(currentPhase, templateName, category);
      toast.success('Template créé avec succès');
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Erreur lors de la création du template');
    }
  };

  const addTool = (tool: Tool) => {
    if (!selectedTools.find(t => t.id === tool.id)) {
      setSelectedTools([...selectedTools, tool]);
    }
  };

  const removeTool = (toolId: string) => {
    setSelectedTools(selectedTools.filter(t => t.id !== toolId));
  };

  const addMaterial = () => {
    setMaterials([...materials, {
      id: crypto.randomUUID(),
      name: '',
      quantity: 0,
      unit: '',
      category: '',
      createdAt: new Date(),
      updatedAt: new Date()
    }]);
  };

  const updateMaterial = (id: string, updates: Partial<Material>) => {
    setMaterials(materials.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const removeMaterial = (id: string) => {
    setMaterials(materials.filter(m => m.id !== id));
  };

  const addStep = () => {
    setSteps([...steps, {
      id: crypto.randomUUID(),
      order: steps.length + 1,
      title: '',
      description: '',
      estimatedTime: 0
    }]);
  };

  const updateStep = (id: string, updates: Partial<SubStep>) => {
    setSteps(steps.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeStep = (id: string) => {
    setSteps(steps.filter(s => s.id !== id));
  };

  const addSafetyNote = () => {
    setSafetyNotes([...safetyNotes, {
      id: crypto.randomUUID(),
      type: 'warning',
      content: ''
    }]);
  };

  const updateSafetyNote = (id: string, updates: Partial<SafetyNote>) => {
    setSafetyNotes(safetyNotes.map(n => n.id === id ? { ...n, ...updates } : n));
  };

  const removeSafetyNote = (id: string) => {
    setSafetyNotes(safetyNotes.filter(n => n.id !== id));
  };

  const addTip = () => {
    setTips([...tips, '']);
  };

  const updateTip = (index: number, value: string) => {
    const newTips = [...tips];
    newTips[index] = value;
    setTips(newTips);
  };

  const removeTip = (index: number) => {
    setTips(tips.filter((_, i) => i !== index));
  };

  const getDifficultyColor = (diff: DifficultyLevel) => {
    switch (diff) {
      case 'very_easy': return 'bg-green-500';
      case 'easy': return 'bg-blue-500';
      case 'medium': return 'bg-yellow-500';
      case 'hard': return 'bg-orange-500';
      case 'very_hard': return 'bg-red-500';
      case 'expert': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getDifficultyLabel = (diff: DifficultyLevel) => {
    switch (diff) {
      case 'very_easy': return 'Très facile';
      case 'easy': return 'Facile';
      case 'medium': return 'Moyen';
      case 'hard': return 'Difficile';
      case 'very_hard': return 'Très difficile';
      case 'expert': return 'Expert';
      default: return diff;
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
      {/* Header - Collapsed View */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-t-lg"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1 flex items-center gap-3">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Phase {index + 1}</span>
          <span className="font-semibold text-gray-900 dark:text-white">{phase.title}</span>
          <Badge className={`${getDifficultyColor(phase.difficulty)} text-white text-xs`}>
            {getDifficultyLabel(phase.difficulty)}
          </Badge>
          {selectedTools.length > 0 && (
            <Badge variant="outline" className="text-xs">
              <Wrench className="h-3 w-3 mr-1" />
              {selectedTools.length} outil{selectedTools.length > 1 ? 's' : ''}
            </Badge>
          )}
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
          <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'info'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Package className="h-4 w-4 inline mr-2" />
              Informations
            </button>
            <button
              onClick={() => setActiveTab('tools')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'tools'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Wrench className="h-4 w-4 inline mr-2" />
              Outils ({selectedTools.length})
            </button>
            <button
              onClick={() => setActiveTab('materials')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'materials'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Package className="h-4 w-4 inline mr-2" />
              Matériaux ({materials.length})
            </button>
            <button
              onClick={() => setActiveTab('steps')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'steps'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <List className="h-4 w-4 inline mr-2" />
              Étapes ({steps.length})
            </button>
            <button
              onClick={() => setActiveTab('safety')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'safety'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <AlertTriangle className="h-4 w-4 inline mr-2" />
              Sécurité ({safetyNotes.length})
            </button>
            <button
              onClick={() => setActiveTab('photos')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'photos'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <ImageIcon className="h-4 w-4 inline mr-2" />
              Photos ({images.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-4 space-y-4">
            {activeTab === 'info' && (
              <>
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
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
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
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                    >
                      <option value="very_easy">Très facile</option>
                      <option value="easy">Facile</option>
                      <option value="medium">Moyen</option>
                      <option value="hard">Difficile</option>
                      <option value="very_hard">Très difficile</option>
                      <option value="expert">Expert</option>
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

                {/* Conseils */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Lightbulb className="h-4 w-4 inline mr-1" />
                    Conseils
                  </label>
                  <div className="space-y-2">
                    {tips.map((tip, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          value={tip}
                          onChange={(e) => updateTip(idx, e.target.value)}
                          placeholder="Conseil..."
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeTip(idx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addTip}>
                      <Plus className="h-4 w-4 mr-1" />
                      Ajouter un conseil
                    </Button>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'tools' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Outils nécessaires
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Sélectionnez les outils depuis votre bibliothèque
                  </p>

                  {selectedTools.length > 0 && (
                    <div className="mb-4 space-y-2">
                      {selectedTools.map((tool) => (
                        <div key={tool.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <span className="text-sm text-gray-900 dark:text-white">{tool.name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeTool(tool.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 max-h-60 overflow-y-auto">
                    {availableTools && availableTools.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2">
                        {availableTools
                          .filter(t => !selectedTools.find(st => st.id === t.id))
                          .map((tool) => (
                            <button
                              key={tool.id}
                              onClick={() => addTool(tool)}
                              className="flex items-center justify-between p-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                            >
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {tool.name}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {tool.category}
                                </div>
                              </div>
                              <Plus className="h-4 w-4 text-primary" />
                            </button>
                          ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                        Aucun outil dans votre bibliothèque.
                        <br />
                        Ajoutez-en dans la section "Outils".
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'materials' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Matériaux nécessaires
                  </label>
                  <div className="space-y-3">
                    {materials.map((material) => (
                      <div key={material.id} className="flex gap-2 items-start p-3 bg-gray-50 dark:bg-gray-700 rounded">
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <Input
                            value={material.name}
                            onChange={(e) => updateMaterial(material.id, { name: e.target.value })}
                            placeholder="Nom du matériau..."
                          />
                          <Input
                            type="number"
                            value={material.quantity || ''}
                            onChange={(e) => updateMaterial(material.id, { quantity: parseFloat(e.target.value) || 0 })}
                            placeholder="Quantité..."
                          />
                          <Input
                            value={material.unit || ''}
                            onChange={(e) => updateMaterial(material.id, { unit: e.target.value })}
                            placeholder="Unité (kg, m, L...)"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMaterial(material.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addMaterial}>
                      <Plus className="h-4 w-4 mr-1" />
                      Ajouter un matériau
                    </Button>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'steps' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Étapes détaillées
                  </label>
                  <div className="space-y-3">
                    {steps.map((step, idx) => (
                      <div key={step.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold">
                            {idx + 1}
                          </span>
                          <Input
                            value={step.title}
                            onChange={(e) => updateStep(step.id, { title: e.target.value })}
                            placeholder="Titre de l'étape..."
                            className="flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeStep(step.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <textarea
                          value={step.description}
                          onChange={(e) => updateStep(step.id, { description: e.target.value })}
                          placeholder="Description détaillée..."
                          rows={2}
                          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 px-3 py-2 text-sm text-gray-900 dark:text-white"
                        />
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addStep}>
                      <Plus className="h-4 w-4 mr-1" />
                      Ajouter une étape
                    </Button>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'safety' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <AlertTriangle className="h-4 w-4 inline mr-1 text-orange-500" />
                    Consignes de sécurité
                  </label>
                  <div className="space-y-3">
                    {safetyNotes.map((note) => (
                      <div key={note.id} className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded">
                        <div className="flex gap-2 items-start mb-2">
                          <select
                            value={note.type}
                            onChange={(e) => updateSafetyNote(note.id, { type: e.target.value as 'warning' | 'danger' | 'info' | 'mandatory' | 'forbidden' })}
                            className="rounded-md border border-orange-300 dark:border-orange-700 bg-white dark:bg-gray-700 px-2 py-1 text-sm"
                          >
                            <option value="info">ℹ️ Information</option>
                            <option value="warning">⚠️ Attention</option>
                            <option value="danger">🚨 Danger</option>
                            <option value="mandatory">✓ Obligatoire</option>
                            <option value="forbidden">⛔ Interdit</option>
                          </select>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeSafetyNote(note.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <Input
                          value={note.content}
                          onChange={(e) => updateSafetyNote(note.id, { content: e.target.value })}
                          placeholder="Consigne de sécurité..."
                        />
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addSafetyNote}>
                      <Plus className="h-4 w-4 mr-1" />
                      Ajouter une consigne
                    </Button>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'photos' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <ImageIcon className="h-4 w-4 inline mr-1" />
                    Photos de la phase
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Ajoutez des photos et annotez-les pour illustrer la phase (trajectoires d'outils, zones importantes, etc.)
                  </p>
                  <ImageUploader
                    images={images}
                    onImagesChange={setImages}
                    onEditImage={setEditingImageId}
                  />
                </div>
              </>
            )}
          </div>

          {/* Image Annotator Modal */}
          {editingImageId && (
            <ImageAnnotator
              annotatedImage={images.find(img => img.imageId === editingImageId)!}
              tools={selectedTools}
              onSave={(annotations, description) => handleSaveAnnotations(editingImageId, annotations, description)}
              onCancel={() => setEditingImageId(null)}
            />
          )}


          {/* Footer Actions */}
          <div className="flex justify-between gap-2 p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" size="sm" onClick={handleSaveAsTemplate}>
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder comme template
            </Button>
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
