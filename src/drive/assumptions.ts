import { DRIVE_TUNABLES, type DriveTunableKey } from "./tunables";

/**
 * The plain-English ledger of every number drive mode invents.
 *
 * Imported by the Methods page, never by the physics. A vitest test asserts a
 * bijection between these keys and the keys of DRIVE_TUNABLES, so this file
 * cannot drift out of date in either direction.
 */
export type AssumptionKind = "physics-choice" | "ui-choice" | "safety-clamp";

export type DriveAssumption = {
  key: DriveTunableKey;
  label: string;
  value: string;
  kind: AssumptionKind;
  why: string;
};

export const DRIVE_ASSUMPTIONS: DriveAssumption[] = [
  {
    key: "physicsDtS",
    label: "Physics timestep",
    value: "5 ms (200 steps per second)",
    kind: "physics-choice",
    why: "The simulation advances in fixed 5 ms slices regardless of how fast your screen refreshes, so the same drive gives the same result on a 60 Hz laptop and a 144 Hz monitor. It is the same step the Garage's 0-60 figures use, so driving and estimating share one physics.",
  },
  {
    key: "maxCatchUpS",
    label: "Maximum catch-up per frame",
    value: "0.1 s",
    kind: "safety-clamp",
    why: "Browsers stop animating a hidden tab. Coming back could hand the loop a gap of several seconds, and simulating all of it at once would freeze the page. Instead we throw that time away, so the car does not lurch forward after you switch tabs. This is not physics: it means simulated time runs slower than real time whenever a frame is late.",
  },
  {
    key: "displayHz",
    label: "Readout refresh rate",
    value: "10 times per second",
    kind: "ui-choice",
    why: "The numbers on screen are rewritten 10 times a second while the physics runs at 200. A figure flickering through every intermediate value is unreadable and implies a precision the model does not have. The gauges move smoothly; only the digits are slowed.",
  },
  {
    key: "inputRampPerS",
    label: "Pedal ramp rate",
    value: "4 per second (about 0.25 s from nothing to full)",
    kind: "ui-choice",
    why: "A keyboard key is a switch, but a throttle pedal is not. Pressing a key moves the pedal toward its target rather than snapping to it. This is a choice about the controls, not a claim about how any car behaves.",
  },
];

/** Lookup by key, for rendering a specific assumption next to what it affects. */
export function assumptionFor(key: DriveTunableKey): DriveAssumption {
  const found = DRIVE_ASSUMPTIONS.find((a) => a.key === key);
  if (!found) throw new Error(`No disclosed assumption for tunable "${key}"`);
  return found;
}

/** Re-exported so a reader of this file can see the values it describes. */
export { DRIVE_TUNABLES };
