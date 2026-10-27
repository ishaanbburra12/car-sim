import Link from "next/link";
import { BRAND_BY_SLUG, type Car, type MaybeFigure } from "@/src/catalog";

const fmt = (n: number, decimals: number) =>
  n.toLocaleString("en-GB", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const CATEGORY_WORD: Record<Car["category"], string> = {
  hypercar: "Hypercar",
  sports: "Sports car",
  prototype: "Prototype",
  everyday: "Everyday",
};

/**
 * A row in the index.
 *
 * Deliberately not a card. Fifty cars in a three-column grid of identical
 * rounded boxes is a wall to be waded through; fifty rows with the figures in
 * one aligned column is a list you can run your eye down, which is what an
 * index is for and what makes a reference work usable.
 */
export function CarRow({ car, showBrand = true }: { car: Car; showBrand?: boolean }) {
  const brand = BRAND_BY_SLUG[car.brand];
  return (
    <li>
      <Link
        href={`/cars/${car.slug}`}
        className="group grid grid-cols-[1fr_auto] items-baseline gap-x-8 gap-y-0.5 border-b py-3.5 transition-colors sm:grid-cols-[1fr_7.5rem_5.5rem]"
        style={{ borderColor: "var(--rule-soft)" }}
      >
        <span className="min-w-0">
          {showBrand ? (
            <span className="block text-[13px]" style={{ color: "var(--ink-3)" }}>
              {brand?.name}
            </span>
          ) : null}
          <span className="block truncate text-[17px] font-medium transition-colors group-hover:text-[var(--signal-ink)]">
            {car.name}
          </span>
        </span>

        <span
          className="num hidden text-right text-[13px] sm:block"
          style={{ color: "var(--ink-3)" }}
          title={CATEGORY_WORD[car.category]}
        >
          {car.years}
        </span>

        <span className="num text-right text-[15px]" style={{ color: "var(--ink-2)" }}>
          {car.powerHp ? (
            <>
              <span style={{ color: "var(--ink)" }}>{fmt(car.powerHp.value, 0)}</span> hp
            </>
          ) : (
            <span style={{ color: "var(--ink-3)" }}>&mdash;</span>
          )}
        </span>
      </Link>
    </li>
  );
}

export function CarIndex({ cars, showBrand = true }: { cars: Car[]; showBrand?: boolean }) {
  return (
    <ul className="border-t" style={{ borderColor: "var(--rule-soft)" }}>
      {cars.map((car) => (
        <CarRow key={car.slug} car={car} showBrand={showBrand} />
      ))}
    </ul>
  );
}

/**
 * The spec block — the one raised surface on the page, because it is the one
 * thing here that is an object rather than a passage of text.
 *
 * Provenance gets its own column rather than a footnote, so you can run down
 * it and see at a glance how much of a car is the maker's own claim, how much
 * someone else measured, and how much nobody has published. That column is the
 * entire argument of this site, so it is given the room to be read.
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
    <div
      className="grid grid-cols-[1fr_auto] items-baseline gap-x-5 gap-y-0.5 border-b py-3 last:border-0 sm:grid-cols-[7.5rem_1fr_8.5rem]"
      style={{ borderColor: "var(--rule)" }}
    >
      <dt className="text-[14px]" style={{ color: "var(--ink-2)" }}>
        {label}
      </dt>
      {figure === null ? (
        <>
          <dd className="num text-right text-[15px]" style={{ color: "var(--ink-3)" }}>
            &mdash;
          </dd>
          <dd
            className="col-span-2 text-[13px] sm:col-span-1 sm:text-left"
            style={{ color: "var(--ink-3)" }}
          >
            not listed
          </dd>
        </>
      ) : (
        <>
          <dd className="text-right">
            <span className="num text-[21px] font-semibold leading-none">
              {fmt(figure.value, decimals)}
            </span>
            <span className="ml-1.5 text-[13px]" style={{ color: "var(--ink-2)" }}>
              {unit}
            </span>
          </dd>
          <dd
            className="col-span-2 text-[13px] sm:col-span-1 sm:text-left"
            style={{ color: "var(--ink-3)" }}
          >
            {figure.source === "manufacturer" ? "maker's figure" : "independent test"}
            {figure.note ? (
              <span className="mt-0.5 block leading-snug">{figure.note}</span>
            ) : null}
          </dd>
        </>
      )}
    </div>
  );
}

export function SpecTable({ car }: { car: Car }) {
  return (
    <dl
      className="rounded-md px-5 py-1"
      style={{ background: "var(--raised)", boxShadow: "inset 0 0 0 1px var(--rule)" }}
    >
      <SpecRow label="Power" figure={car.powerHp} unit="hp" />
      <SpecRow label="Torque" figure={car.torqueLbFt} unit="lb-ft" />
      <SpecRow label="Weight" figure={car.weightKg} unit="kg" />
      <SpecRow label="0&ndash;60 mph" figure={car.zeroTo60S} unit="s" decimals={1} />
      <SpecRow label="Top speed" figure={car.topSpeedMph} unit="mph" />
    </dl>
  );
}
