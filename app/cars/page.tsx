import type { Metadata } from "next";
import { CARS, CAR_SUMMARIES, CATEGORIES } from "@/src/catalog";
import type { SortKey } from "@/src/catalog";
import { coverageOf } from "@/src/catalog/compare";
import type { Category } from "@/src/catalog";
import CarBrowser from "./CarBrowser";

export const metadata: Metadata = {
  title: "Cars",
  description:
    "A written reference of real cars: sports cars, hypercars, racing prototypes and everyday cars, with published figures and their sources.",
};

type Filter = Category | "all";

export default async function CarsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const initialQuery = typeof sp.q === "string" ? sp.q : "";
  const raw = typeof sp.category === "string" ? sp.category : "all";
  const initialCategory: Filter = (CATEGORIES as readonly string[]).includes(raw)
    ? (raw as Category)
    : "all";
  const sortRaw = typeof sp.sort === "string" ? sp.sort : "maker";
  const initialSort: SortKey = (["maker", "name", "power", "year"] as const).includes(
    sortRaw as SortKey,
  )
    ? (sortRaw as SortKey)
    : "maker";

  const cover = coverageOf(CARS);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-[34px] font-semibold leading-tight tracking-tight">Cars</h1>
      <p className="prose-serif mt-3 text-[17px]" style={{ color: "var(--ink-2)" }}>
        {CARS.length} cars, written up one at a time. Every figure was published by the
        manufacturer or measured by an independent tester, and each one says which. Where a
        number could not be sourced it says so instead of guessing.
      </p>
      <p className="prose-serif mt-3 text-[15px]" style={{ color: "var(--ink-3)" }}>
        Across the whole catalogue, {cover.pct}% of the five headline figures are filled in.
        The rest are blank because nobody published them — most of the gaps are racing
        prototypes, for which a 0&ndash;60 time is not a number anyone records.
      </p>
      <div className="mt-9">
        <CarBrowser
          cars={CAR_SUMMARIES}
          initialQuery={initialQuery}
          initialCategory={initialCategory}
          initialSort={initialSort}
        />
      </div>
    </main>
  );
}
