import { createClient } from "@supabase/supabase-js";

// The anon (public) key is designed to ship in frontend code: Row Level
// Security decides what it can do (read the leaderboard, insert a score).
// The service_role key bypasses RLS and must never appear in this repo.
const SUPABASE_URL = "https://pcpqhwdswjhefsjxclsf.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjcHFod2Rzd2poZWZzanhjbHNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzOTI2NDMsImV4cCI6MjA5OTk2ODY0M30.k2Y4YUPgfND16lb3s1Eg8xHsST5v1eMKbeZ1wxXi6no";

export const LEADERBOARD_SIZE = 3;
export const NAME_MAX_LENGTH = 12;

export interface LeaderboardEntry {
  name: string;
  score: number;
}

// No auth or user accounts — disable session machinery entirely.
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Keep letters, numbers, spaces and _ - . only; collapse whitespace, cap length. */
export function sanitizeName(raw: string): string {
  return raw
    .replace(/[^\p{L}\p{N} _.\-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NAME_MAX_LENGTH);
}

/** Top scores, best first (ties: earliest wins). Null when Supabase is unreachable. */
export async function fetchTopScores(): Promise<LeaderboardEntry[] | null> {
  try {
    const { data, error } = await supabase
      .from("scores")
      .select("name, score")
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(LEADERBOARD_SIZE);
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

/** True when a score would enter the current top list. */
export function qualifiesForLeaderboard(
  score: number,
  top: LeaderboardEntry[],
): boolean {
  if (score <= 0) return false;
  if (top.length < LEADERBOARD_SIZE) return true;
  return score > top[top.length - 1].score;
}

/** Resolves false instead of throwing — the game must survive being offline. */
export async function submitScore(
  name: string,
  score: number,
): Promise<boolean> {
  const clean = sanitizeName(name);
  if (!clean) return false;
  try {
    const { error } = await supabase
      .from("scores")
      .insert({ name: clean, score: Math.max(0, Math.round(score)) });
    return !error;
  } catch {
    return false;
  }
}
