"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_DELTA, WORLD_HEIGHT, WORLD_WIDTH } from "@/game/constants";
import { attachInput } from "@/game/input";
import { render } from "@/game/render";
import { createInitialState, createInputState } from "@/game/state";
import type { GameState, InputState } from "@/game/types";
import { update } from "@/game/update";

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const inputRef = useRef<InputState>(createInputState());
  // Mirrors the transition into "gameover" so we only setState once, not per frame.
  const gameOverReportedRef = useRef(false);

  const [overlay, setOverlay] = useState<{ visible: boolean; score: number }>({
    visible: false,
    score: 0,
  });

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
        setOverlay({ visible: true, score: state.score });
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
    setOverlay({ visible: false, score: 0 });
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
          <button type="button" onClick={restart} autoFocus>
            Restart
          </button>
        </div>
      )}
    </div>
  );
}
