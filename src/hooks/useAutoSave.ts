import { useEffect, useRef, useState } from 'react';

interface UseAutoSaveOptions {
  onSave: () => Promise<void> | void;
  delay?: number; // délai en millisecondes (défaut: 2000ms = 2 secondes)
  enabled?: boolean;
}

interface UseAutoSaveReturn {
  isSaving: boolean;
  lastSaved: Date | null;
  triggerSave: () => void;
}

/**
 * Hook pour implémenter la sauvegarde automatique avec debouncing
 *
 * @param options Options de configuration
 * @returns État de sauvegarde et fonction de déclenchement manuel
 *
 * @example
 * const { isSaving, lastSaved } = useAutoSave({
 *   onSave: async () => {
 *     await updateProcedure(id, data);
 *   },
 *   delay: 2000, // 2 secondes
 *   enabled: true
 * }, [data]); // dépendances à surveiller
 */
export function useAutoSave(
  options: UseAutoSaveOptions,
  dependencies: any[] = []
): UseAutoSaveReturn {
  const { onSave, delay = 2000, enabled = true } = options;
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRenderRef = useRef(true);

  const triggerSave = async () => {
    if (!enabled) return;

    setIsSaving(true);
    try {
      await onSave();
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    // Ne pas sauvegarder au premier rendu (chargement initial)
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    if (!enabled) return;

    // Nettoyer le timeout précédent
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Créer un nouveau timeout pour la sauvegarde
    timeoutRef.current = setTimeout(() => {
      triggerSave();
    }, delay);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isSaving,
    lastSaved,
    triggerSave,
  };
}
