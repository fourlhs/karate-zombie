/**
 * Chiptune sound effects synthesized with the Web Audio API — no audio files,
 * matching the hand-made pixel art. The update step queues SoundEffect names;
 * the React shell drains the queue into playSounds().
 */
import type { SoundEffect } from "./types";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

export function setMuted(value: boolean): void {
  muted = value;
  // Zero the master gain so the music loop is silenced too.
  if (master) master.gain.value = value ? 0 : 0.35;
}

/** Shared context + master gain for the music sequencer. */
export function getAudioBus(): { ctx: AudioContext; master: GainNode } | null {
  const context = ensureContext();
  return context && master ? { ctx: context, master } : null;
}

/** Browsers only allow audio after a user gesture; call this from one. */
export function unlockAudio(): void {
  ensureContext();
}

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    if (!window.AudioContext) return null;
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  return ctx;
}

/** An oscillator sliding from freq to endFreq with a decaying envelope. */
function tone(
  freq: number,
  endFreq: number,
  duration: number,
  type: OscillatorType,
  volume: number,
  delay = 0
): void {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 1), t0 + duration);
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t0);
  osc.stop(t0 + duration);
}

/** A burst of low-pass filtered white noise with a decaying envelope. */
function noise(
  duration: number,
  volume: number,
  filterFreq: number,
  delay = 0
): void {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime + delay;
  const buffer = ctx.createBuffer(
    1,
    Math.ceil(ctx.sampleRate * duration),
    ctx.sampleRate
  );
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = filterFreq;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  src.start(t0);
}

const SOUNDS: Record<SoundEffect, () => void> = {
  punch: () => {
    noise(0.06, 0.4, 1800);
    tone(170, 90, 0.09, "square", 0.25);
  },
  kick: () => {
    noise(0.12, 0.5, 1100);
    tone(120, 50, 0.15, "square", 0.3);
  },
  dash: () => {
    noise(0.15, 0.3, 2600);
  },
  kill: () => {
    tone(420, 90, 0.13, "square", 0.28);
    noise(0.08, 0.25, 900);
  },
  hurt: () => {
    tone(220, 55, 0.28, "sawtooth", 0.4);
    noise(0.15, 0.3, 700);
  },
  pickup: () => {
    tone(660, 660, 0.06, "square", 0.22);
    tone(990, 990, 0.09, "square", 0.22, 0.07);
  },
  special: () => {
    tone(150, 900, 0.3, "sawtooth", 0.3);
    tone(200, 40, 0.5, "square", 0.35, 0.12);
    noise(0.35, 0.4, 1500, 0.1);
  },
  bossHit: () => {
    tone(200, 110, 0.1, "square", 0.35);
    noise(0.06, 0.35, 800);
  },
  bossDie: () => {
    tone(160, 35, 0.5, "sawtooth", 0.45);
    noise(0.4, 0.45, 500);
  },
  gameOver: () => {
    tone(392, 392, 0.22, "square", 0.28);
    tone(330, 330, 0.22, "square", 0.28, 0.24);
    tone(262, 262, 0.36, "square", 0.28, 0.48);
  },
};

export function playSounds(effects: SoundEffect[]): void {
  if (effects.length === 0 || muted) return;
  if (!ensureContext()) return;
  for (const effect of effects) {
    SOUNDS[effect]();
  }
}
