import type { Metadata } from "next";
import Link from "next/link";
import { UNITS, LESSON_LENGTH } from "@/src/learn/questions";
import Standing from "./Standing";

export const metadata: Metadata = {
  title: "Practise",
  description:
    "Short lessons drawn from the catalogue: which car is lighter, where a figure came from, what a blank in a specification table means.",
};

export default function LearnPage() {
  const units = UNITS.map((u) => ({ id: u.id, title: u.title }));
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-[34px] font-semibold leading-tight tracking-tight">Practise</h1>
      <p className="prose-serif mt-3 max-w-2xl text-[17px]" style={{ color: "var(--ink-2)" }}>
        Reading about cars and being able to tell two apart are different skills, and only one of
        them comes from reading. These are short sets of {LESSON_LENGTH} questions, built from the
        catalogue itself, so the answer to every one of them is whatever the sourced figures say.
        Get one wrong and the explanation tells you both numbers and where each came from.
      </p>

      <Standing units={units} />

      <ul className="mt-10 border-t" style={{ borderColor: "var(--rule-soft)" }}>
        {UNITS.map((u) => (
          <li key={u.id}>
            <Link
              href={`/learn/${u.id}`}
              className="group block border-b py-5"
              style={{ borderColor: "var(--rule-soft)" }}
            >
              <span className="text-[19px] font-medium transition-colors group-hover:text-[var(--signal-ink)]">
                {u.title}
              </span>
              <span
                className="prose-serif mt-1 block max-w-[40rem] text-[15px] leading-snug"
                style={{ color: "var(--ink-2)" }}
              >
                {u.blurb}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
