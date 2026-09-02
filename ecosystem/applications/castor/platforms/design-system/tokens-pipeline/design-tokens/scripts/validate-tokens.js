/**
 * Token Validation Script
 * ------------------------
 * Validates tokens/tokens.json for:
 *   1. Naming convention violations (keys must be camelCase/alphanumeric only)
 *   2. Missing/malformed "value" fields on leaf tokens
 *   3. Broken references ({category.path.value} pointing at a non-existent token)
 *   4. Duplicate raw values within the same top-level category (warning, not error —
 *      flags likely candidates for consolidation into a single semantic token)
 *
 * Exit code 0 = pass (no errors; warnings allowed)
 * Exit code 1 = fail (at least one error)
 *
 * Usage: node scripts/validate-tokens.js
 */

const fs = require("fs");
const path = require("path");

const TOKENS_PATH = path.join(__dirname, "..", "tokens", "tokens.json");
const NAME_PATTERN = /^[a-zA-Z0-9]+$/; // no spaces, underscores, hyphens, or symbols

const errors = [];
const warnings = [];

function loadTokens() {
  const raw = fs.readFileSync(TOKENS_PATH, "utf-8");
  try {
    return JSON.parse(raw);
  } catch (e) {
    errors.push(`tokens.json is not valid JSON: ${e.message}`);
    return null;
  }
}

function isLeafToken(node) {
  return (
    typeof node === "object" &&
    node !== null &&
    "value" in node &&
    typeof node.value !== "object"
  );
}

// Walk the tree, collecting every leaf token's full dot-path and value
function collectLeaves(node, pathParts, leaves) {
  if (node === null || typeof node !== "object") return;

  if (isLeafToken(node)) {
    leaves[pathParts.join(".")] = node.value;
    return;
  }

  for (const key of Object.keys(node)) {
    if (!NAME_PATTERN.test(key)) {
      errors.push(
        `Naming violation at "${[...pathParts, key].join(".")}" — key "${key}" contains characters other than letters/numbers (no spaces, hyphens, or underscores allowed).`
      );
    }
    collectLeaves(node[key], [...pathParts, key], leaves);
  }
}

// A reference looks like {color.primary.600.value} — resolve it against the leaves map
function resolveReference(ref, leaves) {
  const inner = ref.slice(1, -1); // strip { }
  const withoutValueSuffix = inner.endsWith(".value")
    ? inner.slice(0, -".value".length)
    : inner;
  return Object.prototype.hasOwnProperty.call(leaves, withoutValueSuffix);
}

function validateReferences(leaves) {
  const refPattern = /^\{.+\}$/;
  for (const [tokenPath, value] of Object.entries(leaves)) {
    if (typeof value === "string" && refPattern.test(value.trim())) {
      const ok = resolveReference(value.trim(), leaves);
      if (!ok) {
        errors.push(
          `Broken reference at "${tokenPath}" — points to "${value}", which does not resolve to an existing token.`
        );
      }
    }
  }
}

function validateEmptyValues(leaves) {
  for (const [tokenPath, value] of Object.entries(leaves)) {
    if (value === "" || value === null || value === undefined) {
      errors.push(`Empty/missing value at "${tokenPath}".`);
    }
  }
}

function checkDuplicateRawValues(leaves) {
  // Group leaves by top-level category (e.g. "color", "spacing")
  const byCategory = {};
  for (const [tokenPath, value] of Object.entries(leaves)) {
    if (typeof value === "string" && /^\{.+\}$/.test(value.trim())) continue; // skip references
    const category = tokenPath.split(".")[0];
    byCategory[category] = byCategory[category] || {};
    byCategory[category][value] = byCategory[category][value] || [];
    byCategory[category][value].push(tokenPath);
  }

  for (const [category, valueMap] of Object.entries(byCategory)) {
    for (const [value, tokenPaths] of Object.entries(valueMap)) {
      if (tokenPaths.length > 1) {
        warnings.push(
          `Duplicate raw value "${value}" in category "${category}" used by: ${tokenPaths.join(", ")} — consider consolidating into one semantic token.`
        );
      }
    }
  }
}

function main() {
  const tokens = loadTokens();
  if (!tokens) {
    printReport();
    process.exit(1);
  }

  const leaves = {};
  collectLeaves(tokens, [], leaves);

  validateEmptyValues(leaves);
  validateReferences(leaves);
  checkDuplicateRawValues(leaves);

  printReport(Object.keys(leaves).length);
  process.exit(errors.length > 0 ? 1 : 0);
}

function printReport(tokenCount) {
  console.log("\n=== Horquva Design Token Validation ===\n");
  if (tokenCount !== undefined) {
    console.log(`Checked ${tokenCount} leaf tokens.\n`);
  }

  if (errors.length === 0) {
    console.log("✔ No errors.");
  } else {
    console.log(`✘ ${errors.length} error(s):`);
    errors.forEach((e) => console.log(`  - ${e}`));
  }

  console.log("");

  if (warnings.length === 0) {
    console.log("✔ No warnings.");
  } else {
    console.log(`⚠ ${warnings.length} warning(s):`);
    warnings.forEach((w) => console.log(`  - ${w}`));
  }

  console.log(`\nResult: ${errors.length > 0 ? "FAIL" : "PASS"}\n`);
}

main();
