export type SqlDialect = 'postgres' | 'mysql' | 'sqlite';

export interface ForeignKeyDef {
  targetTable: string;
  targetColumn: string;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

export interface SqlColumnDef {
  id: string;
  name: string;
  type: string;
  lengthOrPrecision?: string;
  isPrimaryKey: boolean;
  isAutoIncrement: boolean;
  isNotNull: boolean;
  isUnique: boolean;
  defaultValue?: string;
  foreignKey?: ForeignKeyDef;
}

export interface SqlTableSchema {
  tableName: string;
  dialect: SqlDialect;
  columns: SqlColumnDef[];
}

export const COMMON_SQL_DATA_TYPES = [
  'INT',
  'BIGINT',
  'VARCHAR',
  'TEXT',
  'BOOLEAN',
  'TIMESTAMP',
  'DATE',
  'DECIMAL',
  'FLOAT',
  'UUID',
  'JSON'
] as const;

/**
 * Normalizes an identifier according to dialect rules.
 */
function quoteIdentifier(name: string, dialect: SqlDialect): string {
  const clean = name.trim().replace(/[^a-zA-Z0-9_]/g, '_');
  if (dialect === 'mysql') return `\`${clean}\``;
  if (dialect === 'postgres') return `"${clean}"`;
  return clean;
}

/**
 * Maps generic data type to dialect-specific SQL type.
 */
export function mapColumnType(
  type: string,
  lengthOrPrecision: string | undefined,
  dialect: SqlDialect,
  isAutoIncrement: boolean
): string {
  const upper = type.toUpperCase().trim();
  const len = lengthOrPrecision ? `(${lengthOrPrecision.trim()})` : '';

  if (dialect === 'postgres') {
    if (isAutoIncrement) {
      if (upper === 'BIGINT') return 'BIGSERIAL';
      return 'SERIAL';
    }
    if (upper === 'VARCHAR') return `VARCHAR${len || '(255)'}`;
    if (upper === 'TIMESTAMP') return 'TIMESTAMPTZ';
    if (upper === 'JSON') return 'JSONB';
    if (upper === 'BOOLEAN') return 'BOOLEAN';
    if (upper === 'UUID') return 'UUID';
    if (upper === 'DECIMAL') return `DECIMAL${len || '(10, 2)'}`;
    return upper;
  }

  if (dialect === 'mysql') {
    if (upper === 'VARCHAR') return `VARCHAR${len || '(255)'}`;
    if (upper === 'BOOLEAN') return 'TINYINT(1)';
    if (upper === 'TIMESTAMP') return 'DATETIME';
    if (upper === 'UUID') return 'VARCHAR(36)';
    if (upper === 'DECIMAL') return `DECIMAL${len || '(10, 2)'}`;
    if (upper === 'JSON') return 'JSON';
    return upper;
  }

  // SQLite
  if (isAutoIncrement) {
    return 'INTEGER';
  }
  if (upper === 'VARCHAR' || upper === 'UUID' || upper === 'JSON') return 'TEXT';
  if (upper === 'TIMESTAMP' || upper === 'DATE') return 'TEXT';
  if (upper === 'BOOLEAN') return 'INTEGER';
  if (upper === 'BIGINT' || upper === 'INT') return 'INTEGER';
  if (upper === 'DECIMAL' || upper === 'FLOAT') return 'REAL';
  return upper;
}

/**
 * Generates formatted CREATE TABLE DDL statement for the given schema and dialect.
 */
export function generateCreateTableDdl(schema: SqlTableSchema): string {
  const table = (schema.tableName || 'my_table').trim().replace(/[^a-zA-Z0-9_]/g, '_');
  const dialect = schema.dialect || 'postgres';
  const columns = schema.columns || [];

  if (columns.length === 0) {
    return `-- Table: ${table}\n-- Please add at least one column to generate DDL.`;
  }

  const columnLines: string[] = [];
  const foreignKeyConstraints: string[] = [];
  const primaryKeyCols: string[] = [];

  for (const col of columns) {
    if (!col.name || !col.name.trim()) continue;

    const colName = col.name.trim().replace(/[^a-zA-Z0-9_]/g, '_');
    const quotedName = quoteIdentifier(colName, dialect);
    const colType = mapColumnType(col.type, col.lengthOrPrecision, dialect, col.isAutoIncrement);

    let parts: string[] = [`  ${quotedName} ${colType}`];

    // Primary Key handling
    if (col.isPrimaryKey) {
      if (dialect === 'sqlite' && col.isAutoIncrement) {
        parts.push('PRIMARY KEY AUTOINCREMENT');
      } else if (dialect === 'mysql' && col.isAutoIncrement) {
        parts.push('AUTO_INCREMENT PRIMARY KEY');
      } else {
        primaryKeyCols.push(quotedName);
      }
    }

    // Not Null
    if (col.isNotNull && !col.isPrimaryKey) {
      parts.push('NOT NULL');
    }

    // Unique
    if (col.isUnique && !col.isPrimaryKey) {
      parts.push('UNIQUE');
    }

    // Default value
    if (col.defaultValue && col.defaultValue.trim()) {
      let def = col.defaultValue.trim();
      const isFunc = /^[a-zA-Z0-9_]+\(.*\)$/i.test(def) || def.toUpperCase() === 'CURRENT_TIMESTAMP';
      if (!isFunc && !/^-?\d+(\.\d+)?$/.test(def) && !['TRUE', 'FALSE', 'NULL'].includes(def.toUpperCase())) {
        if (!def.startsWith("'") && !def.endsWith("'")) {
          def = `'${def}'`;
        }
      }
      parts.push(`DEFAULT ${def}`);
    }

    columnLines.push(parts.join(' '));

    // Foreign Key reference
    if (col.foreignKey && col.foreignKey.targetTable && col.foreignKey.targetColumn) {
      const targetTable = quoteIdentifier(col.foreignKey.targetTable.trim(), dialect);
      const targetCol = quoteIdentifier(col.foreignKey.targetColumn.trim(), dialect);
      const onDel = col.foreignKey.onDelete ? ` ON DELETE ${col.foreignKey.onDelete}` : '';

      foreignKeyConstraints.push(
        `  CONSTRAINT fk_${table}_${colName} FOREIGN KEY (${quotedName}) REFERENCES ${targetTable} (${targetCol})${onDel}`
      );
    }
  }

  // Composite or standard primary key
  if (primaryKeyCols.length > 0 && dialect !== 'sqlite') {
    columnLines.push(`  PRIMARY KEY (${primaryKeyCols.join(', ')})`);
  }

  // Combine columns and foreign keys
  const allElements = [...columnLines, ...foreignKeyConstraints];
  const tableNameQuoted = quoteIdentifier(table, dialect);

  let ddl = `CREATE TABLE ${tableNameQuoted} (\n${allElements.join(',\n')}\n)`;

  if (dialect === 'mysql') {
    ddl += ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;';
  } else {
    ddl += ';';
  }

  return ddl;
}

/**
 * Generates sample SQL query templates based on current table schema.
 */
export function generateSampleQuery(
  schema: SqlTableSchema,
  queryType: 'select_all' | 'pagination' | 'insert' | 'update' | 'search' | 'join'
): string {
  const table = (schema.tableName || 'my_table').trim().replace(/[^a-zA-Z0-9_]/g, '_');
  const dialect = schema.dialect || 'postgres';
  const columns = schema.columns.filter((c) => c.name && c.name.trim());
  const quotedTable = quoteIdentifier(table, dialect);

  const pkCol = columns.find((c) => c.isPrimaryKey)?.name || columns[0]?.name || 'id';
  const quotedPk = quoteIdentifier(pkCol, dialect);

  switch (queryType) {
    case 'select_all':
      return `SELECT *\nFROM ${quotedTable}\nORDER BY ${quotedPk} DESC;`;

    case 'pagination':
      if (dialect === 'mysql') {
        return `SELECT *\nFROM ${quotedTable}\nORDER BY ${quotedPk} DESC\nLIMIT 0, 20;`;
      }
      return `SELECT *\nFROM ${quotedTable}\nORDER BY ${quotedPk} DESC\nLIMIT 20 OFFSET 0;`;

    case 'insert': {
      const insertCols = columns.filter((c) => !c.isAutoIncrement);
      if (insertCols.length === 0) return `INSERT INTO ${quotedTable} DEFAULT VALUES;`;

      const colNames = insertCols.map((c) => quoteIdentifier(c.name, dialect)).join(', ');
      const valPlaceholders = insertCols.map((c) => {
        const u = c.type.toUpperCase();
        if (u.includes('INT') || u.includes('DECIMAL')) return '1';
        if (u.includes('BOOL')) return dialect === 'mysql' ? '1' : 'TRUE';
        if (u.includes('TIME') || u.includes('DATE')) return 'CURRENT_TIMESTAMP';
        return `'sample_${c.name}'`;
      }).join(', ');

      let query = `INSERT INTO ${quotedTable} (\n  ${colNames}\n)\nVALUES (\n  ${valPlaceholders}\n)`;
      if (dialect === 'postgres') {
        query += `\nRETURNING ${quotedPk};`;
      } else {
        query += ';';
      }
      return query;
    }

    case 'update': {
      const updateCols = columns.filter((c) => !c.isPrimaryKey && !c.isAutoIncrement);
      if (updateCols.length === 0) {
        return `UPDATE ${quotedTable}\nSET ${quotedPk} = ${quotedPk}\nWHERE ${quotedPk} = 1;`;
      }
      const setClauses = updateCols.slice(0, 3).map((c) => {
        const q = quoteIdentifier(c.name, dialect);
        return `  ${q} = 'new_value'`;
      }).join(',\n');

      return `UPDATE ${quotedTable}\nSET\n${setClauses}\nWHERE ${quotedPk} = 1;`;
    }

    case 'search': {
      const textCols = columns.filter((c) => {
        const u = c.type.toUpperCase();
        return u.includes('CHAR') || u.includes('TEXT');
      });
      const targetCols = textCols.length > 0 ? textCols : columns.slice(0, 2);

      const whereClauses = targetCols.map((c) => {
        const q = quoteIdentifier(c.name, dialect);
        if (dialect === 'postgres') {
          return `${q} ILIKE '%keyword%'`;
        }
        return `${q} LIKE '%keyword%'`;
      }).join(' OR ');

      return `SELECT *\nFROM ${quotedTable}\nWHERE ${whereClauses || `${quotedPk} = 1`}\nLIMIT 50;`;
    }

    case 'join': {
      const fkCol = columns.find((c) => c.foreignKey && c.foreignKey.targetTable);
      if (fkCol && fkCol.foreignKey) {
        const targetTable = quoteIdentifier(fkCol.foreignKey.targetTable, dialect);
        const targetCol = quoteIdentifier(fkCol.foreignKey.targetColumn, dialect);
        const localFk = quoteIdentifier(fkCol.name, dialect);
        return `SELECT \n  t.*,\n  f.*\nFROM ${quotedTable} t\nINNER JOIN ${targetTable} f ON t.${localFk} = f.${targetCol}\nLIMIT 50;`;
      }
      return `SELECT \n  t.*,\n  other.*\nFROM ${quotedTable} t\nINNER JOIN other_table other ON t.${quotedPk} = other.table_id\nLIMIT 50;`;
    }
  }
}
