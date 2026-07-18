import {
  PLAYER_MAX_HEALTH,
  PLAYER_SIZE,
  PLAYER_SPEED,
  SPAWN_INTERVAL_START,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "./constants";
import type { GameState, InputState } from "./types";

export function createInitialState(): GameState {
  return {
    status: "playing",
    player: {
      pos: { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 },
      size: PLAYER_SIZE,
      speed: PLAYER_SPEED,
      facing: "down",
      moving: false,
      health: PLAYER_MAX_HEALTH,
      maxHealth: PLAYER_MAX_HEALTH,
      attack: { activeTimer: 0, cooldownTimer: 0 },
    },
    zombies: [],
    score: 0,
    elapsed: 0,
    spawnTimer: SPAWN_INTERVAL_START,
    nextZombieId: 1,
  };
}

export function createInputState(): InputState {
  return {
    heldDirections: [],
    attackQueued: false,
  };
}
