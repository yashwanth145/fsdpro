-- Live quizzes and attempts. Paste into the Supabase SQL editor.
-- Vercel cannot store the answer key on disk, so the app keeps it here.
-- Direct table reads stay closed. The app uses the functions below.

create table if not exists public.live_quizzes (
  id uuid primary key,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.live_attempts (
  id uuid primary key,
  quiz_id uuid not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.live_quizzes enable row level security;
alter table public.live_attempts enable row level security;

create or replace function public.save_live_quiz(p_id uuid, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.live_quizzes (id, payload)
  values (p_id, p_payload)
  on conflict (id) do update set payload = excluded.payload;
end;
$$;

create or replace function public.get_live_quiz(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select payload from public.live_quizzes where id = p_id;
$$;

create or replace function public.save_live_attempt(p_id uuid, p_quiz_id uuid, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.live_attempts (id, quiz_id, payload)
  values (p_id, p_quiz_id, p_payload)
  on conflict (id) do update
    set quiz_id = excluded.quiz_id,
        payload = excluded.payload;
end;
$$;

create or replace function public.get_live_attempt(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select payload from public.live_attempts where id = p_id;
$$;

revoke all on function public.save_live_quiz(uuid, jsonb) from public;
revoke all on function public.get_live_quiz(uuid) from public;
revoke all on function public.save_live_attempt(uuid, uuid, jsonb) from public;
revoke all on function public.get_live_attempt(uuid) from public;

grant execute on function public.save_live_quiz(uuid, jsonb) to anon, authenticated;
grant execute on function public.get_live_quiz(uuid) to anon, authenticated;
grant execute on function public.save_live_attempt(uuid, uuid, jsonb) to anon, authenticated;
grant execute on function public.get_live_attempt(uuid) to anon, authenticated;
