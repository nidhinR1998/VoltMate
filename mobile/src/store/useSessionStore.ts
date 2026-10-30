import { create } from "zustand";

export interface LiveTelemetry {
  elapsedSeconds: number;
  voltageV: number;
  currentA: number;
  instantPowerKw: number;
  deliveredKwh: number;
  currentSocPercent: number;
  liveCostInr: number;
  estimatedFullMinsRemaining: number;
}

export interface ChatMessage {
  id: string;
  sender: "DRIVER" | "HOST" | "SYSTEM";
  text: string;
  timestamp: string;
}

interface SessionState {
  activeBookingId: string | null;
  hostName: string;
  hostPhone: string;
  vehicleModel: string;
  batteryCapacityKwh: number;
  targetSocPercent: number;
  isSessionActive: boolean;
  telemetry: LiveTelemetry;
  messages: ChatMessage[];
  
  startSession: (data: {
    bookingId: string;
    hostName: string;
    hostPhone: string;
    vehicleModel: string;
    batteryCapacityKwh: number;
    initialSoc: number;
  }) => void;
  updateTelemetry: (incoming: Partial<LiveTelemetry>) => void;
  addChatMessage: (msg: Omit<ChatMessage, "id">) => void;
  endSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  activeBookingId: null,
  hostName: "Arun Kumar (Host)",
  hostPhone: "+91 98460 12345",
  vehicleModel: "Tata Nexon EV Max",
  batteryCapacityKwh: 40.5,
  targetSocPercent: 90,
  isSessionActive: false,
  telemetry: {
    elapsedSeconds: 0,
    voltageV: 230.0,
    currentA: 14.5,
    instantPowerKw: 3.3,
    deliveredKwh: 0.0,
    currentSocPercent: 32.0,
    liveCostInr: 0.0,
    estimatedFullMinsRemaining: 165,
  },
  messages: [
    {
      id: "1",
      sender: "SYSTEM",
      text: "⚡ Smart Handshake verified. 15A socket energized.",
      timestamp: "Just now"
    }
  ],

  startSession: (data) => set({
    activeBookingId: data.bookingId,
    hostName: data.hostName,
    hostPhone: data.hostPhone,
    vehicleModel: data.vehicleModel,
    batteryCapacityKwh: data.batteryCapacityKwh,
    isSessionActive: true,
    telemetry: {
      elapsedSeconds: 0,
      voltageV: 230.0,
      currentA: 14.5,
      instantPowerKw: 3.3,
      deliveredKwh: 0.0,
      currentSocPercent: data.initialSoc,
      liveCostInr: 0.0,
      estimatedFullMinsRemaining: 180,
    }
  }),

  updateTelemetry: (incoming) => set((state) => ({
    telemetry: { ...state.telemetry, ...incoming }
  })),

  addChatMessage: (msg) => set((state) => ({
    messages: [
      ...state.messages,
      { ...msg, id: `${Date.now()}_${Math.random().toString(36).substring(7)}` }
    ]
  })),

  endSession: () => set({
    isSessionActive: false,
    activeBookingId: null,
  })
}));

