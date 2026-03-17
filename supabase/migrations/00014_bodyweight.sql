alter table public.exercises add column if not exists is_bodyweight boolean not null default false;
alter table public.template_exercises add column if not exists is_bodyweight boolean not null default false;
