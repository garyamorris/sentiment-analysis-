import WebSocket from "ws";
import { EventEmitter } from "node:events";

export interface HumeConfig {
  apiKey: string;
  endpoint: string;
  configId?: string;
}

export interface HumeEmotionMessage {
  emotions: Record<string, number>;
  valence?: number;
  arousal?: number;
}

interface HumeSocketMessage {
  type?: string;
  [key: string]: unknown;
}

export class HumeClient extends EventEmitter {
  private socket?: WebSocket;
  private reconnectAttempts = 0;
  private isClosed = false;

  constructor(private config: HumeConfig) {
    super();
  }

  connect() {
    this.isClosed = false;
    const url = new URL(this.config.endpoint);
    url.searchParams.set("api_key", this.config.apiKey);
    if (this.config.configId) {
      url.searchParams.set("config_id", this.config.configId);
    }

    this.socket = new WebSocket(url.toString());
    this.socket.on("open", () => {
      this.reconnectAttempts = 0;
      this.emit("connected");
    });
    this.socket.on("message", (data) => this.handleMessage(data.toString()));
    this.socket.on("close", () => {
      if (!this.isClosed) {
        this.scheduleReconnect();
      }
      this.emit("disconnected");
    });
    this.socket.on("error", (error) => {
      this.emit("error", error);
    });
  }

  sendAudio(audioChunk: Buffer) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    const payload = {
      type: "audio_input",
      data: audioChunk.toString("base64"),
      encoding: "linear16",
      sample_rate: 16000
    };
    this.socket.send(JSON.stringify(payload));
  }

  close() {
    this.isClosed = true;
    this.socket?.close();
  }

  private scheduleReconnect() {
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 15000);
    this.reconnectAttempts += 1;
    setTimeout(() => {
      if (!this.isClosed) {
        this.connect();
      }
    }, delay);
  }

  private handleMessage(raw: string) {
    let parsed: HumeSocketMessage;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    if (parsed.type === "error") {
      this.emit("error", new Error(String(parsed.message ?? "Hume error")));
      return;
    }

    const predictions = parsed["predictions"];
    if (!Array.isArray(predictions)) {
      return;
    }

    for (const prediction of predictions) {
      if (!prediction || typeof prediction !== "object") continue;
      const model = (prediction as Record<string, unknown>)["model"];
      if (model && typeof model === "string" && model !== "prosody" && model !== "expressive") {
        continue;
      }

      const emotions = (prediction as Record<string, unknown>)["emotions"];
      if (!Array.isArray(emotions)) continue;

      const scores: Record<string, number> = {};
      for (const item of emotions) {
        if (!item || typeof item !== "object") continue;
        const name = (item as Record<string, unknown>)["name"];
        const score = (item as Record<string, unknown>)["score"];
        if (typeof name === "string" && typeof score === "number") {
          scores[name] = score;
        }
      }

      const valence = extractNumber(prediction, "valence");
      const arousal = extractNumber(prediction, "arousal");

      if (Object.keys(scores).length > 0) {
        this.emit("emotion", {
          emotions: scores,
          valence,
          arousal
        } satisfies HumeEmotionMessage);
      }
    }
  }
}

function extractNumber(obj: unknown, key: string) {
  if (!obj || typeof obj !== "object") return undefined;
  const value = (obj as Record<string, unknown>)[key];
  return typeof value === "number" ? value : undefined;
}
