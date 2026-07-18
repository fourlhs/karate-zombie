export type Direction = "up" | "down" | "left" | "right";

export type GameStatus = "playing" | "gameover";

export interface Vector2 {
  x: number;
  y: number;
}

export type AttackKind = "punch" | "kick";

export interface AttackState {
  /** Which attack the active swing (or the last one) is. */
  kind: AttackKind;
  /** Seconds the current swing remains active; 0 = not attacking. */
  activeTimer: number;
  /** Seconds until the next punch is allowed; 0 = ready. */
  punchCooldown: number;
  /** Seconds until the next kick is allowed; 0 = ready. */
  kickCooldown: number;
}

export interface Player {
  pos: Vector2;
  /** Side length of the player's square, in logical pixels. */
  size: number;
  speed: number;
  facing: Direction;
  /** True while movement keys are held; drives the walk animation. */
  moving: boolean;
  /** Seconds of dash burst left; the player is invulnerable while > 0. */
  dashTimer: number;
  /** Seconds until the next dash is allowed. */
  dashCooldown: number;
  dashDir: Vector2;
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

export interface HealthDrop {
  id: number;
  pos: Vector2;
  /** Seconds until the drop disappears. */
  ttl: number;
}

export interface ScorePopup {
  id: number;
  pos: Vector2;
  text: string;
  /** Seconds left; drives the float-up and fade-out. */
  ttl: number;
}

export interface Shake {
  /** Seconds of shake left; 0 = still. */
  timer: number;
  duration: number;
  magnitude: number;
}

export interface GameState {
  status: GameStatus;
  player: Player;
  zombies: Zombie[];
  drops: HealthDrop[];
  popups: ScorePopup[];
  score: number;
  /** Current kill chain; 0 when no combo is running. */
  combo: number;
  /** Seconds left to extend the combo with another kill. */
  comboTimer: number;
  shake: Shake;
  /** Seconds since the run started; drives the difficulty ramp. */
  elapsed: number;
  /** Seconds until the next zombie spawns. */
  spawnTimer: number;
  /** Shared id counter for zombies and drops. */
  nextId: number;
}

export interface InputState {
  /** Currently held movement directions, in press order (latest last). */
  heldDirections: Direction[];
  /** Set on Space keydown, consumed by the update step. */
  attackQueued: boolean;
  /** Set on K keydown, consumed by the update step. */
  kickQueued: boolean;
  /** Set on Shift keydown, consumed by the update step. */
  dashQueued: boolean;
}

/** Axis-aligned rectangle, used for the attack hitbox. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
