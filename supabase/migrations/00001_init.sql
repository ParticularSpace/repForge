create extension if not exists "uuid-ossp";

create table public.users (
  id         uuid primary key default uuid_generate_v4(),
  email      text unique not null,
  name       text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.users enable row level security;

create policy "Users can view own record"   on public.users for select using (auth.uid() = id);
create policy "Users can update own record" on public.users for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email) values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
