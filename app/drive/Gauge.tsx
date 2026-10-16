"use client";

import { fmt } from "../../src/ui/format";

// Colours reused from the chart, where they were validated against this dark
// surface for lightness, chroma, colour-blind separation and contrast.
const EXPECTED = "#d97706"; // the car you are driving
const BOUND = "#3b82f6"; // the two ghosts

const START_DEG = 150;
const SWEEP_DEG = 240;
const CX = 100;
const CY = 100;
const R = 78;

function angleFor(value: number, max: number): number {
  const frac = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  return START_DEG + frac * SWEEP_DEG;
}

function pointOn(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

function arcPath(fromDeg: number, toDeg: number, radius: number): string {
  const a = pointOn(fromDeg, radius);
  const b = pointOn(toDeg, radius);
  const large = toDeg - fromDeg > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${radius} ${radius} 0 ${large} 1 ${b.x} ${b.y}`;
}

function Needle({
  value,
  max,
  color,
  width,
  opacity,
  length = R - 10,
}: {
  value: number;
  max: number;
  color: string;
  width: number;
  opacity: number;
  length?: number;
}) {
  const tip = pointOn(angleFor(value, max), length);
  const tail = pointOn(angleFor(value, max) + 180, 10);
  return (
    <line
      x1={tail.x}
      y1={tail.y}
      x2={tip.x}
      y2={tip.y}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      opacity={opacity}
    />
  );
}

/**
 * A gauge with THREE needles: a bright one for the car you are driving, and a
 * faint one for each end of the model's range. The spread between the faint
 * needles is the uncertainty in the parts data, shown rather than claimed.
 */
export default function Gauge({
  label,
  unit,
  max,
  expected,
  low,
  high,
  redlineFrom,
  decimals = 0,
  collapsed,
  tickStep,
  note,
}: {
  label: string;
  unit: string;
  max: number;
  expected: number;
  low: number;
  high: number;
  redlineFrom?: number;
  decimals?: number;
  collapsed?: boolean;
  tickStep?: number;
  /** Shown under the gauge when the three cars are not comparable. */
  note?: string;
}) {
  // An explicit round step, because max/6 produced tick labels like 1167.
  const step = tickStep ?? max / 6;
  const ticks: number[] = [];
  for (let t = 0; t <= max + 1e-9; t += step) ticks.push(t);

  // The band spans ALL THREE cars, not just the two ghosts. On the tacho the
  // three can be in different gears, so the driven car's rpm is not
  // necessarily between the ghosts' — and a band that does not contain its own
  // needle reads as a bug and misleads about what the spread means.
  const bandLo = Math.min(low, high, expected);
  const bandHi = Math.max(low, high, expected);
  const describe = collapsed
    ? `${label}: ${fmt(expected, decimals)} ${unit}. No range shown: with no parts fitted the three cars are identical.`
    : `${label}: ${fmt(expected, decimals)} ${unit}, model range ${fmt(Math.min(low, high, expected), decimals)} to ${fmt(Math.max(low, high, expected), decimals)}.${note ? " " + note : ""}`;

  return (
    <figure className="m-0">
      <svg viewBox="-14 -4 228 158" className="w-full" role="img" aria-label={describe}>
        <title>{describe}</title>

        {/* Track */}
        <path
          d={arcPath(START_DEG, START_DEG + SWEEP_DEG, R)}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={10}
          strokeLinecap="round"
        />

        {/* Redline zone, for the tacho */}
        {redlineFrom !== undefined && redlineFrom < max && (
          <path
            d={arcPath(angleFor(redlineFrom, max), START_DEG + SWEEP_DEG, R)}
            fill="none"
            stroke="#ef4444"
            strokeOpacity={0.5}
            strokeWidth={10}
            strokeLinecap="round"
          />
        )}

        {/* The band between the two ghosts: the model's spread, drawn as an arc */}
        {!collapsed && bandHi - bandLo > 1e-9 && (
          <path
            d={arcPath(angleFor(bandLo, max), angleFor(bandHi, max), R)}
            fill="none"
            stroke={BOUND}
            strokeOpacity={0.3}
            strokeWidth={10}
          />
        )}

        {/* Ticks */}
        {ticks.map((t) => {
          const a = angleFor(t, max);
          const outer = pointOn(a, R + 7);
          const inner = pointOn(a, R - 7);
          const labelAt = pointOn(a, R + 17);
          return (
            <g key={t}>
              <line
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke="rgba(255,255,255,0.25)"
                strokeWidth={1.5}
              />
              <text
                x={labelAt.x}
                y={labelAt.y}
                fill="rgba(226,232,240,0.45)"
                fontSize={9}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {Math.round(t)}
              </text>
            </g>
          );
        })}

        {/* Ghost needles: the ends of the model's range */}
        {!collapsed && (
          <>
            <Needle value={low} max={max} color={BOUND} width={2} opacity={0.55} length={R - 18} />
            <Needle value={high} max={max} color={BOUND} width={2} opacity={0.55} length={R - 18} />
          </>
        )}

        {/* The car you are driving */}
        <Needle value={expected} max={max} color={EXPECTED} width={3.5} opacity={1} />
        <circle cx={CX} cy={CY} r={6} fill="#0b0f14" stroke={EXPECTED} strokeWidth={2} />

        {/* Reading */}
        <text
          x={CX}
          y={CY + 30}
          fill="#e6edf3"
          fontSize={22}
          fontWeight={600}
          textAnchor="middle"
        >
          {fmt(expected, decimals)}
        </text>
        <text x={CX} y={CY + 43} fill="rgba(148,163,184,0.9)" fontSize={9} textAnchor="middle">
          {unit}
        </text>
      </svg>
      <figcaption className="mt-1 text-center text-xs uppercase tracking-wide text-slate-500">
        {label}
      </figcaption>
      {note && (
        <p className="mt-0.5 text-center text-[10px] leading-snug text-amber-400/70">
          {note}
        </p>
      )}
    </figure>
  );
}

export { EXPECTED, BOUND };
