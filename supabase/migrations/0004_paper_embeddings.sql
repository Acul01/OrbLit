-- Cache for title+abstract embeddings used by the thematic-cluster map.
-- Keyed by OpenAlex work id — the embedding for a given paper never
-- changes (same title/abstract -> same vector), so this is a shared,
-- project-independent cache: computed once, reused by every user/map that
-- includes that paper. Deny-all from the client — only the service-role
-- client (used in the /api/clusters route) reads/writes it, same pattern
-- as zotero_credentials.
create table public.paper_embeddings (
  work_id text primary key,
  model text not null,
  embedding jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.paper_embeddings enable row level security;

-- Deliberately no policies for anon/authenticated: server-only cache.
