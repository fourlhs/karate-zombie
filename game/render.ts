import { ATTACK_DURATION, WORLD_HEIGHT, WORLD_WIDTH } from "./constants";
import type { GameState, Player, Zombie } from "./types";
import { getAttackHitbox } from "./update";

/** Draws one full frame from the current state. */
export function render(ctx: CanvasRenderingContext2D, state: GameState): void {
  drawBackground(ctx);
  drawAttackFlash(ctx, state.player);
  for (const zombie of state.zombies) {
    drawZombie(ctx, zombie, state.player);
  }
  drawPlayer(ctx, state.player);
  drawHud(ctx, state);
}

function drawBackground(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "#12151c";
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
  ctx.lineWidth = 1;
  const cell = 48;
  ctx.beginPath();
  for (let x = cell; x < WORLD_WIDTH; x += cell) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD_HEIGHT);
  }
  for (let y = cell; y < WORLD_HEIGHT; y += cell) {
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD_WIDTH, y);
  }
  ctx.stroke();
}

function drawAttackFlash(ctx: CanvasRenderingContext2D, player: Player): void {
  if (player.attack.activeTimer === 0) return;

  const hitbox = getAttackHitbox(player);
  const strength = player.attack.activeTimer / ATTACK_DURATION;
  ctx.fillStyle = `rgba(255, 214, 90, ${0.25 + 0.4 * strength})`;
  ctx.fillRect(hitbox.x, hitbox.y, hitbox.w, hitbox.h);
  ctx.strokeStyle = `rgba(255, 244, 200, ${0.5 + 0.5 * strength})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(hitbox.x, hitbox.y, hitbox.w, hitbox.h);
}

function drawZombie(
  ctx: CanvasRenderingContext2D,
  zombie: Zombie,
  player: Player
): void {
  const { x, y } = zombie.pos;

  ctx.fillStyle = "#4caf50";
  ctx.strokeStyle = "#2e7031";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, zombie.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Two dark eyes offset toward the player, so zombies look where they walk.
  const dx = player.pos.x - x;
  const dy = player.pos.y - y;
  const len = Math.hypot(dx, dy) || 1;
  const lookX = (dx / len) * zombie.radius * 0.4;
  const lookY = (dy / len) * zombie.radius * 0.4;
  const sideX = (-dy / len) * zombie.radius * 0.35;
  const sideY = (dx / len) * zombie.radius * 0.35;

  ctx.fillStyle = "#173a19";
  ctx.beginPath();
  ctx.arc(x + lookX + sideX, y + lookY + sideY, 2.6, 0, Math.PI * 2);
  ctx.arc(x + lookX - sideX, y + lookY - sideY, 2.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer(ctx: CanvasRenderingContext2D, player: Player): void {
  const { x, y } = player.pos;
  const half = player.size / 2;

  // White gi.
  ctx.fillStyle = "#f4f1e8";
  ctx.strokeStyle = "#c9c4b4";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x - half, y - half, player.size, player.size, 6);
  ctx.fill();
  ctx.stroke();

  // Black belt.
  ctx.fillStyle = "#1c1c1c";
  ctx.fillRect(x - half, y + half * 0.25, player.size, 6);

  // Fist marker on the facing side.
  const fistOffset = half + 4;
  let fx = x;
  let fy = y;
  switch (player.facing) {
    case "up":
      fy -= fistOffset;
      break;
    case "down":
      fy += fistOffset;
      break;
    case "left":
      fx -= fistOffset;
      break;
    case "right":
      fx += fistOffset;
      break;
  }
  ctx.fillStyle = "#e0a878";
  ctx.beginPath();
  ctx.arc(fx, fy, 6, 0, Math.PI * 2);
  ctx.fill();
}

function drawHud(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.fillStyle = "#f4f1e8";
  ctx.font = "bold 22px 'Segoe UI', system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(`SCORE  ${state.score}`, 16, 14);

  const { health, maxHealth } = state.player;
  const heartSize = 22;
  const spacing = 30;
  for (let i = 0; i < maxHealth; i++) {
    const hx = WORLD_WIDTH - 16 - (maxHealth - i) * spacing + spacing / 2;
    drawHeart(ctx, hx, 18, heartSize, i < health);
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.font = "14px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText("WASD move · SPACE attack", 16, WORLD_HEIGHT - 28);
}

function drawHeart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  filled: boolean
): void {
  const s = size / 2;
  ctx.fillStyle = filled ? "#e5484d" : "rgba(255, 255, 255, 0.15)";
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.arc(x - s * 0.5, y + s * 0.1, s * 0.55, Math.PI, 0);
  ctx.arc(x + s * 0.5, y + s * 0.1, s * 0.55, Math.PI, 0);
  ctx.lineTo(x, y + s * 1.2);
  ctx.closePath();
  ctx.fill();
}
