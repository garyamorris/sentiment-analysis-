import { describe, expect, it } from "vitest";
import { mapEmotionToHue } from "../src/mapping/emotionToHue.js";

describe("mapEmotionToHue", () => {
  it("maps joy to warm bright preset", () => {
    const result = mapEmotionToHue({ emotions: { joy: 0.9 } });
    expect(result.label).toBe("happy");
    expect(result.brightness).toBeGreaterThan(80);
  });

  it("maps sad to cool dim preset", () => {
    const result = mapEmotionToHue({ emotions: { sad: 0.8 } });
    expect(result.label).toBe("sad");
    expect(result.brightness).toBeLessThan(50);
  });
});
