// backend/agent/registry.js
//
// Task 11.1 — Tool Registry, envelope, input validation.
// One shape for every tool result; one place where arguments are
// validated before any tool body runs (Gemini gives no strict-mode
// guarantee, so this validation cannot be skipped, §3.3).
//
// Contract each tool module must satisfy:
//   {
//     name: string,
//     description: string,      // prescriptive: WHEN to call it, not just what it does
//     parameters: {              // flat OpenAPI-subset JSON schema
//       type: 'object',
//       properties: { ... },
//       required: [ ... ],
//     },
//     run(ctx, args) { ... }     // ctx is the frozen turn context (agent/turnContext.js)
//   }
//
// A tool's raw return value NEVER reaches the model directly — every
// result, success or failure, comes back through envelope().

const MAX_RESULT_BYTES = 20_000   // tune once real payload sizes are measured
const MAX_ARRAY_ITEMS = 200

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function typeError(key, expected, received) {
  return {
    ok: false,
    error: {
      code: 'INVALID_TYPE',
      message: `"${key}" must be of type ${expected}. Got: ${JSON.stringify(received)}`,
      details: { field: key, expectedType: expected, received },
    },
  }
}

/**
 * Validate `args` against a tool's flat JSON-schema-subset `parameters`.
 * Returns { ok: true } or { ok: false, error }. Never throws — a bad
 * argument must become a correctable, model-visible error.
 */
function validateArgs(parameters, args) {
  const props = parameters?.properties || {}
  const required = parameters?.required || []
  const input = isPlainObject(args) ? args : {}

  const missing = required.filter((key) => input[key] === undefined || input[key] === null)
  if (missing.length) {
    return {
      ok: false,
      error: {
        code: 'MISSING_REQUIRED_FIELD',
        message: `Missing required argument(s): ${missing.join(', ')}`,
        details: { missing },
      },
    }
  }

  for (const [key, schema] of Object.entries(props)) {
    if (input[key] === undefined || input[key] === null) continue // optional, absent
    const value = input[key]

    if (schema.type === 'string' && typeof value !== 'string') return typeError(key, 'string', value)
    if (schema.type === 'integer' && !Number.isInteger(value)) return typeError(key, 'integer', value)
    if (schema.type === 'number' && typeof value !== 'number') return typeError(key, 'number', value)
    if (schema.type === 'boolean' && typeof value !== 'boolean') return typeError(key, 'boolean', value)
    if (schema.type === 'array' && !Array.isArray(value)) return typeError(key, 'array', value)

    if (schema.enum && !schema.enum.includes(value)) {
      return {
        ok: false,
        error: {
          code: 'INVALID_ENUM_VALUE',
          message: `"${key}" must be one of: ${schema.enum.join(', ')}. Got: ${JSON.stringify(value)}`,
          details: { field: key, allowed: schema.enum, received: value },
        },
      }
    }
  }

  return { ok: true }
}

/**
 * Truncate long arrays anywhere in `data` and record what was cut, so
 * the model is told rather than silently fed a partial answer.
 */
function truncate(data) {
  const notes = []

  function walk(node, path) {
    if (Array.isArray(node)) {
      if (node.length > MAX_ARRAY_ITEMS) {
        notes.push(`${path || 'result'}: truncated from ${node.length} to ${MAX_ARRAY_ITEMS} items`)
        return node.slice(0, MAX_ARRAY_ITEMS).map((item, i) => walk(item, `${path}[${i}]`))
      }
      return node.map((item, i) => walk(item, `${path}[${i}]`))
    }
    if (isPlainObject(node)) {
      const out = {}
      for (const [k, v] of Object.entries(node)) out[k] = walk(v, path ? `${path}.${k}` : k)
      return out
    }
    return node
  }

  const walked = walk(data, '')
  const json = JSON.stringify(walked)
  if (json.length > MAX_RESULT_BYTES) {
    notes.push(`result exceeded ${MAX_RESULT_BYTES} bytes and was size-capped`)
    return { data: { note: 'result too large to include in full', keys: Object.keys(walked || {}) }, notes }
  }
  return { data: walked, notes }
}

/**
 * Wrap a tool's raw return in the standard envelope. Provenance is
 * stamped here, from the turn context, so it can never drift per-tool.
 */
function envelope(ctx, args, rawResult) {
  const { data: truncatedData, notes: truncationNotes } = truncate(rawResult?.data ?? null)

  return {
    data: truncatedData,
    provenance: {
      computedAt: new Date().toISOString(),
      snapshotAt: ctx.snapshotAt,
      source: ctx.graphSource?.live ? 'live' : 'graph',
      inputs: args,
      ...(ctx.graphSource?.loadedAt ? { graphLoadedAt: ctx.graphSource.loadedAt } : {}),
    },
    evidence: rawResult?.evidence ?? null,
    authored: false,
    notes: [...(rawResult?.notes || []), ...truncationNotes],
    ...(rawResult?.toolError ? { toolError: rawResult.toolError } : {}),
  }
}

/**
 * Build the registry: assemble tool modules bound to one frozen turn
 * context, expose provider-shaped declarations for the model, and
 * expose a single validated, always-enveloped execute() entry point.
 *
 * @param {object[]} toolModules  each satisfying the contract above
 * @param {object} ctx            the frozen turn context (agent/turnContext.js)
 */
function buildRegistry(toolModules, ctx) {
  const byName = new Map(toolModules.map((t) => [t.name, t]))

  const declarations = toolModules.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }))

  async function execute(name, args) {
    const tool = byName.get(name)
    if (!tool) {
      return envelope(ctx, args, {
        data: null,
        notes: [`Unknown tool: ${name}`],
        toolError: { code: 'UNKNOWN_TOOL', message: `Unknown tool: ${name}` },
      })
    }

    const validation = validateArgs(tool.parameters, args)
    if (!validation.ok) {
      return envelope(ctx, args, {
        data: null,
        notes: [`Argument error: ${validation.error.message}`],
        toolError: validation.error,
      })
    }

    try {
      const raw = await tool.run(ctx, args)
      return envelope(ctx, args, raw)
    } catch (err) {
      // A tool must never throw into the loop — convert to a structured error.
      return envelope(ctx, args, {
        data: null,
        notes: [`Tool "${name}" failed: ${err.message}`],
        toolError: { code: 'TOOL_THREW', message: err.message },
      })
    }
  }

  return { declarations, execute }
}

module.exports = { buildRegistry, validateArgs, envelope }