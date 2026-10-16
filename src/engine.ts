import type { Car, Estimate, Part, RunSample, RunTrace, Spec, Stats } from "./types";
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
const TRACE_INTERVAL_S = 0.02; // how often a recorded run stores a sample
const TRACE_MAX_S = 30; // never record longer than this

// Part prices were written for the Vantora Pulse, a $26,000 hatchback. The same
// job costs more on an expensive car: more labour, rarer parts, and suppliers
// who price to the market. We scale with the SQUARE ROOT of how much dearer the
// car is, so a car that costs 9x more pays about 3x for parts rather than 9x.
// This is an assumption, not a surveyed price list. See the Methods page.
const PART_COST_REFERENCE_USD = 26000;
const PART_COST_EXPONENT = 0.5;

/**
 * Which end of every part's range to take.
 *   pessimistic - every part underdelivers at once
 *   optimistic  - every part overdelivers at once
 *   expected    - the middle of each range: the build the driver actually gets
 *
 * "expected" is the one a person drives. The other two are the bounds, drawn as
 * ghost cars so the spread is visible rather than numeric.
 *
 * Note: the expected build's RESULTS are not the midpoint of the pessimistic
 * and optimistic results. The physics is nonlinear, so a mid-range power gain
 * with a mid-range mass saving does not land halfway between the extremes.
 * That is correct, and it belongs on the Methods page.
 */
export type Scenario = "pessimistic" | "optimistic" | "expected";

// ---- Part pricing ----
/**
 * How much dearer parts are for this car than for the reference hatchback.
 * Exactly 1 for a car at the reference price, so its prices are untouched.
 */
export function partCostMultiplier(car: Car): number {
  const ratio = car.basePriceUsd / PART_COST_REFERENCE_USD;
  return Math.max(1, Math.pow(ratio, PART_COST_EXPONENT));
}

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
  const pick = (r: { low: number; high: number }) => {
    if (scenario === "pessimistic") return r.low;
    if (scenario === "optimistic") return r.high;
    return (r.low + r.high) / 2;
  };

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
    addedCostUsd: scaledPartCost(car, sum((p) => p.costUsd)),
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

/** Part cost for a given car, rounded to a sensible figure once scaled. */
function scaledPartCost(car: Car, listPrice: number): number {
  const m = partCostMultiplier(car);
  return m === 1 ? listPrice : Math.round((listPrice * m) / 10) * 10;
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

// ---- The driving core ----
// ONE timestep of the car, as a pure function: no clock, no rendering, no audio.
// The whole-run simulation below is built on it, and the driving UI steps it
// directly, so there is exactly one copy of the physics in the project.
//
// The body is the old simulate() loop, moved unchanged. The order of the
// arithmetic is load-bearing: the Pulse's published numbers are pinned to ten
// decimal places, so reordering even one expression moves them.

export type LaunchPolicy = "legacy" | "clutch";

/** Everything that changes from one timestep to the next. */
export type DriveState = {
  t: number; // seconds since the run began
  x: number; // metres travelled
  v: number; // metres per second
  gear: number; // 0-based internally; reported 1-based
  shiftTimer: number; // seconds of drive still interrupted by a gear change
  /** Lowest rpm the engine is allowed to show: models the clutch slipping. */
  rpmFloor: number;
  /**
   * True while the clutch is slipping or open: off the line, and again once
   * the car has slowed to a stop. The engine is not solidly connected to the
   * wheels, so it can neither be driven by them nor brake them.
   */
  launchArmed: boolean;
};

export type DriverInputs = {
  throttle: number; // 0..1
  brake: number; // 0..1
  /**
   * Which gear the driver has selected, 0-based. Omit it and the gearbox
   * chooses for itself, which is what the whole-run simulation always does
   * and what a dual-clutch car does in drive mode.
   *
   * Choosing badly has consequences, as it should: a gear that would pass
   * redline makes no power at all, and one that is too tall leaves the engine
   * bogging below its torque.
   */
  gear?: number;
};

export type StepOpts = {
  /** "legacy" reproduces the whole-run simulation exactly. Default. */
  policy?: LaunchPolicy;
  dt?: number;
  /**
   * Shape of the overrun torque curve: engine braking is scaled by
   * (floor + (1 - floor) * rpm / redline), so it is weakest at idle and
   * strongest near the limiter. Omit it and engine braking is OFF entirely,
   * which is what keeps the whole-run simulation untouched.
   *
   * It also requires policy "clutch", because engine braking needs a clutch
   * that can be closed, and only that policy tracks one. Supplying this with
   * the legacy policy does nothing.
   */
  overrunRpmScaleFloor?: number;
};

/** What one step produced, including the force balance for an inspector view. */
export type StepOutput = {
  state: DriveState;
  rpm: number;
  gear: number; // 1-based, as a driver counts
  shifting: boolean;
  onLimiter: boolean;
  tractionLimited: boolean;
  stopped: boolean;
  /** True while the car is stopped and the clutch is ready for a launch. */
  idling: boolean;
  speedMph: number;
  driveForceN: number;
  tractionCapN: number;
  dragN: number;
  rollN: number;
  brakeForceN: number;
  /** Retardation from the engine itself when the driver is off the throttle. */
  engineBrakeN: number;
};

/** Wide open throttle, no brake: what the whole-run simulation always does. */
export const WOT: DriverInputs = Object.freeze({ throttle: 1, brake: 0 });

export function gearTotals(spec: Spec): number[] {
  return spec.gearRatios.map((g) => g * spec.finalDrive);
}

export function rpmInGear(
  spec: Spec,
  gearTotal: number[],
  v: number,
  g: number,
): number {
  return (v / spec.wheelRadiusM) * gearTotal[g] * (60 / (2 * Math.PI));
}

export function standingStart(spec: Spec): DriveState {
  return {
    t: 0,
    x: 0,
    v: 0,
    gear: 0,
    shiftTimer: 0,
    rpmFloor: spec.launchRpm,
    launchArmed: true,
  };
}

/**
 * Deceleration the car can actually achieve: whichever is smaller, what the
 * tires can hold or what the brakes can produce. Lifted out of
 * brakeDistanceFt so the braking model has one definition, not two.
 */
function brakeDecelMps2(spec: Spec, vMps: number): number {
  const tireLimitMps2 = (spec.tireMu * normalForceN(spec, vMps)) / spec.massKg;
  const brakeLimitMps2 = spec.brakeLimitG * G;
  return Math.min(tireLimitMps2, brakeLimitMps2);
}

export function stepDrive(
  spec: Spec,
  gearTotal: number[],
  state: DriveState,
  inputs: DriverInputs,
  opts?: StepOpts,
): StepOutput {
  const dt = opts?.dt ?? DT;
  const policy = opts?.policy ?? "legacy";
  const v = state.v;
  let gear = state.gear;
  let shiftTimer = state.shiftTimer;
  let rpmFloor = state.rpmFloor;
  let launchArmed = state.launchArmed;

  // The rpm floor models a slipping clutch holding the engine up off the line.
  //
  // "legacy" keeps it forever, which is what the whole-run simulation has
  // always done. It barely affects 0-60 — measured at under one timestep,
  // because the engines are past their torque peak by then — but it means the
  // engine can never rev BELOW launch rpm, so the note flatlines after every
  // gear change. Audible, and wrong.
  //
  // "clutch" releases the floor the first time the drivetrain outruns it,
  // which is exactly what a clutch finishing its slip does. No new invented
  // number: the floor simply stops applying.
  const wheelRpm = rpmInGear(spec, gearTotal, v, gear);
  if (policy === "clutch") {
    if (launchArmed && wheelRpm > spec.launchRpm) {
      // The drivetrain has outrun the slipping clutch: it is fully engaged now.
      launchArmed = false;
      rpmFloor = 0;
    } else if (!launchArmed && wheelRpm < spec.idleRpm) {
      // Rolling to a stop. A driver declutches here rather than stalling, so
      // the car is ready to pull away again.
      launchArmed = true;
      rpmFloor = spec.launchRpm;
    }
  }

  // Force at the wheels in gear g at FULL throttle, or -1 if that gear would
  // pass redline (rev limiter). The sentinel is returned before any throttle
  // multiply on purpose: -1 * 0 is -0, and -0 < 0 is false, which would
  // silently disable the rev limiter whenever the driver lifted.
  const wotForceFor = (g: number) => {
    if (rpmInGear(spec, gearTotal, v, g) > spec.redlineRpm) return -1;
    const rpm = Math.max(rpmInGear(spec, gearTotal, v, g), rpmFloor);
    const tq = torqueNm(rpm, spec.effectiveHp, spec.peakHpRpm, spec.engineType);
    return (tq * gearTotal[g] * spec.drivelineEff) / spec.wheelRadiusM;
  };

  if (shiftTimer > 0) {
    shiftTimer -= dt;
  } else if (inputs.gear !== undefined && Number.isFinite(inputs.gear)) {
    // Manual: the driver picked, so the chooser does not run at all. A
    // non-finite gear is ignored rather than clamped, because Math.round(NaN)
    // is NaN and clamping it produces NaN, which then poisons every later
    // step through gearTotal[NaN].
    const wanted = Math.min(Math.max(Math.round(inputs.gear), 0), gearTotal.length - 1);
    if (wanted !== gear) {
      gear = wanted;
      shiftTimer = spec.shiftTimeS;
    }
  } else {
    // Only shift if the current gear is at redline, or another gear pulls >5%
    // harder. The 5% margin stops the car bouncing between two gears (which
    // wastes shift time). The comparison uses full-throttle force in every
    // gear: it is a ratio, so the driver's throttle cancels out of it.
    const currentForce = wotForceFor(gear);
    let bestGear = gear;
    let bestForce = currentForce;
    for (let g = 0; g < gearTotal.length; g++) {
      // Never shift into a gear that would land right at redline.
      if (g !== gear && rpmInGear(spec, gearTotal, v, g) > spec.redlineRpm * 0.95) continue;
      const f = wotForceFor(g);
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

  const wotForce = shiftTimer > 0 ? 0 : Math.max(0, wotForceFor(gear));
  const driveForce = wotForce * inputs.throttle;
  // Downforce presses the driven wheels down too, so the car can put more
  // power down as it speeds up.
  const tractionCap = spec.tractionFraction * normalForceN(spec, v) * spec.tireMu;
  const drive = Math.min(driveForce, tractionCap);

  const drag = 0.5 * AIR_DENSITY * spec.cd * spec.frontalAreaM2 * v * v;
  // Downforce also presses the tires down harder, which costs a little
  // rolling resistance.
  const roll = spec.crr * normalForceN(spec, v);
  // Guarded so that with no brake applied the term is a literal 0 and the sum
  // is bit-identical to the original three-term expression.
  const brakeForceN =
    inputs.brake > 0 ? inputs.brake * brakeDecelMps2(spec, v) * spec.massKg : 0;

  // Engine braking: with the throttle shut, turning the engine over costs
  // torque, and that drags the car down through the gearbox. Off entirely
  // unless a curve shape is supplied and the driver has lifted, so the
  // whole-run simulation (always full throttle) is bit-identical without it.
  // The clutch is open during a gear change and at a standstill, so the engine
  // is not connected to the wheels and cannot slow them.
  const lift = 1 - inputs.throttle;
  // The clutch has to be closed for the engine to drag on the wheels at all.
  // Under the legacy policy launchArmed is never cleared, so engine braking
  // is reported as unavailable rather than silently computing zero: the
  // whole-run simulation does not model a clutch, so it cannot model this.
  const clutchClosed = policy === "clutch" && !launchArmed;
  const engineBrakeN =
    opts?.overrunRpmScaleFloor !== undefined && lift > 0 && shiftTimer <= 0 && clutchClosed
      ? (spec.engineBrakeTorqueNm *
          (opts.overrunRpmScaleFloor +
            (1 - opts.overrunRpmScaleFloor) *
              Math.min(1, Math.max(0, wheelRpm / spec.redlineRpm))) *
          gearTotal[gear] *
          spec.drivelineEff *
          lift) /
        spec.wheelRadiusM
      : 0;

  // Braking, rolling resistance and engine braking all reach the road through
  // the same contact patches, so together they cannot exceed what the tires
  // (or the brakes) can hold. Aerodynamic drag is NOT clamped with them: it
  // pushes on the body, not through the tires, so it genuinely adds on top.
  //
  // Without this clamp the car braked about 6% harder than its own grip limit,
  // because brakeForceN was already set at the full limit and the other two
  // terms were then subtracted as well.
  const throughTires = brakeForceN + engineBrakeN + roll;
  const tireRetardLimitN = brakeDecelMps2(spec, v) * spec.massKg;
  const retard = Math.min(throughTires, tireRetardLimitN);
  const a = (drive - drag - retard) / (spec.massKg * ROTATIONAL_MASS_FACTOR);

  const vNext = Math.max(0, v + a * dt);
  const xNext = state.x + vNext * dt;
  const tNext = state.t + dt;

  return {
    state: {
      t: tNext,
      x: xNext,
      v: vNext,
      gear,
      shiftTimer,
      rpmFloor,
      launchArmed,
    },
    // What the rev counter reads. While the clutch slips under power the
    // engine sits at launch rpm; otherwise it follows the wheels, and never
    // falls below idle, because an engine at rest is still running.
    rpm:
      policy === "clutch"
        ? Math.max(
            rpmInGear(spec, gearTotal, vNext, gear),
            launchArmed && inputs.throttle > 0.02 ? spec.launchRpm : spec.idleRpm,
          )
        : Math.max(rpmInGear(spec, gearTotal, vNext, gear), rpmFloor),
    gear: gear + 1,
    shifting: shiftTimer > 0,
    onLimiter: rpmInGear(spec, gearTotal, v, gear) > spec.redlineRpm,
    tractionLimited: driveForce > tractionCap,
    stopped: vNext === 0,
    idling: policy === "clutch" && launchArmed && vNext < 0.1,
    speedMph: vNext / MPS_PER_MPH,
    driveForceN: drive,
    tractionCapN: tractionCap,
    dragN: drag,
    rollN: roll,
    brakeForceN,
    engineBrakeN,
  };
}

// ---- Straight-line simulation (0-60, quarter mile, top speed) ----
// Now just a driver that holds the throttle flat and steps stepDrive().
function simulate(spec: Spec, trace?: RunSample[]) {
  const gearTotal = gearTotals(spec);
  const sixty = 60 * MPS_PER_MPH;
  const quarter = 402.336; // metres

  let state = standingStart(spec);
  let zeroToSixty = NaN;
  let quarterMile = NaN;
  let rolloutT = NaN; // clock time when the car has travelled one foot
  let nextSampleAt = 0;

  while (state.t < 120) {
    const out = stepDrive(spec, gearTotal, state, WOT);
    state = out.state;

    // Recording is purely observational: it reads the loop's state and
    // changes nothing about it.
    if (trace && state.t >= nextSampleAt && state.t <= TRACE_MAX_S) {
      trace.push({
        t: state.t,
        speedMph: out.speedMph,
        rpm: out.rpm,
        gear: out.gear,
        shifting: out.shifting,
      });
      nextSampleAt += TRACE_INTERVAL_S;
    }

    if (Number.isNaN(rolloutT) && state.x >= ROLLOUT_M) rolloutT = state.t;
    if (Number.isNaN(zeroToSixty) && state.v >= sixty) zeroToSixty = state.t;
    if (Number.isNaN(quarterMile) && state.x >= quarter) quarterMile = state.t;
  }
  return {
    zeroToSixty,
    zeroToSixtyRollout: zeroToSixty - rolloutT,
    quarterMile,
    topSpeedMph: state.v / MPS_PER_MPH,
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
    const decel = brakeDecelMps2(spec, v);
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

/**
 * Run the simulation and keep a sample of every 20 ms, so the run can be
 * played back (for sound, a graph, or a replay). Uses exactly the same
 * simulation as the stats, just with recording switched on.
 *
 * Recording stops once the car passes the quarter mile, or after 30 seconds.
 */
export function traceRun(
  car: Car,
  partIds: string[] = [],
  parts: Part[] = PARTS,
  scenario: Scenario = "pessimistic",
): RunTrace {
  const spec = applyParts(car, partIds, scenario, parts);
  const samples: RunSample[] = [];
  const sim = simulate(spec, samples);
  const endAt = Number.isNaN(sim.quarterMile) ? TRACE_MAX_S : sim.quarterMile;
  const trimmed = samples.filter((s) => s.t <= endAt + 0.4);
  return {
    samples: trimmed,
    zeroToSixtyS: sim.zeroToSixty,
    quarterMileS: sim.quarterMile,
    topGearUsed: trimmed.reduce((m, s) => Math.max(m, s.gear), 1),
  };
}

// ---- Main entry point for the app ----
export function estimate(car: Car, partIds: string[], parts: Part[] = PARTS): Estimate {
  const errors = validateBuild(partIds, parts, car);
  return {
    stock: computeStats(applyParts(car, [], "pessimistic", parts)),
    pessimistic: computeStats(applyParts(car, partIds, "pessimistic", parts)),
    expected: computeStats(applyParts(car, partIds, "expected", parts)),
    optimistic: computeStats(applyParts(car, partIds, "optimistic", parts)),
    errors,
  };
}
