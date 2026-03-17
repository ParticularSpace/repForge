-- Add weekly_goal to users
alter table public.users add column weekly_goal int not null default 3;

-- Add pinned_template_id to users
alter table public.users add column pinned_template_id uuid references public.workout_templates(id) on delete set null;

-- Create weekly_goal_results table
create table public.weekly_goal_results (
  id          uuid primary key default uuid_generate_v4(),
  user_id     text not null,
  week_start  timestamptz not null,
  goal        int not null,
  completed   int not null default 0,
  met         boolean not null default false,
  created_at  timestamptz default now(),
  unique (user_id, week_start)
);

alter table public.weekly_goal_results enable row level security;

create policy "Users manage own weekly results"
  on public.weekly_goal_results for all
  using (auth.uid()::text = user_id);
