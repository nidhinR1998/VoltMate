import { useSessionStore } from "../store/useSessionStore";

class SessionSocketClient {
  private ws: WebSocket | null = null;
  private currentBookingId: string | null = null;
  private reconnectTimer: any = null;

  connect(bookingId: string) {
    if (this.ws && this.currentBookingId === bookingId) {
      return;
    }

    this.disconnect();
    this.currentBookingId = bookingId;

    const baseWsUrl = (process.env.EXPO_PUBLIC_API_URL || "https://api.voltmate.co.in/api/v1")
      .replace("http://", "ws://")
      .replace("https://", "wss://")
      .replace("/api/v1", "");

    const wsUrl = `${baseWsUrl}/ws/session/${bookingId}`;
    console.log("⚡ Connecting WebSocket to:", wsUrl);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("WebSocket connected to session:", bookingId);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "TELEMETRY_UPDATE") {
            useSessionStore.getState().updateTelemetry({
              elapsedSeconds: data.elapsed_seconds,
              voltageV: data.voltage_v,
              currentA: data.current_a,
              instantPowerKw: data.instant_power_kw,
              deliveredKwh: data.delivered_kwh,
              currentSocPercent: data.current_soc_percent,
              liveCostInr: data.live_cost_inr,
              estimatedFullMinsRemaining: data.estimated_full_mins_remaining,
            });
          } else if (data.type === "CHAT_MESSAGE") {
            useSessionStore.getState().addChatMessage({
              sender: data.sender,
              text: data.payload.text || "",
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            });
          }
        } catch (e) {
          console.warn("WS Parse error", e);
        }
      };

      this.ws.onerror = (e) => {
        console.warn("WebSocket error:", e);
      };

      this.ws.onclose = () => {
        console.log("WebSocket disconnected.");
        // Try reconnecting if session still active
        if (useSessionStore.getState().isSessionActive && this.currentBookingId) {
          this.reconnectTimer = setTimeout(() => {
            this.connect(this.currentBookingId!);
          }, 3000);
        }
      };
    } catch (e) {
      console.warn("Failed to instantiate WebSocket", e);
    }
  }

  sendChatMessage(text: string, sender: "DRIVER" | "HOST" = "DRIVER") {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: "CHAT_MESSAGE",
        sender,
        payload: { text },
        timestamp: Date.now(),
      }));
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.currentBookingId = null;
  }
}

export const sessionSocket = new SessionSocketClient();

