-- Lowers the free-tier per-map paper cap from 50 to 30 (src/lib/plan.js
-- FREE_PAPER_LIMIT). At 50, a single map already covered most
-- bachelor/master lit reviews end-to-end, leaving little reason for that
-- persona to ever upgrade — the map count (still 1) was the only real
-- pressure toward Pro. 30 keeps enough room for a genuinely useful free
-- map without being a full substitute for an actual literature review.
--
-- CREATE OR REPLACE, not a new migration from scratch: 0005 already
-- created enforce_free_tier_limits() and its trigger — only the cap
-- constant inside the function body changes here.
create or replace function public.enforce_free_tier_limits()
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
  if paper_count > 30 then
    raise exception 'FREE_TIER_PAPER_LIMIT: free plan is limited to 30 papers per map — upgrade to Pro for unlimited';
  end if;

  return new;
end;
$$;
