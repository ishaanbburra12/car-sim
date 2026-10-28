"use client";

import { useEffect, useState } from "react";
import { LESSON_LENGTH } from "@/src/learn/config";
import {
  dueCount,
  read,
  readItems,
  reset,
  resetItems,
  todayKey,
  totals,
  type Progress,
} from "./progress";

/**
 * The learner's standing, read from their own browser.
 *
 * Rendered only after mount. The server has no idea what is in anyone's
 * localStorage, so drawing anything here during the server pass guarantees a
 * hydration mismatch; an empty slot that fills in is the honest version.
 */
export default function Standing({ units }: { units: { id: string; title: string }[] }) {
  const [p, setP] = useState<Progress | null>(null);
  const [due, setDue] = useState(0);
  useEffect(() => {
    setP(read());
    setDue(dueCount(readItems(), todayKey()));
  }, []);

  if (!p) return <div className="mt-9 h-[4.5rem]" aria-hidden />;

  const t = totals(p);
  if (t.lessons === 0) {
    return (
      <p className="mt-9 text-[14px]" style={{ color: "var(--ink-3)" }}>
        Nothing done yet. A lesson is {LESSON_LENGTH} questions and takes a couple of minutes.
      </p>
    );
  }

  const pct = t.answered > 0 ? Math.round((t.correct / t.answered) * 100) : 0;
  const stat = (n: string | number, label: string) => (
    <div>
      <div className="num text-[26px] font-semibold leading-none">{n}</div>
      <div className="mt-1 text-[13px]" style={{ color: "var(--ink-3)" }}>
        {label}
      </div>
    </div>
  );

  return (
    <div className="mt-9">
      <div className="flex flex-wrap gap-x-10 gap-y-5">
        {stat(p.streak, p.streak === 1 ? "day in a row" : "days in a row")}
        {stat(t.lessons, t.lessons === 1 ? "lesson" : "lessons")}
        {stat(`${pct}%`, `right, of ${t.answered} answered`)}
        {due > 0 ? stat(due, due === 1 ? "due for review" : "due for review") : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[13px]" style={{ color: "var(--ink-3)" }}>
        {units
          .filter((u) => (p.lessons[u.id] ?? 0) > 0)
          .map((u) => {
            const a = p.answered[u.id] ?? 0;
            const c = p.correct[u.id] ?? 0;
            return (
              <span key={u.id}>
                {u.title}: <span className="num">{a > 0 ? Math.round((c / a) * 100) : 0}%</span>
              </span>
            );
          })}
        <button
          type="button"
          onClick={() => {
            reset();
            resetItems();
            setP(read());
            setDue(0);
          }}
          className="underline underline-offset-4 transition-colors hover:text-[var(--signal-ink)]"
          style={{ textDecorationColor: "var(--rule)" }}
        >
          Clear
        </button>
      </div>
      <p className="mt-3 text-[12px]" style={{ color: "var(--ink-3)" }}>
        Kept in this browser only. It is not sent anywhere and will not follow you to another
        device.
      </p>
    </div>
  );
}
