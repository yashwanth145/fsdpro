-- Admin add, list, and delete for the question bank.
-- Paste this into the Supabase SQL editor after supabase/question-bank.sql.
-- Set delete_token to the same value as ADMIN_TOKEN in .env.local and on Vercel.

create table if not exists public.admin_settings (
  id integer primary key check (id = 1),
  delete_token text not null
);

alter table public.admin_settings enable row level security;

insert into public.admin_settings (id, delete_token)
values (1, 'lumina-admin-change-me')
on conflict (id) do nothing;

create or replace function public.admin_token_ok(p_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  expected text;
begin
  select delete_token into expected from public.admin_settings where id = 1;
  return expected is not null and p_token is not null and expected = p_token;
end;
$$;

create or replace function public.admin_list_questions(
  p_token text,
  p_category text default '',
  p_difficulty text default ''
)
returns table (
  id bigint,
  category text,
  difficulty text,
  question_text text,
  options jsonb,
  correct_answer text,
  explanation text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.admin_token_ok(p_token) then
    raise exception 'forbidden';
  end if;

  return query
  select
    question_bank.id,
    question_bank.category,
    question_bank.difficulty,
    question_bank.question_text,
    question_bank.options,
    question_bank.correct_answer,
    question_bank.explanation
  from public.question_bank
  where (p_category = '' or question_bank.category = p_category)
    and (p_difficulty = '' or question_bank.difficulty = p_difficulty)
  order by question_bank.category, question_bank.difficulty, question_bank.id;
end;
$$;

create or replace function public.admin_add_question(
  p_token text,
  p_category text,
  p_difficulty text,
  p_question text,
  p_options jsonb,
  p_correct text,
  p_explanation text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id bigint;
begin
  if not public.admin_token_ok(p_token) then
    raise exception 'forbidden';
  end if;
  if p_category not in ('Science', 'Mathematics', 'History', 'Geography', 'Literature', 'Technology', 'Biology', 'General Knowledge') then
    raise exception 'invalid category';
  end if;
  if p_difficulty not in ('easy', 'medium', 'hard') then
    raise exception 'invalid difficulty';
  end if;
  if jsonb_typeof(p_options) <> 'array' or jsonb_array_length(p_options) <> 4 then
    raise exception 'invalid options';
  end if;
  if not exists (
    select 1
    from jsonb_array_elements_text(p_options) as choice(value)
    where choice.value = p_correct
  ) then
    raise exception 'correct answer must match an option';
  end if;

  insert into public.question_bank (category, difficulty, question_text, options, correct_answer, explanation)
  values (p_category, p_difficulty, btrim(p_question), p_options, p_correct, btrim(p_explanation))
  returning question_bank.id into new_id;

  return jsonb_build_object('id', new_id);
exception
  when unique_violation then
    raise exception 'duplicate question';
end;
$$;

create or replace function public.admin_delete_questions(p_token text, p_ids bigint[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  if not public.admin_token_ok(p_token) then
    raise exception 'forbidden';
  end if;
  if p_ids is null or cardinality(p_ids) < 1 or cardinality(p_ids) > 100 then
    raise exception 'invalid ids';
  end if;

  delete from public.question_bank where id = any(p_ids);
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.admin_token_ok(text) from public;
revoke all on function public.admin_list_questions(text, text, text) from public;
revoke all on function public.admin_add_question(text, text, text, text, jsonb, text, text) from public;
revoke all on function public.admin_delete_questions(text, bigint[]) from public;

grant execute on function public.admin_list_questions(text, text, text) to anon, authenticated;
grant execute on function public.admin_add_question(text, text, text, text, jsonb, text, text) to anon, authenticated;
grant execute on function public.admin_delete_questions(text, bigint[]) to anon, authenticated;
