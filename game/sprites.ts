/**
 * Hand-made pixel art. Each sprite is a grid of palette characters
 * ("." = transparent). Sprites are rasterized once to a small offscreen
 * canvas and drawn scaled-up with image smoothing off, so the game only
 * pays the pixel-by-pixel cost a single time per sprite.
 */

export interface Sprite {
  name: string;
  rows: string[];
}

const PALETTE: Record<string, string> = {
  k: "#22222a", // hair, belt, eyes
  w: "#f8f5e6", // gi
  W: "#ddd6bf", // gi shade
  s: "#f0c08c", // skin
  r: "#e04040", // headband, belt knot, zombie eyes, hearts
  g: "#a6d17a", // zombie skin
  G: "#7ba85a", // zombie skin shade
  c: "#4a4e69", // zombie clothes
  t: "#8a5a33", // tree trunk
  l: "#3f9d3f", // leaf
  L: "#2e7d32", // leaf dark
  m: "#66bb55", // leaf light
  y: "#ffd23f", // flower center
  d: "rgba(20, 35, 12, 0.35)", // empty heart
};

const sprite = (name: string, rows: string[]): Sprite => ({ name, rows });

// --- Karateka -------------------------------------------------------------

export const PLAYER_DOWN = [
  sprite("pd1", [
    "................",
    "....kkkkkkkk....",
    "....rrrrrrrr....",
    "....ssssssss....",
    "....skssssks....",
    ".....ssssss.....",
    "....wwwwwwww....",
    "...swwwwwwwws...",
    "...swwwWWwwws...",
    "....wwwWWwww....",
    "....kkkkkkkk....",
    "....kkkrrkkk....",
    ".....ww..ww.....",
    ".....ww..ww.....",
    ".....ww..ww.....",
    "....ss....ss....",
  ]),
  sprite("pd2", [
    "................",
    "....kkkkkkkk....",
    "....rrrrrrrr....",
    "....ssssssss....",
    "....skssssks....",
    ".....ssssss.....",
    "....wwwwwwww....",
    "...swwwwwwwws...",
    "...swwwWWwwws...",
    "....wwwWWwww....",
    "....kkkkkkkk....",
    "....kkkrrkkk....",
    ".....ww..ww.....",
    "....ww....ww....",
    "....ww....ww....",
    "...ss......ss...",
  ]),
];

export const PLAYER_DOWN_PUNCH = sprite("pdp", [
  "................",
  "....kkkkkkkk....",
  "....rrrrrrrr....",
  "....ssssssss....",
  "....skssssks....",
  ".....ssssss.....",
  "....wwwwwwww....",
  "...swwwwwwww....",
  "....wwwWWwww....",
  "....wwwWWwwww...",
  "....kkkkkkkkww..",
  "....kkkrrkkkww..",
  ".....ww..ww.ww..",
  ".....ww..ww.ss..",
  ".....ww..ww.....",
  "....ss....ss....",
]);

export const PLAYER_UP = [
  sprite("pu1", [
    "................",
    "....kkkkkkkk....",
    "....kkkkkkkk....",
    "....kkkkkkkk....",
    "....rrrrrrrr....",
    ".....ssssss.....",
    "....wwwwwwww....",
    "...swwwwwwwws...",
    "...swwwwwwwws...",
    "....wwwwwwww....",
    "....kkkkkkkk....",
    "....kkkrrkkk....",
    ".....ww..ww.....",
    ".....ww..ww.....",
    ".....ww..ww.....",
    "....ss....ss....",
  ]),
  sprite("pu2", [
    "................",
    "....kkkkkkkk....",
    "....kkkkkkkk....",
    "....kkkkkkkk....",
    "....rrrrrrrr....",
    ".....ssssss.....",
    "....wwwwwwww....",
    "...swwwwwwwws...",
    "...swwwwwwwws...",
    "....wwwwwwww....",
    "....kkkkkkkk....",
    "....kkkrrkkk....",
    ".....ww..ww.....",
    "....ww....ww....",
    "....ww....ww....",
    "...ss......ss...",
  ]),
];

export const PLAYER_UP_PUNCH = sprite("pup", [
  "............ss..",
  "....kkkkkkkkww..",
  "....kkkkkkkkww..",
  "....kkkkkkkkww..",
  "....rrrrrrrrww..",
  ".....ssssss.ww..",
  "....wwwwwwwwww..",
  "...swwwwwwwww...",
  "....wwwwwwww....",
  "....wwwwwwww....",
  "....kkkkkkkk....",
  "....kkkrrkkk....",
  ".....ww..ww.....",
  ".....ww..ww.....",
  ".....ww..ww.....",
  "....ss....ss....",
]);

export const PLAYER_SIDE = [
  sprite("ps1", [
    "................",
    ".....kkkkkk.....",
    "....kkkkkkkk....",
    "....rrrrrrrr....",
    "....ssssssks....",
    ".....sssssss....",
    "....wwwwwww.....",
    "....wwwwwwws....",
    "....wwwwwww.....",
    "....wwwwww......",
    "....kkkkkkk.....",
    "....kkkkrkk.....",
    ".....ww.ww......",
    ".....ww.ww......",
    ".....ww.ww......",
    "....ss...ss.....",
  ]),
  sprite("ps2", [
    "................",
    ".....kkkkkk.....",
    "....kkkkkkkk....",
    "....rrrrrrrr....",
    "....ssssssks....",
    ".....sssssss....",
    "....wwwwwww.....",
    "....wwwwwwws....",
    "....wwwwwww.....",
    "....wwwwww......",
    "....kkkkkkk.....",
    "....kkkkrkk.....",
    ".....ww.ww......",
    "....ww...ww.....",
    "....ww...ww.....",
    "...ss.....ss....",
  ]),
];

export const PLAYER_SIDE_PUNCH = sprite("psp", [
  "................",
  ".....kkkkkk.....",
  "....kkkkkkkk....",
  "....rrrrrrrr....",
  "....ssssssks....",
  ".....sssssss....",
  "....wwwwwww.....",
  "....wwwwwwwwwss.",
  "....wwwwwww.....",
  "....wwwwww......",
  "....kkkkkkk.....",
  "....kkkkrkk.....",
  ".....ww.ww......",
  ".....ww.ww......",
  ".....ww.ww......",
  "....ss...ss.....",
]);

// --- Zombies --------------------------------------------------------------

export const ZOMBIE_DOWN = [
  sprite("zd1", [
    "................",
    ".....gggggg.....",
    "....gggggggg....",
    "....grggggrg....",
    "....gggggggg....",
    ".....gGGGGg.....",
    "..ggccccccccgg..",
    "..ggccccccccgg..",
    "....cGccccGc....",
    "....cccccccc....",
    "....ccccGccc....",
    ".....cc..cc.....",
    ".....cc..cc.....",
    ".....cc..cc.....",
    ".....gg..gg.....",
    "................",
  ]),
  sprite("zd2", [
    "................",
    ".....gggggg.....",
    "....gggggggg....",
    "....grggggrg....",
    "....gggggggg....",
    "..gg.gGGGGg.....",
    "..ggcccccccc....",
    "....ccccccccgg..",
    "....cGccccGcgg..",
    "....cccccccc....",
    "....ccccGccc....",
    ".....cc..cc.....",
    "....cc....cc....",
    "....cc....cc....",
    "....gg....gg....",
    "................",
  ]),
];

export const ZOMBIE_UP = [
  sprite("zu1", [
    "................",
    ".....gggggg.....",
    "....gggggggg....",
    "....ggGGgggg....",
    "....gggggggg....",
    ".....gggggg.....",
    "..ggccccccccgg..",
    "..ggccccccccgg..",
    "....ccGccccc....",
    "....cccccccc....",
    "....cccccGcc....",
    ".....cc..cc.....",
    ".....cc..cc.....",
    ".....cc..cc.....",
    ".....gg..gg.....",
    "................",
  ]),
  sprite("zu2", [
    "................",
    ".....gggggg.....",
    "....gggggggg....",
    "....ggGGgggg....",
    "....gggggggg....",
    "..gg.gggggg.....",
    "..ggcccccccc....",
    "....ccccccccgg..",
    "....ccGcccccgg..",
    "....cccccccc....",
    "....cccccGcc....",
    ".....cc..cc.....",
    "....cc....cc....",
    "....cc....cc....",
    "....gg....gg....",
    "................",
  ]),
];

export const ZOMBIE_SIDE = [
  sprite("zs1", [
    "................",
    ".....ggggg......",
    "....ggggggg.....",
    "....gggggrg.....",
    "....ggggggg.....",
    ".....gGGgg......",
    "....cccccggggg..",
    "....cccccggggg..",
    "....ccccc.......",
    "....cGccc.......",
    "....ccccc.......",
    ".....cc.cc......",
    ".....cc.cc......",
    ".....cc.cc......",
    ".....gg.gg......",
    "................",
  ]),
  sprite("zs2", [
    "................",
    ".....ggggg......",
    "....ggggggg.....",
    "....gggggrg.....",
    "....ggggggg.....",
    ".....gGGgg......",
    "....cccccgggg...",
    "....ccccc.......",
    "....cccccggggg..",
    "....cGccc.......",
    "....ccccc.......",
    ".....cc..cc.....",
    "....cc....cc....",
    "....cc....cc....",
    "....gg....gg....",
    "................",
  ]),
];

// --- Scenery --------------------------------------------------------------

export const TREE = sprite("tree", [
  ".....llllll.....",
  "...llllllllll...",
  "..llmmllllllll..",
  ".llmmllllllllll.",
  ".llllllLLllllll.",
  "llmlllllLLllllll",
  "llllllllllllllLl",
  ".llllLLllllllll.",
  "..llllllllllll..",
  "...llllLLllll...",
  "....llllllll....",
  "......tttt......",
  "......tttt......",
  "......tttt......",
  ".....tttttt.....",
  "................",
]);

export const BUSH = sprite("bush", [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "...lll...lll....",
  "..lllllllllll...",
  ".llmmlllllLLll..",
  ".lllllllllllll..",
  "llllLLlllllmlll.",
  ".lllllllllllll..",
  "..lllllllllll...",
  "................",
]);

export const FLOWER = sprite("flower", [".w.", "wyw", ".w."]);

export const TUFT = sprite("tuft", ["G.G", ".G.", "G.G"]);

// --- HUD ------------------------------------------------------------------

export const HEART_FULL = sprite("heart", [
  ".rr..rr.",
  "rrrrrrrr",
  "rrrrrrrr",
  "rrrrrrrr",
  ".rrrrrr.",
  "..rrrr..",
  "...rr...",
  "........",
]);

export const HEART_EMPTY = sprite("heart0", [
  ".dd..dd.",
  "dddddddd",
  "dddddddd",
  "dddddddd",
  ".dddddd.",
  "..dddd..",
  "...dd...",
  "........",
]);

// --- Rasterizer -----------------------------------------------------------

const cache = new Map<string, HTMLCanvasElement>();

function rasterize(spr: Sprite, flipX: boolean): HTMLCanvasElement {
  const key = flipX ? `${spr.name}|f` : spr.name;
  const cached = cache.get(key);
  if (cached) return cached;

  const h = spr.rows.length;
  const w = Math.max(...spr.rows.map((row) => row.length));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  for (let y = 0; y < h; y++) {
    const row = spr.rows[y];
    for (let x = 0; x < row.length; x++) {
      const color = PALETTE[row[x]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(flipX ? w - 1 - x : x, y, 1, 1);
    }
  }

  cache.set(key, canvas);
  return canvas;
}

/** Draws a sprite centered on (cx, cy), scaled up with crisp pixels. */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  spr: Sprite,
  cx: number,
  cy: number,
  scale: number,
  flipX = false
): void {
  const img = rasterize(spr, flipX);
  ctx.drawImage(
    img,
    Math.round(cx - (img.width * scale) / 2),
    Math.round(cy - (img.height * scale) / 2),
    img.width * scale,
    img.height * scale
  );
}
