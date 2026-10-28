// Numbers the client and the server both need, in a module that imports
// NOTHING. questions.ts imports the catalogue, so a client component taking a
// single constant from it drags all 65 cars into the browser -- which is
// exactly what happened: the lesson page went from 2.55 kB to 32.5 kB and
// `npm run check:payload` refused the build.

/** Questions in one lesson. */
export const LESSON_LENGTH = 8;

/** How many the server offers for the client to choose that lesson from. */
export const POOL_SIZE = 28;
