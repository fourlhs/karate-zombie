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
- **Space** — melee attack: a short-range strike in front of you, active for a
  few frames with a brief cooldown
- Zombies spawn at random screen edges and walk toward you. Hitting one with
  your attack kills it and scores points. If one reaches you, it deals 1 damage
  and is destroyed. At 0 health you get a Game Over screen with your final
  score and a restart button.
- The longer you survive, the faster zombies spawn and move (capped).

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
background grid, attack flash, zombies, player, and the HUD (score + hearts).

**Input.** Keydown/keyup listeners maintain the set of held movement keys in
press order (so facing = the most recently pressed key still held) and an
edge-triggered attack flag consumed by the next update. Space's default page
scroll is prevented, and held keys are cleared on window blur so movement
can't get stuck.
