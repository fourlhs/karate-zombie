"use client";

import { useRef, type MutableRefObject, type PointerEvent } from "react";
import type { Direction, InputState } from "@/game/types";

/** Max distance the joystick nub travels, in px. */
const STICK_RADIUS = 44;
/** Below this fraction of the radius the stick reads as neutral. */
const DEAD_ZONE = 0.25;
/** Half the joystick base, for keeping it on screen. */
const BASE_HALF = 64;

type QueuedFlag = "attackQueued" | "kickQueued" | "dashQueued" | "specialQueued";

/**
 * Touch input for the game. The left half of the screen is a joystick zone:
 * touch anywhere and the stick appears under your thumb (a dim ghost marks
 * the resting spot). The right side holds the action buttons. Everything
 * feeds the exact same InputState the keyboard uses, and each control
 * captures its own pointer so moving and attacking at once (multitouch)
 * just works.
 */
export default function TouchControls({
  inputRef,
}: {
  inputRef: MutableRefObject<InputState>;
}) {
  const baseRef = useRef<HTMLDivElement>(null);
  const nubRef = useRef<HTMLDivElement>(null);
  const stickPointerRef = useRef<number | null>(null);
  const centerRef = useRef({ x: 0, y: 0 });

  const setDirections = (nx: number, ny: number): void => {
    // Map the analog vector onto held directions; the dominant axis goes
    // last because the core faces the most recently pressed direction.
    const dirs: Direction[] = [];
    const horiz: Direction | null = nx > 0.38 ? "right" : nx < -0.38 ? "left" : null;
    const vert: Direction | null = ny > 0.38 ? "down" : ny < -0.38 ? "up" : null;
    if (Math.abs(nx) >= Math.abs(ny)) {
      if (vert) dirs.push(vert);
      if (horiz) dirs.push(horiz);
    } else {
      if (horiz) dirs.push(horiz);
      if (vert) dirs.push(vert);
    }
    inputRef.current.heldDirections = dirs;
  };

  const moveStick = (e: PointerEvent<HTMLDivElement>): void => {
    const nub = nubRef.current;
    if (!nub) return;
    const dx = e.clientX - centerRef.current.x;
    const dy = e.clientY - centerRef.current.y;
    const len = Math.hypot(dx, dy);
    const clamped = Math.min(len, STICK_RADIUS);
    const nx = len > 0 ? dx / len : 0;
    const ny = len > 0 ? dy / len : 0;
    nub.style.transform = `translate(${nx * clamped}px, ${ny * clamped}px)`;
    if (clamped / STICK_RADIUS < DEAD_ZONE) {
      inputRef.current.heldDirections = [];
    } else {
      setDirections(nx, ny);
    }
  };

  const releaseStick = (): void => {
    stickPointerRef.current = null;
    inputRef.current.heldDirections = [];
    const base = baseRef.current;
    const nub = nubRef.current;
    if (nub) nub.style.transform = "translate(0, 0)";
    if (base) {
      base.classList.remove("joystick-active");
      // Clear inline positioning so the CSS ghost position takes over again.
      base.style.left = "";
      base.style.top = "";
      base.style.bottom = "";
    }
  };

  const grabStick = (e: PointerEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    stickPointerRef.current = e.pointerId;
    const base = baseRef.current;
    if (base) {
      // Center the stick under the finger, kept fully on screen.
      const x = Math.min(
        Math.max(e.clientX, BASE_HALF + 4),
        window.innerWidth * 0.48
      );
      const y = Math.min(
        Math.max(e.clientY, BASE_HALF + 4),
        window.innerHeight - BASE_HALF - 4
      );
      base.style.left = `${x - BASE_HALF}px`;
      base.style.top = `${y - BASE_HALF}px`;
      base.style.bottom = "auto";
      base.classList.add("joystick-active");
      centerRef.current = { x, y };
    }
    moveStick(e);
  };

  const queue = (flag: QueuedFlag) => (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    inputRef.current[flag] = true;
  };

  return (
    <div className="touch-controls">
      <div
        className="joystick-zone"
        onPointerDown={grabStick}
        onPointerMove={(e) => {
          if (e.pointerId === stickPointerRef.current) moveStick(e);
        }}
        onPointerUp={(e) => {
          if (e.pointerId === stickPointerRef.current) releaseStick();
        }}
        onPointerCancel={(e) => {
          if (e.pointerId === stickPointerRef.current) releaseStick();
        }}
      >
        <div ref={baseRef} className="joystick">
          <div ref={nubRef} className="joystick-nub" />
        </div>
      </div>
      <button
        type="button"
        className="touch-button tb-punch"
        aria-label="Punch"
        onPointerDown={queue("attackQueued")}
      >
        👊
      </button>
      <button
        type="button"
        className="touch-button tb-kick"
        aria-label="Kick"
        onPointerDown={queue("kickQueued")}
      >
        🦵
      </button>
      <button
        type="button"
        className="touch-button tb-dash"
        aria-label="Dash"
        onPointerDown={queue("dashQueued")}
      >
        💨
      </button>
      <button
        type="button"
        className="touch-button tb-special"
        aria-label="Special"
        onPointerDown={queue("specialQueued")}
      >
        ⚡
      </button>
    </div>
  );
}
