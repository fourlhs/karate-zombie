"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playSounds, setMuted, unlockAudio } from "@/game/audio";
import {
  HIGH_SCORE_KEY,
  MAX_DELTA,
  SOUND_KEY,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "@/game/constants";
import { attachInput } from "@/game/input";
import { render, setHudFont } from "@/game/render";
import { createInitialState, createInputState } from "@/game/state";
import type { GameState, InputState } from "@/game/types";
import { update } from "@/game/update";

const CONTROLS: Array<[string, string]> = [
  ["WASD", "Move"],
  ["SPACE", "Punch — quick jab"],
  ["K", "Kick — bigger sweep, slower recharge"],
  ["SHIFT", "Dash — dodge with brief invulnerability"],
  ["ESC", "Settings / pause"],
];

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const inputRef = useRef<InputState>(createInputState());
  // Mirrors the transition into "gameover" so we only setState once, not per frame.
  const gameOverReportedRef = useRef(false);
  const pausedRef = useRef(false);

  const [overlay, setOverlay] = useState<{
    visible: boolean;
    score: number;
    best: number;
    isNewBest: boolean;
  }>({ visible: false, score: 0, best: 0, isNewBest: false });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    pausedRef.current = settingsOpen;
  }, [settingsOpen]);

  // Hydrate the persisted sound preference after mount (SSR has no storage).
  useEffect(() => {
    const stored = localStorage.getItem(SOUND_KEY) !== "off";
    setSoundOn(stored);
    setMuted(!stored);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Render at device resolution while keeping logical coordinates fixed.
    const dpr = window.devicePixelRatio || 1;
    canvas.width = WORLD_WIDTH * dpr;
    canvas.height = WORLD_HEIGHT * dpr;
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;
    setHudFont(getComputedStyle(document.body).fontFamily);

    const detachInput = attachInput(inputRef.current);

    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSettingsOpen((open) => !open);
    };
    // Browsers only allow audio after a user gesture — unlock on the first one.
    const unlock = () => {
      unlockAudio();
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("pointerdown", unlock);
    };
    window.addEventListener("keydown", onEscape);
    window.addEventListener("keydown", unlock);
    window.addEventListener("pointerdown", unlock);

    let rafId = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, MAX_DELTA);
      last = now;

      const state = stateRef.current;
      if (!pausedRef.current) {
        update(state, inputRef.current, dt);
        if (state.sounds.length > 0) {
          playSounds(state.sounds);
          state.sounds.length = 0;
        }
      }
      render(ctx, state);

      if (state.status === "gameover" && !gameOverReportedRef.current) {
        gameOverReportedRef.current = true;
        const isNewBest = state.score > state.highScore;
        const best = Math.max(state.score, state.highScore);
        try {
          localStorage.setItem(HIGH_SCORE_KEY, String(best));
        } catch {
          // Storage can be unavailable (private mode); the run still works.
        }
        setOverlay({ visible: true, score: state.score, best, isNewBest });
      }

      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      detachInput();
      window.removeEventListener("keydown", onEscape);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("pointerdown", unlock);
    };
  }, []);

  const restart = useCallback(() => {
    stateRef.current = createInitialState();
    gameOverReportedRef.current = false;
    setOverlay({ visible: false, score: 0, best: 0, isNewBest: false });
  }, []);

  const toggleSound = useCallback(() => {
    setSoundOn((on) => {
      const next = !on;
      setMuted(!next);
      try {
        localStorage.setItem(SOUND_KEY, next ? "on" : "off");
      } catch {
        // Preference just won't persist.
      }
      return next;
    });
  }, []);

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    // Drop anything queued while paused so nothing fires on resume.
    const input = inputRef.current;
    input.attackQueued = false;
    input.kickQueued = false;
    input.dashQueued = false;
  }, []);

  return (
    <div className="game-frame">
      <canvas
        ref={canvasRef}
        className="game-canvas"
        aria-label="Karate Zombies game"
      />
      <button
        type="button"
        className="settings-button"
        aria-label="Settings"
        onClick={() => setSettingsOpen((open) => !open)}
      >
        ⚙
      </button>
      {overlay.visible && (
        <div className="game-over">
          <h1>GAME OVER</h1>
          <p>
            Final score: <strong>{overlay.score}</strong>
          </p>
          {overlay.isNewBest ? (
            <p className="new-best">NEW BEST!</p>
          ) : (
            <p className="best">Best: {overlay.best}</p>
          )}
          <button type="button" onClick={restart} autoFocus>
            Restart
          </button>
        </div>
      )}
      {settingsOpen && (
        <div className="settings">
          <h1>SETTINGS</h1>
          <div className="controls">
            {CONTROLS.map(([key, description]) => (
              <div className="control-row" key={key}>
                <span className="key">{key}</span>
                <span>{description}</span>
              </div>
            ))}
          </div>
          <p className="tip">
            Kill zombies for points — quick kills chain combos. Nights are
            deadly and every 2nd night brings a boss: dodge its lunge when it
            trembles. Some zombies drop hearts. The game is paused while this
            is open.
          </p>
          <button type="button" onClick={toggleSound}>
            SOUND: {soundOn ? "ON" : "OFF"}
          </button>
          <button type="button" onClick={closeSettings} autoFocus>
            RESUME
          </button>
        </div>
      )}
    </div>
  );
}
