import { CAR_BY_SLUG } from "./index";

// ---------------------------------------------------------------------------
// The ideas behind the numbers.
//
// A specification table teaches almost nothing on its own. "1,741 lb-ft" is
// only interesting once you know that a Le Mans car's weight is set by the
// organisers rather than the engineer, that a maker's 0-60 and a magazine's
// are not the same measurement, or that Ferrari sometimes publishes a bound
// instead of a figure.
//
// Everything on this page came out of actually checking the catalogue's own
// data, so every example below is a car on this site whose figures were
// verified against the maker's own material. Nothing here is a general
// observation about cars that nobody has tested; if an example is given, the
// car and its entry exist and a test checks that they do.
// ---------------------------------------------------------------------------

export type Example = {
  /** Slug of a car in the catalogue. Checked by a test, not by hand. */
  car: string;
  /** What this particular car shows about the idea. */
  why: string;
};

export type Concept = {
  slug: string;
  term: string;
  /** One line. Used in the index and anywhere the term is cross-referenced. */
  short: string;
  /** The explanation, a paragraph per entry. */
  body: string[];
  examples: Example[];
  /** Slugs of other concepts worth reading next. Checked by a test. */
  see?: string[];
};

export const CONCEPTS: Concept[] = [
  {
    slug: "measured-to-what-speed",
    term: "0-60 mph, 0-100 km/h, and rollout",
    short:
      "Three different sprints that all get printed as though they were one number.",
    body: [
      "Almost every car here has an acceleration figure, and they are not all measuring the same thing. Most of Europe publishes 0-100 km/h. That is 62 mph, not 60, so the European number covers a little more ground and comes out slightly larger. The United States publishes 0-60 mph. At these speeds the difference is roughly a tenth to three tenths of a second.",
      "There is a third convention on top of that. American magazines borrowed a drag-racing habit called rollout: the timing starts not when the car begins to move but when it has travelled the first foot, because that is how a drag strip's beams are placed. Subtracting that first foot makes a car look about two tenths quicker. A rollout-adjusted 2.9 and a standing-start 3.1 can be the same run.",
      "Two tenths sounds like nothing. It is enough to move a car several places in a ranking of cars that are all within half a second of each other, which is most of the fast ones. So every acceleration figure on this site says which sprint it is, and a chart row whose cars did not all publish the same one says so underneath rather than quietly ranking them together.",
    ],
    examples: [
      {
        car: "rimac-concept-one",
        why: "Rimac published both figures in the same press release: 2.5 seconds to 100 km/h and 2.4 seconds to 60 mph. Same car, same run, two numbers.",
      },
      {
        car: "nissan-gt-r-r35",
        why: "Its 2.9 seconds is a rollout-adjusted figure. The same instrumented run was 3.1 seconds measured from a standstill.",
      },
      {
        car: "porsche-911-gt3-rs-992",
        why: "A 3.0-second 0-60 figure circulates widely, but it appears on dealer pages rather than in Porsche's own material. Porsche publishes 3.2 seconds to 100 km/h.",
      },
    ],
    see: ["makers-figures-and-tests", "bounds-not-figures"],
  },
  {
    slug: "makers-figures-and-tests",
    term: "A maker's figure and a measured one",
    short: "Who produced a number changes what it means, and the two are not interchangeable.",
    body: [
      "A manufacturer's figure is what the company printed. It is produced in good conditions, usually with a professional driver, often on a prepared surface, and sometimes with the best-performing option package fitted. It is not dishonest, but it is a best case, and the footnote marks on a maker's own page usually say so.",
      "An independent figure is what somebody else measured, typically a magazine, on a public-road surface with a full tank and ordinary air. It is normally a little slower, and occasionally it is quicker, because launch technique and tyre temperature matter enormously at this end of the scale.",
      "The catalogue tags every figure with which it is, and never adjusts one to match the other. Where a ranking is built from both kinds at once, the chart says so, because a ranking that mixes a company's claim with a stranger's stopwatch is softer than it looks.",
    ],
    examples: [
      {
        car: "pagani-zonda-f",
        why: "Its 3.6-second figure is a magazine's, not Pagani's. It had been tagged as the manufacturer's until the source was checked.",
      },
      {
        car: "peugeot-205-gti",
        why: "The 7.8-second figure comes from a 1986 Auto Bild road test. Modern compilations of the same car give 8.5 to 8.7 seconds.",
      },
      {
        car: "chevrolet-corvette-z06-c8",
        why: "GM's 2.6 seconds is a maker's figure and carries a condition: it applies with the Z07 Performance Package fitted.",
      },
    ],
    see: ["measured-to-what-speed", "bounds-not-figures"],
  },
  {
    slug: "bounds-not-figures",
    term: "When a maker publishes a bound",
    short: "“Over 900 Nm” and “under 3 seconds” are claims, not measurements.",
    body: [
      "Sometimes a manufacturer declines to give a number and gives a limit instead. Ferrari does this more than most: LaFerrari's combined torque is published as “over 900 Nm” and its sprint as “under 3 seconds”. Neither is a figure. They are promises about which side of a line the car falls on.",
      "The temptation is to turn the bound into a number, and it is a strong one, because a table with a blank in it looks unfinished while a table with 2.9 in it looks researched. That is exactly why it is worth resisting: the 2.9 is not a measurement anybody took, it is a reading of the word “under”, and once printed it is indistinguishable from the real figures beside it.",
      "So a bound is recorded here as an absence with the bound quoted as the reason. The reader gets what Ferrari actually said, which is more useful than a number Ferrari did not say.",
    ],
    examples: [
      {
        car: "ferrari-laferrari",
        why: "Both its torque and its sprint are published as bounds. This entry carried 2.9 seconds for years before the source was checked; that number was somebody reading “under 3 seconds”.",
      },
    ],
    see: ["measured-to-what-speed", "why-a-blank-is-not-always-a-gap"],
  },
  {
    slug: "balance-of-performance",
    term: "Balance of Performance",
    short: "In modern endurance racing the organisers set the weight, not the engineer.",
    body: [
      "Sports-car racing in the Hypercar and LMDh classes deliberately prevents anyone running away with it. The organisers set a minimum weight and a power cap for each car, adjust them between races based on how the cars are performing, and publish the result as a Balance of Performance table. A Ferrari and a Porsche that are mechanically very different end up within a few kilograms and a few kilowatts of each other.",
      "This has a consequence for a reference work: a modern prototype's weight is not a property of the car. It is a setting, and it moves. Quoting one is a bit like quoting a football team's position in the table as though it were a physical attribute.",
      "The same goes for power. Several cars on this site all read 670 hp, which looks like a suspicious coincidence until you know it is the regulation cap of 500 kW expressed in horsepower. They are not equally powerful by accident or by convergent engineering; they are equally powerful by rule.",
    ],
    examples: [
      {
        car: "porsche-963",
        why: "Ran at 1,048 kg and then 1,045 kg inside the 2023 season, against a class floor of 1,030 kg. This entry used to carry the floor as though it were the car's weight.",
      },
      {
        car: "ferrari-499p",
        why: "Reads the same 670 hp as its rivals because that is the cap, not because the engines happen to match.",
      },
    ],
    see: ["why-a-blank-is-not-always-a-gap", "homologation"],
  },
  {
    slug: "kerb-dry-and-the-standards",
    term: "Kerb weight, dry weight, and whose standard",
    short: "A car has several published weights, all of them honest, none of them equal.",
    body: [
      "Weight is the figure most likely to disagree with itself across sources, and usually nobody is lying. Dry weight excludes fluids. Kerb weight includes them, and which fluids, and how much fuel, depends on the standard being used: the DIN and EU conventions differ by around 75 kg on the same car, mostly because one assumes a driver and a largely full tank and the other does not.",
      "On top of the standard sits the car itself. Gearbox, body style, wheels and equipment all move the number, and a manufacturer publishes a figure per configuration rather than one for the model. For an ordinary car the spread across configurations can be larger than the entire difference between two different models.",
      "This is why several entries here record a weight as having no single value rather than picking one. It is not a gap in the research. It is that the question “what does a Golf weigh” does not have one answer.",
    ],
    examples: [
      {
        car: "koenigsegg-jesko",
        why: "Koenigsegg publishes both: 1,420 kg kerb and 1,320 kg dry. A hundred kilograms sits between two figures that are equally correct.",
      },
      {
        car: "volkswagen-golf",
        why: "Published between about 1,317 and 1,376 kg for the same engine, depending on gearbox, body and equipment.",
      },
      {
        car: "toyota-corolla",
        why: "Runs from about 1,315 to 1,515 kg across trims, and the DIN and EU standards differ by around 75 kg on top of that.",
      },
    ],
    see: ["why-trims-defeat-a-spec-sheet", "why-a-blank-is-not-always-a-gap"],
  },
  {
    slug: "why-trims-defeat-a-spec-sheet",
    term: "Why ordinary cars are harder to document than hypercars",
    short: "The Corolla is a worse-documented car than the Chiron, and it is not close.",
    body: [
      "It is the wrong way round from what you would expect. A manufacturer who sells 500 of something publishes a full technical specification for it, because the people buying one care and because the car is a single, fixed object. A manufacturer who sells a million of something publishes a configurator.",
      "A model name like Golf or F-150 covers dozens of cars. Different engines, different gearboxes, different markets with different emissions equipment, different model years, and a performance version that may have twice the power of the base car. There is no single set of figures because there is no single car, and the entry has to name the exact version it describes before any number means anything.",
      "The gap shows up starkly when you go looking. Research a hypercar and you land on the maker's own technical specification. Research a mid-range saloon and you land on aggregator sites that disagree with each other, some of which print simulated figures rather than measured ones.",
    ],
    examples: [
      {
        car: "ford-f-150",
        why: "Ford publishes curb weight per cab, bed length and drivetrain. The spread across configurations is well over 500 kg.",
      },
      {
        car: "volkswagen-golf",
        why: "The range runs from 114 hp to 328 hp in the Golf R. A figure for “the Golf” describes none of them.",
      },
      {
        car: "bugatti-chiron",
        why: "The opposite case: a fixed car, fully specified by its maker, every headline figure published and checkable.",
      },
    ],
    see: ["kerb-dry-and-the-standards", "why-a-blank-is-not-always-a-gap"],
  },
  {
    slug: "unpublished-by-policy",
    term: "When a maker simply stops saying",
    short: "Some figures are missing because a company decided not to publish them.",
    body: [
      "A blank is usually somebody's unfinished work. Occasionally it is a decision made by the manufacturer, and no amount of research will fill it.",
      "Tesla stopped publishing power figures in 2015, after being challenged over earlier ones, and has not resumed. Independent dyno runs exist and put the Model 3 Performance somewhere near 470 to 480 hp at the wheels, but a wheel figure and a crank figure are different measurements, and every other power number on this site is a crank figure. Printing the dyno number in the same column would be quietly comparing two different things.",
      "Racing is full of the same situation for different reasons. Teams in modern endurance classes publish a combined output because the rules cap it, and publish no torque figure at all, because how much the hybrid system contributes depends on road speed and on a deployment strategy that is competitive information.",
    ],
    examples: [
      {
        car: "tesla-model-3",
        why: "No manufacturer power figure exists for it at all.",
      },
      {
        car: "mercedes-amg-one",
        why: "Mercedes-AMG publishes the 1,063 hp system output and no torque figure, neither combined nor engine-only.",
      },
      {
        car: "porsche-919-hybrid",
        why: "Porsche published a combined output but never a torque figure for the petrol engine and the two recovery systems acting together.",
      },
    ],
    see: ["why-a-blank-is-not-always-a-gap", "hybrid-torque"],
  },
  {
    slug: "hybrid-torque",
    term: "Why a hybrid's torque is a slippery number",
    short: "An electric motor and a combustion engine do not make their best effort at the same time.",
    body: [
      "A combustion engine has a torque curve: a peak at some engine speed, less either side of it. An electric motor makes close to its maximum from a standstill. Add them together and the answer depends on what speed you ask at, and in a car with a gearbox, on which gear you are in.",
      "Manufacturers resolve this in incompatible ways. Some publish the engine's figure alone. Some publish a combined system figure. Some publish both and leave you to notice which is which. At least one publishes it per gear.",
      "The practical effect is that a torque column across hybrid cars is not a single comparison, and the honest thing is to say which number each one is rather than to pick whichever makes the table look tidy.",
    ],
    examples: [
      {
        car: "porsche-918-spyder",
        why: "Porsche publishes the system torque per gear: 940 lb-ft in seventh, 787 in third, and 390 for the V8 on its own.",
      },
      {
        car: "lamborghini-revuelto",
        why: "807 Nm combined against 725 Nm for the V12 alone. Both are Lamborghini's figures, for the same car.",
      },
      {
        car: "aston-martin-valkyrie",
        why: "900 Nm combined, of which the V12 contributes 740 Nm at 7,000 rpm and the hybrid system the rest.",
      },
    ],
    see: ["unpublished-by-policy", "bounds-not-figures"],
  },
  {
    slug: "homologation",
    term: "Homologation",
    short: "Cars that exist because a rulebook demanded a certain number of them.",
    body: [
      "Racing rules often distinguish between a purpose-built prototype and a car derived from something you can buy. To race in the second kind of class, a manufacturer has to prove the road car is real by building a minimum number of them. That number comes from the rulebook, not from demand.",
      "This produces some of the strangest and best cars ever made: road cars designed backwards from a racing regulation, built in exactly the quantity required and not one more, and sold to whoever would take them. The road car is the paperwork; the race car is the point.",
      "It is also why a production count is sometimes a precise, knowable number rather than a vague one. When a rule says twenty-five, the answer is twenty-five.",
    ],
    examples: [
      {
        car: "porsche-917",
        why: "Twenty-five identical cars had to exist before it could race. Porsche built twenty-five and lined them up for the inspector.",
      },
      {
        car: "bmw-m3-e30",
        why: "Built to homologate a touring-car racer, which is why the road car's bodywork is so different from the 3-series it is based on.",
      },
    ],
    see: ["balance-of-performance"],
  },
  {
    slug: "why-a-blank-is-not-always-a-gap",
    term: "Reading a blank",
    short: "This site distinguishes four kinds of missing figure, because they mean different things.",
    body: [
      "A reference work that prints “not listed” for everything it does not have is throwing away information. A figure nobody on earth publishes and a figure nobody here has looked up are completely different situations, and only one of them is anybody's fault.",
      "So a missing figure on this site says which kind it is. Not published means the people who would know have not said. No single figure means none exists, because trim, market or a rulebook moves it. Sources disagree means published figures contradict each other and we are not going to pick a winner by coin-toss. A plain not listed is the only one that is our own unfinished work.",
      "Completeness is scored the same way. A car is marked against the figures that could be sourced for it, not against a flat five. Marking a Le Mans prototype out of five when three of the five are things nobody publishes reports our denominator as the car's incompleteness, which is backwards — by that measure the prototypes looked 28% documented when almost everything obtainable about them was already here.",
    ],
    examples: [
      {
        car: "porsche-917",
        why: "Shows three kinds of blank on one page: disputed weight, disputed torque, an unpublished sprint and a top speed with no single value.",
      },
      {
        car: "mazda-787b",
        why: "Its torque is given as either 448 or 620 lb-ft depending on the source. The gap is far too wide to split, so neither is printed.",
      },
    ],
    see: ["bounds-not-figures", "balance-of-performance", "unpublished-by-policy"],
  },
];

export const CONCEPT_BY_SLUG: Record<string, Concept> = Object.fromEntries(
  CONCEPTS.map((c) => [c.slug, c]),
);

/** Concepts that cite a given car, so its page can offer them as further reading. */
export function conceptsCiting(carSlug: string): Concept[] {
  return CONCEPTS.filter((c) => c.examples.some((e) => e.car === carSlug));
}

/** The example entries for a concept, with the car attached. */
export function examplesOf(concept: Concept) {
  return concept.examples.map((e) => ({ ...e, car: CAR_BY_SLUG[e.car] }));
}
