alter table public.users
  add column last_coaching_insight text,
  add column last_coaching_generated_at timestamptz;
