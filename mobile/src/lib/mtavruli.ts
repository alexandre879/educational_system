/**
 * Georgian capitals: Mtavruli. (The website draws them with a capitals font instead, since Chrome
 * turns real Mtavruli back into everyday letters under CSS uppercase: see frontend/app/globals.css.)
 *
 * Georgian has an all-caps alphabet, Mtavruli (ᲛᲗᲐᲕᲠᲣᲚᲘ), but `textTransform: "uppercase"` doesn't
 * reliably switch Georgian to it on every phone, so text styled in capitals could stay in everyday
 * Mkhedruli (მხედრული). AppText passes uppercase-styled text through `mtavruli()`: it swaps only
 * the Georgian letters, and the style keeps uppercasing English and Russian as before.
 *
 * Mkhedruli ა–ჺ (U+10D0–U+10FA) and ჽ–ჿ (U+10FD–U+10FF) sit exactly 0xBC0 below their Mtavruli
 * capitals (U+1C90–U+1CBA, U+1CBD–U+1CBF); ჻ and ჼ have no capital.
 */
const MKHEDRULI = /[\u10D0-\u10FA\u10FD-\u10FF]/g;
const TO_MTAVRULI = 0x1c90 - 0x10d0;

export function mtavruli(text: string): string {
  return text.replace(MKHEDRULI, (letter) => String.fromCharCode(letter.charCodeAt(0) + TO_MTAVRULI));
}
