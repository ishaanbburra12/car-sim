"use client";

// ---------------------------------------------------------------------------
// What the learner has done, kept in their own browser.
//
// This is per-viewer convenience, not data: it never reaches a server, it does
// not follow anyone to another device, and clearing site data wipes it. That
// is an acceptable trade for a practice section, and it is why every read and
// write here is wrapped -- localStorage throws in a private window, and a
// progress counter is not worth taking the page down for.
// ---------------------------------------------------------------------------

const KEY = "car-index.learn.v1";

export type Progress = {
  /** Lessons finished, per unit. */
  lessons: Record<string, number>;
  /** Questions answered and got right, per unit. */
  answered: Record<string, number>;
  correct: Record<string, number>;
  /** Consecutive days with at least one finished lesson. */
  streak: number;
  /** ISO date (yyyy-mm-dd) of the last finished lesson. */
  lastDay: string | null;
};

const EMPTY: Progress = { lessons: {}, answered: {}, correct: {}, streak: 0, lastDay: null };

const today = () => new Date().toISOString().slice(0, 10);

function daysBetween(a: string, b: string): number {
  const ms = Date.parse(b) - Date.parse(a);
  return Math.round(ms / 86_400_000);
}

export function read(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return {
      lessons: parsed.lessons ?? {},
      answered: parsed.answered ?? {},
      correct: parsed.correct ?? {},
      streak: parsed.streak ?? 0,
      lastDay: parsed.lastDay ?? null,
    };
  } catch {
    return EMPTY;
  }
}

/** Fold one finished lesson into the stored progress. Exported for testing. */
export function apply(prev: Progress, unit: string, correct: number, total: number, day: string): Progress {
  const gap = prev.lastDay ? daysBetween(prev.lastDay, day) : null;
  // Same day: the streak does not move. Yesterday: it grows. Anything else,
  // including a clock that went backwards, starts again at one.
  const streak = gap === 0 ? prev.streak : gap === 1 ? prev.streak + 1 : 1;
  return {
    lessons: { ...prev.lessons, [unit]: (prev.lessons[unit] ?? 0) + 1 },
    answered: { ...prev.answered, [unit]: (prev.answered[unit] ?? 0) + total },
    correct: { ...prev.correct, [unit]: (prev.correct[unit] ?? 0) + correct },
    streak,
    lastDay: day,
  };
}

export function record(unit: string, correct: number, total: number): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(apply(read(), unit, correct, total, today())));
  } catch {
    // A learner in a private window still gets the lesson; they just do not
    // get a streak. Nothing here is worth an error boundary.
  }
}

export function reset(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}

export const totals = (p: Progress) => ({
  lessons: Object.values(p.lessons).reduce((n, v) => n + v, 0),
  answered: Object.values(p.answered).reduce((n, v) => n + v, 0),
  correct: Object.values(p.correct).reduce((n, v) => n + v, 0),
});
