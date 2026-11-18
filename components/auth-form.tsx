"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { accountLabel, useAuth } from "@/components/auth-provider";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { configured } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    setPending(true);
    try {
      if (mode === "register") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { display_name: displayName.trim() || email.split("@")[0] },
          },
        });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
        if (!data.session) {
          setNotice("Check your email to confirm the account, then sign in.");
          return;
        }
        router.push("/dashboard");
        router.refresh();
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <PageShell className="max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>{mode === "login" ? "Sign in" : "Create an account"}</CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Sign in to save quiz history to your account."
              : "Create an account to keep your quiz results across devices."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {configured ? (
            <form className="space-y-4" onSubmit={onSubmit} noValidate>
              {mode === "register" ? (
                <div className="space-y-2">
                  <Label htmlFor="display-name">Name</Label>
                  <Input
                    id="display-name"
                    autoComplete="name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={Boolean(error)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              {error ? (
                <p role="alert" className="text-sm text-destructive">{error}</p>
              ) : null}
              {notice ? (
                <p role="status" className="text-sm text-foreground">{notice}</p>
              ) : null}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
              </Button>
              <p className="text-sm text-muted-foreground">
                {mode === "login" ? (
                  <>
                    New here? <Link className="font-medium text-primary" href="/register">Create an account</Link>
                  </>
                ) : (
                  <>
                    Already registered? <Link className="font-medium text-primary" href="/login">Sign in</Link>
                  </>
                )}
              </p>
            </form>
          ) : (
            <div className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p>
                Account sign-in is optional. You can take quizzes and keep history in this browser without an account.
              </p>
              <p>
                To enable registration, add <code className="text-foreground">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                <code className="text-foreground">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code className="text-foreground">.env.local</code>,
                run the SQL in <code className="text-foreground">supabase/schema.sql</code>, and restart the server.
              </p>
              <Button asChild>
                <Link href="/generate">Continue without an account</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <SignedInNote />
    </PageShell>
  );
}

function SignedInNote() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <p className="mt-4 text-sm text-muted-foreground">
      You are signed in as {accountLabel(user)}.{" "}
      <Link className="font-medium text-primary" href="/dashboard">Go to the dashboard</Link>
    </p>
  );
}
