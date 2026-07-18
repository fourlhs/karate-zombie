/** Logical playfield size; the canvas is scaled to fit the window. */
export const WORLD_WIDTH = 960;
export const WORLD_HEIGHT = 600;

/** Cap on frame delta so a backgrounded tab doesn't cause a huge jump. */
export const MAX_DELTA = 0.05;

export const PLAYER_SIZE = 36;
export const PLAYER_SPEED = 260;
export const PLAYER_MAX_HEALTH = 3;

/** How far the attack hitbox extends beyond the player's edge. */
export const ATTACK_REACH = 52;
/** Hitbox width perpendicular to the facing direction. */
export const ATTACK_WIDTH = 68;
export const ATTACK_DURATION = 0.12;
export const ATTACK_COOLDOWN = 0.35;
export const SCORE_PER_ZOMBIE = 10;

/** The kick reaches further and sweeps wider, but recharges much slower. */
export const KICK_REACH = 80;
export const KICK_WIDTH = 96;
export const KICK_DURATION = 0.16;
export const KICK_COOLDOWN = 1.1;

export const ZOMBIE_RADIUS = 15;
export const ZOMBIE_BASE_SPEED = 70;
/** Random per-zombie speed variance, +/- this amount. */
export const ZOMBIE_SPEED_VARIANCE = 20;
/** Extra zombie speed gained per second survived, and its cap. */
export const ZOMBIE_SPEED_RAMP = 0.6;
export const ZOMBIE_SPEED_RAMP_MAX = 55;
/** Spawn just outside the visible edge by this margin. */
export const SPAWN_MARGIN = 24;

export const SPAWN_INTERVAL_START = 1.6;
export const SPAWN_INTERVAL_MIN = 0.45;
/** Seconds over which the spawn interval ramps from start to min. */
export const SPAWN_RAMP_DURATION = 90;

export const HIGH_SCORE_KEY = "karate-zombies-high-score";
export const SOUND_KEY = "karate-zombies-sound";

/** Boss zombie: spawns at the start of every Nth night. */
export const BOSS_EVERY_N_NIGHTS = 2;
export const BOSS_HP = 4;
export const BOSS_RADIUS = 30;
export const BOSS_SPEED = 55;
export const BOSS_SCORE = 100;
/** Boss attack cycle: walk, telegraphed windup, then a fast lunge. */
export const BOSS_WALK_TIME = 3;
export const BOSS_WINDUP_TIME = 0.8;
export const BOSS_LUNGE_TIME = 0.45;
export const BOSS_LUNGE_SPEED = 430;
/** Min seconds between boss contact hits, and its post-hit invulnerability. */
export const BOSS_CONTACT_COOLDOWN = 1.2;
export const BOSS_HURT_TIME = 0.25;

/** Dash: a quick burst on Shift with brief invulnerability. */
export const DASH_SPEED = 800;
export const DASH_DURATION = 0.18;
export const DASH_COOLDOWN = 1.0;

/** Kills within this window chain into a combo; the bonus caps at x5. */
export const COMBO_WINDOW = 2;
export const COMBO_MAX_MULT = 5;
/** Score popups: lifetime in seconds and how far they float up. */
export const POPUP_TTL = 0.8;
export const POPUP_RISE = 40;
/** Screen shake (duration seconds, magnitude logical px). */
export const SHAKE_HIT_DURATION = 0.3;
export const SHAKE_HIT_MAGNITUDE = 8;
export const SHAKE_KILL_DURATION = 0.1;
export const SHAKE_KILL_MAGNITUDE = 3;

/** Special move: charged by kills, unleashed on J. */
export const SPECIAL_MAX = 15;
export const SPECIAL_BOSS_DAMAGE = 2;
export const SHOCKWAVE_DURATION = 0.5;

/** Slow motion: starting time scale, ramping back to full speed. */
export const SLOWMO_SCALE = 0.2;
export const SLOWMO_SPECIAL_DURATION = 0.6;

/** Dawn upgrades: pick one at the start of each day (after night 1). */
export const UPGRADE_DAMAGE_INC = 1;
export const UPGRADE_COOLDOWN_FACTOR = 0.75;
export const UPGRADE_COOLDOWN_MIN = 0.4;
/** Tough zombies: +1 hp every N days survived, capped. */
export const ZOMBIE_HP_PER_DAYS = 2;
export const ZOMBIE_HP_MAX = 3;
/** Post-hit invulnerability for multi-hp zombies (one hit per swing). */
export const ZOMBIE_HURT_TIME = 0.2;

/** Chance a killed zombie leaves a health drop behind. */
export const DROP_CHANCE = 0.2;
/** Seconds a drop stays on the ground, and its pickup radius. */
export const DROP_TTL = 12;
export const DROP_RADIUS = 14;

/** Day/night cycle: bright easy days, dark dangerous nights. */
export const DAY_DURATION = 15;
export const NIGHT_DURATION = 12;
/** Seconds dusk and dawn take to fade in and out. */
export const NIGHT_FADE = 2;
/** At full night the spawn interval is multiplied by this (more zombies). */
export const NIGHT_SPAWN_FACTOR = 0.5;
/** At full night zombie speed is multiplied by this. */
export const NIGHT_SPEED_FACTOR = 1.4;
