/**
 * Utility for converting digits, numbers, years, percentages, and metrics
 * into naturally spoken Devanagari Hindi words for OmniVoice TTS.
 */

const HINDI_0_TO_99: readonly string[] = [
  "शून्य", "एक", "दो", "तीन", "चार", "पांच", "छह", "सात", "आठ", "नौ", "दस",
  "ग्यारह", "बारह", "तेरह", "चौदह", "पंद्रह", "सोलह", "सत्रह", "अठारह", "उन्नीस", "बीस",
  "इक्कीस", "बाइस", "तेईस", "चौबीस", "पच्चीस", "छब्बीस", "सत्ताईस", "अट्ठाईस", "उनतीस", "तीस",
  "इकतीस", "बत्तीस", "तैंतीस", "चौंतीस", "पैंतीस", "छत्तीस", "सैंतीस", "अड़तीस", "उनतालीस", "चालीस",
  "इकतालीस", "बयालीस", "तैंतालीस", "चवालीस", "पैंतालीस", "छियालीस", "सैंतालीस", "अड़तालीस", "उनचास", "पचास",
  "इक्यावन", "बावन", "तिरपन", "चौवन", "पचपन", "छप्पन", "सत्तावन", "अट्ठावन", "उनसठ", "साठ",
  "इकसठ", "बासठ", "तिरसठ", "चौंसठ", "पैंसठ", "छियासठ", "सरसठ", "अड़सठ", "उनहत्तर", "सत्तर",
  "इकहत्तर", "बहत्तर", "तिहत्तर", "चौहत्तर", "पचहत्तर", "छिहत्तर", "सतहत्तर", "अठहत्तर", "उन्यासी", "अस्सी",
  "इक्यासी", "बयासी", "तिरासी", "चौरासी", "पचासी", "छियासी", "सत्तासी", "अट्ठासी", "नवासी", "नब्बे",
  "इक्यानवे", "बानवे", "तिरानवे", "चौरानवे", "पचानवे", "छियानवे", "सत्तानवे", "अट्ठानवे", "निन्यानवे",
];

/**
 * Converts any non-negative integer into spoken Devanagari Hindi words.
 */
export function numberToHindi(n: number): string {
  n = Math.round(Number(n));
  if (isNaN(n)) return "";
  if (n < 0) return `माइनस ${numberToHindi(-n)}`;
  if (n < 100) return HINDI_0_TO_99[n] || String(n);

  if (n < 1000) {
    const h = Math.floor(n / 100);
    const rem = n % 100;
    const hStr = h === 1 ? "एक सौ" : `${HINDI_0_TO_99[h]} सौ`;
    return rem === 0 ? hStr : `${hStr} ${numberToHindi(rem)}`;
  }

  if (n < 100000) {
    const th = Math.floor(n / 1000);
    const rem = n % 1000;
    const thStr = `${numberToHindi(th)} हज़ार`;
    return rem === 0 ? thStr : `${thStr} ${numberToHindi(rem)}`;
  }

  if (n < 10000000) {
    const lk = Math.floor(n / 100000);
    const rem = n % 100000;
    const lkStr = `${numberToHindi(lk)} लाख`;
    return rem === 0 ? lkStr : `${lkStr} ${numberToHindi(rem)}`;
  }

  const cr = Math.floor(n / 10000000);
  const rem = n % 10000000;
  const crStr = `${numberToHindi(cr)} करोड़`;
  return rem === 0 ? crStr : `${crStr} ${numberToHindi(rem)}`;
}

/**
 * Helper to normalize numeric string (with optional decimals) to Hindi words.
 */
function normalizeNumeric(str: string): string {
  const clean = str.replace(/,/g, "").trim();
  if (clean.includes(".")) {
    const [intPart, decPart] = clean.split(".");
    const intH = numberToHindi(Number(intPart));
    const decH = decPart
      .split("")
      .map((x) => HINDI_0_TO_99[Number(x)] || x)
      .join(" ");
    return `${intH} दशमलव ${decH}`;
  }
  return numberToHindi(Number(clean));
}

/**
 * Main normalization function for Hindi text destined for TTS.
 * Converts digits, currencies, multipliers, versions, percentages,
 * and years to phonetic Devanagari Hindi words.
 */
export function normalizeHindiNumbersForTTS(text: string): string {
  if (!text) return "";
  let s = text;

  // 1. Convert Devanagari numerals ०-९ to ASCII 0-9
  const devDigits = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
  for (let i = 0; i <= 9; i++) {
    s = s.split(devDigits[i]).join(String(i));
  }

  // 2. Specific tech idioms & phrases
  s = s.replace(/\b24\/7\b/gi, " चौबीसों घंटे ");
  s = s.replace(/C\+\+/gi, " सी प्लस प्लस ");
  s = s.replace(/\b(?:v|ver|version)\s*(\d+(?:\.\d+)?)\b/gi, (_, n) => ` वर्जन ${normalizeNumeric(n)} `);
  s = s.replace(/\bGPT-?(\d+(?:\.\d+)?)\b/gi, (_, n) => ` जीपीटी ${normalizeNumeric(n)} `);

  // 3. Currencies
  s = s.replace(/\$\s*(\d+(?:,\d+)*(?:\.\d+)?)/g, (_, n) => ` ${normalizeNumeric(n)} डॉलर `);
  s = s.replace(/(\d+(?:,\d+)*(?:\.\d+)?)\s*\$/g, (_, n) => ` ${normalizeNumeric(n)} डॉलर `);
  s = s.replace(/(?:₹|rs\.?|inr)\s*(\d+(?:,\d+)*(?:\.\d+)?)/gi, (_, n) => ` ${normalizeNumeric(n)} रुपये `);
  s = s.replace(/(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:₹|rs\.?|inr)/gi, (_, n) => ` ${normalizeNumeric(n)} रुपये `);

  // 4. Multipliers: 2x, 10X -> दो गुना, दस गुना
  s = s.replace(/\b(\d+(?:\.\d+)?)\s*[xX]\b/g, (_, n) => ` ${normalizeNumeric(n)} गुना `);

  // 5. Short unit notations: 10k -> दस हज़ार, 500k -> पांच लाख, 1M -> एक मिलियन
  s = s.replace(/\b(\d+(?:\.\d+)?)\s*[kK]\b/g, (_, n) => {
    const val = parseFloat(n) * 1000;
    return ` ${numberToHindi(val)} `;
  });
  s = s.replace(/\b(\d+(?:\.\d+)?)\s*[mM]\b/g, (_, n) => ` ${normalizeNumeric(n)} मिलियन `);

  // 6. Percentages: 70%, 99.9% -> सत्तर परसेंट, निन्यानवे दशमलव नौ परसेंट
  s = s.replace(/(\d+(?:,\d+)*(?:\.\d+)?)\s*%/g, (_, n) => ` ${normalizeNumeric(n)} परसेंट `);

  // 7. Plus notations: 10+, 50+ -> दस से ज़्यादा
  s = s.replace(/\b(\d+)\+/g, (_, n) => ` ${normalizeNumeric(n)} से ज़्यादा `);

  // 8. Ordinals
  s = s.replace(/\b1st\b/gi, " पहला ")
       .replace(/\b2nd\b/gi, " दूसरा ")
       .replace(/\b3rd\b/gi, " तीसरा ")
       .replace(/\b4th\b/gi, " चौथा ")
       .replace(/\b5th\b/gi, " पांचवां ");

  // 9. #1, #2 -> नंबर एक
  s = s.replace(/#(\d+)\b/g, (_, n) => ` नंबर ${normalizeNumeric(n)} `);

  // 10. Number ranges: 5-10 -> पांच से दस
  s = s.replace(/\b(\d+)\s*-\s*(\d+)\b/g, (_, a, b) => ` ${normalizeNumeric(a)} से ${normalizeNumeric(b)} `);

  // 11. Standalone decimals: 3.5 -> तीन दशमलव पांच
  s = s.replace(/\b(\d+)\.(\d+)\b/g, (_, intPart, decPart) => {
    const intH = numberToHindi(Number(intPart));
    const decH = decPart
      .split("")
      .map((d: string) => HINDI_0_TO_99[Number(d)] || d)
      .join(" ");
    return ` ${intH} दशमलव ${decH} `;
  });

  // 12. Strip commas in numbers: 10,000 -> 10000
  s = s.replace(/\b(\d{1,3}(?:,\d{3})+)\b/g, (m) => m.replace(/,/g, ""));

  // 13. Standalone integers (including years like 2025, small numbers like 2)
  s = s.replace(/\b\d+\b/g, (m) => ` ${numberToHindi(Number(m))} `);

  // 14. Remaining symbols
  s = s.replace(/%/g, " परसेंट ")
       .replace(/&/g, " और ")
       .replace(/\bvs\.?\b/gi, " वर्सेस ");

  // 15. Clean multiple whitespace
  return s.replace(/\s+/g, " ").trim();
}
