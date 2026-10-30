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
  accentColor: "#05E660",
  glowColor: "rgba(5, 230, 96, 0.25)",
  isShockwaveActive: false,

  toggleMode: () => {
    const nextMode: AppMode = get().currentMode === "DRIVER" ? "HOST" : "DRIVER";
    const nextAccent = "#05E660";
    const nextGlow = "rgba(5, 230, 96, 0.25)";

    set({
      currentMode: nextMode,
      accentColor: nextAccent,
      glowColor: nextGlow,
      isShockwaveActive: true,
    });

    setTimeout(() => {
      set({ isShockwaveActive: false });
    }, 650);
  },

  setMode: (mode: AppMode) => {
    set({
      currentMode: mode,
      accentColor: "#05E660",
      glowColor: "rgba(5, 230, 96, 0.25)",
    });
  },

  triggerShockwave: () => {
    set({ isShockwaveActive: true });
    setTimeout(() => {
      set({ isShockwaveActive: false });
    }, 650);
  },
}));
