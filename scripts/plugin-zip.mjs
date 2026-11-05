#!/usr/bin/env node
/**
 * Build the ChatGPT plugin submission ZIP for the Li2 MCP server.
 *
 * Schema source: https://developers.openai.com/plugins/build/plugins (and
 * .../plugins/deploy/submission), read 2026-10-20. See plugin/chatgpt/README.md.
 *
 * Usage:
 *   node scripts/plugin-zip.mjs                      # prod, https://app.li2.ai
 *   BASE_URL=https://app.example.com node scripts/plugin-zip.mjs
 *   MCP_URL=https://host/api/mcp DEMO_URL=https://… node scripts/plugin-zip.mjs
 *   node scripts/plugin-zip.mjs --validate-only
 */

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceDir = join(repoRoot, 'plugin', 'chatgpt')
const stageDir = join(repoRoot, 'dist', 'plugin-chatgpt')
const iconSource = join(repoRoot, 'public', 'images', 'mini_logo.svg')

const DEFAULT_BASE_URL = 'https://app.li2.ai'
const baseUrl = (process.env.BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '')
const mcpUrl = process.env.MCP_URL || `${baseUrl}/api/mcp`
const demoUrl = process.env.DEMO_URL || ''
const outFile = process.env.OUT || join(repoRoot, 'dist', 'li2-chatgpt-plugin.zip')
const validateOnly = process.argv.includes('--validate-only')

const errors = []
const warnings = []
const fail = (message) => errors.push(message)
const warn = (message) => warnings.push(message)

// ---------------------------------------------------------------- stage files

rmSync(stageDir, { recursive: true, force: true })
mkdirSync(join(stageDir, 'assets'), { recursive: true })

const plugin = JSON.parse(readFileSync(join(sourceDir, 'plugin.json'), 'utf8'))
const mcp = JSON.parse(readFileSync(join(sourceDir, 'mcp.json'), 'utf8'))

// The committed manifests carry the production host. Rewrite it so one package
// definition can also be pointed at LiHi or a preview host.
const retarget = (value) =>
  typeof value === 'string' ? value.split(DEFAULT_BASE_URL).join(baseUrl) : value

const openai = plugin.extensions?.['com.openai'] ?? {}
const iface = openai.interface ?? {}
for (const key of ['websiteURL', 'supportURL', 'privacyPolicyURL', 'termsOfServiceURL']) {
  if (iface[key]) iface[key] = retarget(iface[key])
}
const serverNames = Object.keys(mcp.mcpServers ?? {})
if (serverNames.length === 1) mcp.mcpServers[serverNames[0]].url = mcpUrl
if (demoUrl) {
  openai.review = openai.review ?? {}
  openai.review.demo_recording_url = demoUrl
}

copyFileSync(iconSource, join(stageDir, 'assets', 'icon.svg'))
copyFileSync(iconSource, join(stageDir, 'assets', 'logo.svg'))
writeFileSync(join(stageDir, 'plugin.json'), `${JSON.stringify(plugin, null, 2)}\n`)
writeFileSync(join(stageDir, 'mcp.json'), `${JSON.stringify(mcp, null, 2)}\n`)

// ------------------------------------------------------------------ validate

const isHttps = (value) => typeof value === 'string' && /^https:\/\/[^\s@#]+$/.test(value)

const required = (object, key, label) => {
  const value = object?.[key]
  if (value === undefined || value === null || value === '') {
    fail(`${label} is required`)
    return false
  }
  return true
}

const maxLength = (value, limit, label) => {
  if (typeof value === 'string' && value.length > limit) {
    fail(`${label} is ${value.length} characters, limit is ${limit}`)
  }
}

const httpsField = (object, key, label, limit = 1024) => {
  if (!required(object, key, label)) return
  if (!isHttps(object[key])) fail(`${label} must be an HTTPS URL without credentials`)
  maxLength(object[key], limit, label)
}

// plugin.json — portable identity (agent-plugins 1.0.0 schema)
if (plugin.$schema !== 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json') {
  fail('plugin.json $schema must be the agent-plugins 1.0.0 plugin schema URL')
}
if (required(plugin, 'name', 'plugin.json name')) {
  maxLength(plugin.name, 64, 'plugin.json name')
  if (!/^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(plugin.name)) {
    fail('plugin.json name must be lowercase letters, numbers and single hyphens')
  }
}
if (required(plugin, 'version', 'plugin.json version')) {
  if (!/^\d+\.\d+\.\d+/.test(plugin.version)) {
    fail('plugin.json version must be an explicit semantic version for submission')
  }
}
maxLength(plugin.description, 4000, 'plugin.json description')
maxLength(plugin.author?.name, 120, 'plugin.json author.name')
maxLength(plugin.author?.email, 320, 'plugin.json author.email')
if (plugin.author?.url && !isHttps(plugin.author.url)) fail('plugin.json author.url must be HTTPS')
if (plugin.homepage && !isHttps(plugin.homepage)) fail('plugin.json homepage must be HTTPS')

const allowedRootKeys = new Set([
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
])
for (const key of Object.keys(plugin)) {
  if (!allowedRootKeys.has(key)) fail(`plugin.json has unknown root field "${key}"`)
}

// plugin.json — listing metadata for public submission
maxLength(iface.displayName, 30, 'interface.displayName')
required(iface, 'displayName', 'interface.displayName')
maxLength(iface.shortDescription, 30, 'interface.shortDescription')
required(iface, 'shortDescription', 'interface.shortDescription')
maxLength(iface.longDescription, 4000, 'interface.longDescription')
required(iface, 'longDescription', 'interface.longDescription')
maxLength(iface.developerName, 80, 'interface.developerName')
required(iface, 'developerName', 'interface.developerName')
required(iface, 'category', 'interface.category')
httpsField(iface, 'websiteURL', 'interface.websiteURL')
httpsField(iface, 'supportURL', 'interface.supportURL')
httpsField(iface, 'privacyPolicyURL', 'interface.privacyPolicyURL')
httpsField(iface, 'termsOfServiceURL', 'interface.termsOfServiceURL')

if (iface.capabilities) {
  if (iface.capabilities.length > 20) fail('interface.capabilities allows at most 20 entries')
  iface.capabilities.forEach((item, index) =>
    maxLength(item, 120, `interface.capabilities[${index}]`)
  )
}
const prompts = Array.isArray(iface.defaultPrompt)
  ? iface.defaultPrompt
  : iface.defaultPrompt
    ? [iface.defaultPrompt]
    : []
if (prompts.length > 3) fail('interface.defaultPrompt allows at most 3 prompts')
prompts.forEach((item, index) => maxLength(item, 128, `interface.defaultPrompt[${index}]`))
for (const key of ['brandColor', 'brandColorDark']) {
  if (iface[key] && !/^#[0-9A-Fa-f]{6}$/.test(iface[key])) {
    fail(`interface.${key} must be #RRGGBB`)
  }
}

// icons must exist in the package and be square, at least 48x48
for (const key of ['logo', 'composerIcon']) {
  const relative = iface[key]
  if (!relative) {
    fail(`interface.${key} is required in a distributed package`)
    continue
  }
  if (!relative.startsWith('./')) fail(`interface.${key} must start with ./`)
  const staged = join(stageDir, relative.replace(/^\.\//, ''))
  if (!existsSync(staged)) {
    fail(`interface.${key} points at ${relative}, which is not in the package`)
    continue
  }
  if (relative.endsWith('.svg')) {
    const svg = readFileSync(staged, 'utf8').slice(0, 2000)
    const viewBox = svg.match(/viewBox="([\d.\s-]+)"/)
    const dimensions = viewBox
      ? viewBox[1].trim().split(/\s+/).slice(2).map(Number)
      : [svg.match(/width="(\d+)"/)?.[1], svg.match(/height="(\d+)"/)?.[1]].map(Number)
    const [width, height] = dimensions
    if (!(width === height && width >= 48)) {
      fail(`interface.${key} SVG must be square and at least 48x48, saw ${width}x${height}`)
    }
  }
}

// plugin.json — review material
const review = openai.review ?? {}
const positive = review.test_cases?.positive ?? []
const negative = review.test_cases?.negative ?? []
if (positive.length !== 5) {
  fail(`review.test_cases.positive must hold exactly 5 cases, saw ${positive.length}`)
}
if (negative.length !== 3) {
  fail(`review.test_cases.negative must hold exactly 3 cases, saw ${negative.length}`)
}
positive.forEach((item, index) => {
  for (const key of ['description', 'prompt', 'tools_triggered', 'expected_behavior']) {
    required(item, key, `review.test_cases.positive[${index}].${key}`)
  }
  maxLength(item.description, 4000, `review.test_cases.positive[${index}].description`)
})
negative.forEach((item, index) => {
  for (const key of ['description', 'prompt']) {
    required(item, key, `review.test_cases.negative[${index}].${key}`)
  }
})
if (review.demo_recording_url) {
  if (!isHttps(review.demo_recording_url)) fail('review.demo_recording_url must be HTTPS')
} else {
  warn('review.demo_recording_url is empty — MCP review needs a video URL (pass DEMO_URL=…)')
}

// A ZIP carrying app references or lifecycle hooks cannot be submitted.
for (const key of ['apps', 'hooks']) {
  if (openai[key]) fail(`extensions."com.openai".${key} blocks ZIP submission — remove it`)
}
// Credentials and reviewer notes are rejected by ZIP metadata; use the portal form.
const serialized = JSON.stringify({ plugin, mcp })
for (const banned of ['test_credentials', 'reviewer_instructions', 'clientSecret']) {
  if (serialized.includes(`"${banned}"`)) fail(`${banned} must not appear in the package`)
}

// mcp.json
if (mcp.$schema !== 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json') {
  fail('mcp.json $schema must be the agent-plugins 1.0.0 MCP schema URL')
}
for (const key of Object.keys(mcp)) {
  if (key !== '$schema' && key !== 'mcpServers') fail(`mcp.json has unknown root field "${key}"`)
}
if (serverNames.length !== 1) {
  fail(
    `mcp.json must declare exactly one server: only one can be connected per plugin, and ` +
      `plugin-level review.test_cases requires a single server (saw ${serverNames.length})`
  )
}
for (const name of serverNames) {
  const server = mcp.mcpServers[name]
  if (server.type !== 'streamable-http') {
    fail(`mcp.json server "${name}" must use type "streamable-http" for public submission`)
  }
  if (!isHttps(server.url)) fail(`mcp.json server "${name}" url must be an HTTPS URL`)
  if (server.headers && Object.keys(server.headers).length > 0) {
    fail(`mcp.json server "${name}" has headers — public submission rejects nonempty headers`)
  }
  const auth = server.extensions?.['com.openai']?.auth
  if (!auth) {
    fail(`mcp.json server "${name}" is missing extensions."com.openai".auth`)
    continue
  }
  if (!['none', 'oauth', 'mixed', 'api_key'].includes(auth.type)) {
    fail(`mcp.json server "${name}" auth.type "${auth.type}" is not a documented value`)
  }
  if (auth.type === 'api_key') {
    warn(`server "${name}" declares api_key auth, which the submission portal cannot connect`)
  }
  if (auth.client) {
    if (!['provided', 'dcr', 'cimd'].includes(auth.client.mode)) {
      fail(`mcp.json server "${name}" auth.client.mode must be provided, dcr or cimd`)
    }
    if (auth.client.mode === 'provided' && !auth.client.clientId) {
      fail(`mcp.json server "${name}" needs auth.client.clientId for a provided client`)
    }
    if (auth.client.mode !== 'provided' && auth.client.clientId) {
      fail(`mcp.json server "${name}" must not carry clientId with a ${auth.client.mode} client`)
    }
  }
  for (const key of ['authorizationUrl', 'tokenUrl', 'registrationUrl']) {
    if (auth[key] && !isHttps(auth[key])) fail(`mcp.json server "${name}" ${key} must be HTTPS`)
  }
  for (const key of ['baseScopes', 'defaultScopes']) {
    for (const scope of auth[key] ?? []) {
      if (typeof scope !== 'string' || !scope.trim()) {
        fail(`mcp.json server "${name}" ${key} entries must be non-whitespace strings`)
      }
    }
  }
}

// ------------------------------------------------------------------- report

for (const message of warnings) console.warn(`warning: ${message}`)
if (errors.length > 0) {
  for (const message of errors) console.error(`error: ${message}`)
  console.error(`\n${errors.length} validation error(s); no ZIP written.`)
  process.exit(1)
}

console.log(`plugin: ${plugin.name} ${plugin.version} → ${mcpUrl}`)
console.log(`listing URLs on ${baseUrl}`)

if (validateOnly) {
  console.log('validate-only: staged package is valid, ZIP skipped.')
  process.exit(0)
}

// `archiver` and `adm-zip` are not dependencies of this repo and this package is
// built by hand a few times a year, so shell out to the system `zip` instead of
// adding a dependency. Install `zip` (preinstalled on macOS and most Linux) to build.
rmSync(outFile, { force: true })
mkdirSync(dirname(outFile), { recursive: true })
try {
  execFileSync('zip', ['-r', '-X', '-q', outFile, 'plugin.json', 'mcp.json', 'assets'], {
    cwd: stageDir,
    stdio: ['ignore', 'inherit', 'inherit'],
  })
} catch (error) {
  console.error('error: the `zip` CLI failed or is not installed (macOS/Linux ship it).')
  console.error(String(error.message ?? error))
  process.exit(1)
}

console.log(`wrote ${outFile}`)
