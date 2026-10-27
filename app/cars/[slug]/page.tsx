import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BRAND_BY_SLUG,
  CARS,
  CAR_BY_SLUG,
  carsOfBrand,
} from "@/src/catalog";
import { CarIndex, SpecTable } from "@/app/components/catalog-ui";
import { toRow } from "@/app/components/to-row";
import { CompareChart } from "@/app/components/compare-chart";
import { coverage } from "@/src/catalog/compare";

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
  return {
    title: `${BRAND_BY_SLUG[car.brand]?.name} ${car.name}`,
    description: car.blurb.slice(0, 160),
  };
}

const CATEGORY_WORD: Record<string, string> = {
  hypercar: "Hypercar",
  sports: "Sports car",
  prototype: "Racing prototype",
  everyday: "Everyday car",
};

export default async function CarPage({ params }: { params: Promise<{ slug: string }> }) {
  const car = CAR_BY_SLUG[(await params).slug];
  if (!car) notFound();
  const brand = BRAND_BY_SLUG[car.brand];
  const siblings = carsOfBrand(car.brand).filter((c) => c.slug !== car.slug);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href={`/brands/${car.brand}`}
        className="text-[14px] transition-colors hover:text-[var(--signal-ink)]"
        style={{ color: "var(--ink-2)" }}
      >
        {brand?.name}
      </Link>

      <h1 className="mt-1 text-[38px] font-semibold leading-[1.1] tracking-tight">{car.name}</h1>

      <div
        className="mt-4 flex flex-wrap items-baseline gap-x-8 gap-y-1 text-[14px]"
        style={{ color: "var(--ink-2)" }}
      >
        <span>{car.years}</span>
        <span>{CATEGORY_WORD[car.category]}</span>
        {car.produced ? (
          <span>
            <span className="num font-semibold" style={{ color: "var(--ink)" }}>
              {car.produced.count.toLocaleString("en-GB")}
            </span>{" "}
            built
          </span>
        ) : null}
      </div>
      {car.produced?.note ? (
        <p className="mt-1.5 text-[13px]" style={{ color: "var(--ink-3)" }}>
          {car.produced.note}
        </p>
      ) : null}

      <p className="prose-serif mt-7 text-[18px]">{car.blurb}</p>

      {car.review ? (
        <p
          className="mt-5 rounded-md px-4 py-3 text-[14px] leading-relaxed"
          style={{
            background: "var(--raised)",
            boxShadow: "inset 0 0 0 1px var(--rule)",
            color: "var(--ink-2)",
          }}
        >
          <span style={{ color: "var(--ink)" }}>Needs checking. </span>
          {car.review}
        </p>
      ) : null}

      <dl
        className="mt-8 grid gap-x-8 gap-y-4 border-t pt-6 sm:grid-cols-2"
        style={{ borderColor: "var(--rule)" }}
      >
        <div>
          <dt className="text-[13px]" style={{ color: "var(--ink-3)" }}>
            Layout
          </dt>
          <dd className="mt-0.5 text-[15px]">{car.layout}</dd>
        </div>
        <div>
          <dt className="text-[13px]" style={{ color: "var(--ink-3)" }}>
            Engine
          </dt>
          <dd className="mt-0.5 text-[15px]">{car.engine}</dd>
        </div>
      </dl>

      <section className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 className="text-[15px] font-semibold">Published figures</h2>
          <span className="text-[13px]" style={{ color: "var(--ink-3)" }}>
            <span className="num">{coverage(car).have}</span> of{" "}
            <span className="num">{coverage(car).of}</span> filled in
          </span>
        </div>
        <p className="prose-serif mt-1.5 text-[15px]" style={{ color: "var(--ink-2)" }}>
          A maker&rsquo;s figure is what the company printed. An independent test is what
          somebody else measured, usually on a public road with a full tank, which is normally
          a little slower. Neither is adjusted here, and nothing is estimated.
        </p>
        <div className="mt-5">
          <SpecTable car={car} />
        </div>
      </section>

      <CompareChart car={car} />

      <section className="mt-12 border-t pt-6" style={{ borderColor: "var(--rule)" }}>
        <h2 className="text-[15px] font-semibold">Sources</h2>
        <ul className="mt-2 space-y-1.5 text-[14px]" style={{ color: "var(--ink-2)" }}>
          {car.sources.map((src) => (
            <li key={`${src.publisher}-${src.title}`}>
              <span style={{ color: "var(--ink)" }}>{src.publisher}</span>
              {", "}
              {src.url ? (
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4 transition-colors hover:text-[var(--signal-ink)]"
                  style={{ textDecorationColor: "var(--rule)" }}
                >
                  {src.title}
                </a>
              ) : (
                src.title
              )}
              {src.year ? <span className="num"> ({src.year})</span> : null}
            </li>
          ))}
        </ul>
        {brand ? (
          <p className="mt-4 text-[14px]" style={{ color: "var(--ink-2)" }}>
            {brand.name}&rsquo;s own site:{" "}
            <a
              href={brand.site}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 transition-colors hover:text-[var(--signal-ink)]"
              style={{ textDecorationColor: "var(--rule)" }}
            >
              {brand.site.replace("https://", "")}
            </a>
          </p>
        ) : null}
      </section>

      {siblings.length > 0 ? (
        <section className="mt-12">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-[15px] font-semibold">More from {brand?.name}</h2>
            <Link
              href={`/brands/${car.brand}`}
              className="text-[14px] transition-colors hover:text-[var(--signal-ink)]"
              style={{ color: "var(--ink-2)" }}
            >
              All {siblings.length + 1}
            </Link>
          </div>
          <div className="mt-3">
            <CarIndex cars={siblings.slice(0, 4).map(toRow)} showBrand={false} />
          </div>
        </section>
      ) : null}
    </main>
  );
}
