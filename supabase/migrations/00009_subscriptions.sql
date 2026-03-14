alter table public.users
  add column subscription_status text not null default 'free',
  add column stripe_customer_id text unique,
  add column stripe_subscription_id text unique,
  add column pro_granted_by_admin boolean not null default false,
  add column subscription_ends_at timestamptz;

alter table public.workouts
  add column source text not null default 'manual';
