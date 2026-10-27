import { BRAND_BY_SLUG } from "@/src/catalog";
import type { Car } from "@/src/catalog/types";
import type { RowCar } from "./catalog-ui";

// ---------------------------------------------------------------------------
// Why this is its own file.
//
// Reducing a full Car to an index row needs BRAND_BY_SLUG, which is a VALUE,
// and importing it from the barrel pulls CARS in behind it. That is harmless
// in a server component and fatal in a client one: CarBrowser imports CarIndex
// from catalog-ui, so for as long as this function lived there, every blurb in
// the catalogue was bundled into the browser's copy of the index page.
//
// Keeping it apart is the whole guard. Only server components may import this
// module. `npm run check:payload` fails the build if prose reaches a client
// chunk again, because the symptom is invisible in the served HTML.
// ---------------------------------------------------------------------------

export const toRow = (car: Car): RowCar => ({
  slug: car.slug,
  brandName: BRAND_BY_SLUG[car.brand]?.name ?? car.brand,
  name: car.name,
  years: car.years,
  powerHp: car.powerHp ? car.powerHp.value : null,
});
