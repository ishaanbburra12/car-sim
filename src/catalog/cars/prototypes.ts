import { disputed, unpublished, varies, type Car, mfr } from "../types";

// Racing prototypes are a different kind of record from road cars. Teams do
// not publish 0-60 times or top speeds, because neither is a meaningful number
// for a car whose gearing and aerodynamics are changed for every circuit, and
// power is usually set by regulation rather than by ambition. So most of the
// performance fields here are deliberately null: the interesting facts about
// these cars are not the ones a road car is measured by.

export const PROTOTYPES: Car[] = [
  {
    slug: "porsche-963",
    brand: "porsche",
    name: "963",
    years: "2023-present",
    category: "prototype",
    layout: "Mid-engine, rear-wheel drive, hybrid",
    engine: "4.6 L twin-turbocharged V8 with a spec hybrid system",
    blurb:
      "Built to the LMDh rules, which pair a manufacturer's own engine with a common chassis, gearbox and hybrid system supplied to everyone. The point of that compromise is cost: it let a dozen manufacturers return to top-level endurance racing at once.",
    powerHp: mfr(670, "combined output, capped by regulation at 500 kW"),
    torqueLbFt: unpublished(
      "Manufacturers in LMH and LMDh publish a combined power output, because the " +
        "rules cap it at 500 kW, but never a torque figure: how much the hybrid " +
        "system contributes changes with road speed and deployment strategy.",
    ),
    weightKg: varies(
      "Weight in this class is a Balance of Performance number the organisers reset " +
        "between races, not a property of the car. The Porsche 963 ran at 1,048 kg and " +
        "then 1,045 kg inside the 2023 season. The class floor is 1,030 kg.",
    ),
    zeroTo60S: unpublished(
      "Sports-prototypes are never quoted to 60 mph. Standing-start performance " +
        "depends on the gear set and fuel load chosen for a particular circuit, so no " +
        "team or manufacturer publishes a figure.",
    ),
    topSpeedMph: varies(
      "Top speed is set by the aerodynamic package chosen for each circuit. The same " +
        "car runs a low-drag body at Le Mans and far more downforce at a short track, " +
        "so there is no single number that describes it.",
    ),
    produced: null,
    sources: [
      { publisher: "Porsche Motorsport", title: "Material for the 963 and the LMDh regulations" },
    ],
  },
  {
    slug: "toyota-gr010-hybrid",
    brand: "toyota",
    name: "GR010 Hybrid",
    years: "2021-present",
    category: "prototype",
    layout: "Mid-engine, hybrid all-wheel drive",
    engine: "3.5 L twin-turbocharged V6 with a front-axle electric motor",
    blurb:
      "A Le Mans Hypercar, the rule set that runs alongside LMDh. Its electric motor drives the front axle but is only allowed to engage above a set speed, so the car is rear-driven out of slow corners and four-wheel drive down the straights.",
    powerHp: mfr(670, "combined output, capped by regulation"),
    torqueLbFt: unpublished(
      "Manufacturers in LMH and LMDh publish a combined power output, because the " +
        "rules cap it at 500 kW, but never a torque figure: how much the hybrid " +
        "system contributes changes with road speed and deployment strategy.",
    ),
    weightKg: varies(
      "Weight in this class is a Balance of Performance number the organisers reset " +
        "between races, not a property of the car. The Porsche 963 ran at 1,048 kg and " +
        "then 1,045 kg inside the 2023 season. The class floor is 1,030 kg.",
    ),
    zeroTo60S: unpublished(
      "Sports-prototypes are never quoted to 60 mph. Standing-start performance " +
        "depends on the gear set and fuel load chosen for a particular circuit, so no " +
        "team or manufacturer publishes a figure.",
    ),
    topSpeedMph: varies(
      "Top speed is set by the aerodynamic package chosen for each circuit. The same " +
        "car runs a low-drag body at Le Mans and far more downforce at a short track, " +
        "so there is no single number that describes it.",
    ),
    produced: null,
    sources: [
      { publisher: "Toyota Gazoo Racing", title: "Material for the GR010 Hybrid" },
    ],
  },
  {
    slug: "ferrari-499p",
    brand: "ferrari",
    name: "499P",
    years: "2023-present",
    category: "prototype",
    layout: "Mid-engine, hybrid all-wheel drive",
    engine: "3.0 L twin-turbocharged V6 with a front-axle electric motor",
    blurb:
      "Ferrari's return to the top class at Le Mans after fifty years away, and it won on its first attempt in 2023. Its V6 is related to the one in the 296 road car, which is a closer link between racing and showroom than most manufacturers can claim.",
    powerHp: mfr(670, "combined output, capped by regulation"),
    torqueLbFt: unpublished(
      "Manufacturers in LMH and LMDh publish a combined power output, because the " +
        "rules cap it at 500 kW, but never a torque figure: how much the hybrid " +
        "system contributes changes with road speed and deployment strategy.",
    ),
    weightKg: varies(
      "Weight in this class is a Balance of Performance number the organisers reset " +
        "between races, not a property of the car. The Porsche 963 ran at 1,048 kg and " +
        "then 1,045 kg inside the 2023 season. The class floor is 1,030 kg.",
    ),
    zeroTo60S: unpublished(
      "Sports-prototypes are never quoted to 60 mph. Standing-start performance " +
        "depends on the gear set and fuel load chosen for a particular circuit, so no " +
        "team or manufacturer publishes a figure.",
    ),
    topSpeedMph: varies(
      "Top speed is set by the aerodynamic package chosen for each circuit. The same " +
        "car runs a low-drag body at Le Mans and far more downforce at a short track, " +
        "so there is no single number that describes it.",
    ),
    produced: null,
    sources: [
      { publisher: "Ferrari", title: "Competition material for the 499P" },
    ],
  },
  {
    slug: "cadillac-v-series-r",
    brand: "cadillac",
    name: "V-Series.R",
    years: "2023-present",
    category: "prototype",
    layout: "Mid-engine, rear-wheel drive, hybrid",
    engine: "5.5 L naturally aspirated V8 with a spec hybrid system",
    blurb:
      "The only car in the current top class with a naturally aspirated engine, which makes it audibly different from everything it races against. Cadillac chose the V8 partly because it sounds like a Cadillac should.",
    powerHp: mfr(670, "combined output, capped by regulation"),
    torqueLbFt: unpublished(
      "Manufacturers in LMH and LMDh publish a combined power output, because the " +
        "rules cap it at 500 kW, but never a torque figure: how much the hybrid " +
        "system contributes changes with road speed and deployment strategy.",
    ),
    weightKg: varies(
      "Weight in this class is a Balance of Performance number the organisers reset " +
        "between races, not a property of the car. The Porsche 963 ran at 1,048 kg and " +
        "then 1,045 kg inside the 2023 season. The class floor is 1,030 kg.",
    ),
    zeroTo60S: unpublished(
      "Sports-prototypes are never quoted to 60 mph. Standing-start performance " +
        "depends on the gear set and fuel load chosen for a particular circuit, so no " +
        "team or manufacturer publishes a figure.",
    ),
    topSpeedMph: varies(
      "Top speed is set by the aerodynamic package chosen for each circuit. The same " +
        "car runs a low-drag body at Le Mans and far more downforce at a short track, " +
        "so there is no single number that describes it.",
    ),
    produced: null,
    sources: [
      { publisher: "Cadillac Racing", title: "Material for the V-Series.R" },
    ],
  },
  {
    slug: "peugeot-9x8",
    brand: "peugeot",
    name: "9X8",
    years: "2022-present",
    category: "prototype",
    layout: "Mid-engine, hybrid all-wheel drive",
    engine: "2.6 L twin-turbocharged V6 with a front-axle electric motor",
    blurb:
      "Raced for two seasons without a rear wing, generating its downforce entirely from the floor and bodywork, which no other modern prototype had attempted. Peugeot eventually fitted one in 2024 after the concept proved hard to balance.",
    powerHp: mfr(670, "combined output, capped by regulation"),
    torqueLbFt: unpublished(
      "Manufacturers in LMH and LMDh publish a combined power output, because the " +
        "rules cap it at 500 kW, but never a torque figure: how much the hybrid " +
        "system contributes changes with road speed and deployment strategy.",
    ),
    weightKg: varies(
      "Weight in this class is a Balance of Performance number the organisers reset " +
        "between races, not a property of the car. The Porsche 963 ran at 1,048 kg and " +
        "then 1,045 kg inside the 2023 season. The class floor is 1,030 kg.",
    ),
    zeroTo60S: unpublished(
      "Sports-prototypes are never quoted to 60 mph. Standing-start performance " +
        "depends on the gear set and fuel load chosen for a particular circuit, so no " +
        "team or manufacturer publishes a figure.",
    ),
    topSpeedMph: varies(
      "Top speed is set by the aerodynamic package chosen for each circuit. The same " +
        "car runs a low-drag body at Le Mans and far more downforce at a short track, " +
        "so there is no single number that describes it.",
    ),
    produced: null,
    sources: [
      { publisher: "Peugeot Sport", title: "Material for the 9X8" },
    ],
  },
  {
    slug: "porsche-919-hybrid",
    brand: "porsche",
    name: "919 Hybrid",
    years: "2014-2017",
    category: "prototype",
    layout: "Mid-engine, hybrid all-wheel drive",
    engine: "2.0 L turbocharged V4 with two energy recovery systems",
    blurb:
      "Won Le Mans three years running with a two-litre four-cylinder engine, recovering energy from both the brakes and the exhaust. A later unrestricted version set a lap of the Nürburgring Nordschleife faster than anything else has managed.",
    powerHp: mfr(900, "approximate combined output of engine and electric systems"),
    torqueLbFt: unpublished(
      "Porsche published the 919's combined output but never a torque figure for the " +
        "petrol engine and the two energy-recovery systems acting together.",
    ),
    weightKg: mfr(875, "minimum weight under the regulations of the period"),
    zeroTo60S: unpublished(
      "Sports-prototypes are never quoted to 60 mph. Standing-start performance " +
        "depends on the gear set and fuel load chosen for a particular circuit, so no " +
        "team or manufacturer publishes a figure.",
    ),
    topSpeedMph: varies(
      "Top speed is set by the aerodynamic package chosen for each circuit. The same " +
        "car runs a low-drag body at Le Mans and far more downforce at a short track, " +
        "so there is no single number that describes it.",
    ),
    produced: null,
    sources: [
      { publisher: "Porsche Motorsport", title: "Material for the 919 Hybrid" },
      {
        publisher: "Porsche Motorsport",
        title: "919 Hybrid, media guide 2017", year: 2017,
        url: "https://presskit.porsche.de/motorsport/en/mediaguide-2017/topic/lmp1-programs/porsche-919-hybrid.html",
        checked: { on: "2026-10-27", how: "search" },
      },
    ],
  },
  {
    slug: "audi-r18-e-tron-quattro",
    brand: "audi",
    name: "R18 e-tron quattro",
    years: "2012-2016",
    category: "prototype",
    layout: "Mid-engine, diesel hybrid",
    engine: "Turbocharged V6 diesel with a flywheel energy store",
    blurb:
      "The first hybrid to win Le Mans, in 2012. It stored recovered energy in a spinning flywheel rather than a battery, a choice that suited the short, intense recovery bursts of a racing lap better than the battery chemistry of the time.",
    powerHp: unpublished(
      "Audi never published an output for the R18 e-tron quattro. Press reports of the " +
        "period put the diesel V6 near 558 hp and the hybrid motor near 272 hp, but Audi " +
        "did not confirm either, nor a combined figure.",
    ),
    torqueLbFt: unpublished(
      "Audi published no torque figure for the R18 e-tron quattro, in line with its " +
        "practice of not detailing the car's output at all.",
    ),
    weightKg: null,
    zeroTo60S: unpublished(
      "Sports-prototypes are never quoted to 60 mph. Standing-start performance " +
        "depends on the gear set and fuel load chosen for a particular circuit, so no " +
        "team or manufacturer publishes a figure.",
    ),
    topSpeedMph: varies(
      "Top speed is set by the aerodynamic package chosen for each circuit. The same " +
        "car runs a low-drag body at Le Mans and far more downforce at a short track, " +
        "so there is no single number that describes it.",
    ),
    produced: null,
    sources: [
      { publisher: "Audi", title: "Sport material for the R18 e-tron quattro" },
    ],
  },
  {
    slug: "mazda-787b",
    brand: "mazda",
    name: "787B",
    years: "1991",
    category: "prototype",
    layout: "Mid-engine, rear-wheel drive",
    engine: "2.6 L naturally aspirated four-rotor Wankel",
    blurb:
      "The only Japanese car to win Le Mans outright until 2018, and the only rotary-engined one ever to do so. Rotary engines were banned from the category the following year, so its record cannot be repeated.",
    powerHp: mfr(700, "approximately, in race trim"),
    torqueLbFt: disputed(
      "Sources give either 448 lb-ft or 620 lb-ft at 6,500 rpm for the R26B. The gap is " +
        "far too wide to split, and no Mazda figure settles it.",
    ),
    weightKg: mfr(830),
    zeroTo60S: unpublished(
      "Sports-prototypes are never quoted to 60 mph. Standing-start performance " +
        "depends on the gear set and fuel load chosen for a particular circuit, so no " +
        "team or manufacturer publishes a figure.",
    ),
    topSpeedMph: varies(
      "Top speed is set by the aerodynamic package chosen for each circuit. The same " +
        "car runs a low-drag body at Le Mans and far more downforce at a short track, " +
        "so there is no single number that describes it.",
    ),
    produced: null,
    sources: [
      { publisher: "Mazda", title: "Historical material for the 787B" },
    ],
  },
  {
    slug: "ford-gt40-mk-ii",
    brand: "ford",
    name: "GT40 Mk II",
    years: "1965-1966",
    category: "prototype",
    layout: "Mid-engine, rear-wheel drive",
    engine: "7.0 L naturally aspirated V8",
    blurb:
      "Built for the single purpose of beating Ferrari at Le Mans after a failed takeover attempt, and it did so in 1966, taking the first three places. The name comes from its height: forty inches.",
    powerHp: mfr(485, "approximately, in race trim"),
    torqueLbFt: disputed(
      "Enthusiast tables give about 475 lb-ft at 5,000 rpm for the 427, but period Ford " +
        "race-tune figures differ and one widely-copied table actually belongs to the " +
        "1967 Mk IV.",
    ),
    weightKg: disputed(
      "Published figures include 1,111 kg and about 1,200 kg at the start line. Race " +
        "cars were weighed in different trims, and the sources do not say which.",
    ),
    zeroTo60S: unpublished(
      "Sports-prototypes are never quoted to 60 mph. Standing-start performance " +
        "depends on the gear set and fuel load chosen for a particular circuit, so no " +
        "team or manufacturer publishes a figure.",
    ),
    topSpeedMph: varies(
      "Top speed is set by the aerodynamic package chosen for each circuit. The same " +
        "car runs a low-drag body at Le Mans and far more downforce at a short track, " +
        "so there is no single number that describes it.",
    ),
    produced: null,
    sources: [
      { publisher: "Ford", title: "Historical material for the GT40" },
    ],
  },
  {
    slug: "porsche-917",
    brand: "porsche",
    name: "917",
    years: "1969-1971",
    category: "prototype",
    layout: "Mid-engine, rear-wheel drive",
    engine: "4.5-5.0 L naturally aspirated flat-12",
    blurb:
      "Gave Porsche its first outright Le Mans win in 1970. Early cars were notoriously unstable at speed until a team re-shaped the tail by hand in the paddock, which is one of the better-known examples of aerodynamics being solved empirically rather than on paper.",
    powerHp: mfr(580, "approximately, 4.9 L specification"),
    torqueLbFt: disputed(
      "Figures for the 4.5-litre flat-12 run from 331 to 376 lb-ft depending on year and " +
        "state of tune, and the 4.9 and 5.0-litre cars differ again.",
    ),
    weightKg: disputed(
      "Published kerb weights for the 917 K include 820 kg, 830 kg and 896 kg with fuel. " +
        "The cars were rebuilt to different specifications across 1969-71, and the 800 kg " +
        "figure this entry used to carry was the least supported of them.",
    ),
    zeroTo60S: unpublished(
      "Sports-prototypes are never quoted to 60 mph. Standing-start performance " +
        "depends on the gear set and fuel load chosen for a particular circuit, so no " +
        "team or manufacturer publishes a figure.",
    ),
    topSpeedMph: varies(
      "Top speed is set by the aerodynamic package chosen for each circuit. The same " +
        "car runs a low-drag body at Le Mans and far more downforce at a short track, " +
        "so there is no single number that describes it.",
    ),
    produced: { count: 25, note: "the homologation run: 25 identical cars had to exist before it could race" },
    sources: [
      { publisher: "Porsche", title: "Historical material for the 917" },
    ],
  },
];
