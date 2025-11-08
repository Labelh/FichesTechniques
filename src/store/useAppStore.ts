import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ViewMode, SearchFilters, SortOption } from '@/types';

interface AppState {
  // Theme
  theme: 'light' | 'dark' | 'auto';
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;

  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // View mode
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // Search & Filters
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchFilters: SearchFilters;
  setSearchFilters: (filters: SearchFilters) => void;
  clearFilters: () => void;

  // Sort
  sortOption: SortOption;
  setSortOption: (option: SortOption) => void;

  // Selected procedure
  selectedProcedureId: string | null;
  setSelectedProcedureId: (id: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Theme
      theme: 'dark',
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },

      // Sidebar
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      // View mode
      viewMode: 'grid' as ViewMode,
      setViewMode: (mode) => set({ viewMode: mode }),

      // Search & Filters
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),
      searchFilters: {},
      setSearchFilters: (filters) => set({ searchFilters: filters }),
      clearFilters: () => set({ searchFilters: {}, searchQuery: '' }),

      // Sort
      sortOption: { field: 'updatedAt', direction: 'desc' },
      setSortOption: (option) => set({ sortOption: option }),

      // Selected procedure
      selectedProcedureId: null,
      setSelectedProcedureId: (id) => set({ selectedProcedureId: id }),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
        viewMode: state.viewMode,
        sortOption: state.sortOption,
      }),
    }
  )
);

/**
 * Applique le thème à la page
 */
function applyTheme(theme: 'light' | 'dark' | 'auto') {
  const root = window.document.documentElement;
  root.classList.remove('light', 'dark');

  if (theme === 'auto') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
    root.classList.add(systemTheme);
  } else {
    root.classList.add(theme);
  }
}

// Initialiser le thème au chargement
if (typeof window !== 'undefined') {
  const store = useAppStore.getState();
  applyTheme(store.theme);

  // Écouter les changements de préférence système
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      const store = useAppStore.getState();
      if (store.theme === 'auto') {
        applyTheme('auto');
      }
    });
}
