"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { categories } from "@/lib/categories";
import { parseGenerateRequest } from "@/lib/quiz/schema";
import {
  questionCounts,
  timerMinutesOptions,
  type Difficulty,
  type PublicQuiz,
} from "@/lib/quiz/types";
import { titleCase } from "@/lib/format";

const selectClass =
  "flex h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function initialCount(value: string | null): string {
  return questionCounts.some((count) => String(count) === value) ? value! : "10";
}

function initialDifficulty(value: string | null): Difficulty {
  if (value === "easy" || value === "medium" || value === "hard") return value;
  return "medium";
}

function initialTimer(value: string | null): string {
  return timerMinutesOptions.some((minutes) => String(minutes) === value) ? value! : "none";
}

function initialCategory(value: string | null): string {
  return categories.some((category) => category.name === value) ? value! : "Science";
}

export function QuizGenerator() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const presetKey = ["topic", "count", "difficulty", "timer"]
    .map((key) => searchParams.get(key) ?? "")
    .join("|");

  const [appliedPreset, setAppliedPreset] = useState(presetKey);
  const [topic, setTopic] = useState(() => initialCategory(searchParams.get("topic")));
  const [description, setDescription] = useState("");
  const [questionCount, setQuestionCount] = useState(() => initialCount(searchParams.get("count")));
  const [difficulty, setDifficulty] = useState<Difficulty>(() => initialDifficulty(searchParams.get("difficulty")));
  const [timer, setTimer] = useState(() => initialTimer(searchParams.get("timer")));
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<PublicQuiz | null>(null);
  const [starting, setStarting] = useState(false);

  if (presetKey !== appliedPreset && presetKey.replace(/\|/g, "")) {
    setAppliedPreset(presetKey);
    setTopic(initialCategory(searchParams.get("topic")));
    setQuestionCount(initialCount(searchParams.get("count")));
    setDifficulty(initialDifficulty(searchParams.get("difficulty")));
    setTimer(initialTimer(searchParams.get("timer")));
  } else if (presetKey !== appliedPreset) {
    setAppliedPreset(presetKey);
  }

  useEffect(() => {
    const quizId = searchParams.get("quizId");
    if (!quizId || quiz?.id === quizId) return;
    let cancelled = false;
    fetch(`/api/quiz/${quizId}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "This preview is no longer available.");
        return data.quiz as PublicQuiz;
      })
      .then((next) => {
        if (!cancelled) setQuiz(next);
      })
      .catch(() => {
        if (!cancelled) setQuiz(null);
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams, quiz?.id]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const payload = {
      topic,
      description,
      questionCount: Number(questionCount),
      difficulty,
      questionType: "multiple_choice",
      timerMinutes: timer === "none" ? null : Number(timer),
    };
    const parsed = parseGenerateRequest(payload);
    if (!parsed.ok) {
      setFields(parsed.fields);
      setError(parsed.message);
      return;
    }
    setFields({});
    setLoading(true);
    try {
      const response = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "The quiz could not be generated.");
        return;
      }
      setQuiz(data.quiz as PublicQuiz);
      router.replace(`/generate?quizId=${data.quiz.id}`);
    } catch {
      setError("The network request failed. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function startQuiz() {
    if (!quiz || starting) return;
    setStarting(true);
    setError("");
    try {
      const response = await fetch("/api/quiz/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId: quiz.id }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "The quiz could not be started.");
        setStarting(false);
        return;
      }
      router.push(`/quiz/${quiz.id}?attempt=${data.attemptId}`);
    } catch {
      setError("The network request failed. Check your connection and try again.");
      setStarting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Create a quiz</CardTitle>
          <CardDescription>
            Questions are drawn at random from the selected category and difficulty. Answers stay on the server until you submit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit} noValidate>
            <div className="space-y-2">
              <Label htmlFor="topic">Category</Label>
              <select
                id="topic"
                className={selectClass}
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                required
                aria-invalid={Boolean(fields.topic)}
                aria-describedby={fields.topic ? "topic-error" : undefined}
              >
                {categories.map((category) => (
                  <option key={category.name} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
              {fields.topic ? <p id="topic-error" className="text-sm text-destructive">{fields.topic}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Ancient Rome, the Roman Republic, and key leaders."
                aria-invalid={Boolean(fields.description)}
                aria-describedby={fields.description ? "description-error" : undefined}
              />
              {fields.description ? (
                <p id="description-error" className="text-sm text-destructive">{fields.description}</p>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="count">Number of questions</Label>
                <select id="count" className={selectClass} value={questionCount} onChange={(event) => setQuestionCount(event.target.value)}>
                  {questionCounts.map((count) => (
                    <option key={count} value={count}>{count}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <select
                  id="difficulty"
                  className={selectClass}
                  value={difficulty}
                  onChange={(event) => setDifficulty(event.target.value as Difficulty)}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timer">Timer <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <select id="timer" className={selectClass} value={timer} onChange={(event) => setTimer(event.target.value)}>
                  <option value="none">No timer</option>
                  {timerMinutesOptions.map((minutes) => (
                    <option key={minutes} value={minutes}>{minutes} minutes</option>
                  ))}
                </select>
              </div>
            </div>
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            <Button id="generate-quiz" type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="animate-spin" /> : null}
              {loading ? "Generating quiz…" : "Generate Quiz"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <section aria-live="polite" className="space-y-4">
        {loading ? (
          <Card>
            <CardHeader>
              <CardTitle>Building your quiz</CardTitle>
              <CardDescription>
                Choosing questions from the bank for this category and difficulty.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-4 animate-pulse rounded bg-muted" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-24 animate-pulse rounded-xl bg-muted" />
            </CardContent>
          </Card>
        ) : null}

        {!loading && quiz ? (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{titleCase(quiz.difficulty)}</Badge>
                <Badge>{titleCase(quiz.questionType)}</Badge>
                <Badge>{quiz.questions.length} questions</Badge>
                {quiz.timerSeconds ? <Badge>{Math.round(quiz.timerSeconds / 60)} min timer</Badge> : null}
              </div>
              <CardTitle className="pt-2">{quiz.title}</CardTitle>
              <CardDescription>
                Preview for {quiz.topic}. Answers stay hidden until you submit.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="space-y-4">
                {quiz.questions.map((question, index) => (
                  <li key={question.questionId} className="rounded-xl border border-border p-4">
                    <p className="text-sm font-medium text-muted-foreground">Question {index + 1}</p>
                    <p className="mt-1 font-medium">{question.questionText}</p>
                    <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                      {question.options.map((option) => (
                        <li key={option}>{option}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button onClick={() => void startQuiz()} disabled={starting}>
                  {starting ? <Loader2 className="animate-spin" /> : null}
                  {starting ? "Starting…" : "Start quiz"}
                </Button>
                <Button asChild variant="outline">
                  <Link href="/dashboard">Back to dashboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {!loading && !quiz ? (
          <Card>
            <CardHeader>
              <CardTitle>Quiz preview</CardTitle>
              <CardDescription>
                Generated questions will appear here. You can read them before the timer starts.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </section>
    </div>
  );
}
