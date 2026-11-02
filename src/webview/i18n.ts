export type Language = "en" | "fa";

export const translations = {
  en: {
    appName: "DevShelf",
    appSubtitle: "Developer Swiss Army Knife",
    langToggle: "فارسی",

    // Tabs
    tabJson: "JSON / Zod",
    tabJwt: "JWT",
    tabPersian: "Jalali / Text",
    tabPorts: "Ports",
    tabCrypto: "Crypto / Mock",

    // Common Actions
    copy: "Copy",
    copied: "Copied!",
    insertAtCursor: "Insert in Editor",
    clear: "Clear",
    generate: "Generate",
    convert: "Convert",
    refresh: "Refresh",
    kill: "Kill",
    search: "Search...",
    error: "Error",
    options: "Options",

    // JSON -> TS & Zod
    jsonInputPlaceholder: "Paste raw JSON here...",
    jsonRootNameLabel: "Root Type Name:",
    jsonOutputTs: "TypeScript Interfaces",
    jsonOutputZod: "Zod Validation Schema",
    copyTs: "Copy TS",
    copyZod: "Copy Zod",
    copyBoth: "Copy Both",
    insertTs: "Insert TS",
    insertZod: "Insert Zod",
    invalidJson: "Please provide valid JSON format.",

    // JWT Inspector
    jwtInputPlaceholder:
      "Paste encoded JWT token (header.payload.signature)...",
    jwtStatusValid: "Active Token",
    jwtStatusExpired: "Expired Token",
    jwtStatusNotYetValid: "Not Valid Yet",
    jwtStatusNoExpiry: "No Expiration Claim",
    jwtHeader: "Header (Algorithm & Token Type)",
    jwtPayload: "Payload (Claims)",
    jwtIssuedAt: "Issued At (iat):",
    jwtExpiresAt: "Expires At (exp):",
    jwtNotBefore: "Not Before (nbf):",
    invalidJwt: "Invalid JWT structure. Must have 3 dot-separated segments.",

    // Jalali / Persian
    dateConverterTitle: "Date & Timestamp Converter",
    textSanitizerTitle: "Persian Text & Digit Sanitizer",
    nowButton: "Current Time",
    gregorianDateLabel: "Gregorian (YYYY-MM-DD)",
    jalaliDateLabel: "Jalali / Solar Hijri (YYYY/MM/DD)",
    timestampSecLabel: "Unix Timestamp (Seconds)",
    timestampMsLabel: "Unix Timestamp (Milliseconds)",
    weekdayLabel: "Day of Week:",
    monthNameLabel: "Month:",
    leapYearBadge: "Leap Year",
    commonYearBadge: "Common Year",
    inputTextPlaceholder:
      "Paste text containing Arabic chars, Persian digits or improper spaces...",
    sanitizeButton: "Normalize & Clean Text",
    toPersianDigits: "Digits to Persian (۱۲۳)",
    toEnglishDigits: "Digits to English (123)",
    normalizeArabic: "Arabic to Persian (ي/ك -> ی/ک)",
    normalizeZwnj: "Fix Half-Spaces (نیم‌فاصله)",
    cleanHarakat: "Remove Harakat/Vowels",

    // Ports
    portsTitle: "Local Port Manager",
    portsDescription: "Active listening TCP ports on this machine.",
    noPortsFound: "No listening ports found.",
    portHeader: "Port",
    pidHeader: "PID",
    processHeader: "Process",
    actionHeader: "Action",
    killConfirm: "Are you sure you want to terminate PID {pid} ({name})?",
    killedSuccess: "Process {pid} terminated.",
    killedError: "Failed to terminate process: {error}",
    scanning: "Scanning ports...",

    // Crypto & Mock
    cryptoTitle: "ID, Secret & Mock Data Generator",
    uuidLabel: "UUID v4",
    ulidLabel: "ULID",
    secret32Label: "32-Byte Secret (Hex)",
    secret64Label: "64-Byte Secret (Hex)",
    secretBase64Label: "64-Byte Secret (Base64)",
    hasherTitle: "Text Hasher",
    hasherInputPlaceholder: "Enter text to calculate SHA-256...",
    iranMockTitle: "Iranian Test Data Generator",
    nationalCodeLabel: "National Code (کد ملی معتبر)",
    mobileNumberLabel: "Mobile Number (شماره موبایل)",
    postalCodeLabel: "Postal Code (کد پستی)",
    shebaLabel: "Sheba / IBAN (شماره شبا)",
    regenerateMock: "Generate New Test Data",
  },
  fa: {
    appName: "دِوشلف (DevShelf)",
    appSubtitle: "جعبه‌ابزار همه‌کاره توسعه‌دهنده",
    langToggle: "English",

    // Tabs
    tabJson: "JSON / زاد",
    tabJwt: "توکن JWT",
    tabPersian: "جلالی / متن",
    tabPorts: "پورت‌ها",
    tabCrypto: "رمزنگاری / داده تستی",

    // Common Actions
    copy: "کپی",
    copied: "کپی شد!",
    insertAtCursor: "درج در ادیتور",
    clear: "پاک کردن",
    generate: "تولید",
    convert: "تبدیل",
    refresh: "بروزرسانی",
    kill: "بستن پروسس",
    search: "جستجو...",
    error: "خطا",
    options: "تنظیمات",

    // JSON -> TS & Zod
    jsonInputPlaceholder: "کد JSON خام را اینجا وارد کنید...",
    jsonRootNameLabel: "نام تایپ ریشه:",
    jsonOutputTs: "تایپ‌های TypeScript",
    jsonOutputZod: "اسکیمای اعتبارسنجی Zod",
    copyTs: "کپی TS",
    copyZod: "کپی Zod",
    copyBoth: "کپی هر دو",
    insertTs: "درج TS در ادیتور",
    insertZod: "درج Zod در ادیتور",
    invalidJson: "فرمت JSON نامعتبر است.",

    // JWT Inspector
    jwtInputPlaceholder: "توکن JWT را اینجا جای‌گذاری کنید...",
    jwtStatusValid: "توکن معتبر و فعال",
    jwtStatusExpired: "توکن منقضی شده",
    jwtStatusNotYetValid: "هنوز فعال نشده است",
    jwtStatusNoExpiry: "بدون زمان انقضا",
    jwtHeader: "هدر (الگوریتم و نوع توکن)",
    jwtPayload: "پیلود (ادعاها و داده‌ها)",
    jwtIssuedAt: "زمان صدور (iat):",
    jwtExpiresAt: "زمان انقضا (exp):",
    jwtNotBefore: "آغاز اعتبار (nbf):",
    invalidJwt: "فرمت توکن JWT نادرست است. باید دارای ۳ بخش باشد.",

    // Jalali / Persian
    dateConverterTitle: "مبدل تاریخ و تایم‌استمپ",
    textSanitizerTitle: "پالایشگر متن و ارقام فارسی",
    nowButton: "زمان فعلی",
    gregorianDateLabel: "میلادی (YYYY-MM-DD)",
    jalaliDateLabel: "شمسی / جلالی (YYYY/MM/DD)",
    timestampSecLabel: "تایم‌استمپ یونیکس (ثانیه)",
    timestampMsLabel: "تایم‌استمپ یونیکس (میلی‌ثانیه)",
    weekdayLabel: "روز هفته:",
    monthNameLabel: "ماه:",
    leapYearBadge: "سال کبیسه",
    commonYearBadge: "سال عادی",
    inputTextPlaceholder:
      "متن با حروف عربی، ارقام یا فواصل غیراستاندارد را اینجا وارد کنید...",
    sanitizeButton: "استانداردسازی و پاکسازی متن",
    toPersianDigits: "تبدیل ارقام به فارسی (۱۲۳)",
    toEnglishDigits: "تبدیل ارقام به انگلیسی (123)",
    normalizeArabic: "اصلاح حروف عربی (ي/ك -> ی/ک)",
    normalizeZwnj: "اصلاح نیم‌فاصله‌ها",
    cleanHarakat: "حذف اعراب و حرکات",

    // Ports
    portsTitle: "مدیریت پورت‌های محلی",
    portsDescription: "پورت‌های TCP در حال شنود روی سیستم محلی.",
    noPortsFound: "هیچ پورت بازی یافت نشد.",
    portHeader: "پورت",
    pidHeader: "شناسه (PID)",
    processHeader: "پروسس",
    actionHeader: "عملیات",
    killConfirm: "آیا از بستن پروسس {pid} ({name}) مطمئن هستید؟",
    killedSuccess: "پروسس {pid} با موفقیت خاتمه یافت.",
    killedError: "خطا در بستن پروسس: {error}",
    scanning: "در حال بررسی پورت‌ها...",

    // Crypto & Mock
    cryptoTitle: "تولید شناسه، کلید و داده‌های تستی",
    uuidLabel: "شناسه UUID v4",
    ulidLabel: "شناسه ترتیبی ULID",
    secret32Label: "کلید ۳۲ بایتی امن (Hex)",
    secret64Label: "کلید ۶۴ بایتی امن (Hex)",
    secretBase64Label: "کلید ۶۴ بایتی (Base64)",
    hasherTitle: "محاسبه هش",
    hasherInputPlaceholder: "متن مورد نظر برای تولید SHA-256 را وارد کنید...",
    iranMockTitle: "تولید داده‌های تستی ایرانی",
    nationalCodeLabel: "کد ملی معتبر (با الگوریتم دهگان)",
    mobileNumberLabel: "شماره تلفن همراه",
    postalCodeLabel: "کد پستی ۱۰ رقمی",
    shebaLabel: "شماره شبا معتبر (IR...)",
    regenerateMock: "تولید مجدد داده‌ها",
  },
} as const;

export function t(
  key: keyof (typeof translations)["en"],
  lang: Language,
): string {
  return translations[lang][key] || translations["en"][key] || key;
}
