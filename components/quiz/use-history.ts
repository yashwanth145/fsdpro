"use client";

import { useCallback, useEffect, useState } from "react";
import { mergeHistory, readLocalHistory } from "@/lib/history";
import type { QuizResult } from "@/lib/quiz/types";

export function useQuizHistory() {
  const [attempts, setAttempts] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  const reload = useCallback(async () => {
    const local = readLocalHistory();
    let remote: QuizResult[] = [];
    let isAuthenticated = false;
    try {
      const response = await fetch("/api/history");
      if (response.ok) {
        const data = await response.json() as { authenticated?: boolean; attempts?: QuizResult[] };
        isAuthenticated = Boolean(data.authenticated);
        remote = Array.isArray(data.attempts) ? data.attempts : [];
      }
    } catch {
      remote = [];
    }
    setAuthenticated(isAuthenticated);
    setAttempts(mergeHistory(remote, local));
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void reload();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [reload]);

  return { attempts, loading, authenticated, reload };
}
