export interface GenerateOptions {
  rootName?: string;
  useTypeAlias?: boolean;
  exportTypes?: boolean;
  exportSchemas?: boolean;
}

export interface GeneratedOutput {
  typescript: string;
  zod: string;
  combined: string;
}

interface TypeNode {
  tsType: string;
  zodSchema: string;
  subDefinitions: { name: string; ts: string; zod: string }[];
}

function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^[a-z]/, (chr) => chr.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '');
}

function isValidIdentifier(key: string): boolean {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key);
}

function formatKey(key: string): string {
  return isValidIdentifier(key) ? key : JSON.stringify(key);
}

function isIsoDateString(val: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(val);
}

function inferTypeNode(value: unknown, suggestedName: string, depth = 0): TypeNode {
  if (value === null) {
    return {
      tsType: 'null',
      zodSchema: 'z.null()',
      subDefinitions: []
    };
  }

  if (value === undefined) {
    return {
      tsType: 'undefined',
      zodSchema: 'z.undefined()',
      subDefinitions: []
    };
  }

  const typeOf = typeof value;

  if (typeOf === 'string') {
    const isDate = isIsoDateString(value as string);
    return {
      tsType: 'string',
      zodSchema: isDate ? 'z.string().datetime()' : 'z.string()',
      subDefinitions: []
    };
  }

  if (typeOf === 'number') {
    const isInt = Number.isInteger(value);
    return {
      tsType: 'number',
      zodSchema: isInt ? 'z.number().int()' : 'z.number()',
      subDefinitions: []
    };
  }

  if (typeOf === 'boolean') {
    return {
      tsType: 'boolean',
      zodSchema: 'z.boolean()',
      subDefinitions: []
    };
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return {
        tsType: 'unknown[]',
        zodSchema: 'z.array(z.unknown())',
        subDefinitions: []
      };
    }

    const itemTypes = value.map((item, idx) =>
      inferTypeNode(item, `${suggestedName}Item`, depth + 1)
    );

    const uniqueTs = Array.from(new Set(itemTypes.map((t) => t.tsType)));
    const uniqueZod = Array.from(new Set(itemTypes.map((t) => t.zodSchema)));
    const allSubs = itemTypes.flatMap((t) => t.subDefinitions);

    let tsItemType = uniqueTs.join(' | ');
    if (uniqueTs.length > 1) {
      tsItemType = `(${tsItemType})`;
    }

    let zodItemSchema: string;
    if (uniqueZod.length === 1) {
      zodItemSchema = uniqueZod[0];
    } else {
      zodItemSchema = `z.union([${uniqueZod.join(', ')}])`;
    }

    return {
      tsType: `${tsItemType}[]`,
      zodSchema: `z.array(${zodItemSchema})`,
      subDefinitions: allSubs
    };
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);

    if (keys.length === 0) {
      return {
        tsType: 'Record<string, unknown>',
        zodSchema: 'z.record(z.string(), z.unknown())',
        subDefinitions: []
      };
    }

    const subDefs: { name: string; ts: string; zod: string }[] = [];
    const tsFields: string[] = [];
    const zodFields: string[] = [];

    for (const key of keys) {
      const val = obj[key];
      const childName = `${suggestedName}${toPascalCase(key)}`;
      const node = inferTypeNode(val, childName, depth + 1);

      subDefs.push(...node.subDefinitions);

      const formattedKeyName = formatKey(key);
      tsFields.push(`  ${formattedKeyName}: ${node.tsType};`);
      zodFields.push(`  ${formattedKeyName}: ${node.zodSchema}`);
    }

    const interfaceName = toPascalCase(suggestedName);
    const tsDefinition = `interface ${interfaceName} {\n${tsFields.join('\n')}\n}`;
    const zodDefinition = `const ${interfaceName}Schema = z.object({\n${zodFields.join(',\n')}\n});`;

    subDefs.push({
      name: interfaceName,
      ts: tsDefinition,
      zod: zodDefinition
    });

    return {
      tsType: interfaceName,
      zodSchema: `${interfaceName}Schema`,
      subDefinitions: subDefs
    };
  }

  return {
    tsType: 'unknown',
    zodSchema: 'z.unknown()',
    subDefinitions: []
  };
}

export function generateTsAndZod(
  jsonInput: string,
  options: GenerateOptions = {}
): GeneratedOutput {
  const rootName = options.rootName?.trim() || 'Root';
  const pascalRoot = toPascalCase(rootName);
  const exportPrefix = options.exportTypes !== false ? 'export ' : '';
  const exportSchemaPrefix = options.exportSchemas !== false ? 'export ' : '';

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonInput);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid JSON: ${message}`);
  }

  const rootNode = inferTypeNode(parsed, pascalRoot);

  const seenNames = new Set<string>();
  const uniqueDefs: { name: string; ts: string; zod: string }[] = [];

  for (const def of rootNode.subDefinitions) {
    if (!seenNames.has(def.name)) {
      seenNames.add(def.name);
      uniqueDefs.push(def);
    }
  }

  let tsResult = '';
  let zodResult = `import { z } from 'zod';\n\n`;

  if (uniqueDefs.length === 0) {
    tsResult = `${exportPrefix}type ${pascalRoot} = ${rootNode.tsType};\n`;
    zodResult += `${exportSchemaPrefix}const ${pascalRoot}Schema = ${rootNode.zodSchema};\n`;
  } else {
    const tsParts: string[] = [];
    const zodParts: string[] = [];

    for (const def of uniqueDefs) {
      tsParts.push(`${exportPrefix}${def.ts}`);
      zodParts.push(`${exportSchemaPrefix}${def.zod}`);
    }

    tsResult = tsParts.join('\n\n') + '\n';
    zodResult += zodParts.join('\n\n') + '\n';
  }

  const combined = `// --- TypeScript Definitions ---\n\n${tsResult}\n// --- Zod Validation Schemas ---\n\n${zodResult}`;

  return {
    typescript: tsResult,
    zod: zodResult,
    combined
  };
}
