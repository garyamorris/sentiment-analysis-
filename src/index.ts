import "dotenv/config";
import { createMicStream } from "./audio/mic.js";
import { HumeClient } from "./hume/client.js";
import { HueClient } from "./hue/client.js";
import { EmotionWindow, mapEmotionToHue } from "./mapping/emotionToHue.js";

const requiredEnv = [
  "HUME_API_KEY",
  "HUME_ENDPOINT",
  "HUE_BRIDGE_IP",
  "HUE_APP_KEY",
  "HUE_LIGHT_IDS"
] as const;

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

const humeClient = new HumeClient({
  apiKey: process.env.HUME_API_KEY!,
  endpoint: process.env.HUME_ENDPOINT!,
  configId: process.env.HUME_CONFIG_ID
});

const hueClient = new HueClient({
  bridgeIp: process.env.HUE_BRIDGE_IP!,
  appKey: process.env.HUE_APP_KEY!,
  lightIds: process.env.HUE_LIGHT_IDS!.split(",").map((id) => id.trim())
});

const emotionWindow = new EmotionWindow(4000);
let lastHueUpdate = 0;
let pending = false;

function scheduleHueUpdate() {
  if (pending) return;
  const now = Date.now();
  const minInterval = 800;
  const wait = Math.max(0, minInterval - (now - lastHueUpdate));
  pending = true;
  setTimeout(async () => {
    pending = false;
    const aggregate = emotionWindow.getAggregate();
    const hueState = mapEmotionToHue(aggregate);
    lastHueUpdate = Date.now();

    console.log(
      `Emotion: ${hueState.label} (confidence ${hueState.confidence.toFixed(2)}) -> Hue`,
      hueState
    );

    try {
      await hueClient.setLights({
        xy: hueState.xy,
        brightness: hueState.brightness,
        transitionMs: hueState.transitionMs
      });
    } catch (error) {
      console.error("Hue update failed:", error);
    }
  }, wait);
}

async function main() {
  const mic = createMicStream();

  humeClient.on("emotion", (message) => {
    emotionWindow.add({
      emotions: message.emotions,
      valence: message.valence,
      arousal: message.arousal
    });
    scheduleHueUpdate();
  });

  humeClient.on("error", (error) => {
    console.error("Hume error:", error);
  });

  humeClient.on("disconnected", () => {
    console.warn("Hume disconnected, attempting reconnect...");
  });

  humeClient.connect();

  mic.stream.on("data", (chunk) => {
    humeClient.sendAudio(chunk as Buffer);
  });

  process.on("SIGINT", () => {
    console.log("Shutting down...");
    mic.stop();
    humeClient.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
