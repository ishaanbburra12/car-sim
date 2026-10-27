import type { Metadata } from "next";
import Link from "next/link";
import { brandsWithCounts } from "@/src/catalog";

export const metadata: Metadata = {
  title: "Brands",
  description:
    "The manufacturers in this catalogue, what each is known for, and a link to every company's own site.",
};

export default function BrandsPage() {
  const brands = brandsWithCounts();
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-[34px] font-semibold leading-tight tracking-tight">Brands</h1>
      <p className="prose-serif mt-3 text-[17px]" style={{ color: "var(--ink-2)" }}>
        {brands.length} manufacturers. Each page gives that company&rsquo;s cars in this
        catalogue and links out to its own site; nothing here is reproduced from it.
      </p>

      <ul className="mt-9 border-t" style={{ borderColor: "var(--rule-soft)" }}>
        {brands.map(({ brand, count }) => (
          <li key={brand.slug}>
            <Link
              href={`/brands/${brand.slug}`}
              className="group grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1 border-b py-4 sm:grid-cols-[13rem_1fr_4rem]"
              style={{ borderColor: "var(--rule-soft)" }}
            >
              <span className="text-[17px] font-medium transition-colors group-hover:text-[var(--signal-ink)]">
                {brand.name}
              </span>
              <span
                className="col-span-2 text-[14px] leading-snug sm:col-span-1"
                style={{ color: "var(--ink-2)" }}
              >
                {brand.country}, founded <span className="num">{brand.founded}</span>
              </span>
              <span
                className="num hidden text-right text-[14px] sm:block"
                style={{ color: "var(--ink-3)" }}
              >
                {count}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
