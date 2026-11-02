export interface JsonValidationResult {
  isValid: boolean;
  error?: string;
  line?: number;
  column?: number;
}

export function validateJson(input: string): JsonValidationResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Empty JSON input' };
  }

  try {
    JSON.parse(trimmed);
    return { isValid: true };
  } catch (err: any) {
    const message = err.message || 'Syntax Error';

    // Extract line/column from message if available (e.g. "at position 42 (line 3 column 5)")
    const posMatch = message.match(/position (\d+)/i);
    let line: number | undefined;
    let column: number | undefined;

    if (posMatch) {
      const pos = parseInt(posMatch[1], 10);
      const lines = input.slice(0, pos).split('\n');
      line = lines.length;
      column = lines[lines.length - 1].length + 1;
    }

    return {
      isValid: false,
      error: message,
      line,
      column
    };
  }
}

function sortObjectKeys(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  if (obj !== null && typeof obj === 'object') {
    const sorted: Record<string, any> = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
      sorted[key] = sortObjectKeys(obj[key]);
    }
    return sorted;
  }
  return obj;
}

export function formatJson(
  input: string,
  indent: number | 'tab' = 2,
  sortKeys = false
): { output: string; isValid: boolean; error?: string } {
  try {
    let parsed = JSON.parse(input);
    if (sortKeys) {
      parsed = sortObjectKeys(parsed);
    }
    const space = indent === 'tab' ? '\t' : indent;
    return {
      output: JSON.stringify(parsed, null, space),
      isValid: true
    };
  } catch (err: any) {
    return {
      output: input,
      isValid: false,
      error: err.message
    };
  }
}

export function minifyJson(input: string): { output: string; isValid: boolean; error?: string } {
  try {
    const parsed = JSON.parse(input);
    return {
      output: JSON.stringify(parsed),
      isValid: true
    };
  } catch (err: any) {
    return {
      output: input,
      isValid: false,
      error: err.message
    };
  }
}

export function repairCommonJson(input: string): string {
  let text = input.trim();

  // Replace single quotes around keys/values with double quotes
  text = text.replace(/'([^'\\]*(\\.[^'\\]*)*)'/g, '"$1"');

  // Remove trailing commas before closing braces/brackets
  text = text.replace(/,(\s*[\]\}])/g, '$1');

  // Add quotes around unquoted object keys: { foo: "bar" } -> { "foo": "bar" }
  text = text.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');

  return text;
}
