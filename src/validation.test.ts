import { describe, it, expect } from "vitest";
import { estimate } from "./engine";
import { HOLDOUT_MX5 } from "./validation";
import { CARS } from "./cars";

// The point of these tests is to MEASURE, not to pass. The bounds are loose on
// purpose: a tight bound here would create pressure to tune the holdout, which
// would destroy the only honest error estimate the project has.

describe("out-of-sample validation against a car the model was never fitted to", () => {
  const stock = estimate(HOLDOUT_MX5, []).stock;
  const published = HOLDOUT_MX5.published!.zeroToSixtyS!;
  const error = (stock.zeroToSixtyRolloutS - published) / published;

  it("reports the measured error", () => {
    console.log(
      `\nOUT-OF-SAMPLE: ${HOLDOUT_MX5.brand} ${HOLDOUT_MX5.name}\n` +
        `  model 0-60 (rollout) ${stock.zeroToSixtyRolloutS.toFixed(2)}s\n` +
        `  published            ${published.toFixed(2)}s\n` +
        `  error                ${(error * 100).toFixed(1)}%\n` +
        `  (standing start was ${stock.zeroToSixtyS.toFixed(2)}s, quarter mile ${stock.quarterMileS.toFixed(2)}s,` +
        ` top speed ${stock.topSpeedMph.toFixed(0)} mph)\n`,
    );
    expect(Number.isFinite(error)).toBe(true);
  });

  it("is not catastrophically wrong", () => {
    // A deliberately loose sanity bound. If this ever fails, the model has a
    // real problem, not a calibration quibble.
    expect(Math.abs(error)).toBeLessThan(0.35);
  });

  it("produces no NaN for a car outside the fitted set", () => {
    for (const v of Object.values(stock)) expect(Number.isNaN(v)).toBe(false);
  });

  it("the holdout is NOT in the app's car list", () => {
    // If it ever appears there it stops being a holdout, because it would get
    // the same attention as the cars whose numbers we fuss over.
    expect(CARS.find((c) => c.id === HOLDOUT_MX5.id)).toBeUndefined();
  });

  it("every assumed value is copied from an existing car, not chosen freshly", () => {
    const typeR = CARS.find((c) => c.id === "civic-type-r-fl5")!;
    expect(HOLDOUT_MX5.tireMu).toBe(typeR.tireMu);
    expect(HOLDOUT_MX5.brakeLimitG).toBe(typeR.brakeLimitG);
    expect(HOLDOUT_MX5.drivelineEff).toBe(typeR.drivelineEff);
    expect(HOLDOUT_MX5.crr).toBe(typeR.crr);
    expect(HOLDOUT_MX5.shiftTimeS).toBe(typeR.shiftTimeS);
    expect(HOLDOUT_MX5.launchRpm).toBe(typeR.launchRpm);
    expect(HOLDOUT_MX5.idleRpm).toBe(typeR.idleRpm);
    expect(HOLDOUT_MX5.engineBrakeTorqueNm).toBe(typeR.engineBrakeTorqueNm);
  });
});
