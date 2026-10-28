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

/* ------------------------------------------------------- spaced repetition */

/**
 * What the learner has done with each individual question.
 *
 * A Leitner box: a right answer moves an item up a box and so further into
 * the future, a wrong answer knocks it straight back to the bottom. The
 * intervals are the usual roughly-doubling sequence. Nothing here is clever;
 * the value is entirely in showing people the things they got wrong sooner
 * than the things they got right.
 */
export type Item = { box: number; seen: string; wrong: number };
export type Items = Record<string, Item>;

const ITEMS_KEY = "car-index.learn.items.v1";

/** Days before an item in each box is worth asking again. */
export const INTERVALS = [0, 1, 3, 7, 16, 35];

/**
 * How many items to keep. Every question the catalogue can generate is a
 * potential key, which is thousands; without a cap this grows forever in
 * somebody's browser for no benefit. The oldest are dropped first.
 */
const MAX_ITEMS = 600;

export function readItems(): Items {
  try {
    const raw = localStorage.getItem(ITEMS_KEY);
    return raw ? (JSON.parse(raw) as Items) : {};
  } catch {
    return {};
  }
}

/** Fold one answered question into the item map. Pure, for testing. */
export function applyItem(items: Items, id: string, correct: boolean, day: string): Items {
  const prev = items[id];
  const box = correct ? Math.min((prev?.box ?? 0) + 1, INTERVALS.length - 1) : 0;
  return {
    ...items,
    [id]: { box, seen: day, wrong: (prev?.wrong ?? 0) + (correct ? 0 : 1) },
  };
}

/** Drop the least recently seen entries once the map gets too big. */
export function prune(items: Items, max = MAX_ITEMS): Items {
  const keys = Object.keys(items);
  if (keys.length <= max) return items;
  const kept = keys
    .sort((a, b) => (items[b].seen > items[a].seen ? 1 : -1))
    .slice(0, max);
  return Object.fromEntries(kept.map((k) => [k, items[k]]));
}

export function recordItem(id: string, correct: boolean): void {
  try {
    const next = prune(applyItem(readItems(), id, correct, today()));
    localStorage.setItem(ITEMS_KEY, JSON.stringify(next));
  } catch {
    /* a learner without storage still gets the lesson, just not the spacing */
  }
}

const daysSince = (seen: string, day: string) => daysBetween(seen, day);

/**
 * Choose a lesson from a pool, worst-remembered first.
 *
 * Order of priority:
 *   0  got it wrong last time, and it is due
 *   1  never seen
 *   2  answered correctly, but enough days have passed to ask again
 *   3  everything else, to pad the lesson out if the first three are thin
 *
 * Takes anything with an id, deliberately: importing the Question type here
 * would pull the catalogue into the browser, which is the one thing the
 * learning section must not do.
 */
export function selectDue<T extends { id: string }>(
  pool: T[],
  items: Items,
  count: number,
  day: string,
): T[] {
  const rank = (q: T): number => {
    const it = items[q.id];
    if (!it) return 1;
    const due = daysSince(it.seen, day) >= INTERVALS[it.box];
    if (!due) return 3;
    return it.box === 0 ? 0 : 2;
  };

  return [...pool]
    .map((q, i) => ({ q, i, r: rank(q), wrong: items[q.id]?.wrong ?? 0 }))
    .sort((a, b) => a.r - b.r || b.wrong - a.wrong || a.i - b.i)
    .slice(0, count)
    .map((x) => x.q);
}

/** How many tracked items are due today, for the unit list. */
export function dueCount(items: Items, day: string): number {
  return Object.values(items).filter((it) => daysSince(it.seen, day) >= INTERVALS[it.box]).length;
}

export const todayKey = today;

export function resetItems(): void {
  try {
    localStorage.removeItem(ITEMS_KEY);
  } catch {
    /* nothing to do */
  }
}
