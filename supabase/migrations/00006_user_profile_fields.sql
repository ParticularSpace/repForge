alter table public.users
  add column if not exists display_name text,
  add column if not exists age int,
  add column if not exists weight_lbs float,
  add column if not exists height_in float,
  add column if not exists gender text,
  add column if not exists fitness_goal text,
  add column if not exists experience_notes text,
  add column if not exists preferred_rest_seconds int default 60;
