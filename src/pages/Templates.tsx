import { useState, useEffect } from 'react';
import { FolderKanban, FileText, Clock, Wrench, Search, Edit2, Layers, Copy, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import {
  getAllPhaseTemplates,
  deletePhaseTemplate,
  getAllSubStepTemplates,
  deleteSubStepTemplate,
  duplicatePhaseTemplate,
  duplicateSubStepTemplate,
} from '@/services/templateService';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import type { ProcedureTemplate, SubStepTemplate } from '@/types';
import TemplateEditor from '@/components/templates/TemplateEditor';

type TabType = 'phases' | 'substeps';
type SortKey = 'name' | 'date' | 'usage';

function formatDate(date: Date | any): string {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date.seconds ? date.seconds * 1000 : date);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function StatPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 bg-[#1a1a1a] rounded-full text-xs text-gray-400">
      {icon}
      <span>{label}</span>
    </div>
  );
}

export default function Templates() {
  const [activeTab, setActiveTab] = useState<TabType>('phases');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [templates, setTemplates] = useState<ProcedureTemplate[]>([]);
  const [subStepTemplates, setSubStepTemplates] = useState<SubStepTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<{ template: ProcedureTemplate | SubStepTemplate; type: 'phase' | 'substep' } | null>(null);

  useEffect(() => { fetchTemplates(); }, []);
  useEffect(() => { setSearchTerm(''); setSelectedCategory('all'); }, [activeTab]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const [phaseData, subStepData] = await Promise.all([getAllPhaseTemplates(), getAllSubStepTemplates()]);
      setTemplates(phaseData);
      setSubStepTemplates(subStepData);
    } catch {
      toast.error('Erreur lors du chargement des templates');
    } finally {
      setLoading(false);
    }
  };

  const categories = activeTab === 'phases'
    ? ['all', ...Array.from(new Set(templates.map(t => t.category).filter(Boolean)))]
    : ['all', ...Array.from(new Set(subStepTemplates.map(t => t.category).filter(Boolean)))];

  function applySort<T extends { name: string; usageCount: number; createdAt?: any }>(list: T[]): T[] {
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'usage') cmp = (a.usageCount || 0) - (b.usageCount || 0);
      else {
        const da = a.createdAt instanceof Date ? a.createdAt : new Date((a.createdAt?.seconds || 0) * 1000);
        const db = b.createdAt instanceof Date ? b.createdAt : new Date((b.createdAt?.seconds || 0) * 1000);
        cmp = da.getTime() - db.getTime();
      }
      return sortAsc ? cmp : -cmp;
    });
  }

  const filteredTemplates = applySort(templates.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch && (selectedCategory === 'all' || t.category === selectedCategory);
  }));

  const filteredSubStepTemplates = applySort(subStepTemplates.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || (t.subStep.title || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch && (selectedCategory === 'all' || t.category === selectedCategory);
  }));

  const handleDeleteTemplate = async (id: string) => {
    try { await deletePhaseTemplate(id); toast.success('Template supprimé'); setConfirmDeleteId(null); await fetchTemplates(); }
    catch { toast.error('Erreur lors de la suppression'); }
  };
  const handleDeleteSubStepTemplate = async (id: string) => {
    try { await deleteSubStepTemplate(id); toast.success('Template supprimé'); setConfirmDeleteId(null); await fetchTemplates(); }
    catch { toast.error('Erreur lors de la suppression'); }
  };
  const handleDuplicatePhase = async (template: ProcedureTemplate) => {
    try { await duplicatePhaseTemplate(template); toast.success(`"${template.name}" dupliqué`); await fetchTemplates(); }
    catch { toast.error('Erreur lors de la duplication'); }
  };
  const handleDuplicateSubStep = async (template: SubStepTemplate) => {
    try { await duplicateSubStepTemplate(template); toast.success(`"${template.name}" dupliqué`); await fetchTemplates(); }
    catch { toast.error('Erreur lors de la duplication'); }
  };

  const cycleSort = (key: SortKey) => {
    if (sortBy === key) setSortAsc(v => !v);
    else { setSortBy(key); setSortAsc(true); }
  };

  const currentList = activeTab === 'phases' ? filteredTemplates : filteredSubStepTemplates;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Templates</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Chargement…' : `${currentList.length} template${currentList.length !== 1 ? 's' : ''}${searchTerm || selectedCategory !== 'all' ? ' filtrés' : ''}`}
          </p>
        </div>
        {/* Global stats */}
        {!loading && (
          <div className="flex gap-3 text-xs text-gray-500 pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary inline-block" />
              {templates.length} phase{templates.length !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              {subStepTemplates.length} sous-étape{subStepTemplates.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-[#141414] rounded-xl p-1 border border-[#252525]">
        {(['phases', 'substeps'] as TabType[]).map(tab => {
          const isActive = activeTab === tab;
          const count = (tab === 'phases' ? templates : subStepTemplates).length;
          const color = tab === 'phases' ? 'text-primary' : 'text-emerald-400';
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive ? 'bg-[#2a2a2a] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300 hover:bg-[#1e1e1e]'
              }`}
            >
              {tab === 'phases'
                ? <Layers className={`h-4 w-4 ${isActive ? color : ''}`} />
                : <FileText className={`h-4 w-4 ${isActive ? color : ''}`} />}
              {tab === 'phases' ? 'Phases' : 'Sous-étapes'}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  isActive
                    ? (tab === 'phases' ? 'bg-primary/20 text-primary' : 'bg-emerald-500/20 text-emerald-400')
                    : 'bg-[#2a2a2a] text-gray-500'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col gap-3">
        {/* Search + Sort */}
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Rechercher un template…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#1a1a1a] border-[#2a2a2a] focus:border-[#3a3a3a]"
            />
          </div>
          <div className="flex items-center gap-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2 py-1.5">
            {(['name', 'date', 'usage'] as SortKey[]).map(key => (
              <button
                key={key}
                onClick={() => cycleSort(key)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  sortBy === key ? 'bg-[#2e2e2e] text-white' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {key === 'name' ? 'Nom' : key === 'date' ? 'Date' : 'Usage'}
                {sortBy === key && (sortAsc
                  ? <ArrowUp className="h-3 w-3" />
                  : <ArrowDown className="h-3 w-3" />)}
              </button>
            ))}
          </div>
        </div>

        {/* Category pills */}
        {categories.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                  selectedCategory === cat
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-[#2a2a2a] text-gray-500 hover:border-[#3a3a3a] hover:text-gray-300'
                }`}
              >
                {cat === 'all' ? 'Toutes les catégories' : cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-600">
          <div className="w-8 h-8 border-2 border-[#2a2a2a] border-t-primary rounded-full animate-spin" />
          <span className="text-sm">Chargement…</span>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && currentList.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
            {activeTab === 'phases'
              ? <FolderKanban className="h-8 w-8 text-gray-600" />
              : <FileText className="h-8 w-8 text-gray-600" />}
          </div>
          <div className="text-center">
            <p className="text-gray-400 font-medium">
              {searchTerm || selectedCategory !== 'all' ? 'Aucun résultat' : `Aucun template de ${activeTab === 'phases' ? 'phase' : 'sous-étape'}`}
            </p>
            <p className="text-gray-600 text-sm mt-1">
              {searchTerm || selectedCategory !== 'all'
                ? 'Modifiez vos filtres'
                : 'Sauvegardez depuis l\'éditeur de procédure'}
            </p>
          </div>
        </div>
      )}

      {/* ── Grid ── */}
      {!loading && currentList.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* PHASE CARDS */}
          {activeTab === 'phases' && filteredTemplates.map(template => {
            const totalTime = template.defaultPhases.reduce((s, p) => s + (p.estimatedTime || 0), 0);
            const isConfirming = confirmDeleteId === template.id;
            return (
              <div
                key={template.id}
                className="group relative bg-[#1c1c1c] rounded-xl border border-[#272727] hover:border-[#353535] transition-all duration-200 flex flex-col overflow-hidden"
              >
                {/* Accent top bar */}
                <div className="h-0.5 w-full bg-gradient-to-r from-primary/60 to-primary/20" />

                <div className="p-5 flex flex-col flex-1">
                  {/* Title row */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Layers className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white text-sm leading-snug line-clamp-2">{template.name}</h3>
                      {template.category && (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#252525] text-gray-400 border border-[#303030]">
                          {template.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {template.description && (
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">{template.description}</p>
                  )}

                  {/* Stats */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <StatPill icon={<FileText className="h-3 w-3" />} label={`${template.defaultPhases.length} phase${template.defaultPhases.length !== 1 ? 's' : ''}`} />
                    {totalTime > 0 && <StatPill icon={<Clock className="h-3 w-3" />} label={`${totalTime} min`} />}
                    {(template.defaultTools?.length || 0) > 0 && <StatPill icon={<Wrench className="h-3 w-3" />} label={`${template.defaultTools?.length} outil${(template.defaultTools?.length || 0) > 1 ? 's' : ''}`} />}
                    {(template.usageCount || 0) > 0 && <StatPill icon={<span className="text-[10px]">×</span>} label={`Utilisé ${template.usageCount}`} />}
                  </div>

                  {/* Date */}
                  <p className="text-[10px] text-gray-600 mb-4">Créé le {formatDate(template.createdAt)}</p>

                  {/* Actions */}
                  <div className="mt-auto pt-3 border-t border-[#252525]">
                    {isConfirming ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-400 flex-1">Supprimer définitivement ?</span>
                        <button onClick={() => handleDeleteTemplate(template.id)}
                          className="text-xs px-3 py-1 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">Oui</button>
                        <button onClick={() => setConfirmDeleteId(null)}
                          className="text-xs px-3 py-1 rounded-md bg-[#252525] text-gray-400 hover:bg-[#2e2e2e] transition-colors">Non</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditingTemplate({ template, type: 'phase' })}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs text-gray-400 hover:text-white hover:bg-[#252525] transition-colors">
                          <Edit2 className="h-3 w-3" />Modifier
                        </button>
                        <button onClick={() => handleDuplicatePhase(template)} title="Dupliquer"
                          className="p-1.5 rounded-md text-gray-600 hover:text-gray-300 hover:bg-[#252525] transition-colors">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setConfirmDeleteId(template.id)} title="Supprimer"
                          className="p-1.5 rounded-md text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* SUBSTEP CARDS */}
          {activeTab === 'substeps' && filteredSubStepTemplates.map(template => {
            const isConfirming = confirmDeleteId === template.id;
            return (
              <div
                key={template.id}
                className="group relative bg-[#1c1c1c] rounded-xl border border-[#272727] hover:border-[#353535] transition-all duration-200 flex flex-col overflow-hidden"
              >
                {/* Accent top bar */}
                <div className="h-0.5 w-full bg-gradient-to-r from-emerald-500/60 to-emerald-500/10" />

                <div className="p-5 flex flex-col flex-1">
                  {/* Title row */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white text-sm leading-snug line-clamp-2">{template.name}</h3>
                      {template.category && (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#252525] text-gray-400 border border-[#303030]">
                          {template.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sous-étape title */}
                  {template.subStep.title && (
                    <p className="text-xs text-gray-300 font-medium mb-1 line-clamp-1">{template.subStep.title}</p>
                  )}
                  {template.subStep.description && (
                    <p className="text-xs text-gray-600 mb-3 line-clamp-2 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: template.subStep.description.replace(/<[^>]*>/g, ' ').substring(0, 120) }}
                    />
                  )}

                  {/* Stats */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {(template.subStep.estimatedTime || 0) > 0 && <StatPill icon={<Clock className="h-3 w-3" />} label={`${template.subStep.estimatedTime} min`} />}
                    {(template.subStep.tools?.length || 0) > 0 && <StatPill icon={<Wrench className="h-3 w-3" />} label={`${template.subStep.tools?.length} outil${(template.subStep.tools?.length || 0) > 1 ? 's' : ''}`} />}
                    {(template.subStep.tips?.length || 0) > 0 && <StatPill icon={<span className="text-[10px]">💡</span>} label={`${template.subStep.tips?.length}`} />}
                    {(template.subStep.safetyNotes?.length || 0) > 0 && <StatPill icon={<span className="text-[10px]">⚠️</span>} label={`${template.subStep.safetyNotes?.length}`} />}
                    {template.usageCount > 0 && <StatPill icon={<span className="text-[10px]">×</span>} label={`Utilisé ${template.usageCount}`} />}
                  </div>

                  {/* Date */}
                  <p className="text-[10px] text-gray-600 mb-4">Créé le {formatDate(template.createdAt)}</p>

                  {/* Actions */}
                  <div className="mt-auto pt-3 border-t border-[#252525]">
                    {isConfirming ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-400 flex-1">Supprimer définitivement ?</span>
                        <button onClick={() => handleDeleteSubStepTemplate(template.id)}
                          className="text-xs px-3 py-1 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">Oui</button>
                        <button onClick={() => setConfirmDeleteId(null)}
                          className="text-xs px-3 py-1 rounded-md bg-[#252525] text-gray-400 hover:bg-[#2e2e2e] transition-colors">Non</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditingTemplate({ template, type: 'substep' })}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs text-gray-400 hover:text-white hover:bg-[#252525] transition-colors">
                          <Edit2 className="h-3 w-3" />Modifier
                        </button>
                        <button onClick={() => handleDuplicateSubStep(template)} title="Dupliquer"
                          className="p-1.5 rounded-md text-gray-600 hover:text-gray-300 hover:bg-[#252525] transition-colors">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setConfirmDeleteId(template.id)} title="Supprimer"
                          className="p-1.5 rounded-md text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

        </div>
      )}

      {/* Éditeur */}
      {editingTemplate && (
        <TemplateEditor
          template={editingTemplate.template}
          templateType={editingTemplate.type}
          onClose={() => setEditingTemplate(null)}
          onSave={async () => { await fetchTemplates(); setEditingTemplate(null); }}
        />
      )}
    </div>
  );
}
