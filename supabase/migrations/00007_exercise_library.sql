create table public.exercise_library (
  id            uuid primary key default uuid_generate_v4(),
  name          text unique not null,
  muscle_groups jsonb default '[]',
  description   text,
  equipment     text,
  is_custom     boolean default false,
  created_by    text references public.users(id)
);
