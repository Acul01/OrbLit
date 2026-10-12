-- Mendeley OAuth tokens. Same posture as zotero_credentials: the
-- browser never reads this table. Only /api/mendeley/* route handlers,
-- using the service-role client, encrypt and decrypt the tokens.

create table public.mendeley_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mendeley_profile_id text,
  encrypted_access_token text not null,
  encrypted_refresh_token text not null,
  access_token_expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mendeley_credentials enable row level security;

create trigger mendeley_credentials_set_updated_at
  before update on public.mendeley_credentials
  for each row execute procedure public.set_updated_at();
