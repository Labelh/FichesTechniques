import { useState } from 'react';
import { X, Plus, FileText, Clock, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { applyPhaseTemplate } from '@/services/templateService';
import { toast } from 'sonner';

interface PhaseTemplateSelectorProps {
  procedureId: string;
  onClose: () => void;
  onAddBlank: () => void;
}

export default function PhaseTemplateSelector({
  procedureId,
  onClose,
  onAddBlank,
}: PhaseTemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Récupérer tous les templates
  const templates = useLiveQuery(() => db.templates.toArray(), []);

  // Catégories disponibles
  const categories = ['all', ...(templates ? Array.from(new Set(templates.map(t => t.category))) : [])];

  const filteredTemplates = templates?.filter(
    t => selectedCategory === 'all' || t.category === selectedCategory
  ) || [];

  const handleSelectTemplate = async (templateId: string) => {
    try {
      await applyPhaseTemplate(templateId, procedureId);
      toast.success('Template appliqué avec succès');
      onClose();
    } catch (error) {
      console.error('Error applying template:', error);
      toast.error('Erreur lors de l\'application du template');
    }
  };

  const handleAddBlank = () => {
    onAddBlank();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Ajouter une phase</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Choisissez un template ou créez une phase vierge
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Category Filter */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex gap-2 overflow-x-auto">
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option: Blank Phase */}
            <button
              onClick={handleAddBlank}
              className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary dark:hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg group-hover:bg-primary/10 transition-colors">
                  <Plus className="h-6 w-6 text-gray-600 dark:text-gray-400 group-hover:text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Phase vierge
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Créer une nouvelle phase sans template
                  </p>
                </div>
              </div>
            </button>

            {/* Templates */}
            {filteredTemplates.map((template) => {
              const totalTools = template.defaultTools?.length || 0;
              const totalTime = template.defaultPhases.reduce(
                (sum, phase) => sum + (phase.estimatedTime || 0),
                0
              );

              return (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template.id)}
                  className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary dark:hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {template.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                        {template.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
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
                      {template.usageCount && template.usageCount > 0 && (
                        <div className="mt-2 text-xs text-gray-400">
                          Utilisé {template.usageCount} fois
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                Aucun template disponible dans cette catégorie
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Créez un template en sauvegardant une phase existante
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Astuce : Vous pouvez sauvegarder n'importe quelle phase comme template pour la réutiliser
          </p>
        </div>
      </div>
    </div>
  );
}
