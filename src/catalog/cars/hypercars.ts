import { disputed, unpublished, type Car, ind, mfr, mfrRange } from "../types";

export const HYPERCARS: Car[] = [
  {
    slug: "bugatti-chiron",
    brand: "bugatti",
    name: "Chiron",
    years: "2016-2022",
    category: "hypercar",
    layout: "Mid-engine, all-wheel drive",
    engine: "8.0 L quad-turbocharged W16",
    blurb:
      "Sixteen cylinders in a W, four turbochargers, and ten radiators to keep it alive. The engineering problem the Chiron solves is not making the power but getting rid of the heat and keeping the tyres attached: Michelin had to develop a tyre specifically for it, and the rims are X-ray checked.",
    powerHp: mfr(1479),
    torqueLbFt: mfr(1180),
    weightKg: mfr(1996, "kerb weight"),
    zeroTo60S: mfr(2.4, "Bugatti quotes 0-100 km/h (62 mph), not 0-60 mph"),
    topSpeedMph: mfr(261, "electronically limited; a modified Chiron exceeded 300 mph in a one-way run"),
    produced: { count: 500 },
    sources: [
      { publisher: "Bugatti", title: "Press material for the Chiron" },
      {
        publisher: "Bugatti",
        title: "Chiron model page, technical data",
        url: "https://www.bugatti.com/en/models/chiron",
        checked: { on: "2026-10-27", how: "search" },
      },
    ],
  },
  {
    slug: "koenigsegg-jesko",
    brand: "koenigsegg",
    name: "Jesko",
    years: "2023-present",
    category: "hypercar",
    layout: "Mid-engine, rear-wheel drive",
    engine: "5.0 L twin-turbocharged V8",
    blurb:
      "Named after the founder's father. Its nine-speed Light Speed Transmission uses seven clutches instead of a conventional gear train, which lets it jump straight to any ratio rather than shifting through the ones in between. Power depends on fuel: the higher figure needs E85.",
    powerHp: mfr(1280, "on pump petrol; 1,600 hp on E85"),
    torqueLbFt: mfr(1106),
    weightKg: mfr(1420, "dry weight"),
    zeroTo60S: null,
    topSpeedMph: unpublished(
      "Koenigsegg quotes no verified top speed. Its own Jesko Absolut page says how high " +
        "it goes \"depends on the conditions and location of a possible high-speed run\", " +
        "and no such run has been made.",
    ),
    produced: { count: 125 },
    sources: [
      { publisher: "Koenigsegg", title: "Technical specifications for the Jesko" },
      {
        publisher: "Koenigsegg",
        title: "Jesko Attack technical specifications",
        url: "https://www.koenigsegg.com/technical-specifications-jesko-attack",
        checked: { on: "2026-10-27", how: "search" },
      },
    ],
  },
  {
    slug: "rimac-nevera",
    brand: "rimac",
    name: "Nevera",
    years: "2022-present",
    category: "hypercar",
    layout: "Four motors, all-wheel drive",
    engine: "Four electric motors, 120 kWh battery",
    blurb:
      "One motor per wheel, which means torque can be sent to each corner independently and re-calculated a hundred times a second. That is a different way of controlling a car from any mechanical differential, and it is the main reason electric hypercars accelerate the way they do.",
    powerHp: mfr(1914),
    torqueLbFt: mfr(1741),
    weightKg: mfr(2150),
    zeroTo60S: mfr(1.85, "with one foot of rollout, the US magazine convention"),
    topSpeedMph: mfr(258),
    produced: { count: 150 },
    sources: [
      { publisher: "Rimac", title: "Technical specifications for the Nevera" },
      {
        publisher: "Rimac Automobili",
        title: "Nevera technical specifications",
        url: "https://web-cdn.rimac-automobili.com/wp-content/uploads/2023/11/20171226/Nevera_Technical-specifications.pdf",
        checked: { on: "2026-10-27", how: "search" },
      },
    ],
    review:
      "Rimac's own technical-specifications PDF gives 2,340 Nm, while several Rimac "+
      "press releases give 2,360 Nm. The 1,741 lb-ft here is the press-release figure; "+
      "the spec sheet works out at 1,726 lb-ft. Rimac has not reconciled the two.",
  },
  {
    slug: "mclaren-p1",
    brand: "mclaren",
    name: "P1",
    years: "2013-2015",
    category: "hypercar",
    layout: "Mid-engine, rear-wheel drive",
    engine: "3.8 L twin-turbocharged V8 with electric motor",
    blurb:
      "One of three hybrid hypercars launched within a year of each other, and the one that leaned hardest on aerodynamics: the rear wing moves through 300 mm and the car can generate 600 kg of downforce. Only 375 were built.",
    powerHp: mfr(903, "combined petrol and electric"),
    torqueLbFt: mfr(723, "combined"),
    weightKg: mfr(1490, "kerb weight"),
    zeroTo60S: mfr(2.8, "McLaren quotes 0-100 km/h (62 mph), not 0-60 mph; 0-200 km/h in 6.8 s"),
    topSpeedMph: mfr(217, "electronically limited"),
    produced: { count: 375 },
    sources: [
      { publisher: "McLaren", title: "Press material for the P1" },
    ],
  },
  {
    slug: "ferrari-laferrari",
    brand: "ferrari",
    name: "LaFerrari",
    years: "2013-2016",
    category: "hypercar",
    layout: "Mid-engine, rear-wheel drive",
    engine: "6.3 L V12 with HY-KERS electric motor",
    blurb:
      "The only one of the hybrid trio with a naturally aspirated engine, and the only one whose hybrid system came directly from Formula 1 energy recovery rather than from an efficiency programme. The electric motor fills the torque gap low down so the V12 can be tuned for the top end.",
    powerHp: mfr(949, "combined: 789 hp V12 plus 161 hp electric"),
    torqueLbFt: unpublished(
      "Ferrari gives the combined figure only as \"over 900 Nm\", which is a floor rather " +
        "than a number. The V12 alone makes 700 Nm at 6,750 rpm, but ranking that against " +
        "other cars' combined hybrid figures would not be comparing like with like.",
    ),
    weightKg: null,
    zeroTo60S: unpublished(
      "Ferrari quotes only \"under 3 seconds\" to 100 km/h, which is a bound rather than " +
        "a figure -- the same way it gives the torque as \"over 900 Nm\". Third-party " +
        "databases print 3.0 s. The 2.9 s this entry used to carry was nobody's published " +
        "number.",
    ),
    topSpeedMph: mfr(217, "quoted as over 350 km/h"),
    produced: { count: 499, note: "coupes; a further 210 open-top Aperta followed" },
    sources: [
      { publisher: "Ferrari", title: "Press material for LaFerrari" },
      {
        publisher: "Ferrari",
        title: "LaFerrari (2013), model page",
        url: "https://www.ferrari.com/en-EN/auto/laferrari",
        checked: { on: "2026-10-27", how: "search" },
      },
    ],
  },
  {
    slug: "porsche-918-spyder",
    brand: "porsche",
    name: "918 Spyder",
    years: "2013-2015",
    category: "hypercar",
    layout: "Mid-engine, all-wheel drive",
    engine: "4.6 L V8 with two electric motors",
    blurb:
      "Porsche's answer to the question three manufacturers asked at once in 2013: put the electric motor on the front axle. That made it four-wheel drive, and the only one of the three you could sensibly drive in the rain.",
    story: [
      "Three hybrid hypercars arrived within months of each other in 2013, from Porsche, McLaren and Ferrari, and they are usually described as rivals. They are better understood as three different answers to the same question: what is an electric motor actually for in a fast car? McLaren used it for a push of extra power. Ferrari used it to fill the gaps in a V12's delivery. Porsche used it to drive the front wheels, which is the answer that changed the car rather than the engine.",
      "The combustion half is a 4.6-litre V8 developed from the engine of the RS Spyder, the LMP2 car Porsche had been racing since 2005. That engine was a 3.4-litre V8 designed from scratch for racing, and the road version keeps its character: 447 kW, or 608 PS, arriving at 8,700 rpm, with the limiter at 9,150. Those are racing-engine numbers. Most road V8s of comparable size are finished by 7,000.",
      "Its exhausts leave through the top. The tailpipes terminate at the upper surface of the rear deck, directly above the engine, which gives the hot gas the shortest possible path out and keeps back pressure low. Porsche says no other production car has used the arrangement. It is also the single detail most people notice first, which is a reminder that the striking parts of a car are usually solving something.",
      "The electric half is two separate motors. A 115 kW unit sits at the rear, connected to the V8 through a decoupler so the car can drive on electricity alone, and a second motor of around 95 kW drives the front axle on its own. That front motor is the whole argument. It makes the 918 four-wheel drive, it can meter torque across the nose independently of anything the engine is doing, and it is why this car is the one of the three you could sensibly drive in the rain. The battery holds about 6.8 kWh across 312 cells and is good for roughly 30 km on electricity alone.",
      "Adding the two halves together produces a torque figure that refuses to sit still, and Porsche does something unusually honest about it: it publishes the number per gear. 940 lb-ft for the complete system in seventh, 787 lb-ft in third, and 390 lb-ft for the V8 by itself. An electric motor makes its best effort from rest and a combustion engine makes its own somewhere in the middle of the rev range, so the combined figure depends entirely on where you ask. Most manufacturers pick the flattering one and print it alone.",
      "In September 2013 it became the first road-legal car to lap the Nurburgring Nordschleife in under seven minutes, at 6:57 with Marc Lieb driving. Porsche's release at the time credited a car fitted with the Weissach package, which takes the kerb weight from 1,674 kg to about 1,634 kg. The 40 kg comes off in small pieces: visible carbon for the roof, wings, mirrors and screen frames, Alcantara in place of leather, less sound insulation, and forged magnesium wheels that save around 14.9 kg a corner against the standard ones.",
      "Exactly 918 were built, which is the kind of tidiness manufacturers rarely resist. Assembly of the first series car started on 18 September 2013, the first deliveries went out at the end of March 2014, and the last one left Zuffenhausen in mid-2015. The list price started at 768,026 euros including tax and ran to 947,716 with options. The engine outlived the car: Porsche's 963 Le Mans prototype reuses around 80 per cent of the 918's engine components in twin-turbocharged form, so the same basic design has now been an LMP2 racing engine, a road-car engine, and a Hypercar-class racing engine in turn.",
    ],
    powerHp: mfr(887, "combined system output, 652 kW; the V8 alone makes 608 PS at 8,700 rpm"),
    torqueLbFt: mfr(
      940,
      "complete system in 7th gear, calculated at the crankshaft; Porsche gives 787 lb-ft " +
        "in 3rd and 390 lb-ft for the V8 alone, so this figure is gear-dependent",
    ),
    weightKg: mfrRange(
      1634,
      1674,
      "kerb weight: 1,674 kg as standard, 1,634 kg with the Weissach package",
    ),
    zeroTo60S: mfr(2.6, "Porsche quotes 0-100 km/h (62 mph); third-party 0-60 mph times of 2.5 s circulate"),
    topSpeedMph: mfr(214, "345 km/h"),
    produced: {
      count: 918,
      note: "the run matches the model name; first series car 18 September 2013, last built mid-2015",
    },
    related: [
      {
        car: "mclaren-p1",
        how: "The same brief, answered six months earlier and without a driven front axle: McLaren put its electric motor behind the engine and aimed the whole car at a lap time.",
      },
      {
        car: "ferrari-laferrari",
        how: "The third car of the moment. Ferrari used its motor to fill in the V12 rather than to drive anything on its own, and published the headline figures as bounds instead of numbers.",
      },
      {
        car: "porsche-963",
        how: "Porsche's current Le Mans prototype reuses about 80 per cent of this engine's components, twin-turbocharged, which closes a loop that began with the RS Spyder.",
      },
      {
        car: "porsche-919-hybrid",
        how: "Porsche's other hybrid of the period, built to a racing rulebook instead of for the road, and recovering energy from the exhaust as well as the brakes.",
      },
    ],
    sources: [
      { publisher: "Porsche", title: "Press material for the 918 Spyder" },
      {
        publisher: "Porsche",
        title: "918 Spyder press kit, Porsche Museum",
        url: "https://newsroom.porsche.com/en/press-kits/Porsche-Museum/Porsche-918-Spyder.html",
        checked: { on: "2026-10-28", how: "search" },
      },
      {
        publisher: "Porsche",
        title: "Ten years of the Porsche 918 Spyder",
        year: 2023,
        url: "https://newsroom.porsche.com/en/press-kits/Media-Drive-Cayenne-E-Performance/10-Jahre-Porsche-918-Spyder.html",
        checked: { on: "2026-10-28", how: "search" },
      },
      {
        publisher: "Porsche",
        title: "How much is a Porsche 918 Spyder? (production, pricing and the Weissach package)",
        url: "https://www.porsche.com/stories/innovation/how-much-is-a-porsche-918-spyder/",
        checked: { on: "2026-10-28", how: "search" },
      },
      {
        publisher: "Porsche",
        title: "Number 918 rolls out of the manufactory",
        year: 2015,
        url: "https://newsroom.porsche.com/en/products/porsche-918-spyder-manufaktory-end-of-production-11123.html",
        checked: { on: "2026-10-28", how: "search" },
      },
    ],
  },
  {
    slug: "pagani-huayra",
    brand: "pagani",
    name: "Huayra",
    years: "2012-2018",
    category: "hypercar",
    layout: "Mid-engine, rear-wheel drive",
    engine: "6.0 L twin-turbocharged V12, built by Mercedes-AMG",
    blurb:
      "Has four independently moving flaps, one at each corner, that act as both aerodynamic balance and air brake — the car changes its own aerodynamic shape mid-corner rather than relying on a fixed wing. Named after a Quechua wind god.",
    powerHp: mfr(720),
    torqueLbFt: mfr(738),
    weightKg: mfr(1350, "dry weight"),
    zeroTo60S: mfr(3.3, "Pagani quotes 0-100 km/h (62 mph), not 0-60 mph"),
    topSpeedMph: mfr(230),
    produced: { count: 100, note: "coupes; roadster and special versions additional" },
    sources: [
      { publisher: "Pagani", title: "Technical specifications for the Huayra" },
      {
        publisher: "Pagani Automobili",
        title: "Pagani Automobili exclusive event in the Middle East, Huayra technical figures",
        url: "https://www.pagani.com/news/pagani-automobili-exclusive-event-in-the-middle-east/",
        checked: { on: "2026-10-27", how: "search" },
      },
    ],
  },
  {
    slug: "aston-martin-valkyrie",
    brand: "aston-martin",
    name: "Valkyrie",
    years: "2021-present",
    category: "hypercar",
    layout: "Mid-engine, rear-wheel drive",
    engine: "6.5 L naturally aspirated V12 by Cosworth, with hybrid assistance",
    blurb:
      "Designed with Adrian Newey, the Formula 1 aerodynamicist, and shaped around airflow before anything else: the underfloor tunnels are so large that the occupants sit with their feet raised. Its V12 revs past 11,000 rpm, which no other road-car engine of this size does.",
    powerHp: mfr(1140, "combined"),
    torqueLbFt: mfr(664, "900 Nm combined, certified; the V12 alone makes 740 Nm at 7,000 rpm"),
    weightKg: null,
    zeroTo60S: null,
    topSpeedMph: disputed(
      "Aston Martin's own pages disagree: the model page cites 200 mph while its " +
        "Silverstone lap-record story says more than 215 mph. Neither is presented as a " +
        "measured run.",
    ),
    produced: { count: 150, note: "road cars; the track-only AMR Pro is additional" },
    sources: [
      { publisher: "Aston Martin", title: "Press material for the Valkyrie" },
      {
        publisher: "Aston Martin",
        title: "Valkyrie: the ultimate hybrid powertrain for the ultimate hypercar",
        year: 2019,
        url: "https://media.astonmartin.com/aston-martin-valkyrie-the-ultimate-hybrid-powertrain-for-the-ultimate-hypercar/",
        checked: { on: "2026-10-27", how: "search" },
      },
    ],
  },
  {
    slug: "lamborghini-revuelto",
    brand: "lamborghini",
    name: "Revuelto",
    years: "2023-present",
    category: "hypercar",
    layout: "Mid-engine, all-wheel drive",
    engine: "6.5 L naturally aspirated V12 with three electric motors",
    blurb:
      "Lamborghini's first plug-in hybrid V12, and an unusual case of hybridisation being used to keep a naturally aspirated engine alive rather than replace it: the motors cover the low-rev torque that emissions rules would otherwise force a turbocharger to provide.",
    powerHp: mfr(1001, "combined"),
    torqueLbFt: mfr(595, "807 Nm combined; the V12 alone makes 725 Nm at 6,750 rpm"),
    weightKg: mfr(1772, "dry weight"),
    zeroTo60S: mfr(2.5, "quoted as 0-100 km/h in 2.5 s"),
    topSpeedMph: mfr(217),
    produced: null,
    sources: [
      { publisher: "Lamborghini", title: "Technical specifications for the Revuelto" },
      {
        publisher: "Lamborghini",
        title: "Revuelto model page, technical specifications",
        url: "https://www.lamborghini.com/en-en/models/revuelto-models/revuelto",
        checked: { on: "2026-10-27", how: "search" },
      },
    ],
  },
  {
    slug: "mercedes-amg-one",
    brand: "mercedes-benz",
    name: "AMG One",
    years: "2022-present",
    category: "hypercar",
    layout: "Mid-engine, all-wheel drive",
    engine: "1.6 L turbocharged V6 hybrid, derived from Formula 1",
    blurb:
      "The closest a road car has come to using an actual Formula 1 power unit. It took years longer than planned largely because an engine designed to be rebuilt between races had to be made to idle, start from cold and pass emissions tests.",
    powerHp: mfr(1049, "combined"),
    torqueLbFt: unpublished(
      "Mercedes-AMG publishes the ONE's 1,063 hp system output but no peak torque " +
        "figure, neither combined nor engine-only. Its own model page and technical " +
        "briefing on the combustion engine both omit one.",
    ),
    weightKg: null,
    zeroTo60S: mfr(2.9, "quoted as 0-100 km/h in 2.9 s"),
    topSpeedMph: mfr(219),
    produced: { count: 275 },
    sources: [
      { publisher: "Mercedes-AMG", title: "Press material for the One" },
      {
        publisher: "Mercedes-AMG",
        title: "Mercedes-AMG ONE model page",
        url: "https://www.mercedes-amg.com/en/amg-one",
        checked: { on: "2026-10-27", how: "search" },
      },
    ],
  },
  {
    slug: "bugatti-veyron",
    brand: "bugatti",
    name: "Veyron 16.4",
    years: "2005-2015",
    category: "hypercar",
    layout: "Mid-engine, all-wheel drive",
    engine: "8.0 L quad-turbocharged W16",
    blurb:
      "The car that made 1,000 hp and 250 mph into road-car numbers, and it took Volkswagen years to get there: the problems were cooling, tyres and brakes rather than power. At full speed it empties its fuel tank in about twelve minutes, which is the clearest illustration there is of how drag scales with velocity.",
    powerHp: mfr(1001),
    torqueLbFt: mfr(922),
    weightKg: mfr(1888, "kerb weight"),
    zeroTo60S: mfr(2.5, "Bugatti quotes 0-100 km/h (62 mph), not 0-60 mph; 7.3 s to 200 km/h"),
    topSpeedMph: mfr(253, "requires a second key to unlock the top-speed mode"),
    produced: { count: 450, note: "coupes and roadsters across all versions" },
    sources: [
      { publisher: "Bugatti", title: "Veyron 16.4 technical specifications" },
    ],
  },
  {
    slug: "koenigsegg-regera",
    brand: "koenigsegg",
    name: "Regera",
    years: "2016-2022",
    category: "hypercar",
    layout: "Mid-engine, rear-wheel drive",
    engine: "5.0 L twin-turbocharged V8 with three electric motors",
    blurb:
      "Has no gearbox at all. Koenigsegg's Direct Drive system couples the engine to the back axle through a single fixed ratio and uses electric motors to cover everything a set of gears would normally do, which removes the weight and the shift interruptions together.",
    powerHp: mfr(1500, "combined, limited by the battery's output"),
    torqueLbFt: mfr(1475, "combined"),
    weightKg: mfr(1628, "kerb weight"),
    zeroTo60S: mfr(2.8, "Koenigsegg quotes 0-100 km/h (62 mph), not 0-60 mph; 0-200 km/h in 6.6 s"),
    topSpeedMph: mfr(255),
    produced: { count: 80 },
    sources: [
      { publisher: "Koenigsegg", title: "Regera technical specifications" },
      {
        publisher: "Koenigsegg",
        title: "Production-spec Regera presented at Geneva 2016",
         year: 2016,
        url: "https://dev.koenigsegg.com/koenigsegg-presents-agera-rs-production-regera-and-agera-final-at-geneva-2016/",
        checked: { on: "2026-10-27", how: "search" },
      },
    ],
  },
  {
    slug: "rimac-concept-one",
    brand: "rimac",
    name: "Concept_One",
    years: "2013-2018",
    category: "hypercar",
    layout: "Four motors, all-wheel drive",
    engine: "Four electric motors, 82 kWh battery",
    blurb:
      "The first electric hypercar, and effectively the prototype for the company Rimac became. Eight were built, which is fewer than most press fleets, and its real legacy is the battery and motor technology other manufacturers now buy from the firm that made it.",
    powerHp: mfr(1224),
    torqueLbFt: mfr(1180),
    weightKg: mfr(1850),
    zeroTo60S: mfr(
      2.4,
      "0-60 mph, Rimac's own figure for the 2017 900 kW car; the same release gives " +
        "2.5 s to 100 km/h, and the 2016 800 kW production car 2.6 s",
    ),
    topSpeedMph: mfr(221),
    produced: { count: 8 },
    sources: [
      { publisher: "Rimac", title: "Concept_One technical specifications" },
    ],
  },
  {
    slug: "pagani-zonda-f",
    brand: "pagani",
    name: "Zonda F",
    years: "2005-2009",
    category: "hypercar",
    layout: "Mid-engine, rear-wheel drive",
    engine: "7.3 L naturally aspirated V12, built by Mercedes-AMG",
    blurb:
      "Named after Juan Manuel Fangio, who helped Horacio Pagani get the AMG engine deal in the first place. The Zonda ran for eighteen years in a stream of one-off variants, long after it should have been replaced, largely because customers kept commissioning them.",
    powerHp: mfr(602),
    torqueLbFt: mfr(575),
    weightKg: mfr(1230, "dry weight"),
    zeroTo60S: ind(
      3.6,
      "0-100 km/h (62 mph) as reported by Auto Bild; 3.8 s also circulates, and no " +
        "Pagani figure for the F appears in these sources",
    ),
    topSpeedMph: mfr(214),
    produced: { count: 25, note: "F coupes; the wider Zonda family ran to roughly 140 cars" },
    review:
      "The 25 figure covers the Zonda F coupe only. Pagani built a long tail of one-off and special-series Zondas and the total is reported differently in different places.",
    sources: [
      { publisher: "Pagani", title: "Zonda F technical specifications" },
    ],
  },
];
