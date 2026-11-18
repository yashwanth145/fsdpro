"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { QuizPlayer } from "@/components/quiz/player";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { titleCase } from "@/lib/format";
import type { PublicQuiz } from "@/lib/quiz/types";

export function QuizSession({ quizId }: { quizId: string }) {
  const attemptId = useSearchParams().get("attempt");
  if (!attemptId) return <QuizStart quizId={quizId} />;
  return <QuizPlayer attemptId={attemptId} expectedQuizId={quizId} />;
}

function QuizStart({ quizId }: { quizId: string }) {
  const router = useRouter();
  const [quiz, setQuiz] = useState<PublicQuiz | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/quiz/${quizId}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "This quiz could not be loaded.");
        return data.quiz as PublicQuiz;
      })
      .then((next) => {
        if (!cancelled) setQuiz(next);
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
  }, [quizId]);

  async function start() {
    if (starting) return;
    setStarting(true);
    setError("");
    try {
      const response = await fetch("/api/quiz/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "The quiz could not be started.");
        setStarting(false);
        return;
      }
      router.push(`/quiz/${quizId}?attempt=${data.attemptId}`);
    } catch {
      setError("The network request failed. Try again.");
      setStarting(false);
    }
  }

  if (loading) {
    return <Card><CardContent className="py-6"><div className="h-20 animate-pulse rounded-xl bg-muted" /></CardContent></Card>;
  }

  if (!quiz) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quiz unavailable</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild><Link href="/generate">Generate a quiz</Link></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap gap-2">
          <Badge>{titleCase(quiz.difficulty)}</Badge>
          <Badge>{quiz.questions.length} questions</Badge>
          {quiz.timerSeconds ? <Badge>{Math.round(quiz.timerSeconds / 60)} min</Badge> : null}
        </div>
        <CardTitle className="pt-2">{quiz.title}</CardTitle>
        <CardDescription>
          {quiz.topic}. Correct answers stay hidden until you submit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="space-y-3">
          {quiz.questions.map((question, index) => (
            <li key={question.questionId} className="rounded-xl border border-border p-4">
              <p className="text-sm text-muted-foreground">Question {index + 1}</p>
              <p className="mt-1 font-medium">{question.questionText}</p>
            </li>
          ))}
        </ol>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <Button onClick={() => void start()} disabled={starting}>
          {starting ? <Loader2 className="animate-spin" /> : null}
          {starting ? "Starting…" : "Start quiz"}
        </Button>
      </CardContent>
    </Card>
  );
}
