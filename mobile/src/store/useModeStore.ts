import { create } from "zustand";

export type AppMode = "DRIVER" | "HOST";

interface ModeState {
  currentMode: AppMode;
  accentColor: string;
  glowColor: string;
  isShockwaveActive: boolean;
  toggleMode: () => void;
  setMode: (mode: AppMode) => void;
  triggerShockwave: () => void;
}

export const useModeStore = create<ModeState>((set, get) => ({
  currentMode: "DRIVER",
  accentColor: "#00F59B", // Volt Emerald
  glowColor: "rgba(0, 245, 155, 0.35)",
  isShockwaveActive: false,

  toggleMode: () => {
    const nextMode: AppMode = get().currentMode === "DRIVER" ? "HOST" : "DRIVER";
    const nextAccent = nextMode === "DRIVER" ? "#00F59B" : "#FFB800";
    const nextGlow = nextMode === "DRIVER" ? "rgba(0, 245, 155, 0.35)" : "rgba(255, 184, 0, 0.35)";

    set({
      currentMode: nextMode,
      accentColor: nextAccent,
      glowColor: nextGlow,
      isShockwaveActive: true,
    });

    // Reset shockwave transition after 800ms
    setTimeout(() => {
      set({ isShockwaveActive: false });
    }, 850);
  },

  setMode: (mode: AppMode) => {
    const nextAccent = mode === "DRIVER" ? "#00F59B" : "#FFB800";
    const nextGlow = mode === "DRIVER" ? "rgba(0, 245, 155, 0.35)" : "rgba(255, 184, 0, 0.35)";
    set({
      currentMode: mode,
      accentColor: nextAccent,
      glowColor: nextGlow,
    });
  },

  triggerShockwave: () => {
    set({ isShockwaveActive: true });
    setTimeout(() => {
      set({ isShockwaveActive: false });
    }, 850);
  }
}));

