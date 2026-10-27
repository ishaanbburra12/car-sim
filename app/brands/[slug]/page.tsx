import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BRANDS, BRAND_BY_SLUG, CATEGORIES, CATEGORY_LABELS, carsOfBrand } from "@/src/catalog";
import { CarIndex } from "@/app/components/catalog-ui";

export function generateStaticParams() {
  return BRANDS.map((brand) => ({ slug: brand.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const brand = BRAND_BY_SLUG[(await params).slug];
  if (!brand) return { title: "Brand not found" };
  return { title: brand.name, description: brand.blurb.slice(0, 160) };
}

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const brand = BRAND_BY_SLUG[(await params).slug];
  if (!brand) notFound();
  const cars = carsOfBrand(brand.slug);
  const used = CATEGORIES.filter((c) => cars.some((car) => car.category === c));

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/brands"
        className="text-[14px] transition-colors hover:text-[var(--signal-ink)]"
        style={{ color: "var(--ink-2)" }}
      >
        Brands
      </Link>

      <h1 className="mt-1 text-[38px] font-semibold leading-[1.1] tracking-tight">
        {brand.name}
      </h1>
      <div
        className="mt-4 flex flex-wrap gap-x-8 gap-y-1 text-[14px]"
        style={{ color: "var(--ink-2)" }}
      >
        <span>{brand.country}</span>
        <span>
          Founded <span className="num">{brand.founded}</span>
        </span>
        <span>
          <span className="num">{cars.length}</span> {cars.length === 1 ? "car" : "cars"} here
        </span>
      </div>

      <p className="prose-serif mt-7 text-[18px]">{brand.blurb}</p>

      <a
        href={brand.site}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-block rounded-md border px-4 py-2.5 text-[14px] transition-colors hover:text-[var(--signal-ink)]"
        style={{ borderColor: "var(--rule)" }}
      >
        {brand.name}&rsquo;s official site
      </a>

      {cars.length === 0 ? (
        <p className="mt-12 text-[15px]" style={{ color: "var(--ink-2)" }}>
          No cars from {brand.name} have been written up yet.
        </p>
      ) : (
        <div className="mt-12 flex flex-col gap-10">
          {used.map((category) => (
            <section key={category}>
              <h2 className="text-[15px] font-semibold">{CATEGORY_LABELS[category]}</h2>
              <div className="mt-3">
                <CarIndex cars={cars.filter((c) => c.category === category)} showBrand={false} />
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
