/**
 * A looping chiptune track built from a 16-step Web Audio sequencer —
 * triangle bass, sparse square lead, noise hi-hats, all synthesized live.
 * Kill streaks push the tempo up via setMusicIntensity().
 */
import { getAudioBus } from "./audio";

const BASE_BPM = 112;
const STEPS = 16;
/** Max tempo multiplier reached at a 10+ combo. */
const MAX_TEMPO_BOOST = 0.4;

// A natural minor groove; 0 = rest.
const BASS = [
  110, 0, 110, 110, 0, 110, 0, 98,
  87.31, 0, 87.31, 87.31, 0, 82.41, 0, 98,
];
const LEAD = [
  220, 0, 0, 261.63, 0, 0, 329.63, 0,
  293.66, 0, 261.63, 0, 246.94, 0, 196, 0,
];

let intervalId: number | null = null;
let musicGain: GainNode | null = null;
let nextTime = 0;
let step = 0;
let tempo = 1;

export function setMusicIntensity(combo: number): void {
  tempo = 1 + Math.min(combo, 10) * (MAX_TEMPO_BOOST / 10);
}

/** Starts the loop; safe to call every frame (no-ops while running). */
export function startMusic(): void {
  if (intervalId !== null) return;
  const bus = getAudioBus();
  if (!bus) return;
  const { ctx, master } = bus;
  if (!musicGain) {
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.16;
    musicGain.connect(master);
  }
  nextTime = ctx.currentTime + 0.05;
  // Look-ahead scheduler: queue anything due in the next 120ms.
  intervalId = window.setInterval(() => {
    const stepDur = 60 / BASE_BPM / 2 / tempo;
    while (nextTime < ctx.currentTime + 0.12) {
      scheduleStep(ctx, step, nextTime, stepDur);
      nextTime += stepDur;
      step = (step + 1) % STEPS;
    }
  }, 30);
}

export function stopMusic(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function scheduleStep(
  ctx: AudioContext,
  s: number,
  t: number,
  stepDur: number
): void {
  if (BASS[s]) note(ctx, BASS[s], t, stepDur * 0.9, "triangle", 0.5);
  if (LEAD[s]) note(ctx, LEAD[s], t, stepDur * 1.6, "square", 0.16);
  if (s % 2 === 0) hat(ctx, t, s % 8 === 0 ? 0.15 : 0.07);
}

function note(
  ctx: AudioContext,
  freq: number,
  t: number,
  dur: number,
  type: OscillatorType,
  vol: number
): void {
  if (!musicGain) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain);
  gain.connect(musicGain);
  osc.start(t);
  osc.stop(t + dur);
}

function hat(ctx: AudioContext, t: number, vol: number): void {
  if (!musicGain) return;
  const len = 0.03;
  const buffer = ctx.createBuffer(
    1,
    Math.ceil(ctx.sampleRate * len),
    ctx.sampleRate
  );
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 6000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + len);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(musicGain);
  src.start(t);
}
