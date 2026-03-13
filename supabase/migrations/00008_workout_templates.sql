create table public.workout_templates (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.users(id),
  name         text not null,
  type         text,
  source       text default 'manual',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  last_used_at timestamptz,
  use_count    int default 0,
  constraint workout_templates_user_name_source_key unique (user_id, name, source)
);

create table public.template_exercises (
  id            uuid primary key default uuid_generate_v4(),
  template_id   uuid not null references public.workout_templates(id) on delete cascade,
  name          text not null,
  "order"       int not null,
  sets          int not null,
  reps          int not null,
  weight_lbs    float,
  rest_seconds  int,
  muscle_groups jsonb default '[]'
);

alter table public.workout_templates enable row level security;
alter table public.template_exercises enable row level security;

create policy "Users manage own templates"
  on public.workout_templates for all using (auth.uid() = user_id);

create policy "Users manage own template exercises"
  on public.template_exercises for all using (
    template_id in (
      select id from public.workout_templates where user_id = auth.uid()
    )
  );
