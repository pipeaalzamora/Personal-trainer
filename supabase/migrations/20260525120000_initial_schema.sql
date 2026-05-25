create extension if not exists "pgcrypto";

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  price integer not null check (price >= 0),
  image_url text,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  verified boolean not null default false,
  verification_token text,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete restrict,
  total_amount integer not null check (total_amount >= 0),
  status text not null,
  buy_order text not null unique,
  session_id text not null,
  transaction_token text,
  transaction_response jsonb,
  emails_sent boolean not null default false,
  emails_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete restrict,
  price integer not null check (price >= 0),
  is_part_of_pack boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  name text not null,
  path text not null,
  type text not null,
  size integer not null default 0,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.order_transaction_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_courses_category on public.courses(category);
create index if not exists idx_users_email on public.users(email);
create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_orders_buy_order on public.orders(buy_order);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_order_items_course_id on public.order_items(course_id);
create index if not exists idx_files_course_id on public.files(course_id);
create index if not exists idx_order_transaction_history_order_id on public.order_transaction_history(order_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_courses_updated_at on public.courses;
create trigger set_courses_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

alter table public.courses enable row level security;
alter table public.users enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.files enable row level security;
alter table public.order_transaction_history enable row level security;

drop policy if exists "Cursos publicos de lectura" on public.courses;
create policy "Cursos publicos de lectura"
on public.courses for select
to anon, authenticated
using (true);

drop policy if exists "Archivos publicos de lectura metadata" on public.files;
create policy "Archivos publicos de lectura metadata"
on public.files for select
to anon, authenticated
using (true);

insert into storage.buckets (id, name, public)
values
  ('course-files', 'course-files', false),
  ('course-excel', 'course-excel', false)
on conflict (id) do nothing;
