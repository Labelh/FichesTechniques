import { useState } from 'react';
import { FolderKanban, Trash2, FileText, Clock, Wrench, Search } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { deletePhaseTemplate } from '@/services/templateService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

export default function Templates() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Récupérer tous les templates
  const templates = useLiveQuery(() => db.templates.toArray(), []);

  // Catégories disponibles
  const categories = ['all', ...(templates ? Array.from(new Set(templates.map(t => t.category))) : [])];

  // Filtrer les templates
  const filteredTemplates = templates?.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }) || [];

  const handleDeleteTemplate = async (templateId: string, templateName: string) => {
    if (!confirm(`Supprimer le template "${templateName}" ?`)) return;

    try {
      await deletePhaseTemplate(templateId);
      toast.success('Template supprimé avec succès');
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Erreur lors de la suppression du template');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Templates de phases
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Gérez vos modèles de phases réutilisables - {filteredTemplates.length} template{filteredTemplates.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-[#2a2a2a] rounded-lg border border-[#3a3a3a] p-4">
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

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12 bg-[#2a2a2a] rounded-lg border border-[#3a3a3a]">
          <FolderKanban className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchTerm || selectedCategory !== 'all'
              ? 'Aucun template trouvé'
              : 'Aucun template disponible'}
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
                className="bg-[#2a2a2a] rounded-lg border border-[#3a3a3a] p-5 hover:shadow-lg transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileText className="h-5 w-5 text-primary" />
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
                <div className="flex gap-2 pt-4 border-t border-[#3a3a3a]">
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

      {/* Helper text */}
      {templates && templates.length > 0 && (
        <div className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>Astuce :</strong> Pour créer un nouveau template, éditez une procédure et sauvegardez l'une de ses phases en tant que template.
          </p>
        </div>
      )}
    </div>
  );
}
