import type { Metadata } from "next";
import { CARS, CATEGORIES } from "@/src/catalog";
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
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const sp = await searchParams;
  const initialQuery = typeof sp.q === "string" ? sp.q : "";
  const raw = typeof sp.category === "string" ? sp.category : "all";
  const initialCategory: Filter = (CATEGORIES as readonly string[]).includes(raw)
    ? (raw as Category)
    : "all";

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-[34px] font-semibold leading-tight tracking-tight">Cars</h1>
      <p className="prose-serif mt-3 text-[17px]" style={{ color: "var(--ink-2)" }}>
        {CARS.length} cars, written up one at a time. Every figure was published by the
        manufacturer or measured by an independent tester, and each one says which. Where a
        number could not be sourced it says so instead of guessing.
      </p>
      <div className="mt-9">
        <CarBrowser initialQuery={initialQuery} initialCategory={initialCategory} />
      </div>
    </main>
  );
}
