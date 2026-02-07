import { Agent } from "undici";

export interface HueConfig {
  bridgeIp: string;
  appKey: string;
  lightIds: string[];
}

export interface HueCommand {
  xy: { x: number; y: number };
  brightness: number;
  transitionMs: number;
}

export class HueClient {
  private baseUrl: string;
  private dispatcher: Agent;

  constructor(private config: HueConfig) {
    this.baseUrl = `https://${config.bridgeIp}/clip/v2/resource`;
    this.dispatcher = new Agent({
      connect: {
        rejectUnauthorized: false
      }
    });
  }

  async setLights(command: HueCommand) {
    const payload = {
      on: { on: true },
      dimming: { brightness: Math.max(1, Math.min(100, command.brightness)) },
      color: { xy: { x: command.xy.x, y: command.xy.y } },
      dynamics: { duration: command.transitionMs }
    };

    const requests = this.config.lightIds.map((id) =>
      this.request(`/light/${id}`, payload)
    );

    await Promise.allSettled(requests);
  }

  private async request(path: string, body: Record<string, unknown>, attempt = 0): Promise<void> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "hue-application-key": this.config.appKey
      },
      body: JSON.stringify(body),
      dispatcher: this.dispatcher
    });

    if (!response.ok) {
      if (attempt < 2) {
        await delay(500 * (attempt + 1));
        return this.request(path, body, attempt + 1);
      }
      const text = await response.text();
      throw new Error(`Hue request failed (${response.status}): ${text}`);
    }
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
