export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogEntry {
  id: string;
  lineNumber: number;
  timestamp?: string;
  level: LogLevel;
  message: string;
  stackTrace?: string[];
  raw: string;
  isJson?: boolean;
}

export interface LogAnalysisStats {
  totalLines: number;
  parsedEntries: number;
  counts: {
    error: number;
    warn: number;
    info: number;
    debug: number;
  };
}

/**
 * Parses raw multi-line log output into structured LogEntry array.
 */
export function parseLogText(rawText: string): { entries: LogEntry[]; stats: LogAnalysisStats } {
  if (!rawText || !rawText.trim()) {
    return {
      entries: [],
      stats: {
        totalLines: 0,
        parsedEntries: 0,
        counts: { error: 0, warn: 0, info: 0, debug: 0 }
      }
    };
  }

  const lines = rawText.split(/\r?\n/);
  const entries: LogEntry[] = [];
  const counts = { error: 0, warn: 0, info: 0, debug: 0 };

  let currentEntry: LogEntry | null = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Check if line is a continuation of a stack trace
    const isStackTrace = isStackTraceLine(trimmed);
    if (isStackTrace && currentEntry) {
      if (!currentEntry.stackTrace) currentEntry.stackTrace = [];
      currentEntry.stackTrace.push(rawLine);
      continue;
    }

    // Try parsing as JSON log line
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const jsonEntry = tryParseJsonLog(rawLine, i + 1);
      if (jsonEntry) {
        if (currentEntry) entries.push(currentEntry);
        currentEntry = jsonEntry;
        counts[jsonEntry.level]++;
        continue;
      }
    }

    // Parse standard text log line
    const parsed = parseStandardLogLine(rawLine, i + 1);
    if (currentEntry) {
      entries.push(currentEntry);
    }
    currentEntry = parsed;
    counts[parsed.level]++;
  }

  if (currentEntry) {
    entries.push(currentEntry);
  }

  return {
    entries,
    stats: {
      totalLines: lines.length,
      parsedEntries: entries.length,
      counts
    }
  };
}

/**
 * Checks if line is a stack trace continuation.
 */
function isStackTraceLine(line: string): boolean {
  return (
    line.startsWith('at ') ||
    line.startsWith('Traceback (most recent call last):') ||
    line.startsWith('File "') ||
    line.startsWith('Caused by:') ||
    line.startsWith('Exception in thread') ||
    line.startsWith('System.') ||
    /^\s+at\s+/.test(line) ||
    /^\.\.\.\s+\d+\s+more/.test(line)
  );
}

/**
 * Attempts to parse a line as structured JSON log.
 */
function tryParseJsonLog(line: string, lineNumber: number): LogEntry | null {
  try {
    const obj = JSON.parse(line);
    if (typeof obj !== 'object' || obj === null) return null;

    // Level detection in JSON
    let level: LogLevel = 'info';
    const rawLevel = String(obj.level || obj.severity || obj.logLevel || obj.type || '').toLowerCase();
    if (rawLevel.includes('err') || rawLevel.includes('fatal') || rawLevel.includes('crit') || rawLevel === '50' || rawLevel === '60') {
      level = 'error';
    } else if (rawLevel.includes('warn') || rawLevel === '40') {
      level = 'warn';
    } else if (rawLevel.includes('debug') || rawLevel.includes('trace') || rawLevel === '20' || rawLevel === '10') {
      level = 'debug';
    }

    // Timestamp detection
    const ts = obj.timestamp || obj.time || obj.datetime || obj['@timestamp'];
    const timestamp = typeof ts === 'number' ? new Date(ts).toISOString() : typeof ts === 'string' ? ts : undefined;

    // Message detection
    const msg = obj.message || obj.msg || obj.error || JSON.stringify(obj);

    const stackTrace = obj.stack ? (Array.isArray(obj.stack) ? obj.stack : String(obj.stack).split('\n')) : undefined;

    return {
      id: `log-${lineNumber}`,
      lineNumber,
      timestamp,
      level,
      message: String(msg),
      stackTrace,
      raw: line,
      isJson: true
    };
  } catch {
    return null;
  }
}

/**
 * Parses a standard text log line.
 */
function parseStandardLogLine(line: string, lineNumber: number): LogEntry {
  let level: LogLevel = 'info';
  let message = line;
  let timestamp: string | undefined = undefined;

  // 1. Level Detection
  const upper = line.toUpperCase();
  if (
    /\b(ERROR|FATAL|CRITICAL|SEVERE|FAIL|EXCEPTION)\b/.test(upper) ||
    /\[ERROR\]|\[FATAL\]|\[CRIT\]/.test(upper)
  ) {
    level = 'error';
  } else if (
    /\b(WARN|WARNING)\b/.test(upper) ||
    /\[WARN\]|\[WARNING\]/.test(upper)
  ) {
    level = 'warn';
  } else if (
    /\b(DEBUG|TRACE|VERBOSE)\b/.test(upper) ||
    /\[DEBUG\]|\[TRACE\]/.test(upper)
  ) {
    level = 'debug';
  }

  // 2. Timestamp Extraction
  // ISO format: 2026-11-03T12:00:00 or 2026-11-03 12:00:00
  const isoMatch = line.match(/\b\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?\b/);
  if (isoMatch) {
    timestamp = isoMatch[0];
  } else {
    // Bracketed timestamp: [12:00:00] or [03/Nov/2026:12:00:00 +0000]
    const bracketMatch = line.match(/\[(\d{1,2}[\/:\s\w\-]+)\]/);
    if (bracketMatch) {
      timestamp = bracketMatch[1];
    }
  }

  return {
    id: `log-${lineNumber}`,
    lineNumber,
    timestamp,
    level,
    message,
    raw: line
  };
}

/**
 * Filters log entries by level and search query.
 */
export function filterLogEntries(
  entries: LogEntry[],
  options: {
    levels?: LogLevel[];
    query?: string;
  }
): LogEntry[] {
  const allowedLevels = options.levels && options.levels.length > 0
    ? new Set(options.levels)
    : null;

  const q = options.query ? options.query.toLowerCase().trim() : '';

  return entries.filter((e) => {
    if (allowedLevels && !allowedLevels.has(e.level)) {
      return false;
    }

    if (q) {
      const matchMessage = e.message.toLowerCase().includes(q);
      const matchRaw = e.raw.toLowerCase().includes(q);
      const matchStack = e.stackTrace ? e.stackTrace.some((s) => s.toLowerCase().includes(q)) : false;
      return matchMessage || matchRaw || matchStack;
    }

    return true;
  });
}

/**
 * Exports a clean markdown error summary report of all unique errors.
 */
export function exportCleanErrorSummary(entries: LogEntry[]): string {
  const errorEntries = entries.filter((e) => e.level === 'error');
  if (errorEntries.length === 0) {
    return '### Log Analysis Summary\nNo errors detected in the analyzed log stream.';
  }

  // Group errors by normalized message
  const grouped = new Map<string, { count: number; timestamps: string[]; sampleStack?: string[] }>();

  for (const err of errorEntries) {
    // Normalize message (strip line numbers/timestamps)
    const normMsg = err.message.replace(/^\S+\s+/, '').slice(0, 150).trim();
    const existing = grouped.get(normMsg);

    if (existing) {
      existing.count++;
      if (err.timestamp) existing.timestamps.push(err.timestamp);
      if (!existing.sampleStack && err.stackTrace) existing.sampleStack = err.stackTrace;
    } else {
      grouped.set(normMsg, {
        count: 1,
        timestamps: err.timestamp ? [err.timestamp] : [],
        sampleStack: err.stackTrace
      });
    }
  }

  let summary = `### Log Error Report (${errorEntries.length} total errors across ${grouped.size} unique issues)\n\n`;

  let idx = 1;
  for (const [msg, data] of grouped) {
    summary += `#### ${idx}. ${msg}\n`;
    summary += `- **Occurrences:** ${data.count}\n`;
    if (data.timestamps.length > 0) {
      summary += `- **Time Range:** ${data.timestamps[0]} ${data.timestamps.length > 1 ? `to ${data.timestamps[data.timestamps.length - 1]}` : ''}\n`;
    }
    if (data.sampleStack && data.sampleStack.length > 0) {
      summary += '```\n' + data.sampleStack.slice(0, 6).join('\n') + '\n```\n';
    }
    summary += '\n';
    idx++;
  }

  return summary.trim();
}
