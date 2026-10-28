import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UNITS, UNIT_BY_ID, buildPool, type UnitId } from "@/src/learn/questions";
import Quiz from "../Quiz";

export function generateStaticParams() {
  return UNITS.map((u) => ({ unit: u.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ unit: string }>;
}): Promise<Metadata> {
  const unit = UNIT_BY_ID[(await params).unit];
  if (!unit) return { title: "Not found" };
  return { title: unit.title, description: unit.blurb };
}

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ unit: string }>;
  searchParams: Promise<{ s?: string }>;
}) {
  const unitId = (await params).unit as UnitId;
  const unit = UNIT_BY_ID[unitId];
  if (!unit) notFound();

  // The seed lives in the URL so a lesson can be linked, reloaded and argued
  // with. Without one, pick a fresh set per visit.
  const raw = (await searchParams).s;
  const seed = raw && /^\d+$/.test(raw) ? Number(raw) : Math.floor(Math.random() * 1e9);
  // A pool, not a lesson: the client picks the eight it most needs from it.
  const pool = buildPool(unitId, seed);
  if (pool.length === 0) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Quiz
        pool={pool}
        unitId={unitId}
        unitTitle={unit.title}
        nextHref={`/learn/${unitId}?s=${(seed + 1) % 1_000_000_007}`}
      />
    </main>
  );
}
