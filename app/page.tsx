import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpenCheck,
  Clock3,
  ListChecks,
  ShieldCheck,
  Sparkles,
  TimerReset,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    title: "Quizzes drawn from a category you choose",
    description: "Pick Science, History, Biology, and the other set categories. Questions are chosen at random for that category and difficulty.",
    icon: Sparkles,
  },
  {
    title: "Scoring that stays on the server",
    description: "Answer keys are not sent to the browser. The score is calculated after you submit.",
    icon: ShieldCheck,
  },
  {
    title: "Explanations after you finish",
    description: "Review the correct choice, your choice, and a short explanation for every question.",
    icon: BookOpenCheck,
  },
  {
    title: "One question at a time",
    description: "Move forward, go back, and mark questions for review without losing your place.",
    icon: ListChecks,
  },
  {
    title: "Optional countdown",
    description: "Add a timer when you want pressure. The quiz submits itself when time runs out.",
    icon: Clock3,
  },
  {
    title: "History you can revisit",
    description: "Finished quizzes stay in this browser, and in your account when Supabase is configured.",
    icon: TimerReset,
  },
];

const steps = [
  { title: "Choose a category", text: "Pick a subject and difficulty, then set the length and timer." },
  { title: "Draw from the bank", text: "The server picks random questions that match that category and difficulty." },
  { title: "Take the quiz", text: "Answer one question at a time. Correct answers stay hidden." },
  { title: "Review and retry", text: "See your score, read the explanations, and try the same quiz again." },
];

export const metadata: Metadata = {
  title: "Learn smarter",
  description: "Build a quiz from the question bank, test yourself, and review explanations.",
};

export default function HomePage() {
  return (
    <>
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="text-sm font-medium text-primary">Practice that adapts to what you want to learn</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl sm:leading-tight">
            Learn Smarter. Test Yourself. Improve Every Day.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            Lumina builds a quiz from the category and difficulty you choose, walks you through it one question at a time, and shows what to study after you submit.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/dashboard">Start Quiz</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/generate">Generate AI Quiz</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6" aria-labelledby="features-heading">
        <h2 id="features-heading" className="text-2xl font-semibold tracking-tight">What you can do</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-2xl border border-border bg-card p-5 shadow-[0_8px_30px_rgba(28,27,46,0.04)]">
              <feature.icon className="size-5 text-primary" aria-hidden="true" />
              <h3 className="mt-4 font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-card" aria-labelledby="how-heading">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 id="how-heading" className="text-2xl font-semibold tracking-tight">How it works</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <li key={step.title} className="rounded-2xl border border-border p-5">
                <p className="text-sm font-medium text-primary">0{index + 1}</p>
                <h3 className="mt-2 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
