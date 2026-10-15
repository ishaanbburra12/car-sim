import type { Car, Estimate, Part, Spec, Stats } from "./types";
import { PARTS } from "./data";

// ---- Constants and assumptions (list these on your Methods page) ----
const G = 9.81; // m/s^2
const AIR_DENSITY = 1.2; // kg/m^3, sea level, ~20 C
const W_PER_HP = 745.7;
const MPS_PER_MPH = 0.44704;
const FT_PER_M = 3.28084;
const NM_TO_LBFT = 0.73756;
const STACK_DECAY = 0.92; // each extra power part counts for 92% of the one before it
const ROLLOUT_M = 0.3048; // one foot: the head start US magazines allow
const ROTATIONAL_MASS_FACTOR = 1.04; // spinning parts act like a little extra mass
const DT = 0.005; // simulation time step (seconds)
const BRAKE_DT = 0.001; // finer step for the braking integration (seconds)
const CORNERING_REF_MPH = 60; // speed at which cornering grip is reported

type Scenario = "pessimistic" | "optimistic";

// ---- Fitment ----
// Whether a part can go on a given car, and why not if it cannot. Rules live
// in the parts data, so adding a car never means editing this function.
export function partFitsCar(part: Part, car: Car): boolean {
  const f = part.fits;
  if (!f) return true;
  if (f.engineType && car.engineType !== f.engineType) return false;
  if (f.excludeCarIds?.includes(car.id)) return false;
  return true;
}

/** The parts a given car can actually be fitted with. */
export function partsForCar(car: Car, parts: Part[] = PARTS): Part[] {
  return parts.filter((p) => partFitsCar(p, car));
}

// ---- Validation ----
export function validateBuild(
  partIds: string[],
  parts: Part[] = PARTS,
  car?: Car,
): string[] {
  const errors: string[] = [];
  const chosen: Part[] = [];
  for (const id of partIds) {
    const p = parts.find((x) => x.id === id);
    if (!p) errors.push(`Unknown part: ${id}`);
    else chosen.push(p);
  }
  const seen = new Map<string, string>();
  for (const p of chosen) {
    const other = seen.get(p.category);
    if (other) errors.push(`Two ${p.category} parts selected: ${other} and ${p.id}`);
    else seen.set(p.category, p.id);
  }
  if (car) {
    for (const p of chosen) {
      if (!partFitsCar(p, car)) {
        errors.push(`${p.name} does not fit the ${car.name}: ${p.fits!.reason}`);
      }
    }
  }
  const ids = new Set(chosen.map((p) => p.id));
  for (const p of chosen) {
    for (const r of p.requires) if (!ids.has(r)) errors.push(`${p.id} requires ${r}`);
    for (const c of p.conflictsWith) if (ids.has(c)) errors.push(`${p.id} conflicts with ${c}`);
  }
  return errors;
}

// ---- Apply parts to a car for one scenario ----
export function applyParts(
  car: Car,
  partIds: string[],
  scenario: Scenario,
  parts: Part[] = PARTS,
): Spec {
  const chosen = partIds
    .map((id) => parts.find((p) => p.id === id))
    .filter((p): p is Part => Boolean(p));
  const pick = (r: { low: number; high: number }) => (scenario === "pessimistic" ? r.low : r.high);

  // Power gains stack with diminishing returns. Sorted so the order you click doesn't matter.
  // Percentage gains are turned into horsepower against THIS car's stock power,
  // so the same part is worth more on a bigger engine.
  const gains = chosen
    .map((p) => pick(p.hpGainPct) * car.stockHp)
    .filter((g) => g > 0)
    .sort((a, b) => b - a);
  const hpGain = gains.reduce((sum, g, i) => sum + g * Math.pow(STACK_DECAY, i), 0);

  const sum = (f: (p: Part) => number) => chosen.reduce((s, p) => s + f(p), 0);
  return {
    ...car,
    effectiveHp: car.stockHp + hpGain,
    massKg: car.massKg + sum((p) => pick(p.massChangeKg)),
    tireMu: car.tireMu + sum((p) => pick(p.tireMuAdd)),
    cd: car.cd + sum((p) => pick(p.cdAdd)),
    clA: car.clA + sum((p) => pick(p.clAAdd)),
    brakeLimitG: car.brakeLimitG + sum((p) => pick(p.brakeLimitAddG)),
    addedCostUsd: sum((p) => p.costUsd),
  };
}

// ---- Aerodynamics ----
// Downforce pushes the car into the road, so it adds grip without adding mass.
// It grows with the square of speed, which is why it matters on a fast corner
// and does nothing in a parking lot.
function downforceN(spec: Spec, vMps: number): number {
  return 0.5 * AIR_DENSITY * spec.clA * vMps * vMps;
}

/** Weight plus downforce: the force pressing the tires into the road. */
function normalForceN(spec: Spec, vMps: number): number {
  return spec.massKg * G + downforceN(spec, vMps);
}

// ---- Engine model ----
// Two simplified power-curve shapes, both scaled so they peak at x = 1, where
// x = rpm / rpmAtPeak. Neither is a measured dyno curve.
//   turbo: P = Ppeak * (x + x^2 - x^3)   torque peaks at x = 0.50 (early, flat)
//   na:    P = Ppeak * (3x^2 - 2x^3)     torque peaks at x = 0.75 (later, peakier)
// The NA shape deliberately gives away low-rpm torque: that is the real
// difference you feel between a turbo four and a high-revving naturally
// aspirated engine.
export function hpAt(
  rpm: number,
  peakHp: number,
  peakRpm: number,
  engineType: "turbo" | "na" = "turbo",
): number {
  const x = rpm / peakRpm;
  const shape =
    engineType === "na" ? 3 * x * x - 2 * x * x * x : x + x * x - x * x * x;
  return Math.max(0, peakHp * shape);
}

function torqueNm(
  rpm: number,
  peakHp: number,
  peakRpm: number,
  engineType: "turbo" | "na",
): number {
  const watts = hpAt(rpm, peakHp, peakRpm, engineType) * W_PER_HP;
  const omega = (rpm * 2 * Math.PI) / 60;
  return watts / omega;
}

function peakTorqueLbFt(spec: Spec): number {
  let best = 0;
  for (let rpm = 1500; rpm <= spec.redlineRpm; rpm += 50) {
    best = Math.max(
      best,
      torqueNm(rpm, spec.effectiveHp, spec.peakHpRpm, spec.engineType),
    );
  }
  return best * NM_TO_LBFT;
}

// ---- Straight-line simulation (0-60, quarter mile, top speed) ----
function simulate(spec: Spec) {
  const gearTotal = spec.gearRatios.map((g) => g * spec.finalDrive);
  const sixty = 60 * MPS_PER_MPH;
  const quarter = 402.336; // metres

  let v = 0;
  let x = 0;
  let t = 0;
  let gear = 0;
  let shiftTimer = 0;
  let zeroToSixty = NaN;
  let quarterMile = NaN;
  let rolloutT = NaN; // clock time when the car has travelled one foot

  const rpmIn = (v: number, g: number) => (v / spec.wheelRadiusM) * gearTotal[g] * (60 / (2 * Math.PI));

  while (t < 120) {
    // Force at the wheels in gear g, or -1 if that gear would pass redline (rev limiter).
    const forceFor = (g: number) => {
      if (rpmIn(v, g) > spec.redlineRpm) return -1;
      const rpm = Math.max(rpmIn(v, g), spec.launchRpm);
      const tq = torqueNm(rpm, spec.effectiveHp, spec.peakHpRpm, spec.engineType);
      return (tq * gearTotal[g] * spec.drivelineEff) / spec.wheelRadiusM;
    };

    if (shiftTimer > 0) {
      shiftTimer -= DT;
    } else {
      // Only shift if the current gear is at redline, or another gear pulls >5% harder.
      // The 5% margin stops the car bouncing between two gears (which wastes shift time).
      const currentForce = forceFor(gear);
      let bestGear = gear;
      let bestForce = currentForce;
      for (let g = 0; g < gearTotal.length; g++) {
        // Never shift into a gear that would land right at redline (it would just shift back).
        if (g !== gear && rpmIn(v, g) > spec.redlineRpm * 0.95) continue;
        const f = forceFor(g);
        if (f > bestForce) {
          bestForce = f;
          bestGear = g;
        }
      }
      if (bestGear !== gear && (currentForce < 0 || bestForce > currentForce * 1.05)) {
        gear = bestGear;
        shiftTimer = spec.shiftTimeS;
      }
    }

    const driveForce = shiftTimer > 0 ? 0 : Math.max(0, forceFor(gear));
    // Downforce presses the driven wheels down too, so the car can put more
    // power down as it speeds up.
    const tractionCap = spec.tractionFraction * normalForceN(spec, v) * spec.tireMu;
    const drive = Math.min(driveForce, tractionCap);

    const drag = 0.5 * AIR_DENSITY * spec.cd * spec.frontalAreaM2 * v * v;
    // Downforce also presses the tires down harder, which costs a little
    // rolling resistance.
    const roll = spec.crr * normalForceN(spec, v);
    const a = (drive - drag - roll) / (spec.massKg * ROTATIONAL_MASS_FACTOR);

    v = Math.max(0, v + a * DT);
    x += v * DT;
    t += DT;

    if (Number.isNaN(rolloutT) && x >= ROLLOUT_M) rolloutT = t;
    if (Number.isNaN(zeroToSixty) && v >= sixty) zeroToSixty = t;
    if (Number.isNaN(quarterMile) && x >= quarter) quarterMile = t;
  }
  return {
    zeroToSixty,
    zeroToSixtyRollout: zeroToSixty - rolloutT,
    quarterMile,
    topSpeedMph: v / MPS_PER_MPH,
  };
}

// Braking is integrated step by step rather than solved in one formula, because
// downforce (and so grip) falls away as the car slows down. Deceleration is
// whichever is smaller: what the tires can hold, or what the brakes can make.
// That is why better tires alone do nothing until the brakes can use them.
function brakeDistanceFt(spec: Spec): number {
  let v = 60 * MPS_PER_MPH;
  let distanceM = 0;
  let t = 0;
  while (v > 0 && t < 30) {
    const tireLimitMps2 = (spec.tireMu * normalForceN(spec, v)) / spec.massKg;
    const brakeLimitMps2 = spec.brakeLimitG * G;
    const decel = Math.min(tireLimitMps2, brakeLimitMps2);
    const step = Math.min(BRAKE_DT, v / decel); // last step lands exactly on v = 0
    distanceM += v * step - 0.5 * decel * step * step;
    v -= decel * step;
    t += step;
  }
  return distanceM * FT_PER_M;
}

// Cornering grip at a stated speed, so cars with downforce get credit for it.
// Reported at CORNERING_REF_MPH; a downforce car corners harder than this
// faster than this speed, and no better than its tires below it.
function lateralG(spec: Spec): number {
  const v = CORNERING_REF_MPH * MPS_PER_MPH;
  return (spec.tireMu * normalForceN(spec, v)) / (spec.massKg * G);
}

export function computeStats(spec: Spec): Stats {
  const sim = simulate(spec);
  return {
    peakHp: spec.effectiveHp,
    peakTorqueLbFt: peakTorqueLbFt(spec),
    zeroToSixtyS: sim.zeroToSixty,
    zeroToSixtyRolloutS: sim.zeroToSixtyRollout,
    quarterMileS: sim.quarterMile,
    topSpeedMph: sim.topSpeedMph,
    brake60ToZeroFt: brakeDistanceFt(spec),
    lateralG: lateralG(spec),
    massKg: spec.massKg,
    totalCostUsd: spec.basePriceUsd + spec.addedCostUsd,
  };
}

// ---- Main entry point for the app ----
export function estimate(car: Car, partIds: string[], parts: Part[] = PARTS): Estimate {
  const errors = validateBuild(partIds, parts, car);
  return {
    stock: computeStats(applyParts(car, [], "pessimistic", parts)),
    pessimistic: computeStats(applyParts(car, partIds, "pessimistic", parts)),
    optimistic: computeStats(applyParts(car, partIds, "optimistic", parts)),
    errors,
  };
}
