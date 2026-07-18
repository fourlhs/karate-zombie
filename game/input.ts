import type { Direction, InputState } from "./types";

const KEY_TO_DIRECTION: Record<string, Direction> = {
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
};

/**
 * Wires keyboard listeners that mutate the given InputState.
 * Returns a cleanup function that removes the listeners.
 */
export function attachInput(input: InputState): () => void {
  const onKeyDown = (e: KeyboardEvent) => {
    const direction = KEY_TO_DIRECTION[e.code];
    if (direction) {
      if (!input.heldDirections.includes(direction)) {
        input.heldDirections.push(direction);
      }
      return;
    }
    if (e.code === "Space") {
      e.preventDefault(); // keep Space from scrolling the page
      if (!e.repeat) {
        input.attackQueued = true;
      }
      return;
    }
    if (e.code === "KeyK" && !e.repeat) {
      input.kickQueued = true;
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    const direction = KEY_TO_DIRECTION[e.code];
    if (direction) {
      input.heldDirections = input.heldDirections.filter(
        (d) => d !== direction
      );
    }
  };

  // Losing focus never fires keyup, so drop held keys to avoid stuck movement.
  const onBlur = () => {
    input.heldDirections = [];
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  return () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", onBlur);
  };
}
