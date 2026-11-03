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
import { formatJson, minifyJson, repairCommonJson, validateJson } from '../src/utils/jsonFormatter';
import { getSystemNetworkInfo } from '../src/utils/networkInfo';
import { generateConventionalCommit, analyzeDiffHunks } from '../src/utils/gitCommit';
import { GIT_SCENARIOS, GIT_CHEAT_SHEET } from '../src/utils/gitScenarios';
import { parseDockerContainersOutput, isSafeContainerIdentifier } from '../src/utils/dockerManager';
import { normalizeUrl, formatPayloadSize, executeApiRequest } from '../src/utils/apiTester';
import {
  generateCreateTableDdl,
  generateSampleQuery,
  SqlTableSchema
} from '../src/utils/sqlBuilder';
import {
  parseLogText,
  filterLogEntries,
  exportCleanErrorSummary
} from '../src/utils/logAnalyzer';
import { translations } from '../src/webview/i18n';
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

async function runTests() {
  console.log('--- RUNNING DEVSHELF UNIT TESTS ---');

  // 1. JALALI TESTS
  console.log('[Test 1] Jalali Mathematical Conversion');
  const jDate = gregorianToJalali(2026, 11, 2);
  assert.strictEqual(jDate.jy, 1405);
  assert.strictEqual(jDate.jm, 8);
  assert.strictEqual(jDate.jd, 11);

  const gDate = jalaliToGregorian(1405, 8, 11);
  assert.strictEqual(gDate.gy, 2026);
  assert.strictEqual(gDate.gm, 11);
  assert.strictEqual(gDate.gd, 2);

  const norooz = gregorianToJalali(2024, 3, 20);
  assert.strictEqual(norooz.jy, 1403);
  assert.strictEqual(norooz.jm, 1);
  assert.strictEqual(norooz.jd, 1);

  assert.strictEqual(isJalaliLeapYear(1403), true);
  assert.strictEqual(isJalaliLeapYear(1404), false);

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
    name: 'DevShelf Extension',
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

  for (let i = 0; i < 100; i++) {
    const code = generateIranianNationalCode();
    assert.strictEqual(code.length, 10);
    assert.strictEqual(isValidIranianNationalCode(code), true, `Code ${code} failed validation`);
  }

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

  // 6. JSON FORMATTER, MINIFIER & VALIDATOR TESTS
  console.log('[Test 6] JSON Formatter, Minifier & Validator');
  const unformatted = '{"b":2,"a":1}';
  const fmt2 = formatJson(unformatted, 2);
  assert.strictEqual(fmt2.isValid, true);
  assert.ok(fmt2.output.includes('  "b": 2'));

  const sorted = formatJson(unformatted, 2, true);
  assert.ok(sorted.output.indexOf('"a"') < sorted.output.indexOf('"b"'));

  const min = minifyJson('{\n  "name": "DevShelf"\n}');
  assert.strictEqual(min.output, '{"name":"DevShelf"}');

  const invalidVal = validateJson('{ bad: json }');
  assert.strictEqual(invalidVal.isValid, false);
  assert.ok(invalidVal.error);

  const repaired = repairCommonJson("{ name: 'DevShelf', count: 10, }");
  const parsedRepaired = JSON.parse(repaired);
  assert.strictEqual(parsedRepaired.name, 'DevShelf');
  assert.strictEqual(parsedRepaired.count, 10);

  // 7. SYSTEM NETWORK INFO TESTS
  console.log('[Test 7] System Network Info');
  const netInfo = getSystemNetworkInfo();
  assert.ok(netInfo.hostname);
  assert.ok(netInfo.primaryIpv4);
  assert.match(netInfo.primaryIpv4, /^\d+\.\d+\.\d+\.\d+$/);

  // 8. GIT CONVENTIONAL COMMIT GENERATOR TESTS
  console.log('[Test 8] Git Conventional Commit Generator');
  const sampleChanges = [
    { status: 'M' as const, filePath: 'src/utils/portManager.ts' },
    { status: 'A' as const, filePath: 'src/utils/networkInfo.ts' }
  ];
  const commit = generateConventionalCommit(sampleChanges);
  assert.strictEqual(commit.type, 'feat');
  assert.strictEqual(commit.scope, 'network');
  assert.ok(commit.fullMessage.startsWith('feat(network):'));
  assert.ok(commit.fullMessage.includes('- update src/utils/portManager.ts'));
  assert.ok(commit.fullMessage.includes('- add src/utils/networkInfo.ts'));

  // Test detailed semantic diff analysis
  const mockDiff = `diff --git a/src/utils/portManager.ts b/src/utils/portManager.ts
index 1234567..89abcdef 100644
--- a/src/utils/portManager.ts
+++ b/src/utils/portManager.ts
@@ -10,6 +10,12 @@
+export function killProcessTree(pid: number) {
+  return pid;
+}
`;
  const diffSummaries = analyzeDiffHunks(mockDiff);
  assert.ok(diffSummaries.has('src/utils/portManager.ts'));
  assert.ok(diffSummaries.get('src/utils/portManager.ts')![0].includes('killProcessTree'));

  const detailedCommit = generateConventionalCommit(sampleChanges, mockDiff);
  assert.ok(detailedCommit.fullMessage.includes('src/utils/portManager.ts: implement killProcessTree'));

  // 9. GIT COMMAND WIZARD & CHEAT SHEET TESTS
  console.log('[Test 9] Git Command Wizard & Rescue Cheat Sheet');
  assert.ok(GIT_SCENARIOS.length >= 10, 'Expected at least 10 git scenarios');
  assert.ok(GIT_CHEAT_SHEET.length >= 10, 'Expected at least 10 cheat sheet items');

  // Verify scenario generator outputs
  const amendScen = GIT_SCENARIOS.find((s) => s.id === 'amend_commit');
  assert.ok(amendScen);
  assert.strictEqual(
    amendScen.generate({ mode: 'no-edit', includeAll: true }),
    'git add -A && git commit --amend --no-edit'
  );
  assert.strictEqual(
    amendScen.generate({ mode: 'new-msg', newMessage: 'fix: edge case', includeAll: false }),
    'git commit --amend -m "fix: edge case"'
  );

  const undoScen = GIT_SCENARIOS.find((s) => s.id === 'undo_commits');
  assert.ok(undoScen);
  assert.strictEqual(
    undoScen.generate({ resetType: 'soft', count: 2 }),
    'git reset --soft HEAD~2'
  );
  assert.strictEqual(
    undoScen.generate({ resetType: 'hard', count: 1 }),
    'git reset --hard HEAD~1'
  );

  const stashScen = GIT_SCENARIOS.find((s) => s.id === 'stash_save');
  assert.ok(stashScen);
  assert.strictEqual(
    stashScen.generate({ action: 'push', includeUntracked: true, message: 'WIP task' }),
    'git stash push -u -m "WIP task"'
  );

  const squashScen = GIT_SCENARIOS.find((s) => s.id === 'squash_commits');
  assert.ok(squashScen);
  assert.strictEqual(
    squashScen.generate({ count: 4, newMessage: 'refactor: cleanup' }),
    'git reset --soft HEAD~4 && git commit -m "refactor: cleanup"'
  );

  const reflogScen = GIT_SCENARIOS.find((s) => s.id === 'reflog_recover');
  assert.ok(reflogScen);
  assert.strictEqual(
    reflogScen.generate({ step: 'recover', commitHash: 'd7a12b9', recoveredBranch: 'feature-login' }),
    'git branch feature-login d7a12b9 && git checkout feature-login'
  );

  // Verify complete i18n dictionary coverage for scenarios
  for (const scen of GIT_SCENARIOS) {
    assert.ok(scen.id, 'Scenario must have id');
    assert.ok((translations.en as any)[scen.titleKey], `Missing EN titleKey: ${scen.titleKey}`);
    assert.ok((translations.fa as any)[scen.titleKey], `Missing FA titleKey: ${scen.titleKey}`);
    assert.ok((translations.en as any)[scen.descKey], `Missing EN descKey: ${scen.descKey}`);
    assert.ok((translations.fa as any)[scen.descKey], `Missing FA descKey: ${scen.descKey}`);

    for (const input of scen.inputs) {
      assert.ok((translations.en as any)[input.labelKey], `Missing EN labelKey: ${input.labelKey}`);
      assert.ok((translations.fa as any)[input.labelKey], `Missing FA labelKey: ${input.labelKey}`);
      if (input.placeholderKey) {
        assert.ok((translations.en as any)[input.placeholderKey], `Missing EN placeholderKey: ${input.placeholderKey}`);
        assert.ok((translations.fa as any)[input.placeholderKey], `Missing FA placeholderKey: ${input.placeholderKey}`);
      }
      if (input.options) {
        for (const opt of input.options) {
          assert.ok((translations.en as any)[opt.labelKey], `Missing EN option labelKey: ${opt.labelKey}`);
          assert.ok((translations.fa as any)[opt.labelKey], `Missing FA option labelKey: ${opt.labelKey}`);
        }
      }
    }
  }

  // Verify complete i18n dictionary coverage for cheat sheet
  for (const cs of GIT_CHEAT_SHEET) {
    assert.ok(cs.command, 'Cheat sheet must have a command');
    assert.ok((translations.en as any)[cs.titleKey], `Missing EN titleKey: ${cs.titleKey}`);
    assert.ok((translations.fa as any)[cs.titleKey], `Missing FA titleKey: ${cs.titleKey}`);
    assert.ok((translations.en as any)[cs.descKey], `Missing EN descKey: ${cs.descKey}`);
    assert.ok((translations.fa as any)[cs.descKey], `Missing FA descKey: ${cs.descKey}`);
  }

  // 10. DOCKER QUICK DECK TESTS
  console.log('[Test 10] Docker Quick Deck Manager');
  // JSON lines output parsing
  const mockJsonLines = `{"ID":"a1b2c3d4e5f6","Names":"postgres-db","Image":"postgres:15-alpine","State":"running","Status":"Up 3 hours","Ports":"0.0.0.0:5432->5432/tcp"}
{"ID":"9876543210ab","Names":"/redis-cache","Image":"redis:7","State":"exited","Status":"Exited (0) 10 minutes ago","Ports":""}`;
  
  const parsedContainers = parseDockerContainersOutput(mockJsonLines);
  assert.strictEqual(parsedContainers.length, 2);
  assert.strictEqual(parsedContainers[0].id, 'a1b2c3d4e5f6');
  assert.strictEqual(parsedContainers[0].name, 'postgres-db');
  assert.strictEqual(parsedContainers[0].image, 'postgres:15-alpine');
  assert.strictEqual(parsedContainers[0].state, 'running');
  assert.strictEqual(parsedContainers[0].ports, '0.0.0.0:5432->5432/tcp');

  assert.strictEqual(parsedContainers[1].id, '9876543210ab');
  assert.strictEqual(parsedContainers[1].name, 'redis-cache'); // leading slash removed
  assert.strictEqual(parsedContainers[1].state, 'exited');

  // JSON Array parsing
  const mockArray = JSON.stringify([
    { ID: 'c1d2e3f4', Names: 'web-nginx', Image: 'nginx:alpine', State: 'running', Status: 'Up 1 hour' }
  ]);
  const parsedFromArray = parseDockerContainersOutput(mockArray);
  assert.strictEqual(parsedFromArray.length, 1);
  assert.strictEqual(parsedFromArray[0].name, 'web-nginx');

  // Fallback table format parsing
  const mockTable = `CONTAINER ID   IMAGE          COMMAND                  CREATED         STATUS         PORTS                  NAMES
f1e2d3c4b5a6   node:20        "docker-entrypoint.s…"   2 hours ago     Up 2 hours     0.0.0.0:3000->3000/tcp  app-backend`;
  const parsedTable = parseDockerContainersOutput(mockTable);
  assert.strictEqual(parsedTable.length, 1);
  assert.strictEqual(parsedTable[0].name, 'app-backend');
  assert.strictEqual(parsedTable[0].state, 'running');

  // Empty input handling
  assert.strictEqual(parseDockerContainersOutput('').length, 0);

  // Security: Identifier validation
  assert.strictEqual(isSafeContainerIdentifier('postgres-db'), true);
  assert.strictEqual(isSafeContainerIdentifier('a1b2c3d4e5f6'), true);
  assert.strictEqual(isSafeContainerIdentifier('web_app.service-1'), true);
  assert.strictEqual(isSafeContainerIdentifier('web; rm -rf /'), false);
  assert.strictEqual(isSafeContainerIdentifier('web && ls'), false);
  assert.strictEqual(isSafeContainerIdentifier('`whoami`'), false);

  // 11. MINI API TESTER (cURL LITE) TESTS
  console.log('[Test 11] Mini API Tester (cURL Lite)');
  // URL normalization
  assert.strictEqual(normalizeUrl('localhost:4000/api'), 'http://localhost:4000/api');
  assert.strictEqual(normalizeUrl('127.0.0.1:8080/test'), 'http://127.0.0.1:8080/test');
  assert.strictEqual(normalizeUrl('api.example.com/v1'), 'https://api.example.com/v1');
  assert.strictEqual(normalizeUrl('https://myapi.com/users'), 'https://myapi.com/users');
  assert.strictEqual(normalizeUrl('http://myapi.com/users'), 'http://myapi.com/users');
  assert.strictEqual(normalizeUrl(''), '');

  // Payload size formatting
  assert.strictEqual(formatPayloadSize(0), '0 B');
  assert.strictEqual(formatPayloadSize(512), '512 B');
  assert.strictEqual(formatPayloadSize(2048), '2.0 KB');
  assert.strictEqual(formatPayloadSize(1024 * 1024 * 2.5), '2.50 MB');

  // executeApiRequest validation on empty URL
  const emptyRes = await executeApiRequest({ method: 'GET', url: '', headers: [] });
  assert.strictEqual(emptyRes.status, 0);
  assert.strictEqual(emptyRes.error, 'Please enter a valid URL.');

  // Verify i18n keys exist for docker and api
  const dockerKeys = [
    'dockerTitle', 'dockerSubtitle', 'dockerNotInstalled', 'dockerDaemonNotRunning',
    'dockerNoContainers', 'dockerFilterPlaceholder', 'dockerStart', 'dockerStop',
    'dockerRestart', 'dockerLogs', 'dockerLogsTitle', 'dockerCloseLogs', 'dockerRefreshing',
    'dockerImage', 'dockerPorts', 'dockerStatus', 'dockerAll', 'dockerRunning', 'dockerStopped',
    'dockerActivePorts', 'dockerQuickSamples', 'dockerRunInTerminal', 'dockerDaemonOfflineTips',
    'dockerRetry', 'dockerCopiedId', 'dockerTotal'
  ];
  for (const k of dockerKeys) {
    assert.ok((translations.en as any)[k], `Missing EN key: ${k}`);
    assert.ok((translations.fa as any)[k], `Missing FA key: ${k}`);
  }

  const apiKeys = [
    'apiTitle', 'apiSubtitle', 'apiMethod', 'apiUrlPlaceholder', 'apiSend', 'apiSending',
    'apiTabHeaders', 'apiTabBody', 'apiAddHeader', 'apiHeaderKey', 'apiHeaderValue',
    'apiBodyPlaceholder', 'apiFormatJson', 'apiResponseStatus', 'apiResponseTime',
    'apiResponseSize', 'apiTabRespBody', 'apiTabRespHeaders', 'apiNoResponseYet',
    'apiCopyResponse', 'apiQuickPresets', 'apiPresetGetSample', 'apiPresetPostSample',
    'apiPresetLocalhost', 'apiAuthTab', 'apiBearerToken', 'apiTokenPlaceholder',
    'apiQuickHeaders', 'apiFastLatency', 'apiNormalLatency', 'apiSlowLatency',
    'apiWelcomeTitle', 'apiWelcomeTip1', 'apiWelcomeTip2', 'apiWelcomeTip3'
  ];
  for (const k of apiKeys) {
    assert.ok((translations.en as any)[k], `Missing EN key: ${k}`);
    assert.ok((translations.fa as any)[k], `Missing FA key: ${k}`);
  }

  // 12. SQL QUERY & SCHEMA BUILDER TESTS
  console.log('[Test 12] SQL Query & Schema Builder');
  const sampleSchema: SqlTableSchema = {
    tableName: 'users',
    dialect: 'postgres',
    columns: [
      {
        id: '1',
        name: 'id',
        type: 'BIGINT',
        isPrimaryKey: true,
        isAutoIncrement: true,
        isNotNull: true,
        isUnique: true
      },
      {
        id: '2',
        name: 'email',
        type: 'VARCHAR',
        lengthOrPrecision: '255',
        isPrimaryKey: false,
        isAutoIncrement: false,
        isNotNull: true,
        isUnique: true
      },
      {
        id: '3',
        name: 'role_id',
        type: 'INT',
        isPrimaryKey: false,
        isAutoIncrement: false,
        isNotNull: false,
        isUnique: false,
        foreignKey: {
          targetTable: 'roles',
          targetColumn: 'id'
        }
      },
      {
        id: '4',
        name: 'created_at',
        type: 'TIMESTAMP',
        isPrimaryKey: false,
        isAutoIncrement: false,
        isNotNull: true,
        isUnique: false,
        defaultValue: 'CURRENT_TIMESTAMP'
      }
    ]
  };

  // Postgres DDL
  const pgDdl = generateCreateTableDdl(sampleSchema);
  assert.ok(pgDdl.includes('CREATE TABLE "users"'));
  assert.ok(pgDdl.includes('"id" BIGSERIAL'));
  assert.ok(pgDdl.includes('PRIMARY KEY ("id")'));
  assert.ok(pgDdl.includes('"email" VARCHAR(255) NOT NULL UNIQUE'));
  assert.ok(pgDdl.includes('REFERENCES "roles" ("id")'));
  assert.ok(pgDdl.includes('DEFAULT CURRENT_TIMESTAMP'));

  // MySQL DDL
  const mysqlSchema: SqlTableSchema = { ...sampleSchema, dialect: 'mysql' };
  const mysqlDdl = generateCreateTableDdl(mysqlSchema);
  assert.ok(mysqlDdl.includes('CREATE TABLE `users`'));
  assert.ok(mysqlDdl.includes('`id` BIGINT AUTO_INCREMENT PRIMARY KEY'));
  assert.ok(mysqlDdl.includes('`email` VARCHAR(255) NOT NULL UNIQUE'));
  assert.ok(mysqlDdl.includes('REFERENCES `roles` (`id`)'));

  // SQLite DDL
  const sqliteSchema: SqlTableSchema = { ...sampleSchema, dialect: 'sqlite' };
  const sqliteDdl = generateCreateTableDdl(sqliteSchema);
  assert.ok(sqliteDdl.includes('CREATE TABLE users'));
  assert.ok(sqliteDdl.includes('id INTEGER PRIMARY KEY AUTOINCREMENT'));
  assert.ok(sqliteDdl.includes('REFERENCES roles (id)'));

  // Sample Queries
  const selectQuery = generateSampleQuery(sampleSchema, 'select_all');
  assert.ok(selectQuery.includes('SELECT *'));
  assert.ok(selectQuery.includes('FROM "users"'));
  assert.ok(selectQuery.includes('ORDER BY "id" DESC;'));

  const pageQuery = generateSampleQuery(sampleSchema, 'pagination');
  assert.ok(pageQuery.includes('LIMIT 20 OFFSET 0;'));

  const insertQuery = generateSampleQuery(sampleSchema, 'insert');
  assert.ok(insertQuery.includes('INSERT INTO "users"'));
  assert.ok(insertQuery.includes('"email"'));

  const updateQuery = generateSampleQuery(sampleSchema, 'update');
  assert.ok(updateQuery.includes('UPDATE "users"'));
  assert.ok(updateQuery.includes('WHERE "id" = 1;'));

  const searchQuery = generateSampleQuery(sampleSchema, 'search');
  assert.ok(searchQuery.includes('WHERE "email" ILIKE \'%keyword%\''));

  const joinQuery = generateSampleQuery(sampleSchema, 'join');
  assert.ok(joinQuery.includes('INNER JOIN "roles" f ON t."role_id" = f."id"'));

  // 13. LOG FILE ANALYZER & HIGHLIGHTER TESTS
  console.log('[Test 13] Log File Analyzer & Highlighter');
  const rawLogSample = `[2026-11-03T10:00:01.000Z] [INFO] Server started on port 3000
2026-11-03 10:00:02 [WARN] High memory usage detected: 85%
{"timestamp":"2026-11-03T10:00:05.123Z","level":"error","message":"Database connection timeout after 5000ms","service":"auth-service"}
2026-11-03T10:00:06.000Z [ERROR] Failed to query users table
    at Query.run (/app/node_modules/pg/lib/query.js:12:5)
    at Database.execute (/app/src/db.ts:45:18)
    at async AuthController.login (/app/src/controllers/auth.ts:22:9)
[DEBUG] Connection pool metrics: active=4, idle=1`;

  const { entries: parsedLogs, stats: logStats } = parseLogText(rawLogSample);
  assert.strictEqual(parsedLogs.length, 5); // 5 logical entries, stack trace grouped into entry #4
  assert.strictEqual(logStats.counts.error, 2);
  assert.strictEqual(logStats.counts.warn, 1);
  assert.strictEqual(logStats.counts.info, 1);
  assert.strictEqual(logStats.counts.debug, 1);

  // Check Entry 1: INFO
  assert.strictEqual(parsedLogs[0].level, 'info');
  assert.strictEqual(parsedLogs[0].timestamp, '2026-11-03T10:00:01.000Z');
  assert.ok(parsedLogs[0].message.includes('Server started on port 3000'));

  // Check Entry 2: WARN
  assert.strictEqual(parsedLogs[1].level, 'warn');
  assert.ok(parsedLogs[1].message.includes('High memory usage detected'));

  // Check Entry 3: JSON ERROR
  assert.strictEqual(parsedLogs[2].level, 'error');
  assert.strictEqual(parsedLogs[2].isJson, true);
  assert.strictEqual(parsedLogs[2].message, 'Database connection timeout after 5000ms');

  // Check Entry 4: Multiline ERROR with Stack Trace
  assert.strictEqual(parsedLogs[3].level, 'error');
  assert.ok(parsedLogs[3].stackTrace);
  assert.strictEqual(parsedLogs[3].stackTrace!.length, 3);
  assert.ok(parsedLogs[3].stackTrace![0].includes('at Query.run'));

  // Check Entry 5: DEBUG
  assert.strictEqual(parsedLogs[4].level, 'debug');

  // Filtering by Level
  const errorsOnly = filterLogEntries(parsedLogs, { levels: ['error'] });
  assert.strictEqual(errorsOnly.length, 2);

  // Filtering by Query
  const dbRelated = filterLogEntries(parsedLogs, { query: 'Database' });
  assert.strictEqual(dbRelated.length, 2);

  // Export Clean Error Summary
  const summaryReport = exportCleanErrorSummary(parsedLogs);
  assert.ok(summaryReport.includes('### Log Error Report (2 total errors'));
  assert.ok(summaryReport.includes('**Occurrences:** 1'));
  assert.ok(summaryReport.includes('at Query.run'));

  // Check i18n keys for SQL and Logs
  const sqlKeys = [
    'sqlTitle', 'sqlSubtitle', 'sqlDialect', 'sqlTableName', 'sqlAddColumn',
    'sqlColName', 'sqlColType', 'sqlColLength', 'sqlPk', 'sqlAutoInc',
    'sqlNotNull', 'sqlUnique', 'sqlDefault', 'sqlFk', 'sqlGeneratedDdl',
    'sqlCopy', 'sqlInsert', 'sqlSampleQueries', 'sqlQuerySelect', 'sqlQueryPagination',
    'sqlQueryInsert', 'sqlQueryUpdate', 'sqlQuerySearch', 'sqlQueryJoin'
  ];
  for (const k of sqlKeys) {
    assert.ok((translations.en as any)[k], `Missing EN SQL key: ${k}`);
    assert.ok((translations.fa as any)[k], `Missing FA SQL key: ${k}`);
  }

  const logKeys = [
    'logsTitle', 'logsSubtitle', 'logsInputPlaceholder', 'logsAnalyzeActiveFile',
    'logsFilterAll', 'logsFilterError', 'logsFilterWarn', 'logsFilterInfo',
    'logsFilterDebug', 'logsSearchPlaceholder', 'logsExportSummary', 'logsSummaryTitle',
    'logsNoLogs', 'logsTotal', 'logsParsed', 'logsCopy', 'logsCloseSummary'
  ];
  for (const k of logKeys) {
    assert.ok((translations.en as any)[k], `Missing EN Log key: ${k}`);
    assert.ok((translations.fa as any)[k], `Missing FA Log key: ${k}`);
  }

  console.log('--- ALL UNIT TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
