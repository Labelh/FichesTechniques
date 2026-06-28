import { useEffect, useState, useRef } from 'react';
import { Layers, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Phase } from '@/types';

interface PhaseSummaryProps {
  phases: Phase[];
}

export default function PhaseSummary({ phases }: PhaseSummaryProps) {
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    const entries = new Map<string, number>();

    observerRef.current = new IntersectionObserver(
      (obs) => {
        obs.forEach((entry) => {
          entries.set(entry.target.id, entry.intersectionRatio);
        });
        // Phase la plus visible
        let best: string | null = null;
        let bestRatio = 0;
        entries.forEach((ratio, id) => {
          if (ratio > bestRatio) { bestRatio = ratio; best = id; }
        });
        if (best) setActivePhaseId((best as string).replace('phase-', ''));
      },
      { threshold: [0, 0.1, 0.5, 1], rootMargin: '-60px 0px -40% 0px' }
    );

    phases.forEach((p) => {
      const el = document.getElementById(`phase-${p.id}`);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [phases]);

  const scrollTo = (phaseId: string) => {
    const el = document.getElementById(`phase-${phaseId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (phases.length === 0) return null;

  return (
    <div className={`fixed top-24 right-4 z-30 flex flex-col transition-all duration-200 ${collapsed ? 'w-9' : 'w-52'}`}>
      <div className="bg-[#141414] border border-[#252525] rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#252525]">
          {!collapsed && (
            <div className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-gray-300">Phases</span>
              <span className="text-[10px] text-gray-600 bg-[#1e1e1e] px-1.5 rounded-full">{phases.length}</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(v => !v)}
            className="ml-auto p-0.5 rounded text-gray-500 hover:text-gray-300 transition-colors"
          >
            {collapsed ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Liste des phases */}
        {!collapsed && (
          <div className="py-1.5 max-h-[60vh] overflow-y-auto">
            {phases
              .slice()
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((phase, idx) => {
                const isActive = activePhaseId === phase.id;
                const num = phase.phaseNumber ?? idx + 1;
                return (
                  <button
                    key={phase.id}
                    onClick={() => scrollTo(phase.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-all group ${
                      isActive
                        ? 'bg-primary/10 text-white'
                        : 'text-gray-500 hover:text-gray-300 hover:bg-[#1e1e1e]'
                    }`}
                  >
                    <span className={`flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold transition-colors ${
                      isActive ? 'bg-primary text-white' : 'bg-[#252525] text-gray-500 group-hover:bg-[#2e2e2e]'
                    }`}>
                      {num}
                    </span>
                    <span className="text-xs truncate flex-1">{phase.title || `Phase ${num}`}</span>
                    {phase.steps?.length > 0 && (
                      <span className="text-[10px] text-gray-600 flex-shrink-0">{phase.steps.length}</span>
                    )}
                  </button>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
