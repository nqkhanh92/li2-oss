/**
 * ChatGPT plugin submission package (`plugin/chatgpt/`).
 *
 * The package is hand-edited and only built a few times a year, so nothing else notices when it
 * drifts. These tests pin the three ways it can silently become unsubmittable:
 *   1. A manifest stops parsing, or a field required by the submission portal goes missing.
 *   2. A listing/policy URL stops being HTTPS, or the review case counts drift off 5 positive /
 *      3 negative, which the portal rejects only at submission time.
 *   3. A review case names a tool the server does not expose, or the declared OAuth scopes drift
 *      away from `MCP_SCOPES` — the reviewer would hit a dead tool name or a scope error.
 *
 * Schema source: https://developers.openai.com/plugins/deploy/submission and
 * https://developers.openai.com/plugins/build/plugins, read 2026-10-20.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, it, expect } from 'vitest'

import { MCP_TOOL_NAMES } from '@/core/mcp/tools'
import { MCP_SCOPES } from '@/core/services/mcp-oauth.service'

const packageDir = join(process.cwd(), 'plugin', 'chatgpt')
const readManifest = (file: string) =>
  JSON.parse(readFileSync(join(packageDir, file), 'utf8')) as Record<string, any>

const plugin = readManifest('plugin.json')
const mcp = readManifest('mcp.json')
const openai = plugin.extensions?.['com.openai']
const iface = openai?.interface
const review = openai?.review
const serverNames: string[] = Object.keys(mcp.mcpServers ?? {})
const server = mcp.mcpServers[serverNames[0]]
const auth = server?.extensions?.['com.openai']?.auth

const isHttps = (value: unknown) => typeof value === 'string' && /^https:\/\/[^\s@#]+$/.test(value)

describe('plugin/chatgpt/plugin.json', () => {
  it('declares the portable Agent Plugins identity', () => {
    expect(plugin.$schema).toBe('https://agent-plugins.org/schemas/1.0.0/plugin.schema.json')
    expect(plugin.name).toMatch(/^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/)
    expect(plugin.name.length).toBeLessThanOrEqual(64)
    expect(plugin.version).toMatch(/^\d+\.\d+\.\d+/)
  })

  it('uses only fields the portable schema allows at the root', () => {
    const allowed = [
      '$schema',
      'name',
      'version',
      'description',
      'author',
      'homepage',
      'repository',
      'license',
      'keywords',
      'extensions',
    ]
    expect(Object.keys(plugin).filter((key) => !allowed.includes(key))).toEqual([])
  })

  it('keeps listing text inside the submission limits', () => {
    expect(iface.displayName.length).toBeGreaterThan(0)
    expect(iface.displayName.length).toBeLessThanOrEqual(30)
    expect(iface.shortDescription.length).toBeLessThanOrEqual(30)
    expect(iface.longDescription.length).toBeLessThanOrEqual(4000)
    expect(iface.developerName.length).toBeLessThanOrEqual(80)
    expect(iface.category).toBeTruthy()

    const prompts: string[] = Array.isArray(iface.defaultPrompt)
      ? iface.defaultPrompt
      : [iface.defaultPrompt].filter(Boolean)
    expect(prompts.length).toBeLessThanOrEqual(3)
    for (const prompt of prompts) expect(prompt.length).toBeLessThanOrEqual(128)

    expect(iface.capabilities?.length ?? 0).toBeLessThanOrEqual(20)
    for (const capability of iface.capabilities ?? []) {
      expect(capability.length).toBeLessThanOrEqual(120)
    }
  })

  it('provides all four HTTPS listing URLs required for MCP review', () => {
    for (const key of ['websiteURL', 'supportURL', 'privacyPolicyURL', 'termsOfServiceURL']) {
      expect(isHttps(iface[key]), `${key} must be HTTPS`).toBe(true)
      expect(iface[key].length).toBeLessThanOrEqual(1024)
    }
    expect(iface.privacyPolicyURL).toMatch(/\/privacy$/)
    expect(iface.termsOfServiceURL).toMatch(/\/terms$/)
  })

  it('points at packaged square icons with ./ paths', () => {
    for (const key of ['logo', 'composerIcon']) {
      expect(iface[key]).toMatch(/^\.\/assets\//)
    }
    for (const key of ['brandColor', 'brandColorDark']) {
      if (iface[key]) expect(iface[key]).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it('carries exactly five positive and three negative review cases', () => {
    expect(review.test_cases.positive).toHaveLength(5)
    expect(review.test_cases.negative).toHaveLength(3)

    for (const testCase of review.test_cases.positive) {
      expect(testCase.description).toBeTruthy()
      expect(testCase.prompt).toBeTruthy()
      expect(testCase.tools_triggered).toBeTruthy()
      expect(testCase.expected_behavior).toBeTruthy()
    }
    for (const testCase of review.test_cases.negative) {
      expect(testCase.description).toBeTruthy()
      expect(testCase.prompt).toBeTruthy()
    }
  })

  it('names only tools the MCP server actually exposes', () => {
    const named = review.test_cases.positive.flatMap((testCase: { tools_triggered: string }) =>
      testCase.tools_triggered.split(',').map((name) => name.trim())
    )
    expect(named.length).toBeGreaterThan(0)
    for (const name of named) {
      expect(MCP_TOOL_NAMES, `${name} is not an MCP tool`).toContain(name)
    }
  })

  it('omits the fields that make a ZIP unsubmittable', () => {
    expect(openai.apps).toBeUndefined()
    expect(openai.hooks).toBeUndefined()
    const serialized = JSON.stringify(plugin)
    for (const banned of ['test_credentials', 'reviewer_instructions', 'clientSecret']) {
      expect(serialized).not.toContain(`"${banned}"`)
    }
  })
})

describe('plugin/chatgpt/mcp.json', () => {
  it('declares exactly one streamable-http server over HTTPS', () => {
    expect(mcp.$schema).toBe('https://agent-plugins.org/schemas/1.0.0/mcp.schema.json')
    expect(Object.keys(mcp).sort()).toEqual(['$schema', 'mcpServers'])
    expect(serverNames).toHaveLength(1)
    expect(server.type).toBe('streamable-http')
    expect(isHttps(server.url)).toBe(true)
    expect(server.url).toMatch(/\/api\/mcp$/)
  })

  it('sends no headers, which public submission rejects', () => {
    expect(Object.keys(server.headers ?? {})).toEqual([])
  })

  it('declares OAuth with a CIMD client and no embedded credentials', () => {
    expect(auth.type).toBe('oauth')
    expect(auth.client.mode).toBe('cimd')
    expect(auth.client.clientId).toBeUndefined()
    expect(JSON.stringify(mcp)).not.toContain('clientSecret')
  })

  it('requests the same scopes the server supports', () => {
    expect([...auth.baseScopes].sort()).toEqual([...MCP_SCOPES].sort())
  })
})
