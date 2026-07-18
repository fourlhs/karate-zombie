import {
  ATTACK_DURATION,
  KICK_DURATION,
  POPUP_RISE,
  POPUP_TTL,
  SPECIAL_MAX,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "./constants";
import type { GameState, Player, Zombie } from "./types";
import { getAttackHitbox, getNightFactor } from "./update";
import {
  BOSS_DOWN,
  BOSS_SIDE,
  BOSS_UP,
  BUSH,
  type Sprite,
  drawSprite,
  FLOWER,
  HEART_EMPTY,
  HEART_FULL,
  MOON,
  PLAYER_DOWN,
  PLAYER_DOWN_KICK,
  PLAYER_DOWN_PUNCH,
  PLAYER_SIDE,
  PLAYER_SIDE_KICK,
  PLAYER_SIDE_PUNCH,
  PLAYER_UP,
  PLAYER_UP_KICK,
  PLAYER_UP_PUNCH,
  SUN,
  TREE,
  TUFT,
  ZOMBIE_DOWN,
  ZOMBIE_SIDE,
  ZOMBIE_UP,
} from "./sprites";

const SPRITE_SCALE = 3;
const BOSS_SCALE = 5;

let hudFont = "monospace";
let touchMode = false;

/** Lets the React shell pass in the loaded arcade font family. */
export function setHudFont(fontFamily: string): void {
  hudFont = fontFamily;
}

/** On touch devices the HUD drops its keyboard hints. */
export function setTouchMode(value: boolean): void {
  touchMode = value;
}

/** Draws one full frame from the current state. */
export function render(ctx: CanvasRenderingContext2D, state: GameState): void {
  // Screen shake: jolt the whole world layer, decaying over the shake timer.
  const { timer, duration, magnitude } = state.shake;
  const mag = timer > 0 ? magnitude * (timer / duration) : 0;
  if (mag > 0) {
    // Backfill so the shaken world doesn't reveal black at the edges.
    ctx.fillStyle = "#6fb545";
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }
  ctx.save();
  ctx.translate(
    Math.round(Math.sin(state.elapsed * 55) * mag),
    Math.round(Math.cos(state.elapsed * 47) * mag)
  );

  ctx.drawImage(getBackground(), 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  drawAttackFlash(ctx, state.player);
  drawDrops(ctx, state);
  for (const zombie of state.zombies) {
    drawZombie(ctx, zombie, state);
  }
  if (state.boss) {
    drawBoss(ctx, state);
  }
  drawPlayer(ctx, state);
  drawParticles(ctx, state);
  drawShockwave(ctx, state);
  drawPopups(ctx, state);
  ctx.restore();

  // Night falls over the whole scene, but never over the HUD.
  const night = getNightFactor(state.elapsed);
  if (night > 0) {
    ctx.fillStyle = `rgba(16, 20, 62, ${0.48 * night})`;
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }

  drawHud(ctx, state, night);
}

// --- Background -----------------------------------------------------------

let bgCanvas: HTMLCanvasElement | null = null;

/** The grass field with trees and bushes, composed once per page load. */
function getBackground(): HTMLCanvasElement {
  if (bgCanvas) return bgCanvas;

  const canvas = document.createElement("canvas");
  canvas.width = WORLD_WIDTH;
  canvas.height = WORLD_HEIGHT;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  // Grass base with a subtle checkerboard of mowed stripes.
  ctx.fillStyle = "#6fb545";
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  ctx.fillStyle = "#79bf4e";
  const tile = 48;
  for (let ty = 0; ty * tile < WORLD_HEIGHT; ty++) {
    for (let tx = 0; tx * tile < WORLD_WIDTH; tx++) {
      if ((tx + ty) % 2 === 0) {
        ctx.fillRect(tx * tile, ty * tile, tile, tile);
      }
    }
  }

  for (let i = 0; i < 110; i++) {
    drawSprite(
      ctx,
      TUFT,
      Math.random() * WORLD_WIDTH,
      Math.random() * WORLD_HEIGHT,
      SPRITE_SCALE
    );
  }
  for (let i = 0; i < 18; i++) {
    drawSprite(
      ctx,
      FLOWER,
      Math.random() * WORLD_WIDTH,
      Math.random() * WORLD_HEIGHT,
      SPRITE_SCALE
    );
  }
  for (let i = 0; i < 6; i++) {
    drawSprite(
      ctx,
      BUSH,
      60 + Math.random() * (WORLD_WIDTH - 120),
      60 + Math.random() * (WORLD_HEIGHT - 120),
      SPRITE_SCALE
    );
  }
  // Trees hug the top and bottom edges so they frame the field
  // without hiding the action in the middle.
  for (let i = 0; i < 8; i++) {
    const x = 50 + Math.random() * (WORLD_WIDTH - 100);
    const y =
      i % 2 === 0 ? 20 + Math.random() * 50 : WORLD_HEIGHT - 70 + Math.random() * 40;
    drawSprite(ctx, TREE, x, y, 4);
  }

  bgCanvas = canvas;
  return canvas;
}

// --- Entities -------------------------------------------------------------

function drawAttackFlash(ctx: CanvasRenderingContext2D, player: Player): void {
  if (player.attack.activeTimer === 0) return;

  const kicking = player.attack.kind === "kick";
  const hitbox = getAttackHitbox(player);
  const strength =
    player.attack.activeTimer / (kicking ? KICK_DURATION : ATTACK_DURATION);
  ctx.fillStyle = kicking
    ? `rgba(255, 186, 80, ${0.2 + 0.25 * strength})`
    : `rgba(255, 255, 255, ${0.15 + 0.25 * strength})`;
  ctx.fillRect(hitbox.x, hitbox.y, hitbox.w, hitbox.h);
}

function drawPopups(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.font = `12px ${hudFont}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  for (const popup of state.popups) {
    const age = 1 - popup.ttl / POPUP_TTL;
    const y = popup.pos.y - 26 - age * POPUP_RISE;
    ctx.globalAlpha = Math.min(1, popup.ttl / (POPUP_TTL * 0.4));
    ctx.fillStyle = "#22222a";
    ctx.fillText(popup.text, popup.pos.x + 1, y + 1);
    ctx.fillStyle = "#ffd23f";
    ctx.fillText(popup.text, popup.pos.x, y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
}

function drawDrops(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const drop of state.drops) {
    // Blink through the last three seconds before fading away.
    if (drop.ttl < 3 && Math.floor(state.elapsed * 6) % 2 === 0) continue;
    const bob = Math.sin(state.elapsed * 4 + drop.id) * 3;
    drawSprite(ctx, HEART_FULL, drop.pos.x, drop.pos.y + bob, SPRITE_SCALE);
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, state: GameState): void {
  const player = state.player;
  const attacking = player.attack.activeTimer > 0;
  const kicking = attacking && player.attack.kind === "kick";
  const walkFrame = player.moving ? Math.floor(state.elapsed * 8) % 2 : 0;

  let spr: Sprite;
  let flip = false;
  switch (player.facing) {
    case "up":
      spr = kicking
        ? PLAYER_UP_KICK
        : attacking
          ? PLAYER_UP_PUNCH
          : PLAYER_UP[walkFrame];
      break;
    case "down":
      spr = kicking
        ? PLAYER_DOWN_KICK
        : attacking
          ? PLAYER_DOWN_PUNCH
          : PLAYER_DOWN[walkFrame];
      break;
    case "left":
      flip = true;
    // fall through
    case "right":
      spr = kicking
        ? PLAYER_SIDE_KICK
        : attacking
          ? PLAYER_SIDE_PUNCH
          : PLAYER_SIDE[walkFrame];
      break;
  }
  // Dash afterimages trail behind the burst.
  if (player.dashTimer > 0) {
    for (const [dist, alpha] of [
      [36, 0.15],
      [18, 0.3],
    ]) {
      ctx.globalAlpha = alpha;
      drawSprite(
        ctx,
        spr,
        player.pos.x - player.dashDir.x * dist,
        player.pos.y - player.dashDir.y * dist,
        SPRITE_SCALE,
        flip
      );
    }
    ctx.globalAlpha = 1;
  }
  drawSprite(ctx, spr, player.pos.x, player.pos.y, SPRITE_SCALE, flip);
}

function drawZombie(
  ctx: CanvasRenderingContext2D,
  zombie: Zombie,
  state: GameState
): void {
  const dx = state.player.pos.x - zombie.pos.x;
  const dy = state.player.pos.y - zombie.pos.y;
  const frame = Math.floor(state.elapsed * 5 + zombie.id * 0.7) % 2;

  let spr: Sprite;
  let flip = false;
  if (Math.abs(dx) > Math.abs(dy)) {
    spr = ZOMBIE_SIDE[frame];
    flip = dx < 0;
  } else {
    spr = dy > 0 ? ZOMBIE_DOWN[frame] : ZOMBIE_UP[frame];
  }
  // Post-hit flash for tough zombies that survived a swing.
  const flashing =
    zombie.hurtTimer > 0 && Math.floor(state.elapsed * 30) % 2 === 0;
  if (!flashing) {
    drawSprite(ctx, spr, zombie.pos.x, zombie.pos.y, SPRITE_SCALE, flip);
  }

  if (zombie.maxHp > 1) {
    const barW = 22;
    const barX = zombie.pos.x - barW / 2;
    const barY = zombie.pos.y - 30;
    ctx.fillStyle = "rgba(20, 20, 26, 0.7)";
    ctx.fillRect(barX - 1, barY - 1, barW + 2, 5);
    ctx.fillStyle = "#e5484d";
    ctx.fillRect(barX, barY, (barW * zombie.hp) / zombie.maxHp, 3);
  }
}

function drawBoss(ctx: CanvasRenderingContext2D, state: GameState): void {
  const boss = state.boss!;
  // Post-hit flash: blink the sprite while invulnerable.
  const flashing =
    boss.hurtTimer > 0 && Math.floor(state.elapsed * 30) % 2 === 0;

  // Face the player while stalking, or the lunge direction mid-charge.
  const dx =
    boss.phase === "lunge" ? boss.lungeDir.x : state.player.pos.x - boss.pos.x;
  const dy =
    boss.phase === "lunge" ? boss.lungeDir.y : state.player.pos.y - boss.pos.y;
  let spr: Sprite;
  let flip = false;
  if (Math.abs(dx) > Math.abs(dy)) {
    spr = BOSS_SIDE;
    flip = dx < 0;
  } else {
    spr = dy > 0 ? BOSS_DOWN : BOSS_UP;
  }

  // The windup telegraph: the boss trembles and flags the incoming lunge.
  const jitter =
    boss.phase === "windup" ? Math.sin(state.elapsed * 60) * 2.5 : 0;
  if (!flashing) {
    drawSprite(ctx, spr, boss.pos.x + jitter, boss.pos.y, BOSS_SCALE, flip);
  }
  if (boss.phase === "windup") {
    ctx.font = `18px ${hudFont}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = "#e5484d";
    ctx.fillText("!", boss.pos.x, boss.pos.y - 52 + Math.sin(state.elapsed * 12) * 3);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
  }

  // HP bar above the boss.
  const barW = 64;
  const barX = boss.pos.x - barW / 2;
  const barY = boss.pos.y - 48;
  ctx.fillStyle = "rgba(20, 20, 26, 0.7)";
  ctx.fillRect(barX - 1, barY - 1, barW + 2, 8);
  ctx.fillStyle = "#e5484d";
  ctx.fillRect(barX, barY, (barW * boss.hp) / boss.maxHp, 6);
}

function drawParticles(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const p of state.particles) {
    ctx.globalAlpha = Math.min(1, p.ttl / p.maxTtl);
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.pos.x) - 2, Math.round(p.pos.y) - 2, 4, 4);
  }
  ctx.globalAlpha = 1;
}

function drawShockwave(ctx: CanvasRenderingContext2D, state: GameState): void {
  const wave = state.shockwave;
  if (!wave) return;
  const t = 1 - wave.timer / wave.duration;

  // White screen flash that fades as the ring expands.
  ctx.fillStyle = `rgba(255, 255, 255, ${0.35 * (1 - t)})`;
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  ctx.strokeStyle = `rgba(255, 214, 90, ${0.9 * (1 - t)})`;
  ctx.lineWidth = 6 + 14 * (1 - t);
  ctx.beginPath();
  ctx.arc(wave.pos.x, wave.pos.y, 60 + t * 500, 0, Math.PI * 2);
  ctx.stroke();
}

// --- HUD ------------------------------------------------------------------

function drawHud(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  night: number
): void {
  // Touch screens shrink the whole world, so the HUD compensates by growing.
  const hs = touchMode ? 1.6 : 1;
  const px = (v: number) => Math.round(v * hs);

  drawSprite(
    ctx,
    night > 0.5 ? MOON : SUN,
    WORLD_WIDTH / 2,
    px(28),
    px(SPRITE_SCALE)
  );

  ctx.font = `${px(16)}px ${hudFont}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(20, 35, 12, 0.6)";
  ctx.fillText(`SCORE ${state.score}`, 18, 18);
  ctx.fillStyle = "#fffbe8";
  ctx.fillText(`SCORE ${state.score}`, 16, 16);

  if (state.combo >= 2) {
    ctx.font = `${px(12)}px ${hudFont}`;
    ctx.fillStyle = "rgba(20, 35, 12, 0.6)";
    ctx.fillText(`COMBO x${state.combo}`, 18, 18 + px(28));
    ctx.fillStyle = "#ffd23f";
    ctx.fillText(`COMBO x${state.combo}`, 16, 16 + px(28));
  }

  const { health, maxHealth } = state.player;
  const spacing = px(30);
  for (let i = 0; i < maxHealth; i++) {
    const hx = WORLD_WIDTH - 16 - (maxHealth - i) * spacing + spacing / 2;
    drawSprite(
      ctx,
      i < health ? HEART_FULL : HEART_EMPTY,
      hx,
      px(26),
      px(SPRITE_SCALE)
    );
  }

  ctx.font = `${px(10)}px ${hudFont}`;
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255, 251, 232, 0.75)";
  ctx.fillText(
    `BEST ${Math.max(state.highScore, state.score)}`,
    WORLD_WIDTH - 16,
    px(48)
  );
  ctx.textAlign = "left";

  if (!touchMode) {
    ctx.font = `10px ${hudFont}`;
    ctx.fillStyle = "rgba(20, 35, 12, 0.55)";
    ctx.fillText(
      "WASD MOVE · SPACE PUNCH · K KICK · SHIFT DASH",
      16,
      WORLD_HEIGHT - 26
    );
  }

  // Special meter, bottom center.
  const ratio = state.special / SPECIAL_MAX;
  const barW = px(180);
  const barH = px(10);
  const barX = WORLD_WIDTH / 2 - barW / 2;
  const barY = WORLD_HEIGHT - px(30);
  ctx.fillStyle = "rgba(20, 20, 26, 0.6)";
  ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
  ctx.fillStyle = ratio >= 1 ? "#ffd23f" : "rgba(255, 210, 63, 0.55)";
  ctx.fillRect(barX, barY, barW * ratio, barH);
  ctx.font = `${px(9)}px ${hudFont}`;
  ctx.textAlign = "center";
  if (ratio >= 1) {
    if (Math.floor(state.elapsed * 3) % 2 === 0) {
      ctx.fillStyle = "#ffd23f";
      ctx.fillText(
        touchMode ? "SPECIAL READY!" : "PRESS J!",
        WORLD_WIDTH / 2,
        barY - px(14)
      );
    }
  } else {
    ctx.fillStyle = "rgba(20, 35, 12, 0.55)";
    ctx.fillText("SPECIAL", WORLD_WIDTH / 2, barY - px(14));
  }
  ctx.textAlign = "left";
}
