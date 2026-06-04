import { create } from 'zustand';

const useToolStore = create((set) => ({
  activeTool: 'pen',
  isLocked: false,
  strokeColor: '#ffffff',
  fillColor: 'transparent',
  thickness: 2,
  
  setActiveTool: (tool) => set({ activeTool: tool }),
  toggleLock: () => set((state) => ({ isLocked: !state.isLocked })),
  setStrokeColor: (color) => set({ strokeColor: color }),
  setFillColor: (color) => set({ fillColor: color }),
  setThickness: (thickness) => set({ thickness }),
}));

export default useToolStore;
