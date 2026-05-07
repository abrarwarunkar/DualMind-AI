import { create } from 'zustand';

const useAppStore = create((set) => ({
    // Global Loading State
    isLoading: false,
    setLoading: (loading) => set({ isLoading: loading }),

    // Research Session State
    activeSessionId: null,
    setActiveSessionId: (id) => set({ activeSessionId: id }),

    // Knowledge Graph Data
    graphData: { nodes: [], links: [] },
    setGraphData: (data) => set({ graphData: data }),
    
    // UI Theme/Overlay State
    sidebarOpen: false,
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));

export default useAppStore;
