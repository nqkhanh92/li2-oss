import { analyzeConversions, selectPagesForCrawling } from '@/infrastructure/external/claude/claude.client'
import {
  preprocessHtml,
  isHtmlTooSmall,
  extractInternalLinks,
} from '@/features/smart-setup/utils/html-preprocessor'
import { ensureOrgMember } from '@/shared/lib/permission/permissions'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { ADVANCED_FEATURE_KEYS } from '@/shared/types/plan-permission'
import { orgCreditService } from '@/core/services/billing-usage/org-credit.service'
import { isCloud, UNMETERED_AI_CREDITS } from '@/shared/constants/edition'
import { SmartSetupError } from './smart-setup.service'
import { logger } from '@/infrastructure/logging/logger'
import type {
  SupportedLocale,
  ConversionAnalysisResult,
} from '@/infrastructure/external/claude/claude.types'

const log = logger.child({ service: 'ConversionSetupService' })

const FETCH_TIMEOUT_MS = 10_000
const MAX_SUBPAGES = 4

export class ConversionSetupService {
  async analyze(
    orgId: string,
    url: string,
    locale: SupportedLocale
  ): Promise<ConversionAnalysisResult> {
    await ensureOrgMember(orgId)
    await ensureOrgPlan(orgId, ADVANCED_FEATURE_KEYS.SMART_SETUP)

    // Chỉ bản cloud đo tín dụng — bản OSS dùng khoá LLM của chính người vận hành.
    if (isCloud) {
      const credits = await orgCreditService.getOrgCredit(orgId)
      if (credits.ai_credits_balance < 1) {
        throw new SmartSetupError(
          'INSUFFICIENT_CREDITS',
          "You've used all your AI credits. Upgrade your plan for more."
        )
      }
    }

    log.info({ orgId, url }, 'Starting conversion analysis')

    const rawHtml = await this.fetchHtml(url)
    const { html: mainHtml, title } = preprocessHtml(rawHtml)
    log.info({ orgId, url, title, chars: mainHtml.length }, 'Main page fetched')

    if (isHtmlTooSmall(mainHtml)) {
      log.warn({ orgId, url, chars: mainHtml.length }, 'Main page content too small, aborting')
      throw new SmartSetupError(
        'PAGE_TOO_SMALL',
        "This page doesn't have enough content to analyze. Try a different page."
      )
    }

    if (isCloud) await orgCreditService.reduceOrgCredit(orgId, 1)

    // Let AI pick the most conversion-relevant subpages to crawl
    const allSubpageUrls = extractInternalLinks(rawHtml, url)
    const { selected: subpageUrls, reasoning: selectionReasoning } = await selectPagesForCrawling(allSubpageUrls, url, MAX_SUBPAGES)
    log.info(
      { orgId, url, found: allSubpageUrls.length, crawling: subpageUrls.length, subpageUrls, selectionReasoning },
      'AI selected subpages to crawl'
    )

    const subpageResults = await Promise.allSettled(
      subpageUrls.map(async (subUrl) => {
        const raw = await this.fetchHtml(subUrl)
        const { html } = preprocessHtml(raw)
        log.info({ orgId, subUrl, chars: html.length }, 'Subpage crawled')
        return { url: subUrl, html }
      })
    )

    const mainSection = `=== PAGE: ${new URL(url).pathname || '/'} (${title || 'Home'}) ===\n${mainHtml}`
    const pageSections: string[] = [mainSection]
    let failedCount = 0
    let totalChars = mainSection.length

    for (const result of subpageResults) {
      if (result.status === 'fulfilled') {
        const section = `=== PAGE: ${new URL(result.value.url).pathname} ===\n${result.value.html}`
        pageSections.push(section)
        totalChars += section.length
      } else {
        failedCount++
      }
    }

    if (failedCount > 0) {
      log.warn({ orgId, failedCount, total: subpageUrls.length }, 'Some subpages failed to crawl')
    }
    log.info({ orgId, pages: pageSections.length, totalChars }, 'Sending to Claude')

    const result = await analyzeConversions(pageSections.join('\n\n'), url, locale)
    log.info(
      { orgId, count: result.suggestions.length, names: result.suggestions.map((s) => s.name) },
      'Claude analysis complete'
    )

    return result
  }

  /**
   * Scan a site's homepage to find the most likely signup/registration page URL.
   * Uses URL-pattern heuristics only — no AI credits consumed.
   */
  async findSignupPage(orgId: string, siteUrl: string): Promise<{ found: true; url: string } | { found: false }> {
    await ensureOrgMember(orgId)

    let rawHtml: string
    try {
      rawHtml = await this.fetchHtml(siteUrl)
    } catch {
      return { found: false }
    }

    const links = extractInternalLinks(rawHtml, siteUrl)

    const SIGNUP_PATTERNS = [
      /\/(register|signup|sign-up|sign_up|join|create-account|create_account|get-started|get_started|free-trial|trial|onboarding|dang-ky|tao-tai-khoan)/i,
    ]
    const match = links.find((url) => SIGNUP_PATTERNS.some((p) => p.test(url)))

    if (match) return { found: true, url: match }
    return { found: false }
  }

  /**
   * Analyze conversion opportunities from pre-captured browser HTML (AI setup flow).
   * The SDK sends rendered page HTML via postMessage — no server-side fetch needed.
   */
  async analyzeFromHtml(
    orgId: string,
    html: string,
    pageUrl: string,
    locale: SupportedLocale
  ): Promise<ConversionAnalysisResult & { credits_used: 1; credits_remaining: number }> {
    await ensureOrgMember(orgId)
    await ensureOrgPlan(orgId, ADVANCED_FEATURE_KEYS.SMART_SETUP)

    // Chỉ bản cloud đo tín dụng — bản OSS dùng khoá LLM của chính người vận hành.
    if (isCloud) {
      const credits = await orgCreditService.getOrgCredit(orgId)
      if (credits.ai_credits_balance < 1) {
        throw new SmartSetupError(
          'INSUFFICIENT_CREDITS',
          "You've used all your AI credits. Upgrade your plan for more."
        )
      }
    }

    if (isHtmlTooSmall(html)) {
      throw new SmartSetupError(
        'PAGE_TOO_SMALL',
        "This page doesn't have enough content to analyze. Navigate to your signup page and try again."
      )
    }

    log.info({ orgId, pageUrl, chars: html.length }, 'Analyzing pre-captured HTML for registration form')
    if (isCloud) await orgCreditService.reduceOrgCredit(orgId, 1)

    const result = await analyzeConversions(html, pageUrl, locale)
    const updated = isCloud ? await orgCreditService.getOrgCredit(orgId) : null

    log.info({ orgId, count: result.suggestions.length }, 'AI setup form detection complete')

    return {
      ...result,
      credits_used: 1,
      credits_remaining: updated?.ai_credits_balance ?? UNMETERED_AI_CREDITS,
    }
  }

  private async fetchHtml(url: string): Promise<string> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Li2Bot/1.0 (https://li2.ai; analytics setup)',
          Accept: 'text/html',
        },
      })

      if (!response.ok) {
        log.warn({ url, status: response.status }, 'Fetch failed')
        throw new SmartSetupError(
          'FETCH_FAILED',
          `We couldn't reach this website (HTTP ${response.status}). Please check the URL and try again.`
        )
      }

      return await response.text()
    } catch (error: any) {
      if (error instanceof SmartSetupError) throw error
      if (error.name === 'AbortError') {
        throw new SmartSetupError(
          'FETCH_TIMEOUT',
          'The website took too long to respond. Please check the URL and try again.'
        )
      }
      throw new SmartSetupError(
        'FETCH_FAILED',
        "We couldn't reach this website. Please check the URL and try again."
      )
    } finally {
      clearTimeout(timeout)
    }
  }
}

export const conversionSetupService =
  process.env.NODE_ENV !== 'production'
    ? new ConversionSetupService()
    : (globalThis._conversionSetupService ??
      (globalThis._conversionSetupService = new ConversionSetupService()))
