import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import { updateTemplateFirestore, updateSubStepTemplate } from '@/services/templateService';
import type { ProcedureTemplate, SubStepTemplate } from '@/types';

interface TemplateEditorProps {
  template: ProcedureTemplate | SubStepTemplate;
  templateType: 'phase' | 'substep';
  onClose: () => void;
  onSave: () => void;
}

export default function TemplateEditor({ template, templateType, onClose, onSave }: TemplateEditorProps) {
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(
    templateType === 'phase' ? (template as ProcedureTemplate).description : ''
  );
  const [category, setCategory] = useState(template.category);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Le nom est requis');
      return;
    }

    setSaving(true);
    try {
      if (templateType === 'phase') {
        await updateTemplateFirestore(template.id, {
          name: name.trim(),
          description: description.trim(),
          category: category.trim(),
        });
      } else {
        await updateSubStepTemplate(template.id, {
          name: name.trim(),
          category: category.trim(),
        });
      }
      toast.success('Template modifié avec succès');
      onSave();
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Erreur lors de la modification du template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#2a2a2a] rounded-lg max-w-2xl w-full border border-[#323232]">
        {/* Header */}
        <div className="p-6 border-b border-[#323232] flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Modifier le template</h2>
            <p className="text-sm text-gray-400 mt-1">
              Les modifications n'affecteront pas les phases existantes qui utilisent ce template
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Nom *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du template" className="w-full" />
          </div>

          {templateType === 'phase' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description du template..."
                rows={3}
                className="w-full rounded-md border border-[#323232] bg-transparent px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Catégorie</label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex: Peinture, Mécanique..." className="w-full" />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#323232] flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <><span className="animate-spin mr-2">⏳</span>Enregistrement...</>
            ) : (
              <><Save className="h-4 w-4 mr-2" />Enregistrer</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
