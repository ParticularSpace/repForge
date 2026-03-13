alter table public.users add column if not exists equipment_preferences jsonb default '[]';
