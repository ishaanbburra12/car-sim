import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BRANDS, BRAND_BY_SLUG, CATEGORIES, carsOfBrand } from "@/src/catalog";
import { CarCard, CategoryHeading } from "@/app/components/catalog-ui";

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

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/brands" className="hover:text-slate-200">
          Brands
        </Link>
      </nav>

      <header className="mb-10 border-b border-white/10 pb-8">
        <h1 className="text-3xl font-semibold tracking-tight">{brand.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {brand.country} &middot; founded {brand.founded}
        </p>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-300">{brand.blurb}</p>
        <a
          href={brand.site}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-2 rounded-md border border-amber-400/30 px-4 py-2 text-sm text-amber-300 transition hover:border-amber-400/60 hover:bg-amber-400/5"
        >
          Visit {brand.name}&rsquo;s official site
          <span aria-hidden>&rarr;</span>
        </a>
      </header>

      {cars.length === 0 ? (
        <p className="text-slate-400">No cars from {brand.name} have been written up yet.</p>
      ) : (
        <div className="flex flex-col gap-10">
          {CATEGORIES.filter((c) => cars.some((car) => car.category === c)).map((category) => (
            <section key={category}>
              <div className="mb-4">
                <CategoryHeading category={category} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cars
                  .filter((car) => car.category === category)
                  .map((car) => (
                    <CarCard key={car.slug} car={car} />
                  ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
