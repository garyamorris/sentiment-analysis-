import record from "node-record-lpcm16";
import { Readable } from "node:stream";

export interface MicStream {
  stream: Readable;
  stop: () => void;
}

export function createMicStream(): MicStream {
  try {
    const mic = record.record({
      sampleRate: 16000,
      channels: 1,
      audioType: "raw",
      threshold: 0,
      verbose: false
    });
    const stream = mic.stream();
    stream.on("error", (error) => {
      console.error("Microphone stream error:", error);
    });

    return {
      stream,
      stop: () => mic.stop()
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to initialize microphone capture. Ensure permissions are granted and a mic is connected. Details: ${message}`
    );
  }
}
