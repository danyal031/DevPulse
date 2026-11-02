export interface IranianTestData {
  nationalCode: string;
  mobileNumber: string;
  postalCode: string;
  sheba: string;
}

const CROCKFORD_BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytes;
}

export function generateUuidV4(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  const bytes = getRandomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant RFC 4122

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export function generateUlid(seedTime: number = Date.now()): string {
  let timeStr = '';
  let time = seedTime;
  for (let i = 9; i >= 0; i--) {
    const mod = time % 32;
    timeStr = CROCKFORD_BASE32[mod] + timeStr;
    time = Math.floor(time / 32);
  }

  const randBytes = getRandomBytes(16);
  let randStr = '';
  for (let i = 0; i < 16; i++) {
    const randIndex = randBytes[i] % 32;
    randStr += CROCKFORD_BASE32[randIndex];
  }

  return timeStr + randStr;
}

export function generateSecret(lengthBytes: 32 | 64 = 64, format: 'hex' | 'base64' = 'hex'): string {
  const bytes = getRandomBytes(lengthBytes);
  if (format === 'hex') {
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  } else {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return typeof btoa === 'function'
      ? btoa(binary)
      : Buffer.from(bytes).toString('base64');
  }
}

export function encodeBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof btoa === 'function' ? btoa(binary) : Buffer.from(input).toString('base64');
}

export function decodeBase64(input: string): string {
  let binary: string;
  if (typeof atob === 'function') {
    binary = atob(input.trim());
  } else {
    return Buffer.from(input.trim(), 'base64').toString('utf-8');
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export async function computeHash(text: string, algorithm: 'SHA-256' | 'SHA-512' = 'SHA-256'): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest(algorithm, data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return '';
}

export function isValidIranianNationalCode(code: string): boolean {
  const cleaned = code.trim();
  if (!/^\d{10}$/.test(cleaned)) {
    return false;
  }

  // Reject sequences where all digits are identical (e.g. 1111111111)
  const allEqual = /^(\d)\1{9}$/.test(cleaned);
  if (allEqual) {
    return false;
  }

  const digits = cleaned.split('').map((d) => parseInt(d, 10));
  const checkDigit = digits[9];

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * (10 - i);
  }

  const remainder = sum % 11;
  const expectedCheck = remainder < 2 ? remainder : 11 - remainder;

  return checkDigit === expectedCheck;
}

export function generateIranianNationalCode(): string {
  const invalidIdenticals = new Set([
    '000000000',
    '111111111',
    '222222222',
    '333333333',
    '444444444',
    '555555555',
    '666666666',
    '777777777',
    '888888888',
    '999999999'
  ]);

  let first9 = '';
  while (true) {
    const rand = Math.floor(100000000 + Math.random() * 900000000).toString();
    if (!invalidIdenticals.has(rand)) {
      first9 = rand;
      break;
    }
  }

  const digits = first9.split('').map((d) => parseInt(d, 10));
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * (10 - i);
  }

  const remainder = sum % 11;
  const checkDigit = remainder < 2 ? remainder : 11 - remainder;

  return `${first9}${checkDigit}`;
}

export function generateIranianMobileNumber(): string {
  const prefixes = [
    '0912', '0910', '0919', '0990', '0991', '0992', // MCI
    '0935', '0936', '0937', '0938', '0939', '0930', '0933', '0901', '0902', '0903', '0905', // Irancell
    '0920', '0921', '0922', // Rightel
    '0999', '0998' // Shatel / Samantel
  ];

  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(1000000 + Math.random() * 9000000).toString();

  return `${prefix}${suffix}`;
}

export function generateIranianPostalCode(): string {
  // Iran postal codes: 10 digits.
  // 1st digit: 1, 3, 4, 5, 6, 7, 8, 9 (0 and 2 are unused)
  const validStartDigits = ['1', '3', '4', '5', '6', '7', '8', '9'];
  const firstDigit = validStartDigits[Math.floor(Math.random() * validStartDigits.length)];

  let rest = '';
  for (let i = 0; i < 9; i++) {
    rest += Math.floor(Math.random() * 10).toString();
  }

  return `${firstDigit}${rest}`;
}

export function generateIranianSheba(): string {
  // IBAN IR: 26 characters (IR + 2 check digits + 22 account numbers)
  // Bank codes: 012 (Mellat), 017 (Melli), 056 (Saman), 054 (Parsian), 018 (Tejarat), etc.
  const bankCodes = ['012', '017', '018', '054', '056', '062'];
  const bank = bankCodes[Math.floor(Math.random() * bankCodes.length)];

  let bban = `${bank}0`;
  for (let i = 0; i < 18; i++) {
    bban += Math.floor(Math.random() * 10).toString();
  }

  // Modulo 97-10 calculation for IBAN
  // IR translates to 1827 (I=18, R=27), followed by '00' for check digits
  const rearranged = `${bban}182700`;

  let remainder = 0;
  for (let i = 0; i < rearranged.length; i++) {
    remainder = (remainder * 10 + parseInt(rearranged[i], 10)) % 97;
  }

  const check = (98 - remainder).toString().padStart(2, '0');
  return `IR${check}${bban}`;
}

export function generateIranianMockDataSet(): IranianTestData {
  return {
    nationalCode: generateIranianNationalCode(),
    mobileNumber: generateIranianMobileNumber(),
    postalCode: generateIranianPostalCode(),
    sheba: generateIranianSheba()
  };
}
