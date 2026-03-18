-- Fix handle_new_user trigger to handle the case where a user row already
-- exists in public.users (e.g. created manually during testing).
-- ON CONFLICT (email) DO UPDATE ensures the id is always synced to the
-- Supabase auth UUID so PATCH /profile upserts never fail with a
-- unique constraint on email.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (email) do update set id = excluded.id;
  return new;
end;
$$ language plpgsql security definer;
