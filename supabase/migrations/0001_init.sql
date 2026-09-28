-- RefMap initial schema: profiles, subscriptions, projects, zotero_credentials
-- See /Users/luca/.claude/plans/lazy-mixing-sundae.md for the full design rationale.

-- ============================================================
-- profiles
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  locale text not null default 'en',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: select own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row on signup.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- subscriptions (written only by the Stripe webhook via service role)
-- ============================================================
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text unique,
  stripe_price_id text,
  status text not null,
  interval text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index subscriptions_user_id_idx on public.subscriptions(user_id);

alter table public.subscriptions enable row level security;

create policy "subscriptions: select own"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- No insert/update/delete policy for authenticated/anon: only the
-- service-role client (used exclusively in app/api/stripe/webhook)
-- can write this table.

-- ============================================================
-- projects (replaces localStorage tags + manual JSON export/import
-- as the primary persistence layer)
-- ============================================================
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Untitled Map',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_user_id_idx on public.projects(user_id);

alter table public.projects enable row level security;

create policy "projects: full crud own"
  on public.projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- zotero_credentials (encrypted API key; never selectable by clients,
-- only the service-role client reads/decrypts it server-side)
-- ============================================================
create table public.zotero_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  zotero_user_id text not null,
  encrypted_api_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.zotero_credentials enable row level security;

-- Deliberately no policies for anon/authenticated roles: this table is
-- deny-all from the client. Only app/api/zotero/* route handlers,
-- using the SUPABASE_SERVICE_ROLE_KEY client (which bypasses RLS),
-- may read or write it.

-- ============================================================
-- updated_at maintenance
-- ============================================================
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute procedure public.set_updated_at();

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute procedure public.set_updated_at();

create trigger zotero_credentials_set_updated_at
  before update on public.zotero_credentials
  for each row execute procedure public.set_updated_at();
