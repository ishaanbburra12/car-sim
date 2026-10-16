"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { Car } from "../../src/types";
import { estimate } from "../../src/engine";
import { DRIVE_TUNABLES } from "../../src/drive/tunables";
import type { Milestones } from "../../src/drive/session";
import { fmt, fmtBand } from "../../src/ui/format";

/**
 * A driven figure beside the model's range.
 *
 * modelLo and modelHi are REQUIRED props on purpose: it is a type error to
 * render what you achieved without what the model says, so a bare number can
 * never reach the screen by accident in some future session.
 */
function DrivenVsModel({
  label,
  driven,
  modelLo,
  modelHi,
  unit,
  decimals,
  lowerIsBetter,
  modelLabel,
  footnote,
}: {
  label: string;
  driven: number | null;
  modelLo: number;
  modelHi: number;
  unit: string;
  decimals: number;
  lowerIsBetter: boolean;
  /** What the modelled figure actually describes, which is not the same for every row. */
  modelLabel: string;
  footnote?: string;
}) {
  const uncertainty = DRIVE_TUNABLES.modelUncertaintyPct;
  const lo = Math.min(modelLo, modelHi);
  const hi = Math.max(modelLo, modelHi);
  const beat =
    driven !== null && (lowerIsBetter ? driven < lo : driven > hi);

  return (
    <div className="border-t border-white/5 py-3 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-sm text-slate-300">{label}</span>
        <span className="tabular-nums">
          {driven === null ? (
            <span className="text-sm text-slate-600">not reached this run</span>
          ) : (
            <span className="text-lg font-semibold text-slate-100">
              {fmt(driven, decimals)}
              <span className="ml-0.5 text-xs font-normal text-slate-500">{unit}</span>
            </span>
          )}
        </span>
      </div>

      <div className="mt-1 space-y-0.5 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">{modelLabel}</span>
          <span className="tabular-nums text-slate-400">
            <span className="mr-1 text-[10px] uppercase tracking-wide text-amber-400/80">
              est.
            </span>
            {fmtBand(lo, hi, decimals)} {unit}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">
            Widened by the assumed &plusmn;{Math.round(uncertainty * 100)}% model
            error
          </span>
          <span className="tabular-nums text-slate-500">
            {fmtBand(lo * (1 - uncertainty), hi * (1 + uncertainty), decimals)} {unit}
          </span>
        </div>
      </div>

      {footnote && <p className="mt-1.5 text-xs text-slate-500">{footnote}</p>}

      {beat && (
        <p className="mt-1.5 text-xs text-amber-400/80">
          Your run is outside the modelled range. That usually means the run was
          not a standing start from rest &mdash; the clock here runs from the
          moment the session began.
        </p>
      )}
    </div>
  );
}

export default function RunCard({
  car,
  partIds,
  milestones,
}: {
  car: Car;
  partIds: string[];
  milestones: Milestones;
}) {
  // estimate() runs four 24,000-step simulations, about 30 ms. This component
  // re-renders at the display rate, so calling it unmemoized burned roughly a
  // third of the main thread while driving. It depends only on the build.
  const partKey = partIds.join(",");
  const e = useMemo(
    () => estimate(car, partIds),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [car, partKey],
  );
  const nothingYet =
    milestones.zeroToSixtyS === null &&
    milestones.quarterMileS === null &&
    milestones.distanceM < 1;

  if (nothingYet) return null;

  return (
    <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium uppercase tracking-wide text-slate-400">
          Your run
        </h3>
        <span className="text-xs text-slate-500">
          {fmt(milestones.distanceM, 0)} m covered
        </span>
      </div>

      <div className="mt-3">
        <DrivenVsModel
          label="0 to 60 mph, from the start of this run"
          driven={milestones.zeroToSixtyS}
          modelLo={e.pessimistic.zeroToSixtyS}
          modelHi={e.optimistic.zeroToSixtyS}
          unit="s"
          decimals={1}
          lowerIsBetter
          modelLabel="Modelled for this build, launched perfectly"
        />
        <DrivenVsModel
          label="Quarter mile"
          driven={milestones.quarterMileS}
          modelLo={e.pessimistic.quarterMileS}
          modelHi={e.optimistic.quarterMileS}
          unit="s"
          decimals={1}
          lowerIsBetter
          modelLabel="Modelled for this build, launched perfectly"
        />
        <DrivenVsModel
          label="Fastest you reached"
          driven={milestones.topSpeedMph > 0 ? milestones.topSpeedMph : null}
          modelLo={e.pessimistic.topSpeedMph}
          modelHi={e.optimistic.topSpeedMph}
          unit="mph"
          decimals={0}
          lowerIsBetter={false}
          modelLabel="This build's modelled maximum, given unlimited road"
          footnote={
            milestones.topSpeedMph > 0 &&
            milestones.topSpeedMph < Math.min(e.pessimistic.topSpeedMph, e.optimistic.topSpeedMph) * 0.9
              ? "Well short of the maximum simply means you stopped accelerating. Reaching it takes a long straight and a lot of patience, not a better car."
              : undefined
          }
        />
      </div>

      <div className="mt-3 space-y-2 border-t border-white/10 pt-3 text-xs leading-relaxed text-slate-500">
        <p>
          <span className="text-slate-400">The two ranges are different things.</span>{" "}
          The first is how much the <em>parts</em> data varies: the same build
          with every part at its worst against every part at its best. The
          second widens that by an assumed &plusmn;
          {Math.round(DRIVE_TUNABLES.modelUncertaintyPct * 100)}% for how wrong
          the <em>model</em> might be &mdash; tire grip, drag, driveline losses
          and shift times are all numbers we chose.
        </p>
        <p>
          <span className="text-slate-400">Where that &plusmn;10% comes from.</span>{" "}
          Not from the three cars in this app: the model agrees with their
          published figures to about 2%, but it was tuned to do that, so using
          that as an error bar would be circular. It was instead checked once
          against a car the model was never fitted to, where it predicted 0-60
          within 4.6%. One car is not a sample, so the band stays wider than
          that single result.{" "}
          <Link href="/methods" className="text-amber-400 underline underline-offset-2">
            Methods
          </Link>{" "}
          says so too.
        </p>
        <p>
          Your driven time will usually be slower than the modelled one, because
          the model launches perfectly every time and you are working a keyboard.
          Comparing it to a published 0-60 for a real car is not a fair
          comparison in either direction.
        </p>
      </div>
    </div>
  );
}
