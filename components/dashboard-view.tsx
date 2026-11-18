"use client";

import Link from "next/link";
import { Sparkles, Timer } from "lucide-react";
import { accountLabel, useAuth } from "@/components/auth-provider";
import { useQuizHistory } from "@/components/quiz/use-history";
import { scoreSummary } from "@/components/quiz/results";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { categories } from "@/lib/categories";
import { formatDuration, formatWhen, titleCase } from "@/lib/format";
import type { QuizResult } from "@/lib/quiz/types";

export function DashboardView() {
  const { user } = useAuth();
  const { attempts, loading, authenticated } = useQuizHistory();
  const stats = scoreSummary(attempts);
  const recent = attempts.slice(0, 5);
  const name = accountLabel(user);

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome{name ? `, ${name}` : ""}
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            {authenticated
              ? "Your account history is included with quizzes saved in this browser."
              : "Quizzes you finish are saved in this browser. Sign in later if you add Supabase."}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/generate?topic=General%20Knowledge&count=5&difficulty=medium&type=mixed&timer=10">
              <Timer />
              Quick-start quiz
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/generate">
              <Sparkles />
              Generate AI quiz
            </Link>
          </Button>
        </div>
      </div>

      <section aria-label="Quiz statistics" className="grid gap-3 sm:grid-cols-3">
        <Stat label="Total quizzes taken" value={loading ? "…" : String(stats.total)} />
        <Stat label="Average score" value={loading ? "…" : `${stats.average}%`} />
        <Stat label="Best score" value={loading ? "…" : `${stats.best}%`} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight">Recent quizzes</h2>
          <Link className="text-sm font-medium text-primary" href="/history">View history</Link>
        </div>
        {loading ? (
          <Card><CardContent className="py-6"><div className="h-16 animate-pulse rounded-xl bg-muted" /></CardContent></Card>
        ) : recent.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No quizzes yet</CardTitle>
              <CardDescription>
                Pick a category and generate a quiz. Your score, time, and review will show up here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/generate">Generate your first quiz</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {recent.map((attempt) => (
              <HistoryRow key={attempt.attemptId} attempt={attempt} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Quiz categories</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.name}
              href={`/generate?topic=${encodeURIComponent(category.name)}`}
              className="rounded-2xl border border-border bg-card p-4 shadow-[0_8px_30px_rgba(28,27,46,0.04)] transition-colors hover:border-primary/40"
            >
              <p className="font-medium">{category.name}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{category.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export function HistoryList() {
  const { attempts, loading, authenticated } = useQuizHistory();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Quiz history</h1>
        <p className="mt-2 text-muted-foreground">
          {authenticated
            ? "These results come from your account and this browser."
            : "These results are saved in this browser."}
        </p>
      </div>
      {loading ? (
        <Card><CardContent className="py-6"><div className="h-16 animate-pulse rounded-xl bg-muted" /></CardContent></Card>
      ) : attempts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No quiz history yet</CardTitle>
            <CardDescription>
              Finish a quiz and the subject, score, difficulty, and time will be listed here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/generate">Generate a quiz</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {attempts.map((attempt) => (
            <HistoryRow key={attempt.attemptId} attempt={attempt} />
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryRow({ attempt }: { attempt: QuizResult }) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-[0_8px_30px_rgba(28,27,46,0.04)] sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="font-medium">{attempt.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {attempt.topic} · {formatWhen(attempt.submittedAt)}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge>{attempt.percentage}%</Badge>
          <Badge>{titleCase(attempt.difficulty)}</Badge>
          <Badge>{formatDuration(attempt.timeTakenSeconds)}</Badge>
        </div>
      </div>
      <Button asChild variant="outline">
        <Link href={`/results/${attempt.attemptId}`}>View results</Link>
      </Button>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
