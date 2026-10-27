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
  /**
   * The upper end, where the published figure is genuinely a RANGE rather than
   * a number. Kerb weight is the usual case: a Golf Mk8 1.5 TSI is published
   * between 1,317 and 1,376 kg depending on gearbox and equipment, and picking
   * one of those to print would be inventing a precision the maker never
   * claimed. A range is not a hedge here; it is what was published.
   */
  high?: number;
  source: Provenance;
  /** Qualifier: which trim, which market, which measurement standard. */
  note?: string;
};

/**
 * A figure that is missing for a REASON, as distinct from one nobody has
 * looked up yet.
 *
 * This distinction is the whole point. Before it existed, three very different
 * situations printed the identical words "not listed":
 *
 *   - Tesla does not publish a power figure for the Model 3 at all, and has
 *     not since 2015. No amount of research will produce one.
 *   - A Le Mans prototype's weight is a Balance of Performance number that the
 *     organisers reset between races -- the Porsche 963 ran at 1,048 kg and
 *     then 1,045 kg inside one season -- so there is no single weight that is
 *     a property of the car.
 *   - Nobody has got round to looking up the Mazda3's kerb weight.
 *
 * Only the last one is our failing, and a reader could not tell which was
 * which. `null` now means exactly that last case and nothing else; the other
 * two carry a reason, and the page prints it.
 *
 * The same observation is already written down about `produced` below, where
 * it was noticed and not acted on.
 */
export type Absence = {
  absent:
    /** The people who would know have not published it, and say so or simply do not. */
    | "unpublished"
    /** No single value exists for this car: trim, market, or a rulebook that moves it. */
    | "varies"
    /**
     * Published figures contradict each other and we are not going to pick a
     * winner. Period racing cars are full of this -- the Porsche 917's weight
     * is given as 820, 830 and 896 kg by different sources, and the Mazda
     * 787B's torque as either 448 or 620 lb-ft. Printing one of those as fact
     * would be choosing by coin-toss and presenting it as research.
     */
    | "disputed";
  /** Printed on the page, so say something a reader learns from. */
  why: string;
};

/**
 * A spec we do not have a trustworthy figure for. Deliberately NOT optional:
 * writing `null` is a decision, leaving a field out is an accident, and this
 * way the type system makes you make the decision for every car.
 *
 * `null` means "we have not researched this". Anything structural gets an
 * `Absence` with a reason instead.
 */
export type MaybeFigure = Figure | Absence | null;

export const isFigure = (f: MaybeFigure): f is Figure => f !== null && !("absent" in f);
export const isAbsence = (f: MaybeFigure): f is Absence => f !== null && "absent" in f;

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

export type Checked = {
  /** ISO date the link was last confirmed. */
  on: string;
  /**
   * How it was confirmed, because the two are not the same strength and the
   * site says which it has.
   *
   * "search" -- a web search returned this page, and the content it returned
   * matched the figure cited here. The page was really retrieved and really
   * said this, but nobody loaded it in a browser and read around it.
   *
   * "opened" -- somebody opened the page and read it.
   *
   * Everything in this catalogue is currently "search": the container it is
   * written in has no route to any manufacturer or motoring-press domain
   * (DNS fails, and the egress proxy refuses the rest), so web search is the
   * only channel out. Saying so is the point of this field.
   */
  how: "search" | "opened";
};

/**
 * Where a figure came from, structured so a reader can actually go and look.
 *
 * A `url` cannot be written without a `checked` beside it -- the type below is
 * a union, so the compiler rejects one without the other. That is deliberate:
 * an unchecked link on a reference work is worse than no link, because it
 * looks like a citation and isn't one, and the easiest way to end up with one
 * is to paste a plausible address from memory. Making it impossible to do
 * quietly is better than a rule in a comment.
 *
 * Where there is no url, what is here still names the document: who published
 * it, what it is called, and when. The brand's own site is linked separately.
 *
 * `scripts/check-links.mjs` re-verifies every url that IS present. Run it
 * somewhere with open network access to refresh the `checked` dates.
 */
export type Source = {
  /** The organisation that published it. */
  publisher: string;
  /** The document, named as precisely as possible. */
  title: string;
  /** Year of publication, where it is known. */
  year?: number;
} & ({ url: string; checked: Checked } | { url?: undefined; checked?: undefined });

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

/** A published range, e.g. a kerb weight that depends on gearbox and trim. */
export const mfrRange = (low: number, high: number, note?: string): Figure => ({
  value: low,
  high,
  source: "manufacturer",
  ...(note ? { note } : {}),
});

export const indRange = (low: number, high: number, note?: string): Figure => ({
  value: low,
  high,
  source: "independent",
  ...(note ? { note } : {}),
});

/** Nobody who would know has published this figure. */
export const unpublished = (why: string): Absence => ({ absent: "unpublished", why });

/** No single value exists for this car -- trim, market, or a moving rulebook. */
export const varies = (why: string): Absence => ({ absent: "varies", why });

/** Published figures contradict each other; say so rather than pick one. */
export const disputed = (why: string): Absence => ({ absent: "disputed", why });
