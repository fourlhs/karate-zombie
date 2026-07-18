export type Direction = "up" | "down" | "left" | "right";

export type GameStatus = "playing" | "gameover";

export interface Vector2 {
  x: number;
  y: number;
}

export interface AttackState {
  /** Seconds the current swing remains active; 0 = not attacking. */
  activeTimer: number;
  /** Seconds until the next swing is allowed; 0 = ready. */
  cooldownTimer: number;
}

export interface Player {
  pos: Vector2;
  /** Side length of the player's square, in logical pixels. */
  size: number;
  speed: number;
  facing: Direction;
  /** True while movement keys are held; drives the walk animation. */
  moving: boolean;
  health: number;
  maxHealth: number;
  attack: AttackState;
}

export interface Zombie {
  id: number;
  pos: Vector2;
  radius: number;
  speed: number;
}

export interface GameState {
  status: GameStatus;
  player: Player;
  zombies: Zombie[];
  score: number;
  /** Seconds since the run started; drives the difficulty ramp. */
  elapsed: number;
  /** Seconds until the next zombie spawns. */
  spawnTimer: number;
  nextZombieId: number;
}

export interface InputState {
  /** Currently held movement directions, in press order (latest last). */
  heldDirections: Direction[];
  /** Set on Space keydown, consumed by the update step. */
  attackQueued: boolean;
}

/** Axis-aligned rectangle, used for the attack hitbox. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
