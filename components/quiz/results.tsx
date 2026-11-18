"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration } from "@/lib/format";
import { readLocalHistory, saveLocalHistory } from "@/lib/history";
import type { QuizResult } from "@/lib/quiz/types";
import { cn } from "@/lib/utils";

export function ResultsView({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const local = readLocalHistory().find((item) => item.attemptId === attemptId);
    if (local) {
      const timer = window.setTimeout(() => {
        if (cancelled) return;
        setResult(local);
        setLoading(false);
      }, 0);
      return () => {
        cancelled = true;
        window.clearTimeout(timer);
      };
    }

    fetch(`/api/results/${attemptId}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "That result could not be found.");
        return data.result as QuizResult;
      })
      .then((next) => {
        if (cancelled) return;
        saveLocalHistory(next);
        setResult(next);
      })
      .catch((loadError: Error) => {
        if (!cancelled) setError(loadError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  async function retry() {
    if (!result || retrying) return;
    setRetrying(true);
    setError("");
    try {
      const response = await fetch("/api/quiz/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId: result.quizId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "This quiz can no longer be retried. Generate a new one.");
        setRetrying(false);
        return;
      }
      router.push(`/quiz/${result.quizId}?attempt=${data.attemptId}`);
    } catch {
      setError("The network request failed. Try again.");
      setRetrying(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 animate-pulse rounded-xl bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Result not found</CardTitle>
          <CardDescription>{error || "This result is not saved on this device."}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/history">Back to history</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const blank = result.questions.filter((question) => !question.selectedAnswer).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardDescription>{result.topic}</CardDescription>
          <CardTitle>{result.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Score" value={`${result.score}/${result.total}`} />
            <Stat label="Correct" value={String(result.correct)} />
            <Stat label="Incorrect" value={String(result.incorrect)} />
            <Stat label="Percentage" value={`${result.percentage}%`} />
          </div>
          <p className="text-sm text-muted-foreground">
            Time taken: {formatDuration(result.timeTakenSeconds)}
            {result.timedOut ? " · Submitted when the timer ended" : ""}
            {blank > 0 ? ` · ${blank} left blank` : ""}
          </p>
          <p className="rounded-xl bg-muted px-4 py-3 text-sm leading-6">{result.performanceMessage}</p>
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => void retry()} disabled={retrying}>
              {retrying ? <Loader2 className="animate-spin" /> : null}
              Retry quiz
            </Button>
            <Button asChild variant="outline">
              <Link href="/generate">Generate another quiz</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <ol className="space-y-4">
        {result.questions.map((question, index) => (
          <li key={question.questionId}>
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={question.isCorrect ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"}>
                    {question.isCorrect ? "Correct" : "Incorrect"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">Question {index + 1}</span>
                </div>
                <CardTitle className="text-base leading-7">{question.questionText}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2">
                  {question.options.map((option) => {
                    const isCorrect = option === question.correctAnswer;
                    const isSelected = option === question.selectedAnswer;
                    return (
                      <li
                        key={option}
                        className={cn(
                          "rounded-xl border px-3 py-2 text-sm",
                          isCorrect && "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40",
                          isSelected && !isCorrect && "border-red-500 bg-red-50 dark:bg-red-950/40",
                        )}
                      >
                        {option}
                        {isCorrect ? " · Correct answer" : ""}
                        {isSelected ? " · Your answer" : ""}
                      </li>
                    );
                  })}
                </ul>
                {!question.selectedAnswer ? (
                  <p className="text-sm text-muted-foreground">You did not select an answer.</p>
                ) : null}
                <p className="text-sm leading-6">
                  <span className="font-medium">Explanation. </span>
                  {question.explanation}
                </p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border px-4 py-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

export function scoreSummary(attempts: QuizResult[]) {
  if (attempts.length === 0) {
    return { total: 0, average: 0, best: 0 };
  }
  const total = attempts.length;
  const average = Math.round(attempts.reduce((sum, item) => sum + item.percentage, 0) / total);
  const best = Math.max(...attempts.map((item) => item.percentage));
  return { total, average, best };
}
