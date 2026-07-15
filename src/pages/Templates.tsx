import { useState, useEffect, useRef } from 'react';
import { FolderKanban, FileText, Clock, Wrench, Search, Edit2, Layers, Copy, Trash2, ArrowUp, ArrowDown, BookOpen, Check, X } from 'lucide-react';
import {
  getAllPhaseTemplates,
  deletePhaseTemplate,
  getAllSubStepTemplates,
  deleteSubStepTemplate,
  duplicatePhaseTemplate,
  duplicateSubStepTemplate,
  getAllPhraseTemplates,
  deletePhraseTemplate,
  updatePhraseTemplateLabel,
  updatePhraseTemplateFull,
} from '@/services/templateService';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import type { ProcedureTemplate, SubStepTemplate, PhraseTemplate } from '@/types';
import { PHRASE_CATEGORIES } from '@/types';
import TemplateEditor from '@/components/templates/TemplateEditor';

type TabType = 'phases' | 'substeps' | 'phrases';
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
  const [phraseTemplates, setPhraseTemplates] = useState<PhraseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<{ template: ProcedureTemplate | SubStepTemplate; type: 'phase' | 'substep' } | null>(null);
  const [editingPhraseId, setEditingPhraseId] = useState<string | null>(null);
  const [editingPhraseLabel, setEditingPhraseLabel] = useState('');
  const [phraseFilterCategory, setPhraseFilterCategory] = useState('');
  const [editingPhraseModal, setEditingPhraseModal] = useState<PhraseTemplate | null>(null);
  const [editModalLabel, setEditModalLabel] = useState('');
  const [editModalCategory, setEditModalCategory] = useState('');
  const editModalTextRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchTemplates(); }, []);
  useEffect(() => { setSearchTerm(''); setSelectedCategory('all'); }, [activeTab]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const [phaseData, subStepData, phraseData] = await Promise.all([getAllPhaseTemplates(), getAllSubStepTemplates(), getAllPhraseTemplates()]);
      setTemplates(phaseData);
      setSubStepTemplates(subStepData);
      setPhraseTemplates(phraseData as PhraseTemplate[]);
    } catch {
      toast.error('Erreur lors du chargement des templates');
    } finally {
      setLoading(false);
    }
  };

  const categories = activeTab === 'phases'
    ? ['all', ...Array.from(new Set(templates.map(t => t.category).filter(Boolean)))]
    : activeTab === 'substeps'
    ? ['all', ...Array.from(new Set(subStepTemplates.map(t => t.category).filter(Boolean)))]
    : [];

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

  const handleDeletePhrase = async (id: string) => {
    try { await deletePhraseTemplate(id); setPhraseTemplates(prev => prev.filter(p => p.id !== id)); toast.success('Phrase supprimée'); setConfirmDeleteId(null); }
    catch { toast.error('Erreur lors de la suppression'); }
  };

  const openPhraseEditModal = (phrase: PhraseTemplate) => {
    setEditingPhraseModal(phrase);
    setEditModalLabel(phrase.label);
    setEditModalCategory(phrase.category || '');
    setTimeout(() => {
      if (editModalTextRef.current) editModalTextRef.current.innerHTML = phrase.text;
    }, 0);
  };

  const saveEditModal = async () => {
    if (!editingPhraseModal) return;
    const text = editModalTextRef.current?.innerHTML || editingPhraseModal.text;
    try {
      await updatePhraseTemplateFull(editingPhraseModal.id, {
        label: editModalLabel || editingPhraseModal.label,
        text,
        category: editModalCategory || undefined,
      });
      setPhraseTemplates(prev => prev.map(p => p.id === editingPhraseModal.id
        ? { ...p, label: editModalLabel || p.label, text, category: editModalCategory || undefined }
        : p
      ));
      toast.success('Phrase mise à jour');
      setEditingPhraseModal(null);
    } catch { toast.error('Erreur lors de la mise à jour'); }
  };

  const handleSavePhraseLabel = async (id: string) => {
    if (!editingPhraseLabel.trim()) return;
    try {
      await updatePhraseTemplateLabel(id, editingPhraseLabel.trim());
      setPhraseTemplates(prev => prev.map(p => p.id === id ? { ...p, label: editingPhraseLabel.trim() } : p));
      setEditingPhraseId(null);
    } catch { toast.error('Erreur lors de la mise à jour'); }
  };

  const cycleSort = (key: SortKey) => {
    if (sortBy === key) setSortAsc(v => !v);
    else { setSortBy(key); setSortAsc(true); }
  };

  const filteredPhraseTemplates = phraseTemplates.filter(p =>
    (!phraseFilterCategory || p.category === phraseFilterCategory) &&
    (p.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
     p.text.replace(/<[^>]*>/g, '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const currentList = activeTab === 'phases' ? filteredTemplates : activeTab === 'substeps' ? filteredSubStepTemplates : filteredPhraseTemplates;

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
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              {phraseTemplates.length} phrase{phraseTemplates.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-[#141414] rounded-xl p-1 border border-[#252525]">
        {([
          { key: 'phases' as TabType, label: 'Phases', Icon: Layers, color: 'text-primary', activeBg: 'bg-primary/20', count: templates.length },
          { key: 'substeps' as TabType, label: 'Sous-étapes', Icon: FileText, color: 'text-emerald-400', activeBg: 'bg-emerald-500/20', count: subStepTemplates.length },
          { key: 'phrases' as TabType, label: 'Phrases type', Icon: BookOpen, color: 'text-amber-400', activeBg: 'bg-amber-400/20', count: phraseTemplates.length },
        ]).map(({ key, label, Icon, color, activeBg, count }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive ? 'bg-[#2a2a2a] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300 hover:bg-[#1e1e1e]'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? color : ''}`} />
              {label}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${isActive ? `${activeBg} ${color}` : 'bg-[#2a2a2a] text-gray-500'}`}>
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
          {activeTab !== 'phrases' && (
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
          )}
        </div>

        {/* Category pills — phases/substeps */}
        {activeTab !== 'phrases' && categories.length > 1 && (
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

        {/* Category pills — phrases */}
        {activeTab === 'phrases' && PHRASE_CATEGORIES.some(cat => phraseTemplates.some(p => p.category === cat)) && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setPhraseFilterCategory('')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${!phraseFilterCategory ? 'border-amber-400 bg-amber-400/10 text-amber-300' : 'border-[#2a2a2a] text-gray-500 hover:border-[#3a3a3a] hover:text-gray-300'}`}
            >Toutes</button>
            {PHRASE_CATEGORIES.filter(cat => phraseTemplates.some(p => p.category === cat)).map(cat => (
              <button
                key={cat}
                onClick={() => setPhraseFilterCategory(phraseFilterCategory === cat ? '' : cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${phraseFilterCategory === cat ? 'border-amber-400 bg-amber-400/10 text-amber-300' : 'border-[#2a2a2a] text-gray-500 hover:border-[#3a3a3a] hover:text-gray-300'}`}
              >{cat}</button>
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
            {activeTab === 'phases' ? <FolderKanban className="h-8 w-8 text-gray-600" />
              : activeTab === 'substeps' ? <FileText className="h-8 w-8 text-gray-600" />
              : <BookOpen className="h-8 w-8 text-gray-600" />}
          </div>
          <div className="text-center">
            <p className="text-gray-400 font-medium">
              {searchTerm ? 'Aucun résultat'
                : activeTab === 'phrases' ? 'Aucune phrase type enregistrée'
                : `Aucun template de ${activeTab === 'phases' ? 'phase' : 'sous-étape'}`}
            </p>
            <p className="text-gray-600 text-sm mt-1">
              {searchTerm
                ? 'Modifiez votre recherche'
                : activeTab === 'phrases'
                ? 'Sélectionnez du texte dans une description et cliquez sur l\'icône signet'
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

          {/* PHRASE CARDS */}
          {activeTab === 'phrases' && filteredPhraseTemplates.map(phrase => {
            const isConfirming = confirmDeleteId === phrase.id;
            const isEditing = editingPhraseId === phrase.id;
            return (
              <div
                key={phrase.id}
                className="group relative bg-[#1c1c1c] rounded-xl border border-[#272727] hover:border-[#353535] transition-all duration-200 flex flex-col overflow-hidden"
              >
                <div className="h-0.5 w-full bg-gradient-to-r from-amber-400/60 to-amber-400/10" />

                <div className="p-5 flex flex-col flex-1">
                  {/* Label row */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-400/10 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="h-4 w-4 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            autoFocus
                            value={editingPhraseLabel}
                            onChange={(e) => setEditingPhraseLabel(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSavePhraseLabel(phrase.id);
                              if (e.key === 'Escape') setEditingPhraseId(null);
                            }}
                            className="flex-1 text-sm font-semibold text-white bg-[#0f0f0f] border border-amber-400/40 rounded px-2 py-0.5 outline-none"
                          />
                          <button onClick={() => handleSavePhraseLabel(phrase.id)} className="p-1 text-amber-400 hover:text-amber-300">
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div>
                          <h3 className="font-semibold text-white text-sm leading-snug line-clamp-2">{phrase.label}</h3>
                          {phrase.category && (
                            <span className="inline-block mt-1 px-2 py-0 rounded-full text-[10px] font-medium bg-amber-400/10 text-amber-400 border border-amber-400/30">{phrase.category}</span>
                          )}
                        </div>
                      )}
                      <p className="text-[10px] text-gray-600 mt-1">Créé le {formatDate(phrase.createdAt)}</p>
                    </div>
                  </div>

                  {/* Aperçu du texte */}
                  <div
                    className="text-xs text-gray-400 bg-[#141414] rounded-lg p-3 border border-[#222] mb-4 line-clamp-4 leading-relaxed flex-1"
                    dangerouslySetInnerHTML={{ __html: phrase.text }}
                  />

                  {/* Actions */}
                  <div className="mt-auto pt-3 border-t border-[#252525]">
                    {isConfirming ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-400 flex-1">Supprimer définitivement ?</span>
                        <button onClick={() => handleDeletePhrase(phrase.id)}
                          className="text-xs px-3 py-1 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">Oui</button>
                        <button onClick={() => setConfirmDeleteId(null)}
                          className="text-xs px-3 py-1 rounded-md bg-[#252525] text-gray-400 hover:bg-[#2e2e2e] transition-colors">Non</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openPhraseEditModal(phrase)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs text-gray-400 hover:text-white hover:bg-[#252525] transition-colors"
                        >
                          <Edit2 className="h-3 w-3" />Modifier
                        </button>
                        <button onClick={() => setConfirmDeleteId(phrase.id)} title="Supprimer"
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

      {/* Modal — Modifier une phrase type */}
      {editingPhraseModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-xl border border-[#323232] w-full max-w-lg flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-[#323232] flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-amber-400" />
                Modifier la phrase type
              </h3>
              <button onClick={() => setEditingPhraseModal(null)} className="p-1 text-gray-500 hover:text-white rounded">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Libellé */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Libellé</label>
                <Input
                  value={editModalLabel}
                  onChange={(e) => setEditModalLabel(e.target.value)}
                  placeholder="Nom court de la phrase"
                  className="text-sm"
                />
              </div>

              {/* Catégorie */}
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Catégorie</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setEditModalCategory('')}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${!editModalCategory ? 'border-amber-400 bg-amber-400/20 text-amber-300' : 'border-[#323232] text-gray-500 hover:border-[#444] hover:text-gray-300'}`}
                  >Aucune</button>
                  {PHRASE_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setEditModalCategory(editModalCategory === cat ? '' : cat)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${editModalCategory === cat ? 'border-amber-400 bg-amber-400/20 text-amber-300' : 'border-[#323232] text-gray-500 hover:border-[#444] hover:text-gray-300'}`}
                    >{cat}</button>
                  ))}
                </div>
              </div>

              {/* Texte (éditable) */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Contenu de la phrase</label>
                <div
                  ref={editModalTextRef}
                  contentEditable
                  suppressContentEditableWarning
                  className="min-h-[120px] text-sm text-gray-200 bg-[#0f0f0f] rounded-lg p-3 border border-[#2a2a2a] focus:border-[#3a3a3a] outline-none leading-relaxed"
                />
              </div>
            </div>

            <div className="p-4 border-t border-[#323232] flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={() => setEditingPhraseModal(null)}>Annuler</Button>
              <Button variant="default" size="sm" onClick={saveEditModal}>Enregistrer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
