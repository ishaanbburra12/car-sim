import type { Car } from "./types";
import { PULSE } from "./data";

// ---------------------------------------------------------------------------
// Real production cars.
//
// HOW TO READ THE NUMBERS BELOW. Each car mixes three kinds of value:
//
//   [published]  printed by the manufacturer or a major test. Cited per car.
//   [derived]    calculated from a published figure (the arithmetic is shown).
//   [assumed]    our estimate. NOT published anywhere. These are the knobs the
//                model needs but no manufacturer prints: tire grip, brake
//                limit, driveline efficiency, rolling resistance, traction.
//
// Every [assumed] value is a judgement call and belongs on the Methods page.
// Figures are for one specific model year and market, named per car, because
// power and weight differ between markets.
//
// These cars are real, so our MODIFIED figures are clearly not endorsed by
// anyone. Stock published figures are facts; everything our engine outputs is
// an estimate from a simplified model.
// ---------------------------------------------------------------------------

/**
 * Porsche 911 GT3 RS (992), model year 2023, EU specification.
 * The hard case: naturally aspirated, high-revving, and huge downforce.
 */
export const GT3_RS: Car = {
  id: "gt3rs-992",
  brand: "Porsche",
  name: "911 GT3 RS (992)",
  archetype: "naturally aspirated track special",
  drivetrain: "RWD",
  engineType: "na",
  basePriceUsd: 241300, // [published] US base MSRP, 2023
  stockHp: 518, // [published] 4.0 L flat-six
  peakHpRpm: 8500, // [published]
  redlineRpm: 9000, // [published]
  idleRpm: 1000, // [assumed] a race-derived flat-six with aggressive cam timing
  // idles noticeably higher than a road engine.
  engineBrakeTorqueNm: 100, // [assumed] 4.0 L, at the ~25 Nm/litre rule of thumb.
  // Works out to roughly 0.07 g of engine-only braking at 30 mph in third: the
  // strongest of the four, which matches a high-compression naturally
  // aspirated engine on short gearing.
  massKg: 1525, // [published] 1450 kg DIN curb + 75 kg driver
  cd: 0.48, // [derived, circular] Porsche publishes no Cd for the 992 RS. We
  // worked backwards from the published 184 mph top speed: the drag needed to
  // cap the car there implies CdA ~ 0.97 m^2, so Cd ~ 0.48. That is high, but
  // a max-downforce wing costs a lot of drag, and the 991.2 RS was already
  // 0.36 with far less wing.
  // IMPORTANT: because this number came FROM the top speed, our top speed for
  // this car is calibrated, not predicted. It proves nothing. The GT-R and
  // Type R top speeds, which use published Cd values, are the real check.
  frontalAreaM2: 2.01, // [derived] 0.8 x 1.900 m width x 1.322 m height
  clA: 2.2, // [derived] 409 kg downforce at 200 km/h ->
  // clA = 2 x (409 x 9.81) / (1.2 x 55.56^2) = 2.17 m^2.
  // Cross-check: 860 kg at 285 km/h gives 2.24. We use 2.2.
  crr: 0.013, // [assumed] stiff track tires
  drivelineEff: 0.9, // [assumed] PDK, rear drive only
  wheelRadiusM: 0.367, // [derived] 335/30 R21 rear
  gearboxType: "dual-clutch", // [published] 7-speed PDK
  gearRatios: [3.75, 2.38, 1.72, 1.34, 1.11, 0.96, 0.84], // [published]
  finalDrive: 4.27, // [published]
  tireMu: 1.25, // [assumed] Cup 2 R track tires
  brakeLimitG: 1.3, // [assumed] carbon ceramic, strong enough that tires limit
  tractionFraction: 0.75, // [assumed] rear engine puts weight over driven wheels
  shiftTimeS: 0.08, // [assumed] PDK dual-clutch
  launchRpm: 6000, // [assumed] launch control holds this high-revving engine up
  isReal: true,
  note: "Figures for the 2023 992 GT3 RS. Drag coefficient is our estimate; Porsche has not published one for this car.",
  sources: [
    "https://download.newsroom.porsche.com/dam/jcr:1d390f77-93c3-49c0-89c7-634f5f02b26a/S22_3515_en.pdf",
    "https://stuttcars.com/?p=463488",
  ],
  published: { zeroToSixtyS: 3.0, topSpeedMph: 184 },
};

/**
 * Nissan GT-R (R35), model year 2017, US specification.
 * Turbocharged, all-wheel drive, and heavy.
 */
export const GTR: Car = {
  id: "gtr-r35",
  brand: "Nissan",
  name: "GT-R (R35)",
  archetype: "turbocharged AWD supercar",
  drivetrain: "AWD",
  engineType: "turbo",
  basePriceUsd: 111585, // [published] US base MSRP, 2017 Premium
  stockHp: 565, // [published] VR38DETT twin-turbo V6, US rating
  peakHpRpm: 6800, // [published]
  redlineRpm: 7000, // [assumed] close to the published power peak
  idleRpm: 750, // [assumed] a 3.8 L V6 idles lower than a small four, because
  // more cylinders firing per revolution means it runs smoothly slower.
  engineBrakeTorqueNm: 95, // [assumed] 3.8 L at ~25 Nm/litre. About 0.05 g at
  // 30 mph in third - less than the Porsche despite similar torque, because
  // this car is 300 kg heavier and longer geared.
  massKg: 1827, // [published] 1752 kg curb + 75 kg driver
  cd: 0.26, // [published]
  frontalAreaM2: 2.08, // [derived] 0.8 x 1.895 m width x 1.370 m height
  clA: 0.2, // [assumed] mild road-car aero, small but not zero
  crr: 0.012, // [assumed]
  drivelineEff: 0.85, // [assumed] AWD costs more than a rear-drive car
  wheelRadiusM: 0.354, // [derived] 285/35 R20 rear
  gearboxType: "dual-clutch", // [published] 6-speed DCT
  gearRatios: [4.056, 2.301, 1.595, 1.248, 1.001, 0.796], // [published]
  finalDrive: 3.7, // [published] rear axle
  tireMu: 1.05, // [assumed] sticky road tires
  brakeLimitG: 1.1, // [assumed]
  tractionFraction: 1.0, // [assumed] AWD launches on all four tires
  shiftTimeS: 0.12, // [assumed] dual-clutch
  launchRpm: 4500, // [assumed] launch control
  isReal: true,
  note: "Figures for the 2017 R35 GT-R, US market. Power and weight vary by year and trim.",
  sources: [
    "https://www.auto-data.net/en/nissan-gt-r-r35-facelift-2016-3.8-v6-570hp-awd-dct-25701",
    "https://www.vehiclesizes.com/cars/nissan/gt-r/gt-r-r35-facelift-2016-coupe-2017/combined-view",
  ],
  published: { zeroToSixtyS: 2.9, topSpeedMph: 196 },
};

/**
 * Honda Civic Type R (FL5), model year 2023, US specification.
 * Turbocharged front-wheel drive: the closest real car to the Vantora Pulse.
 */
export const TYPE_R: Car = {
  id: "civic-type-r-fl5",
  brand: "Honda",
  name: "Civic Type R (FL5)",
  archetype: "turbocharged hot hatchback",
  drivetrain: "FWD",
  engineType: "turbo",
  basePriceUsd: 43990, // [published] US base MSRP, 2023
  stockHp: 315, // [published] US rating; JDM is quoted higher (~330 PS)
  peakHpRpm: 6500, // [published]
  redlineRpm: 7000, // [published]
  idleRpm: 800, // [assumed] conventional idle for a 2.0 L turbocharged four.
  engineBrakeTorqueNm: 50, // [assumed] 2.0 L at ~25 Nm/litre. About 0.036 g at
  // 30 mph in third.
  massKg: 1505, // [published] 1430 kg curb + 75 kg driver
  cd: 0.34, // [assumed] Honda has not published one for the FL5
  frontalAreaM2: 2.13, // [derived] 0.8 x 1.890 m width x 1.407 m height
  clA: 0.1, // [assumed] Honda claims slight downforce from the wing
  crr: 0.011, // [assumed]
  drivelineEff: 0.9, // [assumed] 6-speed manual, front drive
  wheelRadiusM: 0.321, // [derived] 265/30 R19
  gearboxType: "manual", // [published] 6-speed manual
  gearRatios: [3.625, 2.115, 1.529, 1.125, 0.912, 0.738], // [published]
  finalDrive: 3.842, // [published] FL5 changed from the FK8's 4.111
  tireMu: 1.05, // [assumed] Michelin Pilot Sport 4S
  brakeLimitG: 1.05, // [assumed]
  tractionFraction: 0.55, // [assumed] FWD. Static front weight is ~62%, but
  // accelerating shifts weight rearward, OFF the driven wheels. At ~0.5 g that
  // is roughly 10 points, so ~0.55 is what the front tires actually carry
  // during a launch. Our first guess of 0.62 used the static figure and made
  // the car 9% too quick.
  shiftTimeS: 0.25, // [assumed] 6-speed manual
  launchRpm: 4000, // [assumed] clutch slip, no launch control
  isReal: true,
  note: "Figures for the 2023 FL5 Type R, US market. The JDM car is rated higher.",
  sources: [
    "https://www.encycarpedia.com/us/honda/23-civic-type-r-fl5-hatch",
    "https://www.chasingcars.com.au/news/future-cars/honda-civic-type-r-2023-jdm-specifications-revealed-before-september-japan-release/",
  ],
  published: { zeroToSixtyS: 5.0, topSpeedMph: 171 },
};

/** Every car the configurator offers. The fictional Pulse stays as a baseline. */
export const CARS: Car[] = [PULSE, TYPE_R, GTR, GT3_RS];

export function carById(id: string): Car | undefined {
  return CARS.find((c) => c.id === id);
}
