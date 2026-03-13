alter table public.exercises add column if not exists description text;
alter table public.exercises add column if not exists muscle_groups jsonb default '[]';
