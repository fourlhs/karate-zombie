import {
  HIGH_SCORE_KEY,
  PLAYER_MAX_HEALTH,
  PLAYER_SIZE,
  PLAYER_SPEED,
  SPAWN_INTERVAL_START,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "./constants";
import type { GameState, InputState } from "./types";

/** Guarded so it also runs during server-side rendering, where there is no storage. */
export function loadHighScore(): number {
  if (typeof localStorage === "undefined") return 0;
  return Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0;
}

export function createInitialState(): GameState {
  return {
    status: "playing",
    player: {
      pos: { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 },
      size: PLAYER_SIZE,
      speed: PLAYER_SPEED,
      facing: "down",
      moving: false,
      dashTimer: 0,
      dashCooldown: 0,
      dashDir: { x: 0, y: 1 },
      health: PLAYER_MAX_HEALTH,
      maxHealth: PLAYER_MAX_HEALTH,
      attack: {
        kind: "punch",
        activeTimer: 0,
        punchCooldown: 0,
        kickCooldown: 0,
      },
    },
    zombies: [],
    drops: [],
    popups: [],
    score: 0,
    highScore: loadHighScore(),
    combo: 0,
    comboTimer: 0,
    shake: { timer: 0, duration: 1, magnitude: 0 },
    elapsed: 0,
    spawnTimer: SPAWN_INTERVAL_START,
    nextId: 1,
  };
}

export function createInputState(): InputState {
  return {
    heldDirections: [],
    attackQueued: false,
    kickQueued: false,
    dashQueued: false,
  };
}
