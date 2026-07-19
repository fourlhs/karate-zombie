"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { playSounds, setMuted, unlockAudio } from "@/game/audio";
import {
  HIGH_SCORE_KEY,
  MAX_DELTA,
  SOUND_KEY,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "@/game/constants";
import TouchControls from "@/components/TouchControls";
import { setHapticsEnabled, vibrateFor } from "@/game/haptics";
import { attachInput } from "@/game/input";
import {
  LEADERBOARD_SIZE,
  NAME_MAX_LENGTH,
  fetchTopScores,
  loadSavedName,
  qualifiesForLeaderboard,
  sanitizeName,
  saveName,
  submitScore,
  type LeaderboardEntry,
} from "@/game/leaderboard";
import { setMusicIntensity, startMusic, stopMusic } from "@/game/music";
import {
  render,
  setChallenge,
  setHudFont,
  setTouchMode,
  type Challenge,
} from "@/game/render";
import { createInitialState, createInputState } from "@/game/state";
import type { GameState, InputState, UpgradeKind } from "@/game/types";
import { applyUpgrade, update } from "@/game/update";

const UPGRADES: Array<[UpgradeKind, string, string]> = [
  ["damage", "+1 DAMAGE", "Punches and kicks hit harder"],
  ["speed", "FASTER ATTACKS", "25% shorter attack cooldowns"],
  ["health", "+1 HEART", "Max health up, and heal one"],
];

const CONTROLS: Array<[string, string]> = [
  ["WASD", "Move"],
  ["SPACE", "Punch — quick jab"],
  ["K", "Kick — bigger sweep, slower recharge"],
  ["SHIFT", "Dash — dodge with brief invulnerability"],
  ["J", "Special — shockwave when the meter is full"],
  ["ESC", "Settings / pause"],
];

export default function Game() {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const inputRef = useRef<InputState>(createInputState());
  // Mirrors the transition into "gameover" so we only setState once, not per frame.
  const gameOverReportedRef = useRef(false);
  const pausedRef = useRef(false);
  // Music may only start after a user gesture unlocks audio.
  const audioReadyRef = useRef(false);

  const [overlay, setOverlay] = useState<{
    visible: boolean;
    score: number;
    best: number;
    isNewBest: boolean;
  }>({ visible: false, score: 0, best: 0, isNewBest: false });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [fsSupported, setFsSupported] = useState(false);
  const upgradeShownRef = useRef(false);

  // Global leaderboard (Supabase). "offline" keeps the game fully playable:
  // the overlay just falls back to the local best.
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lbStatus, setLbStatus] = useState<"loading" | "ready" | "offline">(
    "loading",
  );
  const [entryStage, setEntryStage] = useState<
    "none" | "prompt" | "submitting" | "done" | "failed"
  >("none");
  const [playerName, setPlayerName] = useState("");
  const [shareState, setShareState] = useState<"hidden" | "idle" | "copied">(
    "hidden",
  );
  // A friend's score carried in from a shared ?beat= link.
  const challengeRef = useRef<Challenge | null>(null);
  const overlayShownAtRef = useRef(0);

  // Read the challenge from the URL and remember the player's name.
  useEffect(() => {
    setPlayerName(loadSavedName());
    const params = new URLSearchParams(window.location.search);
    const beat = parseInt(params.get("beat") ?? "", 10);
    if (Number.isFinite(beat) && beat > 0) {
      const by =
        sanitizeName(params.get("by") ?? "").toUpperCase() || "A FRIEND";
      challengeRef.current = { by, score: beat, beaten: false };
      setChallenge({ ...challengeRef.current });
    }
    return () => setChallenge(null);
  }, []);

  // Fetch the top list when the game-over overlay appears; only prompt for a
  // name when this run actually cracks it.
  useEffect(() => {
    if (!overlay.visible) return;
    let cancelled = false;
    setLbStatus("loading");
    setEntryStage("none");
    setShareState(
      typeof navigator !== "undefined" &&
        (navigator.share !== undefined || navigator.clipboard !== undefined)
        ? "idle"
        : "hidden",
    );
    fetchTopScores().then((top) => {
      if (cancelled) return;
      if (top === null) {
        setLbStatus("offline");
        return;
      }
      setLeaderboard(top);
      setLbStatus("ready");
      if (qualifiesForLeaderboard(overlay.score, top)) setEntryStage("prompt");
    });
    return () => {
      cancelled = true;
    };
  }, [overlay.visible, overlay.score]);

  const submitName = useCallback(async () => {
    const name = sanitizeName(playerName);
    if (!name) return;
    setEntryStage("submitting");
    const ok = await submitScore(name, overlay.score);
    if (!ok) {
      setEntryStage("failed");
      return;
    }
    saveName(name);
    setEntryStage("done");
    const top = await fetchTopScores();
    if (top) setLeaderboard(top);
  }, [playerName, overlay.score]);

  const shareScore = useCallback(async () => {
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("beat", String(overlay.score));
    const name = sanitizeName(playerName) || loadSavedName();
    if (name) url.searchParams.set("by", name);
    const text = `I scored ${overlay.score} in Karate Zombies 🥋🧟 Beat me:`;
    try {
      if (navigator.share) {
        await navigator.share({ text, url: url.toString() });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${text} ${url.toString()}`);
        setShareState("copied");
        setTimeout(() => setShareState("idle"), 2000);
      }
    } catch {
      // User closed the share sheet — not an error.
    }
  }, [overlay.score, playerName]);

  useEffect(() => {
    pausedRef.current = settingsOpen || upgradeOpen;
  }, [settingsOpen, upgradeOpen]);

  // Hydrate the persisted sound preference after mount (SSR has no storage).
  useEffect(() => {
    const stored = localStorage.getItem(SOUND_KEY) !== "off";
    setSoundOn(stored);
    setMuted(!stored);
  }, []);

  // Touch devices get on-screen controls and a keyboard-free HUD.
  useEffect(() => {
    const touch =
      navigator.maxTouchPoints > 0 ||
      window.matchMedia("(pointer: coarse)").matches;
    setIsTouch(touch);
    setTouchMode(touch);
    setHapticsEnabled(touch);
    setFsSupported(document.fullscreenEnabled ?? false);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      void frame.requestFullscreen().catch(() => {});
    }
  }, []);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Opaque canvas: we always paint the full frame, and it composites faster.
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    // Render at device resolution while keeping logical coordinates fixed.
    // Capped at 2x: 3x phone panels are invisible extra work for pixel art.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = WORLD_WIDTH * dpr;
    canvas.height = WORLD_HEIGHT * dpr;
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;
    setHudFont(getComputedStyle(document.body).fontFamily);

    const detachInput = attachInput(inputRef.current);

    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSettingsOpen((open) => !open);
    };
    // Browsers only allow audio after a user gesture. Keep retrying on every
    // gesture until the context is genuinely running — on iOS the first
    // resume attempt can silently fail, which left the game mute at first.
    const unlock = () => {
      audioReadyRef.current = true;
      if (unlockAudio()) {
        window.removeEventListener("keydown", unlock);
        window.removeEventListener("pointerdown", unlock);
      }
    };
    window.addEventListener("keydown", onEscape);
    window.addEventListener("keydown", unlock);
    window.addEventListener("pointerdown", unlock);

    let rafId = 0;
    let last = performance.now();

    const frame = (now: number) => {
      // Never negative: the first rAF timestamp can predate `last`, and a
      // negative dt walks elapsed below zero — which once read as a day
      // crossing and offered a dawn upgrade on a freshly loaded page.
      const dt = Math.min(Math.max(now - last, 0) / 1000, MAX_DELTA);
      last = now;

      const state = stateRef.current;
      if (!pausedRef.current) {
        update(state, inputRef.current, dt);
        if (state.sounds.length > 0) {
          playSounds(state.sounds);
          vibrateFor(state.sounds);
          state.sounds.length = 0;
        }
        const ch = challengeRef.current;
        if (ch && !ch.beaten && state.score > ch.score) {
          ch.beaten = true;
          setChallenge({ ...ch });
          playSounds(["special"]);
          state.popups.push({
            id: state.nextId++,
            pos: { x: state.player.pos.x, y: state.player.pos.y - 20 },
            text: `BEAT ${ch.by}!`,
            ttl: 0.8,
          });
        }
      }
      render(ctx, state);

      // Music runs while actually playing; kill streaks push the tempo.
      if (
        audioReadyRef.current &&
        !pausedRef.current &&
        state.status === "playing"
      ) {
        startMusic();
        setMusicIntensity(state.combo);
      } else {
        stopMusic();
      }

      if (state.pendingUpgrade && !upgradeShownRef.current) {
        upgradeShownRef.current = true;
        setUpgradeOpen(true);
      }

      if (state.status === "gameover" && !gameOverReportedRef.current) {
        gameOverReportedRef.current = true;
        const isNewBest = state.score > state.highScore;
        const best = Math.max(state.score, state.highScore);
        try {
          localStorage.setItem(HIGH_SCORE_KEY, String(best));
        } catch {
          // Storage can be unavailable (private mode); the run still works.
        }
        overlayShownAtRef.current = performance.now();
        setOverlay({ visible: true, score: state.score, best, isNewBest });
      }

      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      detachInput();
      stopMusic();
      window.removeEventListener("keydown", onEscape);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("pointerdown", unlock);
    };
  }, []);

  const restart = useCallback(() => {
    stateRef.current = createInitialState();
    gameOverReportedRef.current = false;
    upgradeShownRef.current = false;
    // Typing a name uses game keys (space = punch); drop anything queued.
    const input = inputRef.current;
    input.attackQueued = false;
    input.kickQueued = false;
    input.dashQueued = false;
    setUpgradeOpen(false);
    setEntryStage("none");
    setPlayerName("");
    setOverlay({ visible: false, score: 0, best: 0, isNewBest: false });
  }, []);

  const pickUpgrade = useCallback((kind: UpgradeKind) => {
    applyUpgrade(stateRef.current, kind);
    upgradeShownRef.current = false;
    setUpgradeOpen(false);
  }, []);

  // Dev-only test hook: ?test=1 exposes live state so test drivers can read
  // positions directly and set up scenarios instead of pixel-scanning.
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("test")) return;
    const handle = {
      get state() {
        return stateRef.current;
      },
      get input() {
        return inputRef.current;
      },
      restart,
    };
    (window as unknown as { __kz?: typeof handle }).__kz = handle;
    return () => {
      delete (window as unknown as { __kz?: typeof handle }).__kz;
    };
  }, [restart]);

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

  // Tap any dead space on the death screen to retry — armed after a short
  // delay so mashing attack at the moment of death doesn't skip the screen.
  const overlayTap = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (entryStage === "prompt" || entryStage === "submitting") return;
      if ((e.target as HTMLElement).closest("button, input")) return;
      if (performance.now() - overlayShownAtRef.current < 800) return;
      restart();
    },
    [entryStage, restart],
  );

  // One-shot confetti for a new personal best.
  const confettiPieces = useMemo(() => {
    if (!overlay.visible || !overlay.isNewBest) return [];
    const colors = ["#ffd23f", "#e5484d", "#7bd35a", "#f4f1e8", "#66bb55"];
    return Array.from({ length: 28 }, (_, i) => ({
      left: `${(i * 37) % 100}%`,
      background: colors[i % colors.length],
      animationDelay: `${(i % 7) * 0.16}s`,
      animationDuration: `${1.5 + (i % 5) * 0.35}s`,
    }));
  }, [overlay.visible, overlay.isNewBest]);

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    // Drop anything queued while paused so nothing fires on resume.
    const input = inputRef.current;
    input.attackQueued = false;
    input.kickQueued = false;
    input.dashQueued = false;
  }, []);

  return (
    <div className="game-frame" ref={frameRef}>
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
      {fsSupported && (
        <button
          type="button"
          className="settings-button fullscreen-button"
          aria-label="Fullscreen"
          onClick={toggleFullscreen}
        >
          ⛶
        </button>
      )}
      {isTouch && !settingsOpen && !upgradeOpen && !overlay.visible && (
        <TouchControls inputRef={inputRef} />
      )}
      {overlay.visible && (
        <div className="game-over" onClick={overlayTap}>
          {confettiPieces.length > 0 && (
            <div className="confetti" aria-hidden>
              {confettiPieces.map((style, i) => (
                <span key={i} style={style} />
              ))}
            </div>
          )}
          <h1>GAME OVER</h1>
          <p>
            Final score: <strong>{overlay.score}</strong>
          </p>
          {overlay.isNewBest ? (
            <p className="new-best">NEW BEST!</p>
          ) : (
            <p className="best">Best: {overlay.best}</p>
          )}
          {challengeRef.current && (
            <p
              className={
                challengeRef.current.beaten
                  ? "challenge-line beaten"
                  : "challenge-line"
              }
            >
              {challengeRef.current.beaten
                ? `You beat ${challengeRef.current.by}'s ${challengeRef.current.score}!`
                : `${challengeRef.current.by}'s ${challengeRef.current.score} still stands…`}
            </p>
          )}
          <div className="leaderboard">
            <h2>GLOBAL TOP {LEADERBOARD_SIZE}</h2>
            {lbStatus === "loading" && <p className="lb-note">loading…</p>}
            {lbStatus === "offline" && (
              <p className="lb-note">offline — showing local best only</p>
            )}
            {lbStatus === "ready" &&
              (leaderboard.length === 0 ? (
                <p className="lb-note">no scores yet — be the first</p>
              ) : (
                <ol>
                  {leaderboard.map((entry, i) => (
                    <li key={`${i}-${entry.name}-${entry.score}`}>
                      <span className="lb-name">
                        {i + 1}. {entry.name}
                      </span>
                      <span className="lb-score">{entry.score}</span>
                    </li>
                  ))}
                </ol>
              ))}
            {entryStage === "prompt" && (
              <div className="name-entry">
                <p className="lb-note qualify">
                  You made the global top {LEADERBOARD_SIZE}! Enter your name:
                </p>
                <div className="name-entry-row">
                  <input
                    type="text"
                    maxLength={NAME_MAX_LENGTH}
                    placeholder="YOUR NAME"
                    value={playerName}
                    autoFocus
                    onChange={(e) => setPlayerName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitName();
                      // Keep typing away from the game's window-level keys.
                      e.stopPropagation();
                    }}
                  />
                  <button
                    type="button"
                    onClick={submitName}
                    disabled={!sanitizeName(playerName)}
                  >
                    SUBMIT
                  </button>
                </div>
              </div>
            )}
            {entryStage === "submitting" && (
              <p className="lb-note">submitting…</p>
            )}
            {entryStage === "done" && (
              <p className="lb-note done">score submitted!</p>
            )}
            {entryStage === "failed" && (
              <p className="lb-note">
                couldn't reach the leaderboard — score not saved
              </p>
            )}
          </div>
          <div className="end-buttons">
            {shareState !== "hidden" && (
              <button type="button" className="share-button" onClick={shareScore}>
                {shareState === "copied" ? "LINK COPIED!" : "📤 CHALLENGE A FRIEND"}
              </button>
            )}
            <button type="button" onClick={restart} autoFocus>
              Restart
            </button>
          </div>
          {entryStage !== "prompt" && entryStage !== "submitting" && (
            <p className="retry-hint">tap anywhere to retry</p>
          )}
        </div>
      )}
      {upgradeOpen && !settingsOpen && (
        <div className="upgrade">
          <h1>DAWN</h1>
          <p className="tip">You survived the night. Choose an upgrade:</p>
          <div className="upgrade-cards">
            {UPGRADES.map(([kind, title, description]) => (
              <button
                type="button"
                key={kind}
                className="upgrade-card"
                onClick={() => pickUpgrade(kind)}
              >
                <span className="upgrade-title">{title}</span>
                <span className="upgrade-desc">{description}</span>
              </button>
            ))}
          </div>
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
