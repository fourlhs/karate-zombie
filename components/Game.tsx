"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  HIGH_SCORE_KEY,
  MAX_DELTA,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "@/game/constants";
import { attachInput } from "@/game/input";
import { render, setHudFont } from "@/game/render";
import { createInitialState, createInputState } from "@/game/state";
import type { GameState, InputState } from "@/game/types";
import { update } from "@/game/update";

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const inputRef = useRef<InputState>(createInputState());
  // Mirrors the transition into "gameover" so we only setState once, not per frame.
  const gameOverReportedRef = useRef(false);

  const [overlay, setOverlay] = useState<{
    visible: boolean;
    score: number;
    best: number;
    isNewBest: boolean;
  }>({ visible: false, score: 0, best: 0, isNewBest: false });

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

    let rafId = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, MAX_DELTA);
      last = now;

      const state = stateRef.current;
      update(state, inputRef.current, dt);
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
    };
  }, []);

  const restart = useCallback(() => {
    stateRef.current = createInitialState();
    gameOverReportedRef.current = false;
    setOverlay({ visible: false, score: 0, best: 0, isNewBest: false });
  }, []);

  return (
    <div className="game-frame">
      <canvas
        ref={canvasRef}
        className="game-canvas"
        aria-label="Karate Zombies game"
      />
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
    </div>
  );
}
