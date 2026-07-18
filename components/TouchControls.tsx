"use client";

import { useRef, type MutableRefObject, type PointerEvent } from "react";
import type { Direction, InputState } from "@/game/types";

/** Max distance the joystick nub travels, in px. */
const STICK_RADIUS = 44;
/** Below this fraction of the radius the stick reads as neutral. */
const DEAD_ZONE = 0.25;

type QueuedFlag = "attackQueued" | "kickQueued" | "dashQueued" | "specialQueued";

/**
 * Virtual joystick + action buttons for touch devices. Feeds the exact same
 * InputState the keyboard uses, so the game core doesn't know the difference.
 * Each control captures its own pointer, so moving and attacking at the same
 * time (multitouch) just works.
 */
export default function TouchControls({
  inputRef,
}: {
  inputRef: MutableRefObject<InputState>;
}) {
  const baseRef = useRef<HTMLDivElement>(null);
  const nubRef = useRef<HTMLDivElement>(null);
  const stickPointerRef = useRef<number | null>(null);

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
    const base = baseRef.current;
    const nub = nubRef.current;
    if (!base || !nub) return;
    const rect = base.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
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
    if (nubRef.current) nubRef.current.style.transform = "translate(0, 0)";
  };

  const queue = (flag: QueuedFlag) => (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    inputRef.current[flag] = true;
  };

  return (
    <div className="touch-controls">
      <div
        ref={baseRef}
        className="joystick"
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          stickPointerRef.current = e.pointerId;
          moveStick(e);
        }}
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
        <div ref={nubRef} className="joystick-nub" />
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
