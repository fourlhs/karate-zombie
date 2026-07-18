# Karate Zombies

A single-screen browser game built with Next.js 14 (app router) and TypeScript.
Everything runs client-side on an HTML canvas — no backend, no database, no assets.

## How to run

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

For a production build: `npm run build && npm start`.

## How to play

- **WASD** — move (the karateka faces the direction you last moved)
- **Space** — punch: a short-range strike in front of you, active for a few
  frames with a brief cooldown
- **K** — kick: reaches further and sweeps wider, but takes much longer to
  recharge
- Zombies spawn at random screen edges and walk toward you. Hitting one with
  your attack kills it and scores points. If one reaches you, it deals 1 damage
  and is destroyed. At 0 health you get a Game Over screen with your final
  score and a restart button.
- The longer you survive, the faster zombies spawn and move (capped).
- Day and night alternate every ~15 seconds (sun/moon icon in the HUD). At
  night the field darkens and zombies spawn twice as fast and move ~40%
  faster; at dawn it eases off again.
- Killed zombies sometimes (20%) drop a heart. Walk into it to regain 1
  health (up to 3). Drops blink and vanish after 12 seconds, and stay on the
  ground if you're already at full health.

## Architecture

The game is split into a thin React shell and a plain-TypeScript game core:

```
components/Game.tsx   React shell: canvas, rAF loop, input wiring, overlay UI
game/types.ts         Typed interfaces: Player, Zombie, GameState, InputState
game/constants.ts     All tunable numbers (sizes, speeds, timers, ramp curve)
game/state.ts         createInitialState() — also used by the restart button
game/input.ts         Keyboard listeners → InputState (with cleanup function)
game/update.ts        Simulation step: movement, attack, spawning, collisions
game/render.ts        Pure drawing: reads state, paints one frame + HUD
game/sprites.ts       Hand-made pixel art (karateka, zombies, scenery, hearts)
```

**Game loop.** `Game.tsx` runs a `requestAnimationFrame` loop. Each frame it
computes a delta-time in seconds (clamped to 50 ms so a backgrounded tab
doesn't cause a physics jump), calls `update(state, input, dt)`, then
`render(ctx, state)`. The animation frame and all event listeners are cleaned
up on unmount.

**State.** A single `GameState` object holds the player, the zombie list, the
score, elapsed time, and the spawn timer. It lives in a React ref so the loop
mutates it without re-rendering React each frame; React state is only touched
once, on the transition to game over (to show the overlay).

**Update.** `update()` is the only place the simulation advances: player
movement and facing, attack activation/cooldown timers, attack-vs-zombie
kills (circle-vs-rect overlap), edge spawning with the difficulty ramp,
zombie homing, and zombie-vs-player contact damage.

**Render.** `render()` never changes state — it just draws the current frame:
grass background, attack flash, zombies, player, and the HUD (score + hearts).

**Sprites.** All art is hand-made pixel art defined in code — each sprite is a
small grid of palette characters in `game/sprites.ts`, rasterized once to a
tiny offscreen canvas and drawn scaled-up with image smoothing disabled for
crisp pixels. The karateka has walk and punch frames per facing, zombies have
a two-frame shamble, and the grass field (stripes, tufts, flowers, bushes,
trees) is composed once into an offscreen canvas at startup. No image files.

**Input.** Keydown/keyup listeners maintain the set of held movement keys in
press order (so facing = the most recently pressed key still held) and an
edge-triggered attack flag consumed by the next update. Space's default page
scroll is prevented, and held keys are cleared on window blur so movement
can't get stuck.
