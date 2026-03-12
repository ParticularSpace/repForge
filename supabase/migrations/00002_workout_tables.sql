create table public.workouts (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null,
  name         text not null,
  type         text not null,
  difficulty   text not null,
  started_at   timestamptz default now(),
  completed_at timestamptz,
  duration_min integer
);

create table public.exercises (
  id         uuid primary key default uuid_generate_v4(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  name       text not null,
  "order"    integer not null,
  sets       integer not null,
  reps       integer not null,
  weight_lbs float,
  notes      text
);

create table public.set_logs (
  id             uuid primary key default uuid_generate_v4(),
  exercise_id    uuid not null references public.exercises(id) on delete cascade,
  set_number     integer not null,
  completed_at   timestamptz default now(),
  actual_reps    integer,
  actual_weight  float
);
