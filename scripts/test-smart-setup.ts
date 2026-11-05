/**
 * Test script for Smart Setup pipeline
 * Tests: 1) HTML preprocessor, 2) Claude API integration
 *
 * Usage: npx tsx scripts/test-smart-setup.ts
 *
 * Requires: CLAUDE_API_KEY and CLAUDE_BASE_URL in .env.local
 */

import * as dotenv from 'dotenv'
import path from 'path'

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.development') })

import { preprocessHtml, isHtmlTooSmall } from '../src/features/smart-setup/utils/html-preprocessor'
import { analyzeWebsite } from '../src/infrastructure/external/claude/claude.client'

const TEST_URL = 'https://fpt.vn/shop/s/khuyen-mai-wifi/'

// ─── Test 1: HTML Preprocessor ────────────────────────────────────────────────

async function testPreprocessor() {
  console.log('\n━━━ Test 1: HTML Preprocessor ━━━\n')

  // 1a. Fetch real page
  console.log(`Fetching ${TEST_URL}...`)
  const response = await fetch(TEST_URL, {
    headers: {
      'User-Agent': 'Li2Bot/1.0 (https://li2.ai; analytics setup)',
      Accept: 'text/html',
    },
  })

  if (!response.ok) {
    console.error(`FAIL: HTTP ${response.status}`)
    return null
  }

  const rawHtml = await response.text()
  const rawSize = new TextEncoder().encode(rawHtml).length
  console.log(`Raw HTML: ${(rawSize / 1024).toFixed(1)}KB`)

  // 1b. Preprocess
  const result = preprocessHtml(rawHtml)
  const cleanedSize = new TextEncoder().encode(result.html).length
  console.log(`Cleaned HTML: ${(cleanedSize / 1024).toFixed(1)}KB`)
  console.log(`Truncated: ${result.truncated}`)
  console.log(`Title: "${result.title}"`)
  console.log(`Description: "${result.description.substring(0, 100)}..."`)
  console.log(`Too small: ${isHtmlTooSmall(result.html)}`)

  // 1c. Verify scripts/styles stripped
  const hasScript = result.html.includes('<script')
  const hasStyle = result.html.includes('<style')
  const hasOnclick = result.html.includes('onclick=')
  console.log(`\nStripping check:`)
  console.log(`  <script> removed: ${!hasScript ? 'PASS' : 'FAIL'}`)
  console.log(`  <style> removed: ${!hasStyle ? 'PASS' : 'FAIL'}`)
  console.log(`  onclick= removed: ${!hasOnclick ? 'PASS' : 'FAIL'}`)

  // 1d. Verify semantic HTML preserved
  const hasForms = result.html.includes('<form')
  const hasButtons = result.html.includes('<button') || result.html.includes('<a ')
  const hasInputs = result.html.includes('<input')
  console.log(`\nSemantic HTML preserved:`)
  console.log(`  <form>: ${hasForms ? 'PASS' : 'WARN (no forms found)'}`)
  console.log(`  <button>/<a>: ${hasButtons ? 'PASS' : 'WARN'}`)
  console.log(`  <input>: ${hasInputs ? 'PASS' : 'WARN'}`)

  console.log(`\n✅ Preprocessor test complete`)
  return result
}

// ─── Test 2: Claude API Integration ───────────────────────────────────────────

async function testClaude(cleanedHtml: string, title: string, description: string) {
  console.log('\n━━━ Test 2: Claude API Integration ━━━\n')

  if (!process.env.CLAUDE_API_KEY) {
    console.error('FAIL: CLAUDE_API_KEY not set in .env.local')
    return
  }

  console.log(`CLAUDE_API_KEY: ${process.env.CLAUDE_API_KEY.substring(0, 10)}...`)
  console.log(`CLAUDE_BASE_URL: ${process.env.CLAUDE_BASE_URL || '(default)'}`)

  const contextPrefix = title ? `Page title: ${title}\nDescription: ${description}\n\n` : ''

  console.log(`\nCalling Claude API (this may take 5-10 seconds)...`)
  const startTime = Date.now()

  try {
    // Test with Vietnamese locale (since FPT is Vietnamese site)
    const result = await analyzeWebsite(contextPrefix + cleanedHtml, TEST_URL, 'vi')
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

    console.log(`\nDone in ${elapsed}s\n`)

    // Funnel suggestions
    console.log(`── Funnel Suggestions (${result.funnel_suggestions.length}) ──`)
    for (const funnel of result.funnel_suggestions) {
      console.log(`\n  📊 "${funnel.name}"`)
      console.log(`     ${funnel.description}`)
      console.log(`     Steps:`)
      for (const step of funnel.steps) {
        console.log(`       ${step.position}. ${step.name} — ${step.pattern_type} ${step.condition} "${step.pattern}" ${step.is_required ? '(required)' : '(optional)'}`)
      }
    }

    // Event rule suggestions
    console.log(`\n── Event Rule Suggestions (${result.event_rule_suggestions.length}) ──`)
    for (const rule of result.event_rule_suggestions) {
      console.log(`\n  ⚡ ${rule.name}`)
      console.log(`     ${rule.description}`)
      console.log(`     trigger: ${rule.trigger_type}`)
      if (rule.element_text) console.log(`     text: "${rule.element_text}"`)
      if (rule.selector_path) console.log(`     selector: ${rule.selector_path}`)
      if (rule.element_id) console.log(`     element_id: ${rule.element_id}`)
      if (rule.element_href) console.log(`     href: ${rule.element_href}`)
      if (rule.form_id) console.log(`     form_id: ${rule.form_id}`)
      if (rule.form_name) console.log(`     form_name: ${rule.form_name}`)
      if (rule.form_action) console.log(`     form_action: ${rule.form_action}`)
      if (rule.page_path) console.log(`     page: ${rule.page_path}`)
    }

    // Trigger type distribution
    const triggerTypes = new Set(result.event_rule_suggestions.map((r: any) => r.trigger_type))
    console.log(`\n  Trigger types used: ${[...triggerTypes].join(', ')}`)
    console.log(`  Has click rules: ${triggerTypes.has('click') ? 'YES' : 'NO'}`)
    console.log(`  Has form rules: ${triggerTypes.has('form_submit') || triggerTypes.has('form_fill') ? 'YES' : 'WARN - no form rules suggested'}`)
    console.log(`  Has visibility rules: ${triggerTypes.has('element_visibility') ? 'YES' : 'INFO - no visibility rules (page may lack distinct sections)'}`)

    // Validation
    console.log(`\n── Validation ──`)
    const funnelCount = result.funnel_suggestions.length
    const ruleCount = result.event_rule_suggestions.length
    console.log(`  Funnels: ${funnelCount} ${funnelCount >= 2 && funnelCount <= 4 ? 'PASS' : 'WARN (expected 2-4)'}`)
    console.log(`  Rules: ${ruleCount} ${ruleCount >= 3 && ruleCount <= 8 ? 'PASS' : 'WARN (expected 3-8)'}`)

    // Check event names are snake_case English
    const badNames = result.event_rule_suggestions.filter(r => !/^[a-z0-9_]+$/.test(r.name))
    console.log(`  Event names snake_case: ${badNames.length === 0 ? 'PASS' : `FAIL (${badNames.map(r => r.name).join(', ')})`}`)

    // Check funnel steps have valid pattern_types
    const validTypes = ['page_path', 'page_url', 'page_title', 'event']
    const badSteps = result.funnel_suggestions.flatMap(f =>
      f.steps.filter(s => !validTypes.includes(s.pattern_type))
    )
    console.log(`  Pattern types valid: ${badSteps.length === 0 ? 'PASS' : `FAIL (${badSteps.map(s => s.pattern_type).join(', ')})`}`)

    console.log(`\n✅ Claude integration test complete`)
  } catch (error: any) {
    console.error(`\n❌ Claude API error:`, error.message)
    if (error.status) console.error(`   Status: ${error.status}`)
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🧪 Smart Setup Pipeline Test')
  console.log(`Target: ${TEST_URL}`)

  const preprocessed = await testPreprocessor()

  if (preprocessed && !isHtmlTooSmall(preprocessed.html)) {
    await testClaude(preprocessed.html, preprocessed.title, preprocessed.description)
  } else {
    console.log('\n⚠️ Skipping Claude test — preprocessor failed or HTML too small')
  }

  console.log('\n━━━ Done ━━━')
}

main().catch(console.error)