-- Input caps, hourly API counters, embedding cache key, and hiding
-- trigger functions from the Data API.

-- ============================================================
-- link_clicks: short marketing refs only
-- ============================================================
alter table public.link_clicks
  add constraint link_clicks_ref_format
  check (char_length(ref) between 1 and 80 and ref ~ '^[A-Za-z0-9_-]+$');

-- ============================================================
-- feedback: cap free text
-- ============================================================
alter table public.feedback
  add constraint feedback_message_length
  check (message is null or char_length(message) <= 2000);

-- ============================================================
-- projects: reject map payloads over 1 MiB
-- ============================================================
create function public.enforce_project_data_size()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if octet_length(new.data::text) > 1048576 then
    raise exception 'PROJECT_TOO_LARGE';
  end if;
  return new;
end;
$$;

create trigger projects_enforce_data_size
  before insert or update on public.projects
  for each row execute procedure public.enforce_project_data_size();

-- ============================================================
-- paper_embeddings: cache key includes a hash of the embedded text,
-- so a different abstract cannot overwrite another user's vector for
-- the same OpenAlex id. Existing rows are kept as 'legacy' and are
-- not read by the app.
-- ============================================================
alter table public.paper_embeddings add column content_hash text;

update public.paper_embeddings
set content_hash = 'legacy'
where content_hash is null;

alter table public.paper_embeddings drop constraint paper_embeddings_pkey;
alter table public.paper_embeddings alter column content_hash set not null;
alter table public.paper_embeddings
  add primary key (work_id, model, content_hash);

-- ============================================================
-- api_rate_limits: hourly counters, service role only
-- ============================================================
create table public.api_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  route text not null,
  window_start timestamptz not null,
  count integer not null,
  primary key (user_id, route, window_start)
);

alter table public.api_rate_limits enable row level security;

create function public.bump_api_rate_limit(p_user uuid, p_route text, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  bucket timestamptz := date_trunc('hour', now());
  new_count integer;
begin
  insert into public.api_rate_limits as r (user_id, route, window_start, count)
  values (p_user, p_route, bucket, 1)
  on conflict (user_id, route, window_start)
  do update set count = r.count + 1
  returning count into new_count;
  return new_count <= p_limit;
end;
$$;

revoke all on function public.bump_api_rate_limit(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.bump_api_rate_limit(uuid, text, integer) to service_role;

-- Trigger helpers are not part of the Data API. The trigger itself still
-- runs as the function owner.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.enforce_project_data_size() from public, anon, authenticated;
