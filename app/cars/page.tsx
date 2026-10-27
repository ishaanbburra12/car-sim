import type { Metadata } from "next";
import { CARS, CATEGORIES } from "@/src/catalog";
import type { Category } from "@/src/catalog";
import CarBrowser from "./CarBrowser";

export const metadata: Metadata = {
  title: "Cars",
  description:
    "A hand-written reference of real cars: sports cars, hypercars, racing prototypes and everyday cars, with published figures and their sources.",
};

type Filter = Category | "all";

export default async function CarsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  // Read the query string on the server so a shared link opens on the right
  // results; the client takes over from there and filters without reloading.
  const sp = await searchParams;
  const initialQuery = typeof sp.q === "string" ? sp.q : "";
  const raw = typeof sp.category === "string" ? sp.category : "all";
  const initialCategory: Filter = (CATEGORIES as readonly string[]).includes(raw)
    ? (raw as Category)
    : "all";

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Cars</h1>
        <p className="mt-2 max-w-3xl text-slate-400">
          {CARS.length} cars, written up by hand. Every figure on these pages was published by
          the manufacturer or measured by an independent tester, and each one says which. Where
          a number could not be sourced it says <span className="italic">not listed</span> rather
          than guessing.
        </p>
      </header>
      <CarBrowser initialQuery={initialQuery} initialCategory={initialCategory} />
    </main>
  );
}
