import { useState } from 'react';
import {
  Wrench,
  Plus,
  Search,
  Download,
  Upload,
  Trash2,
  Edit,
  DollarSign,
  ExternalLink
} from 'lucide-react';
import { db } from '../db/database';
import { Tool } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { toast } from 'sonner';
import { useLiveQuery } from 'dexie-react-hooks';
import * as XLSX from 'xlsx';

export default function ToolsLibrary() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Récupération des outils depuis la DB
  const tools = useLiveQuery(
    () => db.tools.toArray(),
    []
  );

  // Filtrage des outils
  const filteredTools = tools?.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tool.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;

    return matchesSearch && matchesCategory;
  }) || [];

  // Récupération des catégories uniques
  const categories = Array.from(new Set(tools?.map(t => t.category) || []));

  const handleDeleteTool = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet outil ?')) return;

    try {
      await db.tools.delete(id);
      toast.success('Outil supprimé avec succès');
    } catch (error) {
      console.error('Error deleting tool:', error);
      toast.error('Erreur lors de la suppression de l\'outil');
    }
  };


  const handleImportJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      let imported = 0;
      const toolsToImport = Array.isArray(data) ? data : [data];

      for (const toolData of toolsToImport) {
        await db.tools.add({
          id: crypto.randomUUID(),
          name: toolData.name || 'Outil sans nom',
          description: toolData.description || '',
          category: toolData.category || 'Autre',
          reference: toolData.reference,
          location: toolData.location,
          price: toolData.price,
          purchaseLink: toolData.purchaseLink,
          alternatives: toolData.alternatives || [],
          consumables: toolData.consumables || [],
          createdAt: new Date(),
          updatedAt: new Date()
        });
        imported++;
      }

      toast.success(`${imported} outil(s) importé(s) avec succès`);
      setImportDialogOpen(false);
    } catch (error) {
      console.error('Error importing tools:', error);
      toast.error('Erreur lors de l\'importation. Vérifiez le format du fichier.');
    }
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      // Prendre la première feuille
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Convertir en JSON avec en-têtes de colonnes A-Z
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 'A' });

      let imported = 0;
      let skipped = 0;

      // Ignorer la première ligne si c'est un en-tête
      const startIndex = 1;

      for (let i = startIndex; i < data.length; i++) {
        const row = data[i] as any;

        // Colonnes selon le format demandé:
        // A: Référence, B: Désignation, C: Catégorie, G: Emplacement
        const reference = row['A'] ? String(row['A']).trim() : '';
        const designation = row['B'] ? String(row['B']).trim() : '';
        const category = row['C'] ? String(row['C']).trim() : 'Autre';
        const location = row['G'] ? String(row['G']).trim() : '';

        // Vérifier que la désignation existe au minimum
        if (!designation) {
          skipped++;
          continue;
        }

        await db.tools.add({
          id: crypto.randomUUID(),
          name: designation,
          description: '',
          category: category,
          reference: reference,
          location: location,
          alternatives: [],
          consumables: [],
          createdAt: new Date(),
          updatedAt: new Date()
        });
        imported++;
      }

      const message = skipped > 0
        ? `${imported} outil(s) importé(s), ${skipped} ligne(s) ignorée(s)`
        : `${imported} outil(s) importé(s) avec succès`;

      toast.success(message);
      setImportDialogOpen(false);
    } catch (error) {
      console.error('Error importing Excel:', error);
      toast.error('Erreur lors de l\'importation Excel. Vérifiez le format du fichier.');
    }
  };

  const handleExportJSON = () => {
    if (!tools || tools.length === 0) {
      toast.error('Aucun outil à exporter');
      return;
    }

    const dataStr = JSON.stringify(tools, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `outils-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Outils exportés avec succès');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Bibliothèque d'outils
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Gérez vos outils et équipements - {filteredTools.length} outil{filteredTools.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setImportDialogOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Importer
          </Button>
          <Button
            variant="secondary"
            onClick={handleExportJSON}
          >
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
          <Button onClick={() => {
            setEditingTool(null);
            setIsAddDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un outil
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-900/30 rounded-lg border border-gray-700/50 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher un outil..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent text-gray-900 dark:text-white"
          >
            <option value="all">Toutes les catégories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tools Grid */}
      {filteredTools.length === 0 ? (
        <div className="text-center py-12 bg-gray-900/30 rounded-lg border border-gray-700/50">
          <Wrench className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchTerm || selectedCategory !== 'all'
              ? 'Aucun outil trouvé'
              : 'Aucun outil dans votre bibliothèque'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchTerm || selectedCategory !== 'all'
              ? 'Essayez de modifier vos filtres'
              : 'Commencez par ajouter votre premier outil'}
          </p>
          {!searchTerm && selectedCategory === 'all' && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un outil
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTools.map((tool) => (
            <div
              key={tool.id}
              className="bg-gray-900/30 rounded-lg border border-gray-700/50 p-4 hover:shadow-lg transition-shadow"
            >
              {/* Header: Référence (gauche) et Emplacement (droite) avec boutons d'action */}
              <div className="flex justify-between items-start mb-2">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {tool.reference || 'Sans référence'}
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {tool.location || ''}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingTool(tool);
                        setIsAddDialogOpen(true);
                      }}
                      className="p-1 text-gray-400 hover:text-primary transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTool(tool.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Désignation */}
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                {tool.name}
              </h3>

              {/* Catégorie */}
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 mb-3">
                {tool.category}
              </span>

              {/* Description */}
              {tool.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2 mt-2">
                  {tool.description}
                </p>
              )}

              {/* Prix */}
              {tool.price && (
                <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <DollarSign className="h-4 w-4" />
                  {tool.price} €
                </div>
              )}

              {/* Lien d'achat */}
              {tool.purchaseLink && (
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => window.open(tool.purchaseLink, '_blank')}
                    className="w-full"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Lien d'achat
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Import Dialog */}
      {importDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900/30 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              Importer des outils
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Excel Import */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Depuis Excel (.xlsx, .xls)
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Format attendu:
                </p>
                <div className="text-xs bg-gray-100 dark:bg-gray-700 p-3 rounded">
                  <ul className="space-y-1">
                    <li><strong>Colonne A:</strong> Référence</li>
                    <li><strong>Colonne B:</strong> Désignation (nom)</li>
                    <li><strong>Colonne C:</strong> Catégorie</li>
                    <li><strong>Colonne G:</strong> Emplacement</li>
                  </ul>
                </div>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  <Upload className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                  <label className="cursor-pointer">
                    <span className="text-primary hover:text-primary/80 font-medium text-sm">
                      Choisir un fichier Excel
                    </span>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleImportExcel}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* JSON Import */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Depuis JSON
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Fichier JSON avec propriétés: name, description, category, reference, location, price, purchaseLink
                </p>
                <div className="text-xs bg-gray-100 dark:bg-gray-700 p-3 rounded">
                  <strong>Exemple:</strong>
                  <pre className="mt-1 overflow-x-auto">
{`[{
  "name": "Perceuse",
  "reference": "REF-001",
  "category": "Électro",
  "location": "Atelier A"
}]`}
                  </pre>
                </div>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  <Upload className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                  <label className="cursor-pointer">
                    <span className="text-primary hover:text-primary/80 font-medium text-sm">
                      Choisir un fichier JSON
                    </span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportJSON}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                variant="secondary"
                onClick={() => setImportDialogOpen(false)}
                className="flex-1"
              >
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Tool Dialog */}
      {isAddDialogOpen && (
        <AddEditToolDialog
          tool={editingTool}
          onClose={() => {
            setIsAddDialogOpen(false);
            setEditingTool(null);
          }}
        />
      )}
    </div>
  );
}

// Composant pour ajouter/modifier un outil
function AddEditToolDialog({
  tool,
  onClose
}: {
  tool: Tool | null;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: tool?.name || '',
    description: tool?.description || '',
    category: tool?.category || '',
    reference: tool?.reference || '',
    location: tool?.location || '',
    price: tool?.price || undefined,
    purchaseLink: tool?.purchaseLink || '',
    color: tool?.color || '#ff5722',
  });

  const toolColors = [
    { name: 'Rouge', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Orange-rouge', value: '#ff5722' },
    { name: 'Jaune', value: '#eab308' },
    { name: 'Vert', value: '#22c55e' },
    { name: 'Bleu', value: '#3b82f6' },
    { name: 'Violet', value: '#a855f7' },
    { name: 'Rose', value: '#ec4899' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Lime', value: '#84cc16' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Le nom de l\'outil est requis');
      return;
    }

    try {
      if (tool) {
        // Update existing tool
        await db.tools.update(tool.id, {
          ...formData,
          updatedAt: new Date()
        });
        toast.success('Outil modifié avec succès');
      } else {
        // Create new tool
        await db.tools.add({
          id: crypto.randomUUID(),
          ...formData,
          alternatives: [],
          consumables: [],
          createdAt: new Date(),
          updatedAt: new Date()
        });
        toast.success('Outil ajouté avec succès');
      }
      onClose();
    } catch (error) {
      console.error('Error saving tool:', error);
      toast.error('Erreur lors de l\'enregistrement de l\'outil');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900/30 rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          {tool ? 'Modifier l\'outil' : 'Ajouter un outil'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Référence
            </label>
            <Input
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              placeholder="Ex: REF-001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Désignation (Nom de l'outil) *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Perceuse sans fil"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Catégorie
            </label>
            <Input
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="Ex: Électroportatif"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Emplacement
            </label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Ex: Atelier A - Étagère 2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description de l'outil..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Prix (€)
            </label>
            <Input
              type="number"
              step="0.01"
              value={formData.price || ''}
              onChange={(e) => setFormData({ ...formData, price: e.target.value ? parseFloat(e.target.value) : undefined })}
              placeholder="89.99"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Lien d'achat
            </label>
            <Input
              type="url"
              value={formData.purchaseLink}
              onChange={(e) => setFormData({ ...formData, purchaseLink: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Couleur de code
            </label>
            <div className="grid grid-cols-5 gap-2">
              {toolColors.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: color.value })}
                  className={`h-10 rounded-md border-2 transition-all ${
                    formData.color === color.value
                      ? 'border-primary scale-110'
                      : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Cette couleur sera utilisée pour tracer les trajectoires d'outil sur les photos
            </p>
          </div>

          <div className="flex gap-2 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button type="submit" className="flex-1">
              {tool ? 'Modifier' : 'Ajouter'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
