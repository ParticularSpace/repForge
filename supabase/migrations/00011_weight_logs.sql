create table public.weight_logs (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.users(id),
  weight_lbs float not null,
  logged_at  timestamptz default now()
);

alter table public.weight_logs enable row level security;

create policy "Users manage own weight logs"
  on public.weight_logs for all using (auth.uid() = user_id);
