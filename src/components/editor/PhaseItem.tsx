import { useState } from 'react';
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { updatePhase } from '@/services/procedureService';
import type { Phase, DifficultyLevel } from '@/types';
import { toast } from 'sonner';

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

  const handleSave = async () => {
    try {
      await updatePhase(procedureId, phase.id, {
        title,
        description,
        difficulty,
        estimatedTime,
      });
      toast.success('Phase mise à jour');
      setIsExpanded(false);
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
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
    <div className="border border-gray-700 rounded-lg bg-gray-900/50">
      {/* Header - Collapsed View */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-800/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1 flex items-center gap-3">
          <span className="text-sm font-medium text-gray-400">Phase {index + 1}</span>
          <span className="font-semibold text-white">{phase.title}</span>
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
            <Trash2 className="h-4 w-4 text-red-400" />
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
        <div className="p-4 border-t border-gray-700 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Titre de la phase *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nom de la phase..."
              className="bg-gray-800 border-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description détaillée de la phase..."
              className="w-full min-h-[100px] rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Difficulté
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
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
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Temps estimé (min)
              </label>
              <Input
                type="number"
                min="1"
                value={estimatedTime}
                onChange={(e) => setEstimatedTime(parseInt(e.target.value) || 0)}
                className="bg-gray-800 border-gray-700"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsExpanded(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave}>
              Enregistrer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
