import type { Car } from "./types";

// ---------------------------------------------------------------------------
// OUT-OF-SAMPLE VALIDATION
//
// The three cars in cars.ts cannot measure how good this model is, because the
// model was TUNED to match them: the Type R's traction fraction and the
// per-car shift times were adjusted until their 0-60 figures lined up. Their
// ~2% agreement is an in-sample fit, not a prediction.
//
// This car is the holdout. The protocol, fixed in advance and not revised
// afterwards:
//
//   1. Published values are entered as published.
//   2. Derived values use the same formulas as every other car.
//   3. ASSUMED values are copied from the most similar existing car, by the
//      same reasoning already written down there. Nothing is chosen to make
//      the answer come out well.
//   4. The model is run once. Whatever error appears is the result, and it is
//      reported whether it flatters the model or not.
//
// Breaking rule 3 or 4 would turn this back into a fit and destroy the only
// honest error estimate the project has.
// ---------------------------------------------------------------------------

/**
 * Mazda MX-5 (ND2), model year 2019, US specification, soft top, 6-speed manual.
 *
 * Chosen because it is as unlike the three fitted cars as a petrol manual car
 * gets: half the weight of the GT-R, a third of the power of the GT3 RS,
 * naturally aspirated, rear drive, no aero, and very short gearing. If the
 * model only works on the cars it was fitted to, this is where it will show.
 */
export const HOLDOUT_MX5: Car = {
  id: "mx5-nd2",
  brand: "Mazda",
  name: "MX-5 (ND2)",
  archetype: "lightweight naturally aspirated roadster",
  drivetrain: "RWD",
  engineType: "na",
  basePriceUsd: 25730, // [published] US base MSRP, 2019
  stockHp: 181, // [published] 2.0 L SkyActiv-G
  peakHpRpm: 7000, // [published]
  redlineRpm: 7500, // [published]
  massKg: 1136, // [published] 1061 kg curb (2,339 lb) + 75 kg driver
  cd: 0.3, // [published]
  frontalAreaM2: 1.71, // [derived] 0.8 x 1.735 m width x 1.230 m height
  clA: 0, // [assumed] no wing, same rule as the Pulse
  crr: 0.011, // [assumed] copied from the Civic Type R
  drivelineEff: 0.9, // [assumed] copied from the Type R: manual gearbox, two driven wheels
  wheelRadiusM: 0.308, // [derived] 205/45 R17
  gearRatios: [5.087, 2.991, 2.035, 1.594, 1.286, 1.0], // [published] 6-speed manual
  finalDrive: 2.866, // [published]
  tireMu: 1.05, // [assumed] copied from the Type R and GT-R: performance road tires
  brakeLimitG: 1.05, // [assumed] copied from the Type R
  tractionFraction: 0.58, // [assumed] the Type R's weight-transfer reasoning, mirrored.
  // Front-engined rear drive sits near 50/50 static, and accelerating shifts
  // weight ONTO the driven wheels rather than off them: about 10 points at
  // 0.5 g given this car's centre of gravity height and wheelbase.
  shiftTimeS: 0.25, // [assumed] copied from the Type R: manual gearbox
  launchRpm: 4000, // [assumed] copied from the Type R: clutch slip, no launch control
  idleRpm: 800, // [assumed] the four-cylinder rule used for every other such car
  engineBrakeTorqueNm: 50, // [assumed] 2.0 L at the ~25 Nm per litre rule of thumb
  isReal: true,
  note: "Holdout car for out-of-sample validation. Not shown in the app and never used to tune the model.",
  sources: [
    "https://en.wikipedia.org/wiki/Mazda_MX-5_(ND)",
    "https://www.motormatchup.com/catalog/Mazda/MX_5-Miata/2021/Sport-2DR-Convertible",
    "https://www.sportmazdanorthorlando.com/mazda-research/mazda-mx-5-miata-0-60-times/",
  ],
  published: {
    // Car and Driver's tested figure for the 2019 soft top, which uses the US
    // one-foot rollout convention, so it is compared against the model's
    // rollout time rather than its standing-start time.
    zeroToSixtyS: 5.7,
    // No well-sourced tested top speed was found for this car. The figures in
    // circulation trace back to low-quality aggregators, so top speed is
    // deliberately NOT part of this validation.
  },
};
