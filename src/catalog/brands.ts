import type { Brand } from "./types";

// ---------------------------------------------------------------------------
// Brands.
//
// Names are used here the ordinary way one product refers to another: as the
// name of the thing being described. There are no logos and no manufacturer
// photographs anywhere in this project, because those are the parts that
// actually carry legal weight, and because this codebase ships no binary
// assets at all.
//
// `site` is the manufacturer's own page. We link to it rather than reproduce
// what is on it.
// ---------------------------------------------------------------------------

export const BRANDS: Brand[] = [
  {
    slug: "porsche",
    name: "Porsche",
    country: "Germany",
    founded: 1931,
    site: "https://www.porsche.com",
    blurb:
      "Built its reputation on one rear-engined shape it has refused to abandon for sixty years, and on winning Le Mans more often than anyone else. The engineering habit that defines it is refinement over reinvention: the 911 has been iterated, not replaced.",
  },
  {
    slug: "ferrari",
    name: "Ferrari",
    country: "Italy",
    founded: 1947,
    site: "https://www.ferrari.com",
    blurb:
      "Started as a way to fund a racing team and never quite stopped behaving like one. Road cars have followed the Formula 1 programme closely enough that hybrid systems, paddle gearboxes and carbon tubs all reached the showroom by way of the pit lane.",
  },
  {
    slug: "lamborghini",
    name: "Lamborghini",
    country: "Italy",
    founded: 1963,
    site: "https://www.lamborghini.com",
    blurb:
      "Founded by a tractor manufacturer who thought he could do better than the Ferrari he owned. Its contribution is less mechanical than visual: the Miura established the mid-engined supercar layout, and the Countach established what one should look like.",
  },
  {
    slug: "mclaren",
    name: "McLaren",
    country: "United Kingdom",
    founded: 1963,
    site: "https://www.mclaren.com",
    blurb:
      "A Formula 1 team that builds road cars on the side, and it shows: every McLaren road car since 2011 has been built around a carbon-fibre tub, a decision most rivals still reserve for their most expensive models.",
  },
  {
    slug: "bugatti",
    name: "Bugatti",
    country: "France",
    founded: 1909,
    site: "https://www.bugatti.com",
    blurb:
      "An historic French marque revived in the modern era to answer a single question: what happens if top speed is the only brief and cost is not a constraint. The answer has involved sixteen cylinders and four turbochargers for twenty years.",
  },
  {
    slug: "koenigsegg",
    name: "Koenigsegg",
    country: "Sweden",
    founded: 1994,
    site: "https://www.koenigsegg.com",
    blurb:
      "A small Swedish firm that designs and makes almost everything itself, including its own gearboxes and engine architecture. Its output is tiny and its patent portfolio is not: camshaft-free valve control and multi-clutch transmissions both originate here.",
  },
  {
    slug: "rimac",
    name: "Rimac",
    country: "Croatia",
    founded: 2009,
    site: "https://www.rimac-automobili.com",
    blurb:
      "Began with one person converting an old BMW to electric drive and became the supplier of high-performance battery systems to much older companies. Its own car exists partly to prove what the components can do.",
  },
  {
    slug: "pagani",
    name: "Pagani",
    country: "Italy",
    founded: 1992,
    site: "https://www.pagani.com",
    blurb:
      "Founded by a composites engineer who had worked on Lamborghini's carbon-fibre programme. Production is measured in dozens per year, and the cars are notable less for outright speed than for treating the inside of a car as a finished object.",
  },
  {
    slug: "aston-martin",
    name: "Aston Martin",
    country: "United Kingdom",
    founded: 1913,
    site: "https://www.astonmartin.com",
    blurb:
      "Spent most of its history making fast, heavy, handsome grand tourers, and most of its history in financial difficulty. Recent years have pushed it towards genuine extremes, including a road car designed with Formula 1 aerodynamicists.",
  },
  {
    slug: "mercedes-benz",
    name: "Mercedes-Benz",
    country: "Germany",
    founded: 1926,
    site: "https://www.mercedes-benz.com",
    blurb:
      "Traces its line to the first petrol-driven car of 1886 and has introduced an unusual share of what is now standard safety equipment: crumple zones, anti-lock brakes and stability control all reached production here first. AMG is its performance division.",
  },
  {
    slug: "bmw",
    name: "BMW",
    country: "Germany",
    founded: 1916,
    site: "https://www.bmw.com",
    blurb:
      "An aero-engine firm that moved to motorcycles and then cars. Its identity rests on a particular recipe — straight-six engine, rear-wheel drive, a saloon body — and on the M division that has been sharpening that recipe since the 1970s.",
  },
  {
    slug: "audi",
    name: "Audi",
    country: "Germany",
    founded: 1909,
    site: "https://www.audi.com",
    blurb:
      "Made four-wheel drive a performance technology rather than an off-road one, with the original Quattro rally car, and then spent a decade dominating Le Mans with diesel and hybrid prototypes.",
  },
  {
    slug: "volkswagen",
    name: "Volkswagen",
    country: "Germany",
    founded: 1937,
    site: "https://www.volkswagen.com",
    blurb:
      "Built the best-selling single car design in history, then replaced it with the Golf and effectively invented the modern hatchback. The GTI version is the reason the phrase 'hot hatch' exists.",
  },
  {
    slug: "toyota",
    name: "Toyota",
    country: "Japan",
    founded: 1937,
    site: "https://www.toyota.com",
    blurb:
      "The world's largest car maker, and the origin of the production system that most manufacturing industries have since copied. It also made hybrid drive ordinary, a decade before anyone else treated it as a serious idea.",
  },
  {
    slug: "honda",
    name: "Honda",
    country: "Japan",
    founded: 1948,
    site: "https://www.honda.com",
    blurb:
      "An engine company that happens to make cars, motorcycles, generators and aircraft. Its particular obsession is getting unusual output from small naturally aspirated engines, which is what VTEC was for.",
  },
  {
    slug: "nissan",
    name: "Nissan",
    country: "Japan",
    founded: 1933,
    site: "https://www.nissan-global.com",
    blurb:
      "Responsible for two very different landmarks: the Skyline GT-R line, which made computer-controlled four-wheel drive a performance tool, and the Leaf, the first mass-market electric car.",
  },
  {
    slug: "mazda",
    name: "Mazda",
    country: "Japan",
    founded: 1920,
    site: "https://www.mazda.com",
    blurb:
      "The only manufacturer to make the rotary engine work in volume production, and the only Japanese manufacturer to have won Le Mans outright. Its other contribution is the MX-5, which rescued the small affordable sports car from extinction.",
  },
  {
    slug: "subaru",
    name: "Subaru",
    country: "Japan",
    founded: 1953,
    site: "https://www.subaru.com",
    blurb:
      "Has built almost nothing but flat engines and four-wheel drive for decades, a combination that came from aircraft engineering and turned out to suit both rally stages and snowy roads.",
  },
  {
    slug: "chevrolet",
    name: "Chevrolet",
    country: "United States",
    founded: 1911,
    site: "https://www.chevrolet.com",
    blurb:
      "General Motors' volume brand, and home of the Corvette — a car that spent sixty years as a front-engined V8 before moving its engine behind the driver in 2020.",
  },
  {
    slug: "ford",
    name: "Ford",
    country: "United States",
    founded: 1903,
    site: "https://www.ford.com",
    blurb:
      "Did not invent the car or the assembly line but combined them in a way that made cars affordable, which changed the shape of cities. Also built the GT40 specifically to beat Ferrari at Le Mans, and did.",
  },
  {
    slug: "tesla",
    name: "Tesla",
    country: "United States",
    founded: 2003,
    site: "https://www.tesla.com",
    blurb:
      "Made electric cars desirable rather than merely virtuous, and forced an industry that had treated batteries as a compliance exercise to take them seriously. Its charging network did as much for adoption as its cars.",
  },
  {
    slug: "hyundai",
    name: "Hyundai",
    country: "South Korea",
    founded: 1967,
    site: "https://www.hyundai.com",
    blurb:
      "Went from licence-building other companies' designs to setting its own benchmarks within about thirty years, which is unusually fast. Its N performance division was built by engineers hired away from BMW's M division.",
  },
  {
    slug: "alpine",
    name: "Alpine",
    country: "France",
    founded: 1955,
    site: "https://www.alpinecars.com",
    blurb:
      "A French maker of small, light, rear-engined rally cars, dormant for decades and revived in 2017. The revival kept the founding principle, which is that lightness beats power.",
  },
  {
    slug: "lotus",
    name: "Lotus",
    country: "United Kingdom",
    founded: 1948,
    site: "https://www.lotuscars.com",
    blurb:
      "Colin Chapman's firm, and the source of the most quoted line in car engineering: add lightness. Lotus brought the monocoque chassis and ground-effect aerodynamics to Formula 1, and has applied the same thinking to road cars ever since.",
  },
  {
    slug: "cadillac",
    name: "Cadillac",
    country: "United States",
    founded: 1902,
    site: "https://www.cadillac.com",
    blurb:
      "General Motors' luxury brand, and an early mover on things now taken for granted, including the electric starter. Recently it has returned to top-level endurance racing after decades away.",
  },
  {
    slug: "peugeot",
    name: "Peugeot",
    country: "France",
    founded: 1810,
    site: "https://www.peugeot.com",
    blurb:
      "Older than the car itself — it made coffee grinders and saw blades first. Its competition history runs from Grand Prix racing through the Group B rally era to Le Mans victories in 1992, 1993 and 2009.",
  },
];

export const BRAND_BY_SLUG: Record<string, Brand> = Object.fromEntries(
  BRANDS.map((b) => [b.slug, b]),
);
