import { useState, useEffect } from 'react';
import { FolderKanban, Trash2, FileText, Clock, Wrench, Search, Plus, Edit2, Layers } from 'lucide-react';
import { getAllPhaseTemplates, deletePhaseTemplate, getAllSubStepTemplates, deleteSubStepTemplate } from '@/services/templateService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import type { ProcedureTemplate, SubStepTemplate } from '@/types';
import TemplateEditor from '@/components/templates/TemplateEditor';

type TabType = 'phases' | 'substeps';

export default function Templates() {
  const [activeTab, setActiveTab] = useState<TabType>('phases');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [templates, setTemplates] = useState<ProcedureTemplate[]>([]);
  const [subStepTemplates, setSubStepTemplates] = useState<SubStepTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<ProcedureTemplate | null>(null);

  // Récupérer tous les templates depuis Firestore
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const [phaseData, subStepData] = await Promise.all([
          getAllPhaseTemplates(),
          getAllSubStepTemplates(),
        ]);
        setTemplates(phaseData);
        setSubStepTemplates(subStepData);
      } catch (error) {
        console.error('Error fetching templates:', error);
        toast.error('Erreur lors du chargement des templates');
      }
    };
    fetchTemplates();
  }, []);

  // Reset filtres quand on change de tab
  useEffect(() => {
    setSearchTerm('');
    setSelectedCategory('all');
  }, [activeTab]);

  // Catégories disponibles (selon le tab actif)
  const categories = activeTab === 'phases'
    ? ['all', ...(templates ? Array.from(new Set(templates.map(t => t.category))) : [])]
    : ['all', ...Array.from(new Set(subStepTemplates.map(t => t.category)))];

  // Filtrer les templates de phases
  const filteredTemplates = templates?.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }) || [];

  // Filtrer les templates de sous-étapes
  const filteredSubStepTemplates = subStepTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (template.subStep.title || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const refreshTemplates = async () => {
    try {
      const [phaseData, subStepData] = await Promise.all([
        getAllPhaseTemplates(),
        getAllSubStepTemplates(),
      ]);
      setTemplates(phaseData);
      setSubStepTemplates(subStepData);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleDeleteTemplate = async (templateId: string, templateName: string) => {
    if (!confirm(`Supprimer le template "${templateName}" ?`)) return;

    try {
      await deletePhaseTemplate(templateId);
      toast.success('Template supprimé avec succès');
      await refreshTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Erreur lors de la suppression du template');
    }
  };

  const handleDeleteSubStepTemplate = async (templateId: string, templateName: string) => {
    if (!confirm(`Supprimer le template "${templateName}" ?`)) return;

    try {
      await deleteSubStepTemplate(templateId);
      toast.success('Template supprimé avec succès');
      await refreshTemplates();
    } catch (error) {
      console.error('Error deleting substep template:', error);
      toast.error('Erreur lors de la suppression du template');
    }
  };

  const currentCount = activeTab === 'phases' ? filteredTemplates.length : filteredSubStepTemplates.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Templates
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Gérez vos modèles réutilisables - {currentCount} template{currentCount > 1 ? 's' : ''}
          </p>
        </div>
        <Button
          onClick={() => toast.info(
            activeTab === 'phases'
              ? 'Créez un template en sauvegardant une phase lors de l\'édition d\'une procédure'
              : 'Créez un template en cliquant sur l\'icône de sauvegarde d\'une sous-étape lors de l\'édition d\'une procédure'
          )}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Créer un template
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#1a1a1a] rounded-lg p-1 border border-[#323232]">
        <button
          onClick={() => setActiveTab('phases')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'phases'
              ? 'bg-primary text-white'
              : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
          }`}
        >
          <Layers className="h-4 w-4" />
          Phases
          {templates.length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === 'phases' ? 'bg-white/20' : 'bg-[#323232]'
            }`}>
              {templates.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('substeps')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'substeps'
              ? 'bg-primary text-white'
              : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
          }`}
        >
          <FileText className="h-4 w-4" />
          Sous-étapes
          {subStepTemplates.length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === 'substeps' ? 'bg-white/20' : 'bg-[#323232]'
            }`}>
              {subStepTemplates.length}
            </span>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-[#2a2a2a] rounded-lg border border-[#323232] p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher un template..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {category === 'all' ? 'Tous' : category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* === TAB: PHASES === */}
      {activeTab === 'phases' && (
        <>
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12 bg-[#2a2a2a] rounded-lg border border-[#323232]">
              <FolderKanban className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchTerm || selectedCategory !== 'all'
                  ? 'Aucun template trouvé'
                  : 'Aucun template de phase disponible'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchTerm || selectedCategory !== 'all'
                  ? 'Essayez de modifier vos filtres'
                  : 'Créez un template en sauvegardant une phase lors de l\'édition d\'une procédure'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => {
                const totalTools = template.defaultTools?.length || 0;
                const totalTime = template.defaultPhases.reduce(
                  (sum, phase) => sum + (phase.estimatedTime || 0),
                  0
                );

                return (
                  <div
                    key={template.id}
                    className="bg-[#2a2a2a] rounded-lg border border-[#323232] p-5 hover:border-[#404040] transition-colors"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Layers className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">
                            {template.name}
                          </h3>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                            {template.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                      {template.description || 'Pas de description'}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        <span>{template.defaultPhases.length} phase(s)</span>
                      </div>
                      {totalTime > 0 && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{totalTime} min</span>
                        </div>
                      )}
                      {totalTools > 0 && (
                        <div className="flex items-center gap-1">
                          <Wrench className="h-3 w-3" />
                          <span>{totalTools} outil(s)</span>
                        </div>
                      )}
                    </div>

                    {/* Usage count */}
                    {template.usageCount !== undefined && template.usageCount > 0 && (
                      <div className="mb-4 text-xs text-gray-400 dark:text-gray-500">
                        Utilisé {template.usageCount} fois
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-t border-[#323232]">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingTemplate(template)}
                        className="flex-1"
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Modifier
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteTemplate(template.id, template.name)}
                        className="flex-1 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Supprimer
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* === TAB: SOUS-ÉTAPES === */}
      {activeTab === 'substeps' && (
        <>
          {filteredSubStepTemplates.length === 0 ? (
            <div className="text-center py-12 bg-[#2a2a2a] rounded-lg border border-[#323232]">
              <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchTerm || selectedCategory !== 'all'
                  ? 'Aucun template trouvé'
                  : 'Aucun template de sous-étape disponible'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchTerm || selectedCategory !== 'all'
                  ? 'Essayez de modifier vos filtres'
                  : 'Sauvegardez une sous-étape comme template depuis l\'éditeur de procédure'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSubStepTemplates.map((template) => {
                const toolCount = template.subStep.tools?.length || 0;

                return (
                  <div
                    key={template.id}
                    className="bg-[#2a2a2a] rounded-lg border border-[#323232] p-5 hover:border-[#404040] transition-colors"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                          <FileText className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">
                            {template.name}
                          </h3>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                            {template.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Titre de la sous-étape */}
                    {template.subStep.title && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-1">
                        {template.subStep.title}
                      </p>
                    )}

                    {/* Description preview */}
                    {template.subStep.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 line-clamp-2"
                        dangerouslySetInnerHTML={{
                          __html: template.subStep.description.replace(/<[^>]*>/g, ' ').substring(0, 120)
                        }}
                      />
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
                      {(template.subStep.estimatedTime || 0) > 0 && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{template.subStep.estimatedTime} min</span>
                        </div>
                      )}
                      {toolCount > 0 && (
                        <div className="flex items-center gap-1">
                          <Wrench className="h-3 w-3" />
                          <span>{toolCount} outil(s)</span>
                        </div>
                      )}
                      {(template.subStep.tips?.length || 0) > 0 && (
                        <div className="flex items-center gap-1">
                          <span>💡</span>
                          <span>{template.subStep.tips?.length} conseil(s)</span>
                        </div>
                      )}
                      {(template.subStep.safetyNotes?.length || 0) > 0 && (
                        <div className="flex items-center gap-1">
                          <span>⚠️</span>
                          <span>{template.subStep.safetyNotes?.length} note(s)</span>
                        </div>
                      )}
                    </div>

                    {/* Usage count */}
                    {template.usageCount > 0 && (
                      <div className="mb-4 text-xs text-gray-400 dark:text-gray-500">
                        Utilisé {template.usageCount} fois
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-t border-[#323232]">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteSubStepTemplate(template.id, template.name)}
                        className="flex-1 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Supprimer
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Helper text */}
      {((activeTab === 'phases' && templates.length > 0) || (activeTab === 'substeps' && subStepTemplates.length > 0)) && (
        <div className="bg-background-elevated border border-[#323232] rounded-lg p-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>Astuce :</strong>{' '}
            {activeTab === 'phases'
              ? 'Pour créer un nouveau template de phase, éditez une procédure et sauvegardez l\'une de ses phases en tant que template.'
              : 'Pour créer un nouveau template de sous-étape, cliquez sur l\'icône de sauvegarde dans le header d\'une sous-étape lors de l\'édition d\'une procédure.'}
          </p>
        </div>
      )}

      {/* Éditeur de template */}
      {editingTemplate && (
        <TemplateEditor
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSave={async () => {
            await refreshTemplates();
            setEditingTemplate(null);
          }}
        />
      )}
    </div>
  );
}
