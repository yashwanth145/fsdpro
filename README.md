# Lumina

Lumina is an online quiz app. Questions come from a bank in Supabase. A quiz is a random set that matches the category and difficulty you choose. The answer key stays on the server, and the score is calculated after you submit.

You can take quizzes without an account. Finished quizzes are saved in the browser. If you add Supabase, registration and account history turn on.

## Local setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Copy `.env.example` to `.env.local`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes, to build quizzes | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes, to build quizzes | Supabase anon key. |

Restart `npm run dev` after changing `.env.local`.

### Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `supabase/schema.sql` for accounts and history.
3. Run `supabase/question-bank.sql` to create and fill the 300-question bank.
4. Add the project URL and anon key to `.env.local`.
5. Restart the server.
6. Use Register and Sign in if you want account history. Row Level Security limits each person to their own attempts.

The bank is read through the `draw_questions` function. Each draw keeps the same category and difficulty and returns 5 or 10 random multiple-choice questions.

## Scripts

```bash
npm run dev
npm run lint
npx tsc --noEmit
npx tsx scripts/test-quiz-logic.ts
npm run build
npm start
```

## Deploy

The app is a Next.js App Router project and can be deployed on Vercel or any Node host that runs `next build` and `next start`.

1. Push the repository to your host. Do not commit `.env.local` or `.data/`.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the host's environment settings.
3. Run `supabase/question-bank.sql` in the Supabase SQL editor before generating quizzes.
4. Build with `npm run build` and start with `npm start`.

Quiz answer keys for an attempt are stored in `.data/quiz-store.json` on the server disk. That file is local to one Node server. On a platform with a read-only or short-lived filesystem, a quiz can still be taken during the life of that server process, and a signed-in user's submitted results are also stored in Supabase. Guest history remains in the browser.
