/**
 * Text matching helpers, in their own file with no imports.
 *
 * They live here so the browse page can use them without pulling the whole
 * catalogue into the browser along with them.
 */

/**
 * Lower case, strip accents, and treat anything that is not a letter or digit
 * as a space. The accent stripping is what lets "huracan" find the Huracán;
 * typing an accent on a keyboard that lacks one is a real obstacle.
 */
export function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** The same with every separator removed, so "mx5" finds the MX-5. */
export function squash(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}
