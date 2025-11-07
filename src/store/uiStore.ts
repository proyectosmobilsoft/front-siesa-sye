import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  isDarkMode: boolean
  sidebarOpen: boolean
  selectedCompany: string | null
  searchQuery: string
  toggleDarkMode: () => void
  setSidebarOpen: (open: boolean) => void
  setSelectedCompany: (company: string | null) => void
  setSearchQuery: (query: string) => void
}

export const useUIStore = create<UIState>()(
  persist(
    set => ({
      isDarkMode: false,
      sidebarOpen: true, // Siempre abierto por defecto
      selectedCompany: null,
      searchQuery: '',

      toggleDarkMode: () => set(state => ({ isDarkMode: !state.isDarkMode })),
      setSidebarOpen: open => set({ sidebarOpen: open }),
      setSelectedCompany: company => set({ selectedCompany: company }),
      setSearchQuery: query => set({ searchQuery: query }),
    }),
    {
      name: 'ui-storage',
      partialize: state => ({
        isDarkMode: state.isDarkMode,
        // No persistir sidebarOpen para que siempre inicie abierto
      }),
    }
  )
)
