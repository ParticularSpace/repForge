alter table public.users add column onboarding_completed boolean not null default false;

-- Mark all existing users as having completed onboarding so they don't see it
update public.users set onboarding_completed = true where created_at < now();
