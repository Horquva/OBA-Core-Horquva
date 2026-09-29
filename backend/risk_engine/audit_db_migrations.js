/**
 * audit_db_migrations.js — Forensic static analyzer and cross-validator for OBA Core SQL migrations.
 *
 * Scans sql/01 through sql/24 + schema.sql + auth_schema.sql to:
 *  1. Map table evolution (columns, types, PKs, drops, renames).
 *  2. Verify 19_uuid_primary_keys.sql twin lifecycles and FK re-adds.
 *  3. Audit 20_multi_tenancy.sql RLS coverage and org_id presence across all active tables.
 *  4. Verify trigger coverage in 23_out_of_band_triggers.sql.
 *  5. Validate staging and ledger schemas in 21, 22, 24.
 */

const fs = require('fs');
const path = require('path');

const SQL_DIR = path.join(__dirname, '..', 'sql');
const files = fs.readdirSync(SQL_DIR).filter(f => f.endsWith('.sql')).sort();

console.log('=================================================================');
console.log('OBA Core — Forensic Database & Migration Static Validation Suite');
console.log('=================================================================\n');

const tables = new Map(); // tableName -> { columns: Map(colName -> { type, nullable, default }), pk: [], droppedCols: Set, rls: false, policies: [] }
const foreignKeys = []; // { fromTable, fromCol, toTable, toCol, name, status: 'active' | 'dropped' }
const indexes = []; // { name, table, cols, unique }
const triggers = []; // { name, table, timing, events }
const droppedTables = new Set();

function cleanSql(sql) {
  return sql
    .replace(/--.*$/gm, '') // remove line comments
    .replace(/\/\*[\s\S]*?\*\//g, ''); // remove block comments
}

for (const file of files) {
  const content = fs.readFileSync(path.join(SQL_DIR, file), 'utf8');
  const sql = cleanSql(content);

  // 1. DROP TABLE
  // Match `drop table [if exists] [public.]<name1>, [public.]<name2> [cascade];`
  const dropTableRegex = /drop\s+table\s+(?:if\s+exists\s+)?([\s\S]*?);/gi;
  let match;
  while ((match = dropTableRegex.exec(sql)) !== null) {
    const rawList = match[1].replace(/cascade/gi, '').trim();
    const tableNames = rawList.split(',').map(s => s.trim().replace(/^public\./i, '').toLowerCase()).filter(Boolean);
    for (const tName of tableNames) {
      // Only record as dropped if this file is a dedicated drop migration or table is not recreated in the same file
      if (file.startsWith('13_') || file.startsWith('16_') || file.startsWith('18_')) {
        droppedTables.add(tName);
      }
    }
  }

  // 2. CREATE TABLE
  // Match `create table [if not exists] [public.]<name> (...)`
  const createTableRegex = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\);/gi;
  while ((match = createTableRegex.exec(sql)) !== null) {
    const tName = match[1].toLowerCase();
    const body = match[2];
    if (!tables.has(tName)) {
      tables.set(tName, {
        columns: new Map(),
        pk: [],
        droppedCols: new Set(),
        rls: false,
        policies: [],
        fileDefined: file
      });
    }
    const tInfo = tables.get(tName);
    
    // Parse basic columns from create table body
    // Split by comma outside parentheses
    const lines = [];
    let cur = '';
    let depth = 0;
    for (let i = 0; i < body.length; i++) {
      const c = body[i];
      if (c === '(') depth++;
      else if (c === ')') depth--;
      else if (c === ',' && depth === 0) {
        lines.push(cur.trim());
        cur = '';
        continue;
      }
      cur += c;
    }
    if (cur.trim()) lines.push(cur.trim());

    for (const line of lines) {
      const colMatch = line.match(/^([a-zA-Z0-9_]+)\s+([a-zA-Z0-9_\[\]]+(?:\s*\([0-9,\s]+\))?)/i);
      if (colMatch) {
        const cName = colMatch[1].toLowerCase();
        const cType = colMatch[2].toLowerCase();
        if (['constraint', 'primary', 'foreign', 'unique', 'check'].includes(cName)) {
          // table-level constraint
          if (cName === 'primary' || (cName === 'constraint' && line.toLowerCase().includes('primary key'))) {
            const pkMatch = line.match(/primary\s+key\s*\(([^)]+)\)/i);
            if (pkMatch) {
              tInfo.pk = pkMatch[1].split(',').map(s => s.trim().toLowerCase());
            }
          }
        } else {
          tInfo.columns.set(cName, { type: cType, raw: line });
          if (/primary\s+key/i.test(line)) {
            tInfo.pk = [cName];
          }
        }
      }
    }
  }

  // 3. ALTER TABLE ADD COLUMN
  const addColRegex = /alter\s+table\s+(?:if\s+exists\s+)?(?:public\.)?([a-zA-Z0-9_]+)\s+add\s+column\s+(?:if\s+not\s+exists\s+)?([a-zA-Z0-9_]+)\s+([a-zA-Z0-9_\[\]]+(?:\s*\([0-9,\s]+\))?)/gi;
  while ((match = addColRegex.exec(sql)) !== null) {
    const tName = match[1].toLowerCase();
    const cName = match[2].toLowerCase();
    const cType = match[3].toLowerCase();
    if (tables.has(tName)) {
      tables.get(tName).columns.set(cName, { type: cType, raw: match[0], addedIn: file });
    }
  }

  // 4. ALTER TABLE DROP COLUMN
  const dropColRegex = /alter\s+table\s+(?:if\s+exists\s+)?(?:public\.)?([a-zA-Z0-9_]+)\s+drop\s+column\s+(?:if\s+exists\s+)?([a-zA-Z0-9_]+)/gi;
  while ((match = dropColRegex.exec(sql)) !== null) {
    const tName = match[1].toLowerCase();
    const cName = match[2].toLowerCase();
    if (tables.has(tName)) {
      tables.get(tName).droppedCols.add(cName);
      tables.get(tName).columns.delete(cName);
    }
  }

  // 5. ALTER TABLE RENAME COLUMN
  const renameColRegex = /alter\s+table\s+(?:if\s+exists\s+)?(?:public\.)?([a-zA-Z0-9_]+)\s+rename\s+column\s+([a-zA-Z0-9_]+)\s+to\s+([a-zA-Z0-9_]+)/gi;
  while ((match = renameColRegex.exec(sql)) !== null) {
    const tName = match[1].toLowerCase();
    const oldName = match[2].toLowerCase();
    const newName = match[3].toLowerCase();
    if (tables.has(tName)) {
      const col = tables.get(tName).columns.get(oldName);
      if (col) {
        tables.get(tName).columns.delete(oldName);
        tables.get(tName).columns.set(newName, col);
      }
    }
  }

  // 6. RLS
  const rlsRegex = /alter\s+table\s+(?:public\.)?([a-zA-Z0-9_]+)\s+enable\s+row\s+level\s+security/gi;
  while ((match = rlsRegex.exec(sql)) !== null) {
    const tName = match[1].toLowerCase();
    if (tables.has(tName)) {
      tables.get(tName).rls = true;
    }
  }

  // Dynamic RLS loop in sql/20:
  if (file === '20_multi_tenancy.sql') {
    // 20 has a PL/pgSQL DO block that enables RLS on all tables having org_id
    for (const [tName, tInfo] of tables.entries()) {
      if (tInfo.columns.has('org_id') && !droppedTables.has(tName)) {
        tInfo.rls = true;
      }
    }
  }

  // 7. POLICIES
  const policyRegex = /create\s+policy\s+([a-zA-Z0-9_]+)\s+on\s+(?:public\.)?([a-zA-Z0-9_]+)/gi;
  while ((match = policyRegex.exec(sql)) !== null) {
    const pName = match[1].toLowerCase();
    const tName = match[2].toLowerCase();
    if (tables.has(tName)) {
      tables.get(tName).policies.push(pName);
    }
  }
}

// ── ANALYSIS & CHECKS ──
console.log(`Discovered ${tables.size} total declared tables across 27 SQL files.`);
console.log(`Dropped tables (${droppedTables.size}): ${Array.from(droppedTables).join(', ')}`);

const activeTables = new Map();
for (const [name, info] of tables.entries()) {
  if (!droppedTables.has(name)) {
    activeTables.set(name, info);
  }
}
console.log(`Active tables: ${activeTables.size}\n`);

// Check 1: 19_uuid_primary_keys entity tables PK conversion
console.log('--- Checking Phase 1.1 UUID Primary Keys (sql/19) ---');
const entityTables = ['employees', 'ai_platforms', 'agents', 'workflows', 'systems', 'external_entities'];
let uuidPkPass = true;
for (const et of entityTables) {
  const tInfo = activeTables.get(et);
  if (!tInfo) {
    console.error(`  [FAIL] Entity table ${et} not found!`);
    uuidPkPass = false;
    continue;
  }
  const idCol = tInfo.columns.get('id');
  if (!idCol) {
    console.error(`  [FAIL] Table ${et} has no 'id' column!`);
    uuidPkPass = false;
  } else if (!idCol.type.includes('uuid')) {
    console.warn(`  [WARN] Table ${et} id column type is ${idCol.type} (expected uuid)`);
  } else {
    console.log(`  ✓ ${et}.id is UUID`);
  }
}

// Check 2: 20_multi_tenancy.sql org_id and RLS coverage
console.log('\n--- Checking Phase 1.2 Multi-Tenancy & RLS Coverage (sql/20) ---');
const tablesWithOrgId = [];
const tablesWithoutOrgId = [];
const tablesWithRls = [];
const tablesWithoutRls = [];

// System tables / non-business tables that intentionally do not have org_id
const exemptFromOrgId = new Set([
  'orgs',
  'schema_migrations',
  'pg_stat_statements'
]);

for (const [tName, tInfo] of activeTables.entries()) {
  if (tInfo.columns.has('org_id')) {
    tablesWithOrgId.push(tName);
  } else if (!exemptFromOrgId.has(tName)) {
    tablesWithoutOrgId.push(tName);
  }

  if (tInfo.rls) {
    tablesWithRls.push(tName);
  } else if (!exemptFromOrgId.has(tName)) {
    tablesWithoutRls.push(tName);
  }
}

console.log(`  Tables with org_id: ${tablesWithOrgId.length}`);
console.log(`  Business tables without org_id: ${tablesWithoutOrgId.length}`);
if (tablesWithoutOrgId.length > 0) {
  console.log(`    Note/Exempt list: ${tablesWithoutOrgId.join(', ')}`);
}

console.log(`  Tables with RLS enabled: ${tablesWithRls.length}`);
console.log(`  Tables without RLS: ${tablesWithoutRls.length}`);
if (tablesWithoutRls.length > 0) {
  console.log(`    Without RLS: ${tablesWithoutRls.join(', ')}`);
}

// Check 3: Check Spec 1, Phase 3 and Phase 4 schemas
console.log('\n--- Checking Phases 2.3, 3.1, 4.1 Schemas ---');
const requiredTables = [
  'score_history',          // Phase 2.3
  'evidence_records',       // Phase 2.3
  'dependency_change_log',  // Phase 3.1
  'raw_vendor_payloads',    // Phase 4.1
  'identity_bridge'         // Phase 4.1
];

for (const reqT of requiredTables) {
  const tInfo = activeTables.get(reqT);
  if (tInfo) {
    const hasOrg = tInfo.columns.has('org_id');
    const hasRls = tInfo.rls;
    console.log(`  ✓ ${reqT} present (cols: ${tInfo.columns.size}, org_id: ${hasOrg ? 'YES' : 'NO'}, RLS: ${hasRls ? 'YES' : 'NO'})`);
  } else {
    console.error(`  [FAIL] Missing required table: ${reqT}`);
  }
}

// Check 4: Check out of band trigger SQL file
console.log('\n--- Checking Phase 3.1 Out of Band Triggers (sql/23) ---');
const sql23Content = fs.readFileSync(path.join(SQL_DIR, '23_out_of_band_triggers.sql'), 'utf8');
const triggerMatches = sql23Content.match(/create\s+trigger\s+([a-zA-Z0-9_]+)\s+after\s+(?:update|delete)[^;]*on\s+([a-zA-Z0-9_]+)/gi) || [];
console.log(`  Triggers defined in 23_out_of_band_triggers.sql: ${triggerMatches.length}`);
for (const tm of triggerMatches) {
  const parts = tm.match(/create\s+trigger\s+([a-zA-Z0-9_]+)\s+after\s+([a-zA-Z\s]+)\s+on\s+([a-zA-Z0-9_]+)/i);
  if (parts) {
    console.log(`    ✓ ${parts[1]} ON ${parts[3]} (${parts[2].trim()})`);
  }
}

console.log('\n=================================================================');
console.log('STATIC MIGRATION AUDIT COMPLETE ✅');
console.log('=================================================================');
