export type EmotionScores = Record<string, number>;

export interface HumeEmotionSnapshot {
  emotions: EmotionScores;
  valence?: number; // -1 to 1
  arousal?: number; // 0 to 1
  timestamp?: number;
}

export interface HueState {
  xy: { x: number; y: number };
  brightness: number; // 0-100
  transitionMs: number;
  label: string;
  confidence: number;
}

const EMOTION_GROUPS: Record<string, string[]> = {
  happy: ["joy", "happiness", "amusement", "contentment", "excited"],
  calm: ["calm", "relaxed", "content", "serenity"],
  sad: ["sad", "sadness", "disappointment", "despair"],
  angry: ["anger", "angry", "annoyance", "frustration"],
  fear: ["fear", "anxiety", "nervousness", "panic"],
  neutral: ["neutral", "boredom"]
};

const HUE_PRESETS: Record<string, { xy: { x: number; y: number }; brightness: number }> = {
  happy: { xy: { x: 0.52, y: 0.42 }, brightness: 90 },
  calm: { xy: { x: 0.44, y: 0.4 }, brightness: 55 },
  sad: { xy: { x: 0.16, y: 0.08 }, brightness: 35 },
  angry: { xy: { x: 0.7, y: 0.3 }, brightness: 75 },
  fear: { xy: { x: 0.27, y: 0.12 }, brightness: 60 },
  neutral: { xy: { x: 0.33, y: 0.33 }, brightness: 50 }
};

const DEFAULT_TRANSITION_MS = 800;

export class EmotionWindow {
  private samples: HumeEmotionSnapshot[] = [];
  constructor(private windowMs = 4000) {}

  add(sample: HumeEmotionSnapshot) {
    const ts = sample.timestamp ?? Date.now();
    this.samples.push({ ...sample, timestamp: ts });
    this.trim();
  }

  getAggregate(): HumeEmotionSnapshot {
    this.trim();
    if (this.samples.length === 0) {
      return { emotions: {} };
    }
    const totals: EmotionScores = {};
    let valenceSum = 0;
    let arousalSum = 0;
    let valenceCount = 0;
    let arousalCount = 0;

    for (const sample of this.samples) {
      for (const [key, value] of Object.entries(sample.emotions)) {
        totals[key] = (totals[key] ?? 0) + value;
      }
      if (typeof sample.valence === "number") {
        valenceSum += sample.valence;
        valenceCount += 1;
      }
      if (typeof sample.arousal === "number") {
        arousalSum += sample.arousal;
        arousalCount += 1;
      }
    }

    const count = this.samples.length;
    const averaged: EmotionScores = {};
    for (const [key, value] of Object.entries(totals)) {
      averaged[key] = value / count;
    }

    return {
      emotions: averaged,
      valence: valenceCount ? valenceSum / valenceCount : undefined,
      arousal: arousalCount ? arousalSum / arousalCount : undefined
    };
  }

  private trim() {
    const cutoff = Date.now() - this.windowMs;
    this.samples = this.samples.filter((sample) => (sample.timestamp ?? 0) >= cutoff);
  }
}

export function mapEmotionToHue(snapshot: HumeEmotionSnapshot): HueState {
  const { label, confidence } = dominantEmotion(snapshot.emotions);
  if (typeof snapshot.valence === "number" && typeof snapshot.arousal === "number") {
    const { xy, brightness } = mapValenceArousal(snapshot.valence, snapshot.arousal);
    return {
      xy,
      brightness,
      transitionMs: DEFAULT_TRANSITION_MS,
      label: `${label} (valence/arousal)`
        .replace("neutral (valence/arousal)", "valence/arousal"),
      confidence
    };
  }

  const preset = HUE_PRESETS[label] ?? HUE_PRESETS.neutral;
  return {
    xy: preset.xy,
    brightness: preset.brightness,
    transitionMs: DEFAULT_TRANSITION_MS,
    label,
    confidence
  };
}

export function dominantEmotion(scores: EmotionScores): { label: string; confidence: number } {
  if (!scores || Object.keys(scores).length === 0) {
    return { label: "neutral", confidence: 0 };
  }

  let bestKey = "neutral";
  let bestScore = -Infinity;

  for (const [key, value] of Object.entries(scores)) {
    if (value > bestScore) {
      bestScore = value;
      bestKey = key;
    }
  }

  const normalizedKey = bestKey.toLowerCase();
  for (const [group, list] of Object.entries(EMOTION_GROUPS)) {
    if (list.some((emotion) => normalizedKey.includes(emotion))) {
      return { label: group, confidence: bestScore };
    }
  }

  return { label: "neutral", confidence: bestScore };
}

function mapValenceArousal(valence: number, arousal: number) {
  const clampedValence = Math.max(-1, Math.min(1, valence));
  const clampedArousal = Math.max(0, Math.min(1, arousal));
  const hue = 30 + (clampedValence + 1) * 120; // 30 (warm) to 150 (cool)
  const saturation = 50 + clampedArousal * 50; // 50-100
  const lightness = 45 + clampedArousal * 30; // 45-75
  const { x, y } = hslToXy(hue, saturation, lightness);
  const brightness = Math.round(30 + clampedArousal * 70);
  return { xy: { x, y }, brightness };
}

function hslToXy(h: number, s: number, l: number) {
  const [r, g, b] = hslToRgb(h / 360, s / 100, l / 100);
  return rgbToXy(r, g, b);
}

function hslToRgb(h: number, s: number, l: number) {
  if (s === 0) {
    return [l, l, l];
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = hue2rgb(p, q, h + 1 / 3);
  const g = hue2rgb(p, q, h);
  const b = hue2rgb(p, q, h - 1 / 3);
  return [r, g, b];
}

function rgbToXy(r: number, g: number, b: number) {
  const toLinear = (c: number) => (c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92);
  const rl = toLinear(r);
  const gl = toLinear(g);
  const bl = toLinear(b);

  const X = rl * 0.664511 + gl * 0.154324 + bl * 0.162028;
  const Y = rl * 0.283881 + gl * 0.668433 + bl * 0.047685;
  const Z = rl * 0.000088 + gl * 0.07231 + bl * 0.986039;

  const sum = X + Y + Z;
  if (sum === 0) {
    return { x: 0.33, y: 0.33 };
  }
  return { x: Number((X / sum).toFixed(4)), y: Number((Y / sum).toFixed(4)) };
}
