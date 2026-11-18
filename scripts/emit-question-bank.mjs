import { writeFileSync } from "node:fs";
import { rows } from "./bank-rows.mjs";

const categories = [
  "Science",
  "Mathematics",
  "History",
  "Geography",
  "Literature",
  "Technology",
  "Biology",
  "General Knowledge",
];
const difficulties = ["easy", "medium", "hard"];

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

const seen = new Set();
const counts = {};
for (const row of rows) {
  const [category, difficulty, question, a, b, c, d, answer, explanation] = row;
  if (!categories.includes(category)) throw new Error(`bad category ${category}`);
  if (!difficulties.includes(difficulty)) throw new Error(`bad difficulty ${difficulty}`);
  const options = [a, b, c, d];
  if (new Set(options).size !== 4) throw new Error(`duplicate options: ${question}`);
  if (!options.includes(answer)) throw new Error(`answer not in options: ${question}`);
  if (!explanation || explanation.length < 8) throw new Error(`short explanation: ${question}`);
  const key = `${category}|${difficulty}|${question}`;
  if (seen.has(key)) throw new Error(`duplicate question: ${question}`);
  seen.add(key);
  counts[key.slice(0, key.indexOf("|", key.indexOf("|") + 1))] = (counts[`${category}|${difficulty}`] ?? 0) + 1;
  counts[`${category}|${difficulty}`] = (counts[`${category}|${difficulty}`] ?? 0);
}

const tally = {};
for (const row of rows) {
  const key = `${row[0]}|${row[1]}`;
  tally[key] = (tally[key] ?? 0) + 1;
}
for (const category of categories) {
  for (const difficulty of difficulties) {
    const count = tally[`${category}|${difficulty}`] ?? 0;
    if (count < 12) throw new Error(`${category} ${difficulty} has ${count}`);
  }
}
if (rows.length !== 300) throw new Error(`expected 300 rows, got ${rows.length}`);

const values = rows
  .map((row) => {
    const [category, difficulty, question, a, b, c, d, answer, explanation] = row;
    const options = JSON.stringify([a, b, c, d]);
    return `  (${sqlString(category)}, ${sqlString(difficulty)}, ${sqlString(question)}, ${sqlString(options)}::jsonb, ${sqlString(answer)}, ${sqlString(explanation)})`;
  })
  .join(",\n");

const sql = `-- Question bank for Lumina. Paste this whole file into the Supabase SQL editor.
-- It creates the bank, blocks direct table reads, and loads 300 multiple-choice questions.
-- The app draws a random set with the same category and difficulty.

create table if not exists public.question_bank (
  id bigint generated always as identity primary key,
  category text not null check (category in ('Science', 'Mathematics', 'History', 'Geography', 'Literature', 'Technology', 'Biology', 'General Knowledge')),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  question_text text not null,
  options jsonb not null,
  correct_answer text not null,
  explanation text not null,
  unique (category, difficulty, question_text)
);

alter table public.question_bank enable row level security;

create or replace function public.draw_questions(
  p_category text,
  p_difficulty text,
  p_limit integer
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
language sql
stable
security definer
set search_path = public
as $$
  select
    question_bank.id,
    question_bank.category,
    question_bank.difficulty,
    question_bank.question_text,
    question_bank.options,
    question_bank.correct_answer,
    question_bank.explanation
  from public.question_bank
  where question_bank.category = p_category
    and question_bank.difficulty = p_difficulty
  order by random()
  limit least(greatest(coalesce(p_limit, 5), 1), 10);
$$;

revoke all on function public.draw_questions(text, text, integer) from public;
grant execute on function public.draw_questions(text, text, integer) to anon, authenticated;

insert into public.question_bank (category, difficulty, question_text, options, correct_answer, explanation)
values
${values}
on conflict (category, difficulty, question_text) do nothing;
`;

writeFileSync(new URL("../supabase/question-bank.sql", import.meta.url), sql);
console.log(`wrote ${rows.length} questions`);
for (const category of categories) {
  const parts = difficulties.map((difficulty) => `${difficulty}:${tally[`${category}|${difficulty}`]}`);
  console.log(category, parts.join(" "));
}
