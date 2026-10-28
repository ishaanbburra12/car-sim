"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
// Type only. This component must never import the catalogue: it is the one
// piece of the learning section that ships to the browser, and the questions
// arrive as props already built on the server.
import type { Question } from "@/src/learn/questions";
import { LESSON_LENGTH } from "@/src/learn/config";
import { readItems, record, recordItem, selectDue, todayKey } from "./progress";

type Phase = "asking" | "answered" | "done";

const LETTERS = ["1", "2", "3", "4", "5"];

export default function Quiz({
  pool,
  unitId,
  unitTitle,
  nextHref,
}: {
  pool: Question[];
  unitId: string;
  unitTitle: string;
  nextHref: string;
}) {
  // Chosen on the client, because what this learner keeps getting wrong lives
  // in their browser and the server has never seen it. Null until mounted:
  // rendering a guess during the server pass and swapping it afterwards would
  // show one question and then replace it, which is worse than a short wait.
  const [questions, setQuestions] = useState<Question[] | null>(null);
  useEffect(() => {
    setQuestions(selectDue(pool, readItems(), LESSON_LENGTH, todayKey()));
  }, [pool]);

  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("asking");
  const [right, setRight] = useState(0);
  const [wrongOnes, setWrongOnes] = useState<Question[]>([]);

  const q = questions?.[index];
  const correct = chosen !== null && chosen === q?.answer;

  const choose = useCallback(
    (id: string) => {
      if (phase !== "asking" || !questions) return;
      const current = questions[index];
      setChosen(id);
      setPhase("answered");
      const got = id === current.answer;
      if (got) setRight((n) => n + 1);
      else setWrongOnes((xs) => [...xs, current]);
      // Recorded per question, immediately, so the spacing reflects the
      // answer even if the lesson is abandoned here.
      recordItem(current.id, got);
    },
    [phase, index, questions],
  );

  const next = useCallback(() => {
    if (phase !== "answered") return;
    if (!questions) return;
    if (index + 1 >= questions.length) {
      setPhase("done");
      return;
    }
    setIndex((i) => i + 1);
    setChosen(null);
    setPhase("asking");
  }, [phase, index, questions]);

  // Save only once the lesson is finished, so an abandoned lesson does not
  // quietly wreck an accuracy figure the learner never saw.
  useEffect(() => {
    if (phase === "done" && questions) record(unitId, right, questions.length);
  }, [phase, unitId, right, questions]);

  // Keys, because answering eight questions with a mouse is tedious.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === "done") return;
      if (phase === "answered" && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        next();
        return;
      }
      if (phase === "asking" && q) {
        const n = LETTERS.indexOf(e.key);
        if (n >= 0 && n < q.choices.length) {
          e.preventDefault();
          choose(q.choices[n].id);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, q, choose, next]);

  if (!questions) {
    return (
      <div className="animate-pulse" aria-busy>
        <div className="h-1 w-full rounded-full" style={{ background: "var(--rule)" }} />
        <div className="mt-8 h-8 w-2/3 rounded" style={{ background: "var(--raised)" }} />
        <div className="mt-7 space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 rounded-md" style={{ background: "var(--raised)" }} />
          ))}
        </div>
        <span className="sr-only">Choosing your questions</span>
      </div>
    );
  }

  if (phase === "done") {
    const pct = Math.round((right / questions.length) * 100);
    return (
      <div>
        <p className="text-[13px]" style={{ color: "var(--ink-3)" }}>
          {unitTitle}
        </p>
        <h1 className="mt-2 text-[34px] font-semibold leading-tight tracking-tight">
          <span className="num">{right}</span> of{" "}
          <span className="num">{questions.length}</span>
        </h1>
        <p className="prose-serif mt-3 text-[17px]" style={{ color: "var(--ink-2)" }}>
          {pct === 100
            ? "All of them. Try a harder unit, or come back for a different set."
            : pct >= 60
              ? "Worth another round — every lesson draws a different set of questions."
              : "These are meant to be learned rather than guessed. The explanations below are the useful part."}
        </p>

        {wrongOnes.length > 0 ? (
          <section className="mt-9">
            <h2 className="text-[15px] font-semibold">What to look at again</h2>
            <ul className="mt-3 border-t" style={{ borderColor: "var(--rule-soft)" }}>
              {wrongOnes.map((w) => (
                <li
                  key={w.id}
                  className="border-b py-4"
                  style={{ borderColor: "var(--rule-soft)" }}
                >
                  <p className="text-[15px] font-medium">{w.prompt}</p>
                  {w.context ? (
                    <p className="mt-0.5 text-[14px]" style={{ color: "var(--ink-3)" }}>
                      {w.context}
                    </p>
                  ) : null}
                  <p
                    className="prose-serif mt-1.5 max-w-[38rem] text-[15px] leading-snug"
                    style={{ color: "var(--ink-2)" }}
                  >
                    {w.explain}
                  </p>
                  {w.link ? (
                    <Link
                      href={w.link.href}
                      className="mt-1.5 inline-block text-[14px] underline underline-offset-4 transition-colors hover:text-[var(--signal-ink)]"
                      style={{ textDecorationColor: "var(--rule)" }}
                    >
                      {w.link.label}
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            href={nextHref}
            className="rounded-md px-5 py-2.5 text-[15px] font-medium transition-opacity hover:opacity-90"
            style={{ background: "var(--signal)", color: "#17130a" }}
          >
            Another set
          </Link>
          <Link
            href="/learn"
            className="rounded-md border px-5 py-2.5 text-[15px] transition-colors hover:text-[var(--signal-ink)]"
            style={{ borderColor: "var(--rule)" }}
          >
            All units
          </Link>
        </div>
      </div>
    );
  }

  if (!q) return null;

  return (
    <div>
      {/* Progress. One segment per question, filled as you go. */}
      <div className="flex items-center gap-3">
        <Link
          href="/learn"
          className="text-[13px] transition-colors hover:text-[var(--signal-ink)]"
          style={{ color: "var(--ink-3)" }}
        >
          {unitTitle}
        </Link>
        <div className="flex flex-1 gap-1" aria-hidden>
          {questions.map((_, i) => (
            <span
              key={i}
              className="h-1 flex-1 rounded-full"
              style={{
                background:
                  i < index || (i === index && phase === "answered")
                    ? "var(--signal)"
                    : "var(--rule)",
              }}
            />
          ))}
        </div>
        <span className="num text-[13px]" style={{ color: "var(--ink-3)" }}>
          {index + 1}/{questions.length}
        </span>
      </div>

      <h1 className="mt-8 text-[26px] font-semibold leading-tight tracking-tight">{q.prompt}</h1>
      {q.context ? (
        <p className="prose-serif mt-2 max-w-[36rem] text-[17px]" style={{ color: "var(--ink-2)" }}>
          {q.context}
        </p>
      ) : null}

      <ul className="mt-7 space-y-2.5" role="radiogroup" aria-label={q.prompt}>
        {q.choices.map((c, i) => {
          const isAnswer = c.id === q.answer;
          const isChosen = c.id === chosen;
          const show = phase === "answered";
          // After answering, mark the right one green and a wrong pick red.
          // Everything else stays neutral rather than being greyed out, so
          // the page does not flash four colours at once.
          const border = show && isAnswer ? "#4a7d4e" : show && isChosen ? "#8a4440" : "var(--rule)";
          const bg =
            show && isAnswer
              ? "rgba(74,125,78,0.14)"
              : show && isChosen
                ? "rgba(138,68,64,0.14)"
                : "var(--raised)";
          return (
            <li key={c.id}>
              <button
                type="button"
                role="radio"
                aria-checked={isChosen}
                disabled={show}
                onClick={() => choose(c.id)}
                className="flex w-full items-baseline gap-3 rounded-md border px-4 py-3.5 text-left transition-colors disabled:cursor-default"
                style={{ borderColor: border, background: bg }}
              >
                <span
                  className="num text-[12px] leading-5"
                  style={{ color: "var(--ink-3)" }}
                  aria-hidden
                >
                  {LETTERS[i]}
                </span>
                <span className="flex-1">
                  <span className="text-[16px]">{c.label}</span>
                  {c.sub ? (
                    <span className="mt-0.5 block text-[13px]" style={{ color: "var(--ink-3)" }}>
                      {c.sub}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {phase === "answered" ? (
        <div
          className="mt-6 rounded-md px-5 py-4"
          style={{ background: "var(--raised)", boxShadow: "inset 0 0 0 1px var(--rule)" }}
        >
          <p className="text-[15px] font-semibold" style={{ color: correct ? "#8fbf93" : "#d79a95" }}>
            {correct ? "Right" : "Not that one"}
          </p>
          <p
            className="prose-serif mt-1.5 max-w-[38rem] text-[16px] leading-snug"
            style={{ color: "var(--ink-2)" }}
          >
            {q.explain}
          </p>
          {q.link ? (
            <Link
              href={q.link.href}
              className="mt-2 inline-block text-[14px] underline underline-offset-4 transition-colors hover:text-[var(--signal-ink)]"
              style={{ textDecorationColor: "var(--rule)" }}
            >
              {q.link.label}
            </Link>
          ) : null}
          <div className="mt-4">
            <button
              type="button"
              onClick={next}
              className="rounded-md px-5 py-2.5 text-[15px] font-medium transition-opacity hover:opacity-90"
              style={{ background: "var(--signal)", color: "#17130a" }}
            >
              {index + 1 >= questions.length ? "Finish" : "Continue"}
            </button>
            <span className="ml-3 text-[13px]" style={{ color: "var(--ink-3)" }}>
              or press Enter
            </span>
          </div>
        </div>
      ) : (
        <p className="mt-5 text-[13px]" style={{ color: "var(--ink-3)" }}>
          Pick one, or press {LETTERS.slice(0, q.choices.length).join(", ")}.
        </p>
      )}
    </div>
  );
}
