import type { Metadata } from "next";
import Link from "next/link";
import { CONCEPTS } from "@/src/catalog/concepts";

export const metadata: Metadata = {
  title: "Ideas",
  description:
    "The ideas behind the numbers: what a 0-60 time actually measures, why a racing car's weight is set by the organisers, and how to read a blank in a specification table.",
};

export default function ConceptsPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-[34px] font-semibold leading-tight tracking-tight">Ideas</h1>
      <p className="prose-serif mt-3 max-w-2xl text-[17px]" style={{ color: "var(--ink-2)" }}>
        A specification table teaches very little on its own. These are the ideas that make the
        numbers mean something &mdash; what a 0-60 time actually measures, why several racing
        cars here read exactly the same power figure, and what a blank in a table is telling
        you. Every one is illustrated with cars from this catalogue.
      </p>

      <ul className="mt-9 border-t" style={{ borderColor: "var(--rule-soft)" }}>
        {CONCEPTS.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/concepts/${c.slug}`}
              className="group grid grid-cols-1 gap-x-6 gap-y-1 border-b py-4 sm:grid-cols-[18rem_1fr]"
              style={{ borderColor: "var(--rule-soft)" }}
            >
              <span className="text-[17px] font-medium transition-colors group-hover:text-[var(--signal-ink)]">
                {c.term}
              </span>
              <span className="text-[14px] leading-snug" style={{ color: "var(--ink-2)" }}>
                {c.short}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
