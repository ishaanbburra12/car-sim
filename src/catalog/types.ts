// ---------------------------------------------------------------------------
// The car catalogue.
//
// This is a LEARNING platform, so the rule that governs the rest of this
// project governs it twice over: never print a number we cannot stand behind.
//
// The simulator side of this codebase deals in estimates, and labels them as
// estimates. The catalogue does not estimate at all. Every figure here is one
// a manufacturer or an independent tester published, and it carries a tag
// saying which. If we do not have a figure we trust, the field is `null` and
// the page prints "not listed" rather than a plausible guess.
//
// That distinction matters more than it sounds. A guessed 0-60 time on a page
// that looks like a reference work is worse than no page at all, because a
// reader has no way to tell it from the real ones.
// ---------------------------------------------------------------------------

/** Where a published figure came from. */
export type Provenance =
  /** The company that built the car printed this. */
  | "manufacturer"
  /** A magazine or independent tester measured it. Usually slower than the
   *  manufacturer's own claim, because they test on a public-road surface with
   *  a full tank and a real driver. */
  | "independent";

export type Figure = {
  value: number;
  source: Provenance;
  /** Qualifier: which trim, which market, which measurement standard. */
  note?: string;
};

/**
 * A spec we do not have a trustworthy figure for. Deliberately NOT optional:
 * writing `null` is a decision, leaving a field out is an accident, and this
 * way the type system makes you make the decision for every car.
 */
export type MaybeFigure = Figure | null;

export const CATEGORIES = ["hypercar", "sports", "prototype", "everyday"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  hypercar: "Hypercars",
  sports: "Sports cars",
  prototype: "Prototypes & racers",
  everyday: "Everyday cars",
};

export const CATEGORY_BLURBS: Record<Category, string> = {
  hypercar:
    "The top of the tree: tiny production runs, budgets that ignore the usual limits, and engineering that often reaches road cars a decade later.",
  sports:
    "Built to be enjoyed on a road or a track. Some are fast, some are not; what they share is that handling came before practicality.",
  prototype:
    "Purpose-built racing cars: designed from a blank sheet to a rulebook rather than developed from something you could buy. In racing, \u201cprototype\u201d is the name of a class, not a stage of development \u2014 these are finished machines, not test mules.",
  everyday:
    "The cars most people actually own. Unglamorous, enormously refined, and the place almost every piece of safety and efficiency technology ends up.",
};

/**
 * Where a figure came from, structured so a reader can actually go and look.
 *
 * NOTE ON URLs. There is deliberately no url on most of these. Manufacturer
 * deep links rot faster than almost anything else on the web — a model page
 * moves the moment the model is replaced — and a dead link on a reference work
 * is worse than no link, because it looks like a citation and isn't one. More
 * to the point, the container this catalogue was written in cannot reach any
 * car manufacturer's site, so a URL added here could not have been checked by
 * the person adding it. Writing one anyway would be manufacturing the
 * appearance of verifiability, which is the exact thing this project exists
 * not to do.
 *
 * What is here instead is enough to find the document: who published it, what
 * it is called, and when. The brand's own site is linked separately, and is
 * the place to start looking.
 *
 * `scripts/check-links.mjs` verifies any url that IS present. Run it somewhere
 * with open network access before trusting one.
 */
export type Source = {
  /** The organisation that published it. */
  publisher: string;
  /** The document, named as precisely as possible. */
  title: string;
  /** Year of publication, where it is known. */
  year?: number;
  /** Only ever set to a link that has been checked. */
  url?: string;
};

export type Brand = {
  slug: string;
  name: string;
  country: string;
  /** Year the company was founded, as the company itself dates it. */
  founded: number;
  /** The manufacturer's own site. We link out rather than reproduce. */
  site: string;
  blurb: string;
};

export type Car = {
  slug: string;
  /** Slug of the brand in brands.ts. Checked by a test, not by hand. */
  brand: string;
  name: string;
  /** Production years as commonly given, e.g. "2021-present" or "1990-1993". */
  years: string;
  category: Category;
  /** Engine position and driven wheels, e.g. "mid-engine, rear-wheel drive". */
  layout: string;
  /** What the engine is, in words rather than numbers. */
  engine: string;
  /** Why this car is worth a page. Two or three sentences, no marketing. */
  blurb: string;
  powerHp: MaybeFigure;
  torqueLbFt: MaybeFigure;
  /** Kerb/curb weight. Standards differ by market, so the note says which. */
  weightKg: MaybeFigure;
  zeroTo60S: MaybeFigure;
  topSpeedMph: MaybeFigure;
  /**
   * How many were built, where that is a real, knowable number: a deliberate
   * production cap, or a homologation run.
   *
   * `null` is the normal case and means two different things that are worth
   * keeping apart in your head: either the car was simply mass-produced and no
   * cap exists, or a cap exists and we could not source it. Both print the
   * same way, because inventing the difference would be worse than admitting
   * we did not look it up.
   */
  produced: { count: number; note?: string } | null;
  /** Where the figures above came from. At least one, always. */
  sources: Source[];
  /**
   * Set when something on this entry is known to need checking: a figure that
   * could not be pinned to a specific trim, a production number that different
   * accounts disagree on. Surfaced on the page rather than hidden, because a
   * reference work that quietly carries doubt is worse than one that says so.
   */
  review?: string;
};

/* --- Small constructors, so the data files stay readable ----------------- */

export const mfr = (value: number, note?: string): Figure => ({
  value,
  source: "manufacturer",
  ...(note ? { note } : {}),
});

export const ind = (value: number, note?: string): Figure => ({
  value,
  source: "independent",
  ...(note ? { note } : {}),
});
