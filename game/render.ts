import {
  ATTACK_DURATION,
  KICK_DURATION,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "./constants";
import type { GameState, Player, Zombie } from "./types";
import { getAttackHitbox, getNightFactor } from "./update";
import {
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

let hudFont = "monospace";

/** Lets the React shell pass in the loaded arcade font family. */
export function setHudFont(fontFamily: string): void {
  hudFont = fontFamily;
}

/** Draws one full frame from the current state. */
export function render(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.drawImage(getBackground(), 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  drawAttackFlash(ctx, state.player);
  for (const zombie of state.zombies) {
    drawZombie(ctx, zombie, state);
  }
  drawPlayer(ctx, state);

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
  drawSprite(ctx, spr, zombie.pos.x, zombie.pos.y, SPRITE_SCALE, flip);
}

// --- HUD ------------------------------------------------------------------

function drawHud(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  night: number
): void {
  drawSprite(ctx, night > 0.5 ? MOON : SUN, WORLD_WIDTH / 2, 28, SPRITE_SCALE);

  ctx.font = `16px ${hudFont}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(20, 35, 12, 0.6)";
  ctx.fillText(`SCORE ${state.score}`, 18, 18);
  ctx.fillStyle = "#fffbe8";
  ctx.fillText(`SCORE ${state.score}`, 16, 16);

  const { health, maxHealth } = state.player;
  const spacing = 30;
  for (let i = 0; i < maxHealth; i++) {
    const hx = WORLD_WIDTH - 16 - (maxHealth - i) * spacing + spacing / 2;
    drawSprite(ctx, i < health ? HEART_FULL : HEART_EMPTY, hx, 26, SPRITE_SCALE);
  }

  ctx.font = `10px ${hudFont}`;
  ctx.fillStyle = "rgba(20, 35, 12, 0.55)";
  ctx.fillText("WASD MOVE · SPACE PUNCH · K KICK", 16, WORLD_HEIGHT - 26);
}
