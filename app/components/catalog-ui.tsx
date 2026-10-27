import Link from "next/link";
import {
  BRAND_BY_SLUG,
  CATEGORY_LABELS,
  type Car,
  type Category,
  type MaybeFigure,
} from "@/src/catalog";

const CATEGORY_STYLE: Record<Category, string> = {
  hypercar: "bg-rose-500/10 text-rose-300 ring-rose-400/20",
  sports: "bg-amber-500/10 text-amber-300 ring-amber-400/20",
  prototype: "bg-sky-500/10 text-sky-300 ring-sky-400/20",
  everyday: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20",
};

/** The singular form, for a chip on a single car. */
const CATEGORY_ONE: Record<Category, string> = {
  hypercar: "Hypercar",
  sports: "Sports car",
  prototype: "Prototype",
  everyday: "Everyday",
};

export function CategoryChip({ category }: { category: Category }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${CATEGORY_STYLE[category]}`}
    >
      {CATEGORY_ONE[category]}
    </span>
  );
}

/**
 * One row of the spec table.
 *
 * The whole point of this component is the `null` branch. A reference site
 * that quietly omits a row it has no data for looks complete; one that prints
 * "Not listed" is telling the reader something true, which is that we did not
 * find a figure we were willing to stand behind.
 */
function SpecRow({
  label,
  figure,
  unit,
  decimals = 0,
}: {
  label: string;
  figure: MaybeFigure;
  unit: string;
  decimals?: number;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-white/5 py-3 last:border-0">
      <dt className="text-sm text-slate-400">{label}</dt>
      {figure === null ? (
        <dd className="text-sm italic text-slate-500">Not listed</dd>
      ) : (
        <dd className="text-right">
          <span className="text-lg font-semibold tabular-nums text-slate-100">
            {figure.value.toFixed(decimals)}
          </span>
          <span className="ml-1 text-sm text-slate-400">{unit}</span>
          <span className="ml-2 text-xs text-slate-500">
            {figure.source === "manufacturer" ? "maker's figure" : "independent test"}
          </span>
          {figure.note ? (
            <span className="mt-0.5 block max-w-sm text-xs text-slate-500">{figure.note}</span>
          ) : null}
        </dd>
      )}
    </div>
  );
}

export function SpecTable({ car }: { car: Car }) {
  return (
    <dl className="rounded-lg border border-white/10 bg-white/[0.02] px-4">
      <SpecRow label="Power" figure={car.powerHp} unit="hp" />
      <SpecRow label="Torque" figure={car.torqueLbFt} unit="lb-ft" />
      <SpecRow label="Weight" figure={car.weightKg} unit="kg" />
      <SpecRow label="0-60 mph" figure={car.zeroTo60S} unit="s" decimals={1} />
      <SpecRow label="Top speed" figure={car.topSpeedMph} unit="mph" />
    </dl>
  );
}

export function CarCard({ car }: { car: Car }) {
  const brand = BRAND_BY_SLUG[car.brand];
  return (
    <Link
      href={`/cars/${car.slug}`}
      className="group flex flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-4 transition hover:border-amber-400/40 hover:bg-white/[0.05]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-slate-500">{brand?.name}</p>
          <h3 className="truncate text-base font-semibold text-slate-100 group-hover:text-amber-300">
            {car.name}
          </h3>
        </div>
        <CategoryChip category={car.category} />
      </div>
      <p className="text-xs text-slate-500">{car.years}</p>
      <p className="text-sm text-slate-400">{car.engine}</p>
      <p className="mt-auto pt-2 text-sm tabular-nums text-slate-300">
        {car.powerHp ? (
          <>
            {car.powerHp.value} hp
          </>
        ) : (
          <span className="italic text-slate-500">Power not listed</span>
        )}
      </p>
    </Link>
  );
}

export function CategoryHeading({ category }: { category: Category }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
      {CATEGORY_LABELS[category]}
    </h2>
  );
}
