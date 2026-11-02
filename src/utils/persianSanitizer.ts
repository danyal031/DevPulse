export interface PersianNormalizeOptions {
  convertDigitsToPersian?: boolean;
  convertDigitsToEnglish?: boolean;
  normalizeArabicChars?: boolean;
  normalizePunctuation?: boolean;
  normalizeZwnj?: boolean;
  removeHarakat?: boolean;
}

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function toEnglishDigits(input: string): string {
  let result = input;
  for (let i = 0; i < 10; i++) {
    const pRegex = new RegExp(PERSIAN_DIGITS[i], 'g');
    const aRegex = new RegExp(ARABIC_DIGITS[i], 'g');
    result = result.replace(pRegex, String(i)).replace(aRegex, String(i));
  }
  return result;
}

export function toPersianDigits(input: string): string {
  return input.replace(/[0-9]/g, (digit) => PERSIAN_DIGITS[parseInt(digit, 10)] ?? digit);
}

export function normalizeArabicChars(input: string): string {
  return input
    .replace(/\u064A/g, '\u06CC') // Arabic Yeh to Persian Yeh
    .replace(/\u0643/g, '\u06A9') // Arabic Kaf to Persian Keheh
    .replace(/\u0649/g, '\u06CC') // Alef Maksura to Persian Yeh
    .replace(/\u0629/g, '\u0647') // Teh Marbuta to Heh
    .replace(/\u06C0/g, '\u0647\u200C\u06CC') // Heh with Yeh above
    .replace(/\u0640/g, ''); // Remove Tatweel (Kashida)
}

export function removeHarakat(input: string): string {
  // Strips Fatha, Damma, Kasra, Tanwin, Sukun, Shadda
  return input.replace(/[\u064B-\u0652\u0670]/g, '');
}

export function normalizeZwnj(input: string): string {
  let text = input;

  // Clean repeated ZWNJ and spaces around ZWNJ
  text = text.replace(/\u200C+/g, '\u200C');
  text = text.replace(/ \u200C/g, '\u200C').replace(/\u200C /g, '\u200C');

  // Fix continuous prefixes: 'می ' and 'نمی ' followed by word characters
  text = text.replace(/(^|[\s\(\[\{"'«])(می|نمی) +([\u0600-\u06FF])/g, '$1$2\u200C$3');

  // Fix suffixes: ' ها', ' های', ' تر', ' ترین', ' ام', ' ات', ' اش', ' مان', ' تان', ' شان'
  text = text.replace(/([\u0600-\u06FF]) +(ها|های|تر|ترین|ام|ات|اش|مان|تان|شان)([\s\.,!\?؛،؟\)\]\}"'»]|$)/g, '$1\u200C$2$3');

  return text;
}

export function normalizePunctuation(input: string): string {
  return input
    .replace(/,/g, '،')
    .replace(/;/g, '؛')
    .replace(/\?/g, '؟')
    .replace(/«/g, '«')
    .replace(/»/g, '»')
    .replace(/\.{3}/g, '…');
}

export function normalizePersianText(
  input: string,
  options: PersianNormalizeOptions = {
    normalizeArabicChars: true,
    convertDigitsToEnglish: true,
    normalizeZwnj: true,
    removeHarakat: false,
    normalizePunctuation: false
  }
): string {
  let output = input;

  if (options.normalizeArabicChars) {
    output = normalizeArabicChars(output);
  }

  if (options.removeHarakat) {
    output = removeHarakat(output);
  }

  if (options.convertDigitsToEnglish) {
    output = toEnglishDigits(output);
  } else if (options.convertDigitsToPersian) {
    output = toPersianDigits(output);
  }

  if (options.normalizeZwnj) {
    output = normalizeZwnj(output);
  }

  if (options.normalizePunctuation) {
    output = normalizePunctuation(output);
  }

  return output;
}
