// A range of outcomes. `low` = pessimistic result, `high` = optimistic result.
// Every part effect is a Range, so the app can show an honest band, not one number.
export type Range = { low: number; high: number };

export type Car = {
  id: string;
  brand: string;
  name: string;
  archetype: string;
  drivetrain: "FWD" | "RWD" | "AWD";
  /**
   * Shape of the power curve. "turbo" makes torque early and flat; "na" makes
   * torque later and keeps power climbing to a high redline. Picks the curve
   * used by hpAt(), nothing else.
   */
  engineType: "turbo" | "na";
  basePriceUsd: number;
  stockHp: number; // peak power at the crank
  peakHpRpm: number;
  redlineRpm: number;
  massKg: number; // curb weight + driver
  cd: number; // drag coefficient
  frontalAreaM2: number;
  /**
   * Downforce coefficient times area (m^2), as a positive number. Downforce at
   * speed v is 0.5 * airDensity * clA * v^2, pushing the car into the road, so
   * it adds grip without adding mass. 0 for a car with no meaningful aero.
   */
  clA: number;
  crr: number; // rolling resistance coefficient
  drivelineEff: number; // fraction of engine power that reaches the wheels
  wheelRadiusM: number;
  gearRatios: number[];
  finalDrive: number;
  tireMu: number; // tire grip coefficient (1.0 = 1 g of grip)
  brakeLimitG: number; // most deceleration the brakes can produce on their own
  tractionFraction: number; // share of weight on the driven wheels during launch
  /** Time with no drive during a gear change. A dual-clutch is far quicker than a manual. */
  shiftTimeS: number;
  /** Rpm the engine is held at on a standing start (clutch slip or launch control). */
  launchRpm: number;
  note: string;
  /** True for a real production car, false for an invented one. */
  isReal: boolean;
  /** Where the published figures came from. Shown on the Methods page. */
  sources?: string[];
  /** Manufacturer/press figures, for comparing our model against reality. */
  published?: { zeroToSixtyS?: number; topSpeedMph?: number };
};

export type PartCategory =
  | "exhaust"
  | "intake"
  | "turbo"
  | "brakes"
  | "tires"
  | "weight"
  | "aero";

/**
 * Rules for whether a part can be fitted to a given car. Kept as plain data
 * (not functions) so the Methods page can list the rules, and so the reason a
 * part is unavailable can be shown to the user instead of silently hiding it.
 */
export type PartFitment = {
  /** Only fits cars with this engine type. A turbo kit needs a turbo engine. */
  engineType?: "turbo" | "na";
  /** Never fits these specific cars, by id. */
  excludeCarIds?: string[];
  /** Plain-English reason, shown in the UI when the part does not fit. */
  reason: string;
};

export type Part = {
  id: string;
  name: string;
  category: PartCategory;
  costUsd: number;
  /**
   * Peak power added, as a FRACTION of the car's stock power (0.05 = +5%),
   * before stacking losses. Percentages rather than fixed horsepower, because
   * a given exhaust is worth far more on a 565 hp engine than on a 200 hp one.
   */
  hpGainPct: Range;
  massChangeKg: Range; // negative = lighter. low = smaller change, high = bigger change
  tireMuAdd: Range;
  brakeLimitAddG: Range;
  /** Added drag coefficient. Wings cost straight-line speed. */
  cdAdd: Range;
  /** Added downforce coefficient x area (m^2). */
  clAAdd: Range;
  conflictsWith: string[];
  requires: string[];
  assumption: string; // shown on the Methods page
  /** Omitted means the part fits every car. */
  fits?: PartFitment;
};

export type Spec = Car & {
  // The car with a set of parts applied, for one scenario
  effectiveHp: number;
  addedCostUsd: number;
};

export type Stats = {
  peakHp: number;
  peakTorqueLbFt: number;
  zeroToSixtyS: number;
  /**
   * 0-60 measured the way US magazines do it: the clock starts after the car
   * has moved one foot. Always a little quicker than zeroToSixtyS.
   */
  zeroToSixtyRolloutS: number;
  quarterMileS: number;
  topSpeedMph: number;
  brake60ToZeroFt: number;
  /** Peak cornering grip, estimated at CORNERING_REF_MPH (downforce included). */
  lateralG: number;
  massKg: number;
  totalCostUsd: number;
};

export type Estimate = {
  stock: Stats;
  pessimistic: Stats;
  optimistic: Stats;
  errors: string[];
};
