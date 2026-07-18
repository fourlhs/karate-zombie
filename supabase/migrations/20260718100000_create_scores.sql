-- Global leaderboard: anyone can read scores and submit their own,
-- nobody can edit or delete through the public API.

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  score integer not null,
  created_at timestamptz not null default now(),
  -- Server-side guardrails mirroring the client's limits: the anon key is
  -- public, so nothing stops hand-crafted requests from skipping the UI.
  constraint scores_name_length check (char_length(name) between 1 and 12),
  constraint scores_score_range check (score between 0 and 1000000)
);

-- The leaderboard query is "order by score desc limit N".
create index scores_score_desc_idx on public.scores (score desc);

-- With RLS enabled, every operation is denied unless a policy allows it.
alter table public.scores enable row level security;

-- Anyone (anon key included) may read all rows: the leaderboard is public.
create policy "public read" on public.scores
  for select using (true);

-- Anyone may insert a row, as long as it passes the table constraints.
-- No update/delete policies exist, so those stay denied for the anon key.
create policy "public insert" on public.scores
  for insert with check (true);
