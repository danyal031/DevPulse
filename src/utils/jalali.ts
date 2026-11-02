export interface JalaliDate {
  jy: number;
  jm: number;
  jd: number;
}

export interface GregorianDate {
  gy: number;
  gm: number;
  gd: number;
}

export interface JalaliDetails extends JalaliDate {
  yearStr: string;
  monthStr: string;
  dayStr: string;
  formatted: string;
  monthNameFa: string;
  monthNameEn: string;
  weekdayFa: string;
  weekdayEn: string;
  isLeap: boolean;
  timestampMs: number;
  timestampSec: number;
}

export const JALALI_MONTH_NAMES_FA = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند'
] as const;

export const JALALI_MONTH_NAMES_EN = [
  'Farvardin',
  'Ordibehesht',
  'Khordad',
  'Tir',
  'Mordad',
  'Shahrivar',
  'Mehr',
  'Aban',
  'Azar',
  'Dey',
  'Bahman',
  'Esfand'
] as const;

export const WEEKDAYS_FA = [
  'یک‌شنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه',
  'شنبه'
] as const;

export const WEEKDAYS_EN = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
] as const;

export function isJalaliLeapYear(jy: number): boolean {
  const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
  const bl = breaks.length;
  let jp = breaks[0];
  let jm: number;
  let jump = 0;

  if (jy < jp || jy >= breaks[bl - 1]) {
    // Fallback for years outside break table: standard 33-year cycle
    return (((jy + 38) * 31) % 128) <= 31;
  }

  for (let i = 1; i < bl; i++) {
    jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) break;
    jp = jm;
  }

  let n = jy - jp;
  if (jump - n < 6) {
    n = n - jump + Math.floor(jump / 33) * 33 + 4;
  }

  let leap = (((n + 1) % 33) - 1) % 4;
  if (leap === -1) {
    leap = 4;
  }

  return leap === 0;
}

export function isGregorianLeapYear(gy: number): boolean {
  return (gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0);
}

export function gregorianToJalali(gy: number, gm: number, gd: number): JalaliDate {
  const gDaysInMonth = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 +
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) +
    gd +
    gDaysInMonth[gm - 1];

  let jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;

  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }

  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }

  return { jy, jm, jd };
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): GregorianDate {
  const gy = jy + 1595;
  let days =
    -355668 +
    365 * gy +
    Math.floor(gy / 33) * 8 +
    Math.floor(((gy % 33) + 3) / 4) +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);

  let gy2 = 400 * Math.floor(days / 146097);
  days %= 146097;

  if (days > 36524) {
    gy2 += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) {
      days++;
    }
  }

  gy2 += 4 * Math.floor(days / 1461);
  days %= 1461;

  if (days > 365) {
    gy2 += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }

  let gd = days + 1;
  const daysInMonth = [
    0,
    31,
    isGregorianLeapYear(gy2) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31
  ];

  let gm = 0;
  while (gm < 13 && gd > daysInMonth[gm]) {
    gd -= daysInMonth[gm];
    gm++;
  }

  return { gy: gy2, gm, gd };
}

export function getJalaliDetailsFromGregorian(date: Date): JalaliDetails {
  const gy = date.getFullYear();
  const gm = date.getMonth() + 1;
  const gd = date.getDate();

  const { jy, jm, jd } = gregorianToJalali(gy, gm, gd);
  const dayOfWeekIndex = date.getDay(); // 0 is Sunday

  const yearStr = String(jy);
  const monthStr = String(jm).padStart(2, '0');
  const dayStr = String(jd).padStart(2, '0');
  const formatted = `${yearStr}/${monthStr}/${dayStr}`;

  return {
    jy,
    jm,
    jd,
    yearStr,
    monthStr,
    dayStr,
    formatted,
    monthNameFa: JALALI_MONTH_NAMES_FA[jm - 1] ?? '',
    monthNameEn: JALALI_MONTH_NAMES_EN[jm - 1] ?? '',
    weekdayFa: WEEKDAYS_FA[dayOfWeekIndex] ?? '',
    weekdayEn: WEEKDAYS_EN[dayOfWeekIndex] ?? '',
    isLeap: isJalaliLeapYear(jy),
    timestampMs: date.getTime(),
    timestampSec: Math.floor(date.getTime() / 1000)
  };
}

export function parseJalaliString(str: string): JalaliDate | null {
  const cleaned = str.trim().replace(/[\/\-\.]/g, '/');
  const parts = cleaned.split('/');
  if (parts.length !== 3) {
    return null;
  }

  const jy = parseInt(parts[0], 10);
  const jm = parseInt(parts[1], 10);
  const jd = parseInt(parts[2], 10);

  if (isNaN(jy) || isNaN(jm) || isNaN(jd)) {
    return null;
  }
  if (jm < 1 || jm > 12) {
    return null;
  }
  if (jd < 1 || jd > 31) {
    return null;
  }
  if (jm > 6 && jd > 30) {
    return null;
  }
  if (jm === 12 && jd === 30 && !isJalaliLeapYear(jy)) {
    return null;
  }

  return { jy, jm, jd };
}
