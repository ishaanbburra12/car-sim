import type { Car, Part } from "./types";

// FICTIONAL car. All numbers are invented to be plausible for a compact turbo hatchback.
// Before you publish: web-search "Vantora" and "Pulse" to make sure you aren't using a real name.
export const PULSE: Car = {
  id: "pulse",
  brand: "Vantora",
  name: "Pulse",
  archetype: "compact turbo hatchback",
  drivetrain: "FWD",
  engineType: "turbo",
  basePriceUsd: 26000,
  stockHp: 200,
  peakHpRpm: 5500,
  redlineRpm: 6500,
  idleRpm: 800, // [assumed] conventional idle for a modern four-cylinder petrol engine
  engineBrakeTorqueNm: 50, // [assumed] ~25 Nm per litre of displacement

  massKg: 1375, // ~1300 kg curb + 75 kg driver
  cd: 0.34,
  frontalAreaM2: 2.25,
  clA: 0, // no meaningful downforce on a road hatchback
  crr: 0.012,
  drivelineEff: 0.88,
  wheelRadiusM: 0.31,
  gearboxType: "manual",
  gearRatios: [3.6, 2.1, 1.4, 1.05, 0.85, 0.7],
  finalDrive: 4.1,
  tireMu: 1.0,
  brakeLimitG: 0.95,
  tractionFraction: 0.65,
  shiftTimeS: 0.25, // manual gearbox
  launchRpm: 4000,
  isReal: false,
  published: undefined,
  note: "Fictional car. Figures are invented for a plausible compact hatchback.",
};

const none = { low: 0, high: 0 };

// The six original parts were written as fixed horsepower figures tuned for
// the 200 hp Pulse. They are expressed as percentages of 200 hp here, so the
// Pulse behaves exactly as before while bigger engines now scale properly.

export const PARTS: Part[] = [
  {
    id: "exhaust-sport",
    name: "Sport cat-back exhaust",
    category: "exhaust",
    costUsd: 900,
    hpGainPct: { low: 0.025, high: 0.06 }, // was +5 to +12 hp on a 200 hp car
    massChangeKg: { low: -6, high: -10 },
    tireMuAdd: none,
    brakeLimitAddG: none,
    cdAdd: none,
    clAAdd: none,
    conflictsWith: [],
    requires: [],
    assumption:
      "Freer-flowing exhaust: a small power gain, a little less weight. Range reflects that real gains vary by car and tune.",
  },
  {
    id: "intake-cold-air",
    name: "Cold-air intake",
    category: "intake",
    costUsd: 350,
    hpGainPct: { low: 0.01, high: 0.03 }, // was +2 to +6 hp on a 200 hp car
    massChangeKg: none,
    tireMuAdd: none,
    brakeLimitAddG: none,
    cdAdd: none,
    clAAdd: none,
    conflictsWith: [],
    requires: [],
    assumption: "Small, uncertain gain. Often the least cost-effective power part.",
  },
  {
    id: "turbo-upgrade",
    name: "Larger turbo + tune",
    category: "turbo",
    costUsd: 3200,
    hpGainPct: { low: 0.2, high: 0.45 }, // was +40 to +90 hp on a 200 hp car
    massChangeKg: { low: 8, high: 12 },
    tireMuAdd: none,
    brakeLimitAddG: none,
    cdAdd: none,
    clAAdd: none,
    conflictsWith: [],
    requires: [],
    assumption:
      "Big gain with a wide range because it depends heavily on the tune and supporting parts. Simplified: same power-curve shape as stock.",
    fits: {
      engineType: "turbo",
      reason:
        "This is a bigger turbo for an engine that already has one. A naturally aspirated engine would need a whole forced-induction system, which is a different (and much more expensive) job.",
    },
  },
  {
    id: "brakes-big",
    name: "Big brake kit",
    category: "brakes",
    costUsd: 2400,
    hpGainPct: none,
    massChangeKg: { low: 4, high: 8 },
    tireMuAdd: none,
    brakeLimitAddG: { low: 0.03, high: 0.1 },
    cdAdd: none,
    clAAdd: none,
    conflictsWith: [],
    requires: [],
    assumption:
      "Raises the brakes' own limit. Stopping distance is capped by tire grip, so brakes alone stop helping once they exceed the tires.",
    fits: {
      excludeCarIds: ["gt3rs-992"],
      reason:
        "This car already has carbon-ceramic brakes that out-grip its tires. A bigger kit would add cost and weight for no shorter stop.",
    },
  },
  {
    id: "tires-sport",
    name: "Sport tires",
    category: "tires",
    costUsd: 1100,
    hpGainPct: none,
    massChangeKg: none,
    tireMuAdd: { low: 0.06, high: 0.14 },
    brakeLimitAddG: none,
    cdAdd: none,
    clAAdd: none,
    conflictsWith: [],
    requires: [],
    assumption:
      "More grip for cornering, braking, and launch. Braking only improves if the brakes can use the extra grip.",
    fits: {
      excludeCarIds: ["gt3rs-992"],
      reason:
        "This car already comes on track tires. A road-going sport tire would be a downgrade.",
    },
  },
  {
    id: "weight-reduction",
    name: "Lightweight wheels + rear seat delete",
    category: "weight",
    costUsd: 1500,
    hpGainPct: none,
    massChangeKg: { low: -40, high: -90 },
    tireMuAdd: none,
    brakeLimitAddG: none,
    cdAdd: none,
    clAAdd: none,
    conflictsWith: [],
    requires: [],
    assumption:
      "Removes mass. Simplified: grip scales with weight, so this changes acceleration but not braking distance.",
    fits: {
      excludeCarIds: ["gt3rs-992"],
      reason:
        "This car has no rear seats to delete and already wears lightweight wheels, so there is nothing left for this part to remove.",
    },
  },
  {
    id: "exhaust-titanium",
    name: "Titanium race exhaust",
    category: "exhaust",
    costUsd: 6500,
    hpGainPct: { low: 0.01, high: 0.03 },
    massChangeKg: { low: -8, high: -16 },
    tireMuAdd: none,
    brakeLimitAddG: none,
    cdAdd: none,
    clAAdd: none,
    conflictsWith: [],
    requires: [],
    assumption:
      "A much lighter exhaust for a smaller power gain than the cat-back, because most of the easy flow has already been found. You are paying for weight, not power.",
  },
  {
    id: "tires-track",
    name: "Track tires",
    category: "tires",
    costUsd: 2600,
    hpGainPct: none,
    massChangeKg: none,
    tireMuAdd: { low: 0.15, high: 0.25 },
    brakeLimitAddG: none,
    cdAdd: none,
    clAAdd: none,
    conflictsWith: [],
    requires: [],
    assumption:
      "Far more grip than a sport tire, at the cost of wet weather behaviour and tread life, neither of which this model simulates.",
    fits: {
      excludeCarIds: ["gt3rs-992"],
      reason: "This car already comes on track tires from the factory.",
    },
  },
  {
    id: "aero-package",
    name: "Adjustable wing + front splitter",
    category: "aero",
    costUsd: 4500,
    hpGainPct: none,
    massChangeKg: { low: 6, high: 14 },
    tireMuAdd: none,
    brakeLimitAddG: none,
    cdAdd: { low: 0.04, high: 0.09 },
    clAAdd: { low: 0.4, high: 0.9 },
    conflictsWith: [],
    requires: [],
    assumption:
      "Downforce is not free: a wing that adds grip also adds drag, so this helps cornering and high-speed braking while COSTING top speed. The low end of the range is the honest one for a bolt-on wing that has not been developed in a wind tunnel.",
    fits: {
      excludeCarIds: ["gt3rs-992"],
      reason:
        "This car already has the most aggressive aero its maker offers. A bolt-on wing would not improve on a factory package developed in a wind tunnel.",
    },
  },
  {
    id: "weight-carbon",
    name: "Carbon body panels + lightweight glass",
    category: "weight",
    costUsd: 9000,
    hpGainPct: none,
    massChangeKg: { low: -15, high: -38 },
    tireMuAdd: none,
    brakeLimitAddG: none,
    cdAdd: none,
    clAAdd: none,
    conflictsWith: [],
    requires: [],
    assumption:
      "Expensive weight saving that works on any car, including one that has already had its interior stripped. Simplified: grip scales with weight, so this changes acceleration but not braking distance.",
  },
];
