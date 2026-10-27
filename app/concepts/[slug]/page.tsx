import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CONCEPTS, CONCEPT_BY_SLUG, examplesOf } from "@/src/catalog/concepts";
import { BRAND_BY_SLUG } from "@/src/catalog";

export function generateStaticParams() {
  return CONCEPTS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const concept = CONCEPT_BY_SLUG[(await params).slug];
  if (!concept) return { title: "Not found" };
  return { title: concept.term, description: concept.short };
}

export default async function ConceptPage({ params }: { params: Promise<{ slug: string }> }) {
  const concept = CONCEPT_BY_SLUG[(await params).slug];
  if (!concept) notFound();
  const examples = examplesOf(concept);
  const see = (concept.see ?? []).map((s) => CONCEPT_BY_SLUG[s]).filter(Boolean);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/concepts"
        className="text-[13px] transition-colors hover:text-[var(--signal-ink)]"
        style={{ color: "var(--ink-3)" }}
      >
        Ideas
      </Link>
      <h1 className="mt-2 text-[34px] font-semibold leading-tight tracking-tight">
        {concept.term}
      </h1>
      <p className="prose-serif mt-3 text-[17px]" style={{ color: "var(--ink-2)" }}>
        {concept.short}
      </p>

      <div className="mt-8 space-y-5">
        {concept.body.map((para, i) => (
          <p key={i} className="prose-serif text-[17px] leading-relaxed">
            {para}
          </p>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="text-[15px] font-semibold">
          {examples.length === 1 ? "A car that shows it" : "Cars that show it"}
        </h2>
        <ul className="mt-3 border-t" style={{ borderColor: "var(--rule-soft)" }}>
          {examples.map((e) => (
            <li key={e.car.slug}>
              <Link
                href={`/cars/${e.car.slug}`}
                className="group block border-b py-4"
                style={{ borderColor: "var(--rule-soft)" }}
              >
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span
                    className="text-[13px]"
                    style={{ color: "var(--ink-3)" }}
                  >
                    {BRAND_BY_SLUG[e.car.brand]?.name ?? e.car.brand}
                  </span>
                  <span className="text-[17px] font-medium transition-colors group-hover:text-[var(--signal-ink)]">
                    {e.car.name}
                  </span>
                  <span className="num text-[13px]" style={{ color: "var(--ink-3)" }}>
                    {e.car.years}
                  </span>
                </div>
                <p
                  className="prose-serif mt-1.5 text-[15px] leading-snug"
                  style={{ color: "var(--ink-2)" }}
                >
                  {e.why}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {see.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-[15px] font-semibold">Read next</h2>
          <ul className="mt-3 space-y-2">
            {see.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/concepts/${s.slug}`}
                  className="group text-[15px] transition-colors hover:text-[var(--signal-ink)]"
                >
                  {s.term}
                  <span className="ml-2 text-[14px]" style={{ color: "var(--ink-3)" }}>
                    {s.short}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
