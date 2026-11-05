/**
 * ============================================================================
 * ⭐ P0.4 — one assertion the agent route tests call on the payload they already built.
 * ============================================================================
 *
 * WHAT IT GUARDS: the MCP spec requires a tool that publishes an `outputSchema` to answer with
 * `structuredContent` that validates against it. The schema is generated from Zod and the route's
 * TypeScript is inferred from that same Zod, so the compiler already catches a field with the wrong
 * TYPE — what it cannot catch is a route that sends a field nobody declared, because
 * `APIResponse.ok` takes `unknown` and a spread or an `as` erases the check. That field ships inside
 * `structuredContent` and is the exact drift a strict client would one day reject.
 *
 * WHY NOT Ajv: `ajv` sits in `node_modules` only as a transitive dependency of the lint toolchain,
 * and a test importing an undeclared package breaks the day that chain changes. `zod-to-json-schema`
 * IS a declared dependency and is what generates the published schema, so validating against the
 * SOURCE Zod checks the same contract through a path this repo actually owns. The two steps below
 * cover what Ajv would have: Zod does types, nullability and required-ness, and `assertDeclared`
 * does the key-level agreement in both directions.
 *
 * ⚠️ IT THROWS PLAIN ERRORS AND IMPORTS NOTHING FROM `vitest`. `vitest.config.ts` aliases the
 * `server-only` specifier to `vitest` so server code can be unit-tested, and every agent route test
 * calls `vi.mock('server-only', () => ({}))` — which replaces that resolved module wholesale. A
 * helper that pulled `expect` out of `vitest` would therefore receive the empty mock and die with
 * "No expect export is defined on the server-only mock". A thrown Error fails the test just as
 * loudly and cannot be mocked away.
 *
 * ⚠️ `assertDeclared` IS STRICTER THAN THE SHIPPED SCHEMA ON PURPOSE. `toOutputJsonSchema` reopens
 * every object (`additionalProperties: true`) so an added field cannot break a connected client
 * mid-release; this assertion refuses the same field so it cannot go unnoticed in the repo. Loose on
 * the wire, strict in CI.
 */
import {
  getMcpTool,
  MCP_TOOL_OUTPUT_ZOD,
  type JsonSchemaNode,
  type JsonSchemaObject,
  type McpToolName,
} from '@/core/mcp/tools'

function fail(message: string): never {
  throw new Error(`[mcp outputSchema] ${message}`)
}

function assertDeclared(schema: JsonSchemaNode, value: unknown, path: string): void {
  if (Array.isArray(value)) {
    const items = schema.items as JsonSchemaNode | undefined
    if (!items) fail(`${path} is an array but its schema declares no items`)
    value.forEach((entry, index) => assertDeclared(items, entry, `${path}[${index}]`))
    return
  }
  if (typeof value !== 'object' || value === null) return

  const properties = (schema.properties ?? {}) as Record<string, JsonSchemaNode>
  const required = (schema.required ?? []) as string[]
  const present = Object.keys(value as Record<string, unknown>)

  for (const key of required) {
    if (!present.includes(key)) fail(`${path}: schema requires "${key}", payload has none`)
  }
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!(key in properties)) fail(`${path}: payload carries "${key}", which no schema declares`)
    assertDeclared(properties[key], entry, `${path}.${key}`)
  }
}

/**
 * Assert a tool-route payload is exactly what the tool's published `outputSchema` promises.
 *
 * Pass the `data` field of the route's `APIResponse` envelope — that is the only part that crosses
 * into `structuredContent` (`core/mcp/call-tool.ts` forwards `.data` and nothing else).
 */
export function expectValidToolOutput(tool: McpToolName, payload: unknown): void {
  const published = getMcpTool(tool)?.outputSchema
  if (!published) fail(`${tool} publishes no outputSchema`)

  const parsed = MCP_TOOL_OUTPUT_ZOD[tool].safeParse(payload)
  if (!parsed.success) {
    fail(`${tool} payload fails its own Zod: ${JSON.stringify(parsed.error.issues)}`)
  }

  assertDeclared(published as JsonSchemaObject, payload, tool)
}
