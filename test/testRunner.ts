import assert from 'assert';
import {
  gregorianToJalali,
  jalaliToGregorian,
  getJalaliDetailsFromGregorian,
  isJalaliLeapYear,
  parseJalaliString
} from '../src/utils/jalali';
import {
  toEnglishDigits,
  toPersianDigits,
  normalizeArabicChars,
  normalizeZwnj,
  normalizePersianText
} from '../src/utils/persianSanitizer';
import { parseJwt, formatTimeSpan } from '../src/utils/jwt';
import { generateTsAndZod } from '../src/utils/jsonToTsZod';
import {
  generateUuidV4,
  generateUlid,
  generateSecret,
  isValidIranianNationalCode,
  generateIranianNationalCode,
  generateIranianMobileNumber,
  generateIranianPostalCode,
  generateIranianSheba
} from '../src/utils/cryptoMock';

function runTests() {
  console.log('--- RUNNING KAARBOX UNIT TESTS ---');

  // 1. JALALI TESTS
  console.log('[Test 1] Jalali Mathematical Conversion');
  // 2026-11-02 -> 1405/08/11
  const jDate = gregorianToJalali(2026, 11, 2);
  assert.strictEqual(jDate.jy, 1405);
  assert.strictEqual(jDate.jm, 8);
  assert.strictEqual(jDate.jd, 11);

  // Reverse: 1405/08/11 -> 2026-11-02
  const gDate = jalaliToGregorian(1405, 8, 11);
  assert.strictEqual(gDate.gy, 2026);
  assert.strictEqual(gDate.gm, 11);
  assert.strictEqual(gDate.gd, 2);

  // Now test Norooz (1 Farvardin 1403 = 20 March 2024 - leap year)
  const norooz = gregorianToJalali(2024, 3, 20);
  assert.strictEqual(norooz.jy, 1403);
  assert.strictEqual(norooz.jm, 1);
  assert.strictEqual(norooz.jd, 1);

  // Leap year check
  assert.strictEqual(isJalaliLeapYear(1403), true);
  assert.strictEqual(isJalaliLeapYear(1404), false);

  // Parse Jalali string
  const parsed = parseJalaliString('1405/08/11');
  assert.ok(parsed);
  assert.strictEqual(parsed.jy, 1405);
  assert.strictEqual(parsed.jm, 8);
  assert.strictEqual(parsed.jd, 11);

  // 2. PERSIAN SANITIZER TESTS
  console.log('[Test 2] Persian Sanitizer & Digits');
  const faDigits = toPersianDigits('Call 09123456789 in 2026');
  assert.strictEqual(faDigits, 'Call ۰۹۱۲۳۴۵۶۷۸۹ in ۲۰۲۶');

  const enDigits = toEnglishDigits('شماره ۰۹۱۲۳۴۵۶۷۸۹ و ٠١٢٣٤٥٦٧٨٩');
  assert.strictEqual(enDigits, 'شماره 09123456789 و 0123456789');

  const arabicChars = normalizeArabicChars('ديكور و موسيقى و كيك');
  assert.strictEqual(arabicChars, 'دیکور و موسیقی و کیک');

  const zwnjText = normalizeZwnj('می روم به دانشگاه ها و کتاب های بزرگ تر');
  assert.strictEqual(zwnjText, 'می‌روم به دانشگاه‌ها و کتاب‌های بزرگ‌تر');

  const fullSanitized = normalizePersianText('اين يک تست است با شماره ۱۲۳۴۵ و كتاب ها');
  assert.strictEqual(fullSanitized, 'این یک تست است با شماره 12345 و کتاب‌ها');

  // 3. JWT PARSER TESTS
  console.log('[Test 3] JWT Inspector');
  // Sample JWT: { "alg": "HS256", "typ": "JWT" } . { "sub": "1234567890", "name": "Ali Reza", "iat": 1516239022, "exp": 1516242622 }
  const sampleJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFsaSBSZXphIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyNDI2MjJ9.4z7kR377v4zJ4T0vD9y8q1K8K8K8K8K8K8K8K8K8K8K';
  const decoded = parseJwt(sampleJwt);
  assert.strictEqual(decoded.header.alg, 'HS256');
  assert.strictEqual(decoded.payload.sub, '1234567890');
  assert.strictEqual(decoded.payload.name, 'Ali Reza');
  assert.strictEqual(decoded.isExpired, true);

  const timeSpan = formatTimeSpan(3600, false);
  assert.strictEqual(timeSpan, 'in 1h');
  const timeSpanFa = formatTimeSpan(-7200, true);
  assert.strictEqual(timeSpanFa, '2 ساعت پیش');

  // 4. JSON TO TYPESCRIPT & ZOD TESTS
  console.log('[Test 4] JSON to TypeScript & Zod');
  const jsonSample = JSON.stringify({
    id: 101,
    name: 'Kaarbox Extension',
    isActive: true,
    tags: ['developer', 'tools'],
    metadata: {
      createdAt: '2026-11-02T11:55:33Z',
      downloads: 5000
    }
  });

  const generated = generateTsAndZod(jsonSample, { rootName: 'AppConfig' });
  assert.ok(generated.typescript.includes('interface AppConfig'));
  assert.ok(generated.typescript.includes('interface AppConfigMetadata'));
  assert.ok(generated.typescript.includes('isActive: boolean;'));
  assert.ok(generated.zod.includes('const AppConfigSchema = z.object({'));
  assert.ok(generated.zod.includes('z.string().datetime()'));

  // 5. CRYPTO & MOCK DATA TESTS
  console.log('[Test 5] Crypto, IDs & Iranian Mock Data');
  const uuid = generateUuidV4();
  assert.match(uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

  const ulid = generateUlid();
  assert.strictEqual(ulid.length, 26);

  const sec32 = generateSecret(32, 'hex');
  assert.strictEqual(sec32.length, 64);

  // Generate 100 Iranian National Codes and verify 100% pass modulo 11 validation!
  for (let i = 0; i < 100; i++) {
    const code = generateIranianNationalCode();
    assert.strictEqual(code.length, 10);
    assert.strictEqual(isValidIranianNationalCode(code), true, `Code ${code} failed validation`);
  }

  // Verify invalid national codes fail
  assert.strictEqual(isValidIranianNationalCode('1111111111'), false);
  assert.strictEqual(isValidIranianNationalCode('1234567890'), false);

  const mobile = generateIranianMobileNumber();
  assert.match(mobile, /^09\d{9}$/);

  const postal = generateIranianPostalCode();
  assert.strictEqual(postal.length, 10);
  assert.ok(!postal.startsWith('0') && !postal.startsWith('2'));

  const sheba = generateIranianSheba();
  assert.ok(sheba.startsWith('IR'));
  assert.strictEqual(sheba.length, 26);

  console.log('--- ALL UNIT TESTS PASSED SUCCESSFULLY! ---');
}

runTests();
