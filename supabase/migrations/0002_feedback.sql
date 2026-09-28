-- Feedback: star rating (1-5) + free text, submitted from the dashboard's
-- feedback button. Insert-only from the client — users write their own
-- feedback but can't read anyone's (including their own) back; feedback
-- is meant to be reviewed by the operator, not editable/browsable by users.
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  message text,
  created_at timestamptz not null default now()
);

create index feedback_user_id_idx on public.feedback(user_id);

alter table public.feedback enable row level security;

create policy "feedback: insert own"
  on public.feedback for insert
  with check (auth.uid() = user_id);

-- No select/update/delete policy for anon/authenticated: submissions are
-- write-only from the client, readable only via the Supabase dashboard or
-- a service-role client.
