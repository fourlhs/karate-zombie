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
  /** Damage per landed swing; raised by dawn upgrades. */
  damage: number;
  /** Multiplier on attack cooldowns; lowered by dawn upgrades. */
  cooldownFactor: number;
  attack: AttackState;
}

export type UpgradeKind = "damage" | "speed" | "health";

export interface Zombie {
  id: number;
  pos: Vector2;
  radius: number;
  speed: number;
  /** Later days spawn tougher zombies with more than 1 hp. */
  hp: number;
  maxHp: number;
  /** Post-hit invulnerability; also drives the hurt flash. */
  hurtTimer: number;
}

export type SoundEffect =
  | "punch"
  | "kick"
  | "dash"
  | "kill"
  | "hurt"
  | "pickup"
  | "special"
  | "bossHit"
  | "bossDie"
  | "gameOver";

export type BossPhase = "walk" | "windup" | "lunge";

export interface Boss {
  pos: Vector2;
  radius: number;
  hp: number;
  maxHp: number;
  phase: BossPhase;
  /** Seconds left in the current phase. */
  phaseTimer: number;
  lungeDir: Vector2;
  /** Seconds until boss contact can damage the player again. */
  contactCooldown: number;
  /** Post-hit invulnerability; also drives the hurt flash. */
  hurtTimer: number;
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
  boss: Boss | null;
  /** Night number that last spawned a boss, so each boss night spawns one. */
  lastBossNight: number;
  /** Set at dawn; the shell pauses and offers an upgrade pick. */
  pendingUpgrade: boolean;
  drops: HealthDrop[];
  popups: ScorePopup[];
  /** Sound events queued by the update step; drained and played by the shell. */
  sounds: SoundEffect[];
  score: number;
  /** Best score from previous runs, loaded from localStorage. */
  highScore: number;
  /** Current kill chain; 0 when no combo is running. */
  combo: number;
  /** Seconds left to extend the combo with another kill. */
  comboTimer: number;
  shake: Shake;
  /** Special meter: kills charge it toward SPECIAL_MAX. */
  special: number;
  /** Expanding ring drawn after the special fires. */
  shockwave: { timer: number; duration: number; pos: Vector2 } | null;
  /** Slow motion; the simulation dt is scaled while timer > 0. */
  slowMo: { timer: number; duration: number };
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
  /** Set on J keydown, consumed by the update step. */
  specialQueued: boolean;
}

/** Axis-aligned rectangle, used for the attack hitbox. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
