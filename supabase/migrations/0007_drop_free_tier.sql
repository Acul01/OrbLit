-- OrbLit is free for every signed-in user. Drop the trigger that capped
-- maps and papers for anyone without an active Stripe subscription.
-- The subscriptions table itself stays; the app no longer reads it.

drop trigger if exists projects_enforce_free_tier_limits on public.projects;
drop function if exists public.enforce_free_tier_limits();
drop function if exists public.is_pro_user(uuid);
