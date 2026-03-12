create table public.workouts (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.users(id) on delete cascade,
  name         text not null,
  type         text not null,
  difficulty   text not null,
  started_at   timestamptz not null default now(),
  completed_at timestamptz,
  duration_min integer
);

create table public.exercises (
  id          uuid primary key default uuid_generate_v4(),
  workout_id  uuid not null references public.workouts(id) on delete cascade,
  name        text not null,
  "order"     integer not null,
  sets        integer not null,
  reps        integer not null,
  weight_lbs  real,
  notes       text
);

create table public.set_logs (
  id            uuid primary key default uuid_generate_v4(),
  exercise_id   uuid not null references public.exercises(id) on delete cascade,
  set_number    integer not null,
  completed_at  timestamptz not null default now(),
  actual_reps   integer,
  actual_weight real
);

alter table public.workouts enable row level security;
create policy "Users can manage own workouts"
  on public.workouts for all
  using (auth.uid() = user_id);

alter table public.exercises enable row level security;
create policy "Users can manage own exercises"
  on public.exercises for all
  using (
    workout_id in (select id from public.workouts where user_id = auth.uid())
  );

alter table public.set_logs enable row level security;
create policy "Users can manage own set logs"
  on public.set_logs for all
  using (
    exercise_id in (
      select e.id from public.exercises e
      join public.workouts w on w.id = e.workout_id
      where w.user_id = auth.uid()
    )
  );
