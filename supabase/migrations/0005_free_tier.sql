-- Free-tier enforcement: users without an active/trialing subscription get
-- 1 map, capped at 50 papers each. The app (OrbLitApp.jsx) already gates
-- this client-side for UX (upsell before the user hits the wall), but
-- `projects` is written directly from the browser via RLS (see
-- src/hooks/useProject.js) — only a DB-level trigger can't be bypassed by
-- a crafted request straight to Supabase, so this is the real
-- enforcement; src/lib/plan.js mirrors the same two numbers for the
-- client-side UX layer.

create function public.is_pro_user(uid uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = uid and status in ('active', 'trialing')
  );
$$;

create function public.enforce_free_tier_limits()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  existing_maps int;
  paper_count int;
begin
  if public.is_pro_user(new.user_id) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    select count(*) into existing_maps from public.projects where user_id = new.user_id;
    if existing_maps >= 1 then
      raise exception 'FREE_TIER_MAP_LIMIT: free plan is limited to 1 map — upgrade to Pro for unlimited maps';
    end if;
  end if;

  paper_count := coalesce(jsonb_array_length(new.data->'nodes'), 0);
  if paper_count > 50 then
    raise exception 'FREE_TIER_PAPER_LIMIT: free plan is limited to 50 papers per map — upgrade to Pro for unlimited';
  end if;

  return new;
end;
$$;

create trigger projects_enforce_free_tier_limits
  before insert or update on public.projects
  for each row execute procedure public.enforce_free_tier_limits();
