/**
 * Vibration feedback driven by the same sound-event queue the audio uses.
 * Android supports navigator.vibrate; iOS ignores it silently.
 */
import type { SoundEffect } from "./types";

let enabled = false;

export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

const PATTERNS: Partial<Record<SoundEffect, number | number[]>> = {
  kill: 12,
  pickup: 20,
  bossHit: 25,
  special: 45,
  hurt: 70,
  bossDie: [40, 40, 90],
  gameOver: [60, 50, 120],
};

/** Fires the strongest pattern among this frame's events. */
export function vibrateFor(effects: SoundEffect[]): void {
  if (!enabled || typeof navigator === "undefined" || !navigator.vibrate) {
    return;
  }
  let best: number | number[] | null = null;
  let bestWeight = 0;
  for (const effect of effects) {
    const pattern = PATTERNS[effect];
    if (!pattern) continue;
    const weight = Array.isArray(pattern)
      ? pattern.reduce((a, b) => a + b, 0)
      : pattern;
    if (weight > bestWeight) {
      best = pattern;
      bestWeight = weight;
    }
  }
  if (best !== null) {
    try {
      navigator.vibrate(best);
    } catch {
      // Some browsers throw on unusual patterns; feedback is best-effort.
    }
  }
}
