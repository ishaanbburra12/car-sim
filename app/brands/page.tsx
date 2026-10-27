import type { Metadata } from "next";
import Link from "next/link";
import { brandsWithCounts } from "@/src/catalog";

export const metadata: Metadata = {
  title: "Brands",
  description:
    "The manufacturers in this catalogue, what each is known for, and a link to each company's own site.",
};

export default function BrandsPage() {
  const brands = brandsWithCounts();
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Brands</h1>
        <p className="mt-2 max-w-3xl text-slate-400">
          {brands.length} manufacturers. Each page lists that company&rsquo;s cars in this
          catalogue and links out to its own site — nothing here is reproduced from it.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map(({ brand, count }) => (
          <Link
            key={brand.slug}
            href={`/brands/${brand.slug}`}
            className="group flex flex-col rounded-lg border border-white/10 bg-white/[0.02] p-4 transition hover:border-amber-400/40 hover:bg-white/[0.05]"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-100 group-hover:text-amber-300">
                {brand.name}
              </h2>
              <span className="shrink-0 text-xs text-slate-500">
                {count} {count === 1 ? "car" : "cars"}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {brand.country} &middot; founded {brand.founded}
            </p>
            <p className="mt-3 line-clamp-4 text-sm text-slate-400">{brand.blurb}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
