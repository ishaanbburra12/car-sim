import {
  applyParts,
  gearTotals,
  standingStart,
  stepDrive,
  type DriveState,
  type DriverInputs,
  type Scenario,
  type StepOutput,
} from "../engine";
import { PARTS } from "../data";
import type { Car, Part, Spec } from "../types";
import { DRIVE_TUNABLES } from "./tunables";

/**
 * A drive session runs THREE cars at once from the same driver inputs: the
 * pessimistic build, the expected build, and the optimistic build.
 *
 * The person drives the expected car. The other two are ghosts, and the gap
 * that opens between them on the road IS the uncertainty in the parts data —
 * shown as a distance rather than claimed as a number.
 *
 * Nothing here touches a clock, the DOM, React or audio. It is a pure state
 * machine: given a session, driver inputs and how much wall-clock time passed,
 * it returns the next session and a frame to draw.
 */

export const GHOSTS: Scenario[] = ["pessimistic", "expected", "optimistic"];

/** The car the person is actually driving. */
export const DRIVEN: Scenario = "expected";

export type DriveSession = {
  car: Car;
  partIds: string[];
  specs: Record<Scenario, Spec>;
  totals: Record<Scenario, number[]>;
  states: Record<Scenario, DriveState>;
  /** Simulated time not yet consumed by a whole physics step, seconds. */
  accumulatorS: number;
  /** Simulated seconds elapsed. Not wall-clock: late frames are discarded. */
  elapsedS: number;
  /** Physics steps taken, for diagnostics and tests. */
  steps: number;
  /** Wall-clock time thrown away by the catch-up clamp, seconds. */
  droppedS: number;
  last: Record<Scenario, StepOutput>;
};

export type DriveFrame = {
  elapsedS: number;
  steps: number;
  /** Metres covered by the car the person is driving. */
  distanceM: number;
  outputs: Record<Scenario, StepOutput>;
  /** Metres between the pessimistic and optimistic ghosts. The uncertainty. */
  gapM: number;
  /** False when the three cars are not even in the same gear. */
  gearsAgree: boolean;
  /** True when every scenario is identical, i.e. no parts are fitted. */
  collapsed: boolean;
};

const ZERO_DT = { dt: 0, policy: "clutch" as const };

/**
 * Driving uses the clutch policy: the launch rpm floor is released once the
 * drivetrain outruns it, so the engine revs down after a gear change instead
 * of sticking at launch rpm. The whole-run simulation keeps the legacy policy,
 * so the Garage's published numbers are untouched.
 */
const DRIVE_OPTS = { policy: "clutch" as const };

/** A readout taken without advancing time, for the first frame before any step. */
function peek(
  specs: Record<Scenario, Spec>,
  totals: Record<Scenario, number[]>,
  states: Record<Scenario, DriveState>,
): Record<Scenario, StepOutput> {
  const out = {} as Record<Scenario, StepOutput>;
  for (const g of GHOSTS) {
    out[g] = stepDrive(specs[g], totals[g], states[g], { throttle: 0, brake: 0 }, ZERO_DT);
  }
  return out;
}

export function createSession(
  car: Car,
  partIds: string[] = [],
  parts: Part[] = PARTS,
): DriveSession {
  const specs = {} as Record<Scenario, Spec>;
  const totals = {} as Record<Scenario, number[]>;
  const states = {} as Record<Scenario, DriveState>;
  for (const g of GHOSTS) {
    specs[g] = applyParts(car, partIds, g, parts);
    totals[g] = gearTotals(specs[g]);
    states[g] = standingStart(specs[g]);
  }
  return {
    car,
    partIds,
    specs,
    totals,
    states,
    accumulatorS: 0,
    elapsedS: 0,
    steps: 0,
    droppedS: 0,
    last: peek(specs, totals, states),
  };
}

/** Back to the start line with the same car and build. */
export function resetSession(session: DriveSession): DriveSession {
  return createSession(session.car, session.partIds);
}

/**
 * True when the three scenarios are the same car, which happens whenever no
 * parts are fitted. The ghosts would sit exactly on top of each other, so the
 * UI must say the view cannot show uncertainty rather than drawing a zero gap
 * that looks like certainty.
 */
export function isCollapsed(session: DriveSession): boolean {
  const a = session.specs.pessimistic;
  const b = session.specs.optimistic;
  return (
    a.effectiveHp === b.effectiveHp &&
    a.massKg === b.massKg &&
    a.tireMu === b.tireMu &&
    a.brakeLimitG === b.brakeLimitG &&
    a.cd === b.cd &&
    a.clA === b.clA
  );
}

/**
 * Advance the session by however much wall-clock time passed.
 *
 * Time is consumed in whole fixed steps so the result does not depend on frame
 * rate. Anything beyond maxCatchUpS is discarded rather than simulated, which
 * keeps a backgrounded tab from freezing the page on return; the discarded
 * amount is reported in droppedS so the UI can be honest that simulated time
 * fell behind real time.
 */
export function advance(
  session: DriveSession,
  inputs: DriverInputs,
  wallDtS: number,
): { session: DriveSession; frame: DriveFrame } {
  const dt = DRIVE_TUNABLES.physicsDtS;
  const safeDt = Number.isFinite(wallDtS) && wallDtS > 0 ? wallDtS : 0;
  const usable = Math.min(safeDt, DRIVE_TUNABLES.maxCatchUpS);
  const dropped = safeDt - usable;

  let acc = session.accumulatorS + usable;
  const states = { ...session.states };
  let outputs = session.last;
  let steps = 0;

  while (acc >= dt) {
    const next = {} as Record<Scenario, StepOutput>;
    for (const g of GHOSTS) {
      next[g] = stepDrive(session.specs[g], session.totals[g], states[g], inputs, DRIVE_OPTS);
      states[g] = next[g].state;
    }
    outputs = next;
    acc -= dt;
    steps++;
  }

  const nextSession: DriveSession = {
    ...session,
    states,
    accumulatorS: acc,
    elapsedS: session.elapsedS + steps * dt,
    steps: session.steps + steps,
    droppedS: session.droppedS + dropped,
    last: outputs,
  };

  return { session: nextSession, frame: frameOf(nextSession) };
}

export function frameOf(session: DriveSession): DriveFrame {
  const gears = GHOSTS.map((g) => session.last[g].gear);
  return {
    elapsedS: session.elapsedS,
    steps: session.steps,
    distanceM: session.states[DRIVEN].x,
    outputs: session.last,
    gapM: Math.abs(
      session.states.optimistic.x - session.states.pessimistic.x,
    ),
    gearsAgree: gears.every((g) => g === gears[0]),
    collapsed: isCollapsed(session),
  };
}
