-- Raw click counts for ?ref=... marketing links, independent of whether
-- the visitor ever signs up. Anonymous, insert-only from the client (no
-- auth required — clicks happen before any account exists), no select
-- policy for anon/authenticated so visitors can't enumerate click counts
-- of other referrers; only readable via the Supabase dashboard/SQL editor.
create table public.link_clicks (
  id uuid primary key default gen_random_uuid(),
  ref text not null,
  created_at timestamptz not null default now()
);

create index link_clicks_ref_idx on public.link_clicks(ref);

alter table public.link_clicks enable row level security;

create policy "link_clicks: insert anyone"
  on public.link_clicks for insert
  to anon, authenticated
  with check (true);
