"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Flag, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { saveLocalHistory } from "@/lib/history";
import { formatClock } from "@/lib/format";
import { remainingSeconds } from "@/lib/quiz/score";
import type { PublicQuiz, QuizResult } from "@/lib/quiz/types";
import { cn } from "@/lib/utils";

type ProgressState = {
  answers: Record<string, string>;
  marked: string[];
  index: number;
};

function progressKey(attemptId: string) {
  return `lumina.progress.${attemptId}`;
}

function readProgress(attemptId: string): ProgressState {
  if (typeof window === "undefined") return { answers: {}, marked: [], index: 0 };
  try {
    const raw = window.sessionStorage.getItem(progressKey(attemptId));
    if (!raw) return { answers: {}, marked: [], index: 0 };
    const parsed = JSON.parse(raw) as ProgressState;
    return {
      answers: parsed.answers && typeof parsed.answers === "object" ? parsed.answers : {},
      marked: Array.isArray(parsed.marked) ? parsed.marked : [],
      index: typeof parsed.index === "number" ? parsed.index : 0,
    };
  } catch {
    return { answers: {}, marked: [], index: 0 };
  }
}

export function QuizPlayer({
  attemptId,
  expectedQuizId,
}: {
  attemptId: string;
  expectedQuizId: string;
}) {
  const router = useRouter();
  const [quiz, setQuiz] = useState<PublicQuiz | null>(null);
  const [startedAt, setStartedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [marked, setMarked] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const submittedRef = useRef(false);
  const answersRef = useRef(answers);
  const hydratedRef = useRef(false);
  const submitRef = useRef<(reason: "user" | "timeout") => void>(() => {});

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/attempts/${attemptId}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "This attempt could not be loaded.");
        return data as {
          submitted: boolean;
          result?: QuizResult;
          startedAt?: string;
          quiz?: PublicQuiz;
        };
      })
      .then((data) => {
        if (cancelled) return;
        if (data.submitted && data.result) {
          saveLocalHistory(data.result);
          router.replace(`/results/${data.result.attemptId}`);
          return;
        }
        if (!data.quiz || !data.startedAt) {
          throw new Error("This attempt could not be loaded.");
        }
        if (data.quiz.id !== expectedQuizId) {
          throw new Error("This attempt does not belong to the quiz in the address bar.");
        }
        const saved = readProgress(attemptId);
        setQuiz(data.quiz);
        setStartedAt(data.startedAt);
        setAnswers(saved.answers);
        setMarked(saved.marked);
        setIndex(Math.min(saved.index, Math.max(0, data.quiz.questions.length - 1)));
        hydratedRef.current = true;
        setLoading(false);
      })
      .catch((loadError: Error) => {
        if (cancelled) return;
        setError(loadError.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [attemptId, expectedQuizId, router]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    window.sessionStorage.setItem(
      progressKey(attemptId),
      JSON.stringify({ answers, marked, index }),
    );
  }, [answers, marked, index, attemptId]);

  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (!submittedRef.current && Object.keys(answersRef.current).length > 0) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, []);

  async function submit(reason: "user" | "timeout") {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    setConfirmOpen(false);
    setError("");
    try {
      const response = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, answers: answersRef.current }),
      });
      const data = await response.json();
      if (!response.ok) {
        submittedRef.current = false;
        setSubmitting(false);
        setError(data.error ?? "The quiz could not be submitted.");
        return;
      }
      const result = data.result as QuizResult;
      saveLocalHistory(result);
      window.sessionStorage.removeItem(progressKey(attemptId));
      router.push(`/results/${result.attemptId}`);
    } catch {
      submittedRef.current = false;
      setSubmitting(false);
      setError(reason === "timeout"
        ? "Time is up, but the submission did not go through. Submit again."
        : "The network request failed. Your answers are still on this page.");
    }
  }

  useEffect(() => {
    submitRef.current = submit;
  });

  useEffect(() => {
    if (!quiz || !startedAt || quiz.timerSeconds == null) return;
    const tick = () => {
      const left = remainingSeconds(startedAt, quiz.timerSeconds);
      setRemaining(left);
      if (left === 0) {
        setAnnouncement("Time is up. Submitting your quiz.");
        submitRef.current("timeout");
      } else if (left != null && (left === 60 || left === 30 || left <= 10)) {
        setAnnouncement(`${left} seconds remaining`);
      }
    };
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [quiz, startedAt]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading quiz</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-4 animate-pulse rounded bg-muted" />
          <div className="h-24 animate-pulse rounded-xl bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (!quiz) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quiz unavailable</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p role="alert" className="text-sm text-muted-foreground">{error || "This quiz could not be loaded."}</p>
          <Button asChild>
            <Link href="/generate">Generate another quiz</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const question = quiz.questions[index];
  const answeredCount = quiz.questions.filter((item) => answers[item.questionId]).length;
  const unanswered = quiz.questions.length - answeredCount;
  const markedCurrent = marked.includes(question.questionId);

  function selectAnswer(option: string) {
    setAnswers((current) => ({ ...current, [question.questionId]: option }));
  }

  function toggleMark() {
    setMarked((current) =>
      current.includes(question.questionId)
        ? current.filter((id) => id !== question.questionId)
        : [...current, question.questionId],
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">{quiz.topic}</p>
              <CardTitle>{quiz.title}</CardTitle>
            </div>
            {remaining != null ? (
              <p
                className={cn(
                  "rounded-xl bg-muted px-3 py-2 font-mono text-sm",
                  remaining <= 30 && "bg-destructive/10 text-destructive",
                )}
                aria-hidden="true"
              >
                {formatClock(remaining)}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Question {index + 1} of {quiz.questions.length}</span>
              <span>{answeredCount} answered</span>
            </div>
            <Progress value={answeredCount} max={quiz.questions.length} label="Answered questions" />
          </div>
          <p className="sr-only" aria-live="polite">{announcement}</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <h2 id={`question-${question.questionId}`} className="text-xl font-semibold leading-8">
            {question.questionText}
          </h2>
          <div role="radiogroup" aria-labelledby={`question-${question.questionId}`} className="space-y-3">
            {question.options.map((option, optionIndex) => {
              const selected = answers[question.questionId] === option;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => selectAnswer(option)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted",
                  )}
                >
                  <span className="mt-0.5 font-medium text-muted-foreground">
                    {String.fromCharCode(65 + optionIndex)}
                  </span>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button variant="outline" onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0 || submitting}>
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setIndex((value) => Math.min(quiz.questions.length - 1, value + 1))}
              disabled={index === quiz.questions.length - 1 || submitting}
            >
              Next
            </Button>
            <Button variant={markedCurrent ? "secondary" : "outline"} onClick={toggleMark} disabled={submitting} aria-pressed={markedCurrent}>
              <Flag />
              {markedCurrent ? "Marked for review" : "Mark for review"}
            </Button>
            <Button className="sm:ml-auto" onClick={() => setConfirmOpen(true)} disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : null}
              {submitting ? "Submitting…" : "Submit quiz"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-base">Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="grid grid-cols-5 gap-2">
            {quiz.questions.map((item, itemIndex) => {
              const isCurrent = itemIndex === index;
              const isAnswered = Boolean(answers[item.questionId]);
              const isMarked = marked.includes(item.questionId);
              return (
                <li key={item.questionId}>
                  <button
                    type="button"
                    onClick={() => setIndex(itemIndex)}
                    aria-label={`Question ${itemIndex + 1}${isAnswered ? ", answered" : ", unanswered"}${isMarked ? ", marked for review" : ""}`}
                    aria-current={isCurrent ? "true" : undefined}
                    className={cn(
                      "flex h-10 w-full items-center justify-center rounded-lg border text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isCurrent && "border-primary",
                      isAnswered ? "bg-primary text-primary-foreground" : "bg-card",
                      isMarked && "ring-2 ring-violet-400",
                    )}
                  >
                    {itemIndex + 1}
                  </button>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit this quiz?</DialogTitle>
            <DialogDescription>
              {unanswered === 0
                ? "You have answered every question. You can still go back before submitting."
                : `${unanswered} question${unanswered === 1 ? " is" : "s are"} still unanswered and will be marked incorrect.`}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Keep working</Button>
            <Button onClick={() => void submit("user")} disabled={submitting}>Submit quiz</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
