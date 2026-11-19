"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { categories } from "@/lib/categories";
import { difficulties } from "@/lib/quiz/types";

type BankQuestion = {
  id: number;
  category: string;
  difficulty: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
};

const selectClass =
  "flex h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function AdminQuestions() {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [token, setToken] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [explanation, setExplanation] = useState("");
  const [newCategory, setNewCategory] = useState<string>(categories[0].name);
  const [newDifficulty, setNewDifficulty] = useState<(typeof difficulties)[number]>("easy");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const visibleIds = useMemo(() => questions.map((question) => question.id), [questions]);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));

  async function loadQuestions(nextCategory = category, nextDifficulty = difficulty) {
    const params = new URLSearchParams();
    if (nextCategory) params.set("category", nextCategory);
    if (nextDifficulty) params.set("difficulty", nextDifficulty);
    const response = await fetch(`/api/admin/questions?${params.toString()}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "The questions could not be loaded.");
    setQuestions(data.questions as BankQuestion[]);
    setSelected([]);
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/session")
      .then((response) => response.json())
      .then(async (data: { authenticated?: boolean }) => {
        if (cancelled) return;
        setAuthenticated(Boolean(data.authenticated));
        setReady(true);
        if (data.authenticated) await loadQuestions();
      })
      .catch(() => {
        if (!cancelled) {
          setError("The admin page could not check your session.");
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
    // The first load uses the default filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Sign-in failed.");
      setAuthenticated(true);
      setToken("");
      await loadQuestions();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await fetch("/api/admin/session", { method: "DELETE" });
    setAuthenticated(false);
    setQuestions([]);
    setSelected([]);
  }

  async function applyFilters(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loadQuestions();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The questions could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  function toggle(id: number) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function removeSelected() {
    if (selected.length === 0) return;
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const response = await fetch("/api/admin/questions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selected }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "The questions could not be deleted.");
      setNotice(`Deleted ${data.removed} question${data.removed === 1 ? "" : "s"}.`);
      await loadQuestions();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The questions could not be deleted.");
    } finally {
      setLoading(false);
    }
  }

  async function addQuestion(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const response = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: newCategory,
          difficulty: newDifficulty,
          questionText,
          options,
          correctAnswer,
          explanation,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "The question could not be added.");
      setQuestionText("");
      setOptions(["", "", "", ""]);
      setCorrectAnswer("");
      setExplanation("");
      setCategory(newCategory);
      setDifficulty(newDifficulty);
      setNotice("Question added. You can select it below and delete it.");
      await loadQuestions(newCategory, newDifficulty);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The question could not be added.");
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return <p className="text-sm text-muted-foreground">Loading the question bank…</p>;
  }

  if (!authenticated) {
    return (
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Admin sign-in</CardTitle>
          <CardDescription>
            Use the ADMIN_TOKEN from .env.local. It must match the token in supabase/admin-questions.sql.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(event) => void signIn(event)}>
            <div className="space-y-2">
              <Label htmlFor="admin-token">Admin token</Label>
              <Input id="admin-token" type="password" value={token} onChange={(event) => setToken(event.target.value)} required />
            </div>
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : null}
              Open question bank
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{questions.length} questions shown</p>
        <Button variant="outline" onClick={() => void signOut()}>Sign out</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add a question</CardTitle>
          <CardDescription>New questions join the same bank and can be selected for deletion.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(event) => void addQuestion(event)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-category">Category</Label>
                <select id="new-category" className={selectClass} value={newCategory} onChange={(event) => setNewCategory(event.target.value)}>
                  {categories.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-difficulty">Difficulty</Label>
                <select id="new-difficulty" className={selectClass} value={newDifficulty} onChange={(event) => setNewDifficulty(event.target.value as (typeof difficulties)[number])}>
                  {difficulties.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-question">Question</Label>
              <Textarea id="new-question" value={questionText} onChange={(event) => setQuestionText(event.target.value)} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {options.map((option, index) => (
                <div key={index} className="space-y-2">
                  <Label htmlFor={`option-${index}`}>Choice {index + 1}</Label>
                  <Input
                    id={`option-${index}`}
                    value={option}
                    onChange={(event) => {
                      const next = [...options];
                      next[index] = event.target.value;
                      setOptions(next);
                      if (correctAnswer === option) setCorrectAnswer(event.target.value);
                    }}
                    required
                  />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="correct">Correct choice</Label>
              <select id="correct" className={selectClass} value={correctAnswer} onChange={(event) => setCorrectAnswer(event.target.value)} required>
                <option value="">Choose the correct answer</option>
                {options.filter(Boolean).map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="explanation">Explanation</Label>
              <Textarea id="explanation" value={explanation} onChange={(event) => setExplanation(event.target.value)} required />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : null}
              Add question
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Choose questions to delete</CardTitle>
          <CardDescription>Filter the bank, select the rows you want gone, then delete them.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]" onSubmit={(event) => void applyFilters(event)}>
            <div className="space-y-2">
              <Label htmlFor="filter-category">Category</Label>
              <select id="filter-category" className={selectClass} value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="">All categories</option>
                {categories.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-difficulty">Difficulty</Label>
              <select id="filter-difficulty" className={selectClass} value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
                <option value="">All difficulties</option>
                {difficulties.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="outline" disabled={loading}>Show questions</Button>
            </div>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => setSelected(allSelected ? [] : visibleIds)}
              />
              Select all shown
            </label>
            <Button variant="destructive" disabled={loading || selected.length === 0} onClick={() => void removeSelected()}>
              Delete selected ({selected.length})
            </Button>
          </div>

          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          {notice ? <p role="status" className="text-sm text-muted-foreground">{notice}</p> : null}

          <ul className="space-y-3">
            {questions.map((question) => (
              <li key={question.id} className="rounded-xl border border-border p-4">
                <label className="flex items-start gap-3">
                  <input
                    className="mt-1"
                    type="checkbox"
                    checked={selected.includes(question.id)}
                    onChange={() => toggle(question.id)}
                  />
                  <span>
                    <span className="text-sm text-muted-foreground">{question.category} · {question.difficulty}</span>
                    <span className="mt-1 block font-medium">{question.questionText}</span>
                    <span className="mt-2 block text-sm text-muted-foreground">Correct answer: {question.correctAnswer}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
