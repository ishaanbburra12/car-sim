import Link from "next/link";
import { BRANDS, CARS, CATEGORIES, CATEGORY_BLURBS, CATEGORY_LABELS } from "@/src/catalog";

export default function Home() {
  const counts = Object.fromEntries(
    CATEGORIES.map((c) => [c, CARS.filter((car) => car.category === c).length]),
  ) as Record<(typeof CATEGORIES)[number], number>;

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="max-w-[18ch] text-[46px] font-semibold leading-[1.05] tracking-tight sm:text-[58px]">
        Every number here came from somewhere.
      </h1>
      <p className="prose-serif mt-6 text-[19px]">
        {CARS.length} cars from {BRANDS.length} manufacturers, each written up by hand: what it
        is, how it is put together, and why it mattered. The figures were published by the
        manufacturer or measured by an independent tester, and every one of them says which.
        Where a number could not be sourced, the page says so rather than filling the gap. That
        rule leaves some blanks, and it is the reason the rest is worth reading.
      </p>

      <div className="mt-9 flex flex-wrap gap-3">
        <Link
          href="/cars"
          className="rounded-md px-5 py-2.5 text-[15px] font-medium transition-opacity hover:opacity-90"
          style={{ background: "var(--signal)", color: "#17130a" }}
        >
          Search the catalogue
        </Link>
        <Link
          href="/brands"
          className="rounded-md border px-5 py-2.5 text-[15px] transition-colors hover:text-[var(--signal-ink)]"
          style={{ borderColor: "var(--rule)" }}
        >
          Browse by brand
        </Link>
      </div>

      <ul className="mt-16 border-t" style={{ borderColor: "var(--rule-soft)" }}>
        {CATEGORIES.map((category) => (
          <li key={category}>
            <Link
              href={`/cars?category=${category}`}
              className="group grid grid-cols-[1fr_auto] items-baseline gap-x-8 gap-y-2 border-b py-6 sm:grid-cols-[13rem_1fr_3rem]"
              style={{ borderColor: "var(--rule-soft)" }}
            >
              <span className="text-[19px] font-medium transition-colors group-hover:text-[var(--signal-ink)]">
                {CATEGORY_LABELS[category]}
              </span>
              <span
                className="prose-serif col-span-2 text-[15px] sm:col-span-1"
                style={{ color: "var(--ink-2)" }}
              >
                {CATEGORY_BLURBS[category]}
              </span>
              <span
                className="num hidden text-right text-[14px] sm:block"
                style={{ color: "var(--ink-3)" }}
              >
                {counts[category]}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-16 border-t pt-8" style={{ borderColor: "var(--rule)" }}>
        <h2 className="text-[15px] font-semibold">There is also a simulator</h2>
        <p className="prose-serif mt-2 text-[16px]" style={{ color: "var(--ink-2)" }}>
          This project began as a performance simulator for a car that does not exist, and that
          part is still here: bolt parts onto it and see what the model thinks happens, as a
          range rather than a single number. It is kept well away from the catalogue, because
          everything it produces is an estimate and nothing in the catalogue is.
        </p>
        <div className="mt-4 flex flex-wrap gap-6 text-[15px]">
          <Link href="/garage" className="transition-colors hover:text-[var(--signal-ink)]">
            Open the simulator
          </Link>
          <Link
            href="/methods"
            className="transition-colors hover:text-[var(--signal-ink)]"
            style={{ color: "var(--ink-2)" }}
          >
            How its model works
          </Link>
        </div>
      </section>
    </main>
  );
}
