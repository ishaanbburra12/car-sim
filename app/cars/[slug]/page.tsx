import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BRAND_BY_SLUG, CARS, CAR_BY_SLUG, carsOfBrand } from "@/src/catalog";
import { CarCard, CategoryChip, SpecTable } from "@/app/components/catalog-ui";
import { CompareChart } from "@/app/components/compare-chart";

export function generateStaticParams() {
  return CARS.map((car) => ({ slug: car.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const car = CAR_BY_SLUG[(await params).slug];
  if (!car) return { title: "Car not found" };
  const brand = BRAND_BY_SLUG[car.brand];
  return {
    title: `${brand?.name} ${car.name}`,
    description: car.blurb.slice(0, 160),
  };
}

export default async function CarPage({ params }: { params: Promise<{ slug: string }> }) {
  const car = CAR_BY_SLUG[(await params).slug];
  if (!car) notFound();
  const brand = BRAND_BY_SLUG[car.brand];
  const siblings = carsOfBrand(car.brand).filter((c) => c.slug !== car.slug);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link href="/cars" className="hover:text-slate-200">
          Cars
        </Link>
        <span aria-hidden>/</span>
        <Link href={`/brands/${car.brand}`} className="hover:text-slate-200">
          {brand?.name}
        </Link>
      </nav>

      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            <span className="text-slate-400">{brand?.name}</span> {car.name}
          </h1>
          <CategoryChip category={car.category} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500">
          <span>{car.years}</span>
          {car.produced ? (
            <>
              <span aria-hidden>·</span>
              <span className="text-slate-300">
                <span className="font-semibold tabular-nums">
                  {car.produced.count.toLocaleString("en-GB")}
                </span>{" "}
                built
              </span>
            </>
          ) : null}
        </div>
        {car.produced?.note ? (
          <p className="mt-1 text-xs text-slate-500">{car.produced.note}</p>
        ) : null}
      </header>

      <p className="max-w-3xl text-lg leading-relaxed text-slate-300">{car.blurb}</p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Layout</h2>
          <p className="mt-1 text-slate-200">{car.layout}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Engine</h2>
          <p className="mt-1 text-slate-200">{car.engine}</p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Published figures
        </h2>
        <SpecTable car={car} />
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          A maker&rsquo;s figure is what the company printed. An independent test is what someone
          else measured, usually on a public road with a full tank, which is normally a little
          slower. Neither is adjusted here, and nothing on this page is estimated — if we could
          not source a number, the row says so.
        </p>
      </section>

      <CompareChart car={car} />

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Where these came from
        </h2>
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-400">
          {car.sources.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        {brand ? (
          <p className="mt-3 text-sm text-slate-400">
            {brand.name}&rsquo;s own site:{" "}
            <a
              href={brand.site}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-300 underline underline-offset-2 hover:text-amber-200"
            >
              {brand.site.replace("https://", "")}
            </a>
          </p>
        ) : null}
      </section>

      {siblings.length > 0 ? (
        <section className="mt-12">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              More from {brand?.name}
            </h2>
            <Link
              href={`/brands/${car.brand}`}
              className="text-sm text-amber-300 hover:text-amber-200"
            >
              All {siblings.length + 1} &rarr;
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {siblings.slice(0, 3).map((c) => (
              <CarCard key={c.slug} car={c} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
