import { useState, useEffect } from 'react';
import { X, Plus, FileText, Clock, Zap, Layers } from 'lucide-react';
import { getAllPhaseTemplates, applyPhaseTemplate } from '@/services/templateService';
import { toast } from 'sonner';
import type { ProcedureTemplate } from '@/types';

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
  const [templates, setTemplates] = useState<ProcedureTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllPhaseTemplates().then(data => {
      setTemplates(data);
      setLoading(false);
    });
  }, []);

  const categories = ['all', ...(templates ? Array.from(new Set(templates.map(t => t.category).filter(Boolean))) : [])];

  const filteredTemplates = templates?.filter(
    t => selectedCategory === 'all' || t.category === selectedCategory
  ) || [];

  const handleSelectTemplate = async (templateId: string) => {
    try {
      await applyPhaseTemplate(templateId, procedureId);
      toast.success('Template appliqué avec succès');
      onClose();
    } catch {
      toast.error('Erreur lors de l\'application du template');
    }
  };

  const handleAddBlank = () => {
    onAddBlank();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#141414] rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-[#252525] shadow-2xl">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/15 border border-primary/20">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-none">Ajouter une phase</h2>
              <p className="text-xs text-gray-500 mt-1">Choisissez un template ou démarrez vide</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-[#252525] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Category Filter */}
        <div className="px-6 pb-3 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === category
                  ? 'bg-primary text-white shadow-sm shadow-primary/30'
                  : 'bg-[#1e1e1e] text-gray-400 hover:text-gray-200 hover:bg-[#252525] border border-[#2a2a2a]'
              }`}
            >
              {category === 'all' ? 'Tous' : category}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="mx-6 border-t border-[#1e1e1e]" />

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              {/* Phase vierge */}
              <button
                onClick={handleAddBlank}
                className="group p-4 border border-dashed border-[#2a2a2a] rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#1e1e1e] group-hover:bg-primary/10 border border-[#2a2a2a] group-hover:border-primary/20 flex items-center justify-center transition-colors">
                    <Plus className="h-4 w-4 text-gray-500 group-hover:text-primary transition-colors" />
                  </div>
                  <span className="font-semibold text-sm text-white">Phase vierge</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed pl-11">
                  Démarrer avec une phase sans contenu prédéfini
                </p>
              </button>

              {/* Templates */}
              {filteredTemplates.map((template) => {
                const totalTime = template.defaultPhases.reduce(
                  (sum, phase) => sum + (phase.estimatedTime || 0), 0
                );
                const usageCount = template.usageCount ?? 0;

                return (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template.id)}
                    className="group p-4 border border-[#1e1e1e] rounded-xl hover:border-primary/40 hover:bg-[#1a1a1a] transition-all text-left"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center mt-0.5">
                        <FileText className="h-4 w-4 text-primary/70" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-sm text-white leading-snug">{template.name}</h3>
                          {usageCount > 0 && (
                            <span className="flex-shrink-0 flex items-center gap-1 text-[10px] text-gray-500 bg-[#1e1e1e] border border-[#2a2a2a] px-1.5 py-0.5 rounded-full">
                              <Zap className="h-2.5 w-2.5" />
                              {usageCount}×
                            </span>
                          )}
                        </div>
                        {template.description && (
                          <p className="text-xs text-gray-500 line-clamp-1 mb-2">{template.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-[10px] text-gray-600">
                          <span className="flex items-center gap-1">
                            <FileText className="h-2.5 w-2.5" />
                            {template.defaultPhases.length} phase{template.defaultPhases.length > 1 ? 's' : ''}
                          </span>
                          {totalTime > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" />
                              {totalTime} min
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {!loading && filteredTemplates.length === 0 && selectedCategory !== 'all' && (
            <div className="text-center py-12">
              <FileText className="h-8 w-8 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Aucun template dans cette catégorie</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#1e1e1e] bg-[#0f0f0f]">
          <p className="text-[11px] text-gray-600 text-center">
            Astuce : vous pouvez enregistrer n'importe quelle phase comme template pour la réutiliser
          </p>
        </div>
      </div>
    </div>
  );
}
