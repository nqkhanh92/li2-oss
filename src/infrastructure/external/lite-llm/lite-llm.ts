import {
  AIProviderType,
  EXTERNAL_BASE_URL_MAPPING,
  MODEL_MAPPING,
} from '@/core/types/ai-provider.type'
import { logger } from '@/infrastructure/logging/logger'
import { AppError } from '@/infrastructure/response/errors/domain.errors'
import { APIError, OpenAI } from 'openai'
import { z } from 'zod'
import { zodResponseFormat } from 'openai/helpers/zod'
import { decrypt } from '@/shared/utils/decrypt-key'

const log = logger.child({
  service: 'lite-llm',
})

/**
 * Schema for AI slug generation response
 */
const responseSchema = z.object({
  slug: z.string().min(1).max(100),
  alternatives: z.array(z.string().min(1).max(100)).length(2),
  confidence_score: z.number().min(0).max(1),
})

export type SlugGenerationResponse = z.infer<typeof responseSchema>

/**
 * Configuration constants
 */
const DEFAULT_TIMEOUT_MS = 30000 // 30 seconds for AI calls
const MAX_RETRIES = 1

export class LiteLLM {
  private static openAIClient: OpenAI | null = null

  /**
   * Get or create OpenAI client instance
   */
  private static getClient(provider?: AIProviderType, decodedKey?: string): OpenAI {
    if (provider && decodedKey) {
      const externalBaseUrl = EXTERNAL_BASE_URL_MAPPING[provider]
      if (externalBaseUrl) {
        log.info(
          { provider, decodedKey, externalBaseUrl },
          'Creating OpenAI client for external AI Provider'
        )
        return new OpenAI({
          apiKey: `${decodedKey.slice(0, 5)}...`, // Will be overridden per request
          baseURL: externalBaseUrl,
          timeout: DEFAULT_TIMEOUT_MS,
          maxRetries: 0, // We handle retries manually
        })
      }
    }

    if (!this.openAIClient) {
      if (!process.env.LITE_LLM_API_URL) {
        throw new AppError('LITE_LLM_API_URL is not configured')
      }
      this.openAIClient = new OpenAI({
        apiKey: 'placeholder', // Will be overridden per request
        baseURL: process.env.LITE_LLM_API_URL,
        timeout: DEFAULT_TIMEOUT_MS,
        maxRetries: 0, // We handle retries manually
      })
    }
    return this.openAIClient
  }

  protected validateInputs(prompt: string, provider: AIProviderType, apiKey: string) {
    if (!apiKey) {
      log.error({ provider, method: 'completions' }, 'API key not provided')
      throw new AppError('API key is required for AI completion')
    }

    if (!prompt?.trim()) {
      log.error({ provider, method: 'completions' }, 'Empty prompt provided')
      throw new AppError('Prompt cannot be empty')
    }
  }

  protected getDecryptedKey(apiKey: string) {
    try {
      if (!process.env.LITE_LLM_KEY_SALT) {
        log.error(
          { method: 'completions' },
          'LITE_LLM_KEY_SALT environment variable is not configured'
        )
        throw new AppError('LITE_LLM_KEY_SALT environment variable is not configured')
      }
      return decrypt(apiKey, process.env.LITE_LLM_KEY_SALT)
    } catch (error) {
      log.error({ error, method: 'completions' }, 'Failed to decrypt API key')
      throw new AppError('Failed to decrypt API key')
    }
  }

  protected getParsedResult<T>(content: string | null, schema: z.ZodType<T>) {
    if (!content) {
      log.error({ content, method: 'completions' }, 'AI Return No content')
      return null
    }

    try {
      const rawParsed = JSON.parse(content)
      return schema.parse(rawParsed)
    } catch (parseError) {
      log.error(
        { error: parseError, content, method: 'completions' },
        'Failed to parse AI response'
      )
      return null
    }
  }

  async completionWithSchema<T>(
    prompt: string,
    provider: AIProviderType,
    apiKey: string,
    schema: z.ZodType<T>
  ): Promise<{ success: boolean; data: T | null; error?: string }> {
    // Validate inputs
    this.validateInputs(prompt, provider, apiKey)

    const decodedKey = this.getDecryptedKey(apiKey)
    const model = MODEL_MAPPING[provider]

    if (!model) {
      log.error({ provider, method: 'completions' }, 'Unsupported AI provider')
      throw new AppError(`Unsupported AI provider: ${provider}`)
    }
    try {
      const client = LiteLLM.getClient(provider, decodedKey)
      const completion = await client.chat.completions.create(
        {
          model,
          messages: [
            {
              role: 'system',
              content: 'You are a data mapping expert',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          response_format: zodResponseFormat(schema, 'data'),
          temperature: 0.7, // Balance between creativity and consistency
        },
        {
          headers: {
            Authorization: `Bearer ${decodedKey}`,
          },
          timeout: 30000,
        }
      )
      const content = completion.choices[0]?.message?.content
      const parsed = this.getParsedResult(content, schema)
      if (!parsed) {
        log.error({ content, method: 'completions' }, 'Failed to parse AI response')
        return {
          success: false,
          data: null,
          error: 'Failed to parse AI response',
        }
      }
      return {
        success: true,
        data: parsed,
      }
    } catch (error) {
      log.error({ provider, method: 'completions' }, `${error}`)
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Generate slug completions using LiteLLM API with structured output
   * @param prompt - The prompt to generate completions for
   * @param provider - The AI provider to use (Gemini or OpenAI)
   * @param apiKey - Encrypted API key for the provider
   * @param options - Callback handlers for different error scenarios
   * @returns Promise resolving to completion result
   */
  async completions(
    prompt: string,
    provider: AIProviderType,
    apiKey: string,
    options?: {
      onRateLimit?: () => void | Promise<void>
      onInvalidKey?: () => void | Promise<void>
    }
  ): Promise<{
    success: boolean
    data: (SlugGenerationResponse & { provider_used: AIProviderType }) | null
    error?: string
  }> {
    const startTime = Date.now()

    // Validate inputs
    if (!apiKey) {
      log.error({ provider, method: 'completions' }, 'API key not provided')
      throw new AppError('API key is required for AI completion')
    }

    if (!prompt?.trim()) {
      log.error({ provider, method: 'completions' }, 'Empty prompt provided')
      throw new AppError('Prompt cannot be empty')
    }

    // Decrypt API key
    let decodedKey: string
    try {
      if (!process.env.LITE_LLM_KEY_SALT) {
        throw new AppError('LITE_LLM_KEY_SALT environment variable is not configured')
      }
      decodedKey = decrypt(apiKey, process.env.LITE_LLM_KEY_SALT)
    } catch (error) {
      log.error({ error, provider, method: 'completions' }, 'Failed to decrypt API key')
      throw new AppError('Failed to decrypt API key')
    }

    const model = MODEL_MAPPING[provider]
    if (!model) {
      log.error({ provider, method: 'completions' }, 'Unsupported AI provider')
      throw new AppError(`Unsupported AI provider: ${provider}`)
    }

    log.info(
      {
        provider,
        model,
        promptLength: prompt.length,
        method: 'completions',
      },
      'Starting AI completion request'
    )

    try {
      const client = LiteLLM.getClient(provider, decodedKey)
      console.log([
        {
          role: 'system',
          content:
            'You are an expert SEO specialist that creates memorable, keyword-rich URL slugs. Generate slugs that are concise (2-6 words), use hyphens between words, contain relevant keywords, and accurately represent the page content. Focus on clarity and search engine optimization.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ])

      const completion = await client.chat.completions.create(
        {
          model,
          messages: [
            {
              role: 'system',
              content:
                'You are an expert SEO specialist that creates memorable, keyword-rich URL slugs. Generate slugs that are concise (2-6 words), use hyphens between words, contain relevant keywords, and accurately represent the page content. Focus on clarity and search engine optimization.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          response_format: zodResponseFormat(responseSchema, 'slug'),
          temperature: 0.7, // Balance between creativity and consistency
        },
        {
          headers: {
            Authorization: `Bearer ${decodedKey}`,
          },
        }
      )

      // Validate response
      const content = completion.choices[0]?.message?.content
      if (!content) {
        log.error(
          { provider, model, completion, method: 'completions' },
          'AI returned empty response'
        )
        return {
          success: false,
          data: null,
          error: 'AI returned empty response',
        }
      }

      // Parse and validate with Zod schema
      let parsed: SlugGenerationResponse
      try {
        const rawParsed = JSON.parse(content)
        parsed = responseSchema.parse(rawParsed)
      } catch (parseError) {
        log.error(
          { error: parseError, content, provider, method: 'completions' },
          'Failed to parse AI response'
        )
        return {
          success: false,
          data: null,
          error: 'Invalid AI response format',
        }
      }

      const duration = Date.now() - startTime
      log.info(
        {
          provider,
          model,
          duration,
          slug: parsed.slug,
          confidence: parsed.confidence_score,
          method: 'completions',
        },
        'AI completion succeeded'
      )

      return {
        success: true,
        data: { ...parsed, provider_used: provider },
      }
    } catch (error) {
      const duration = Date.now() - startTime

      // Handle API errors
      if (error instanceof APIError) {
        log.warn(
          {
            error: error.message,
            status: error.status,
            provider,
            model,
            duration,
            method: 'completions',
          },
          'AI API error occurred'
        )

        // Rate limit or service unavailable
        if (error.status === 429 || error.status === 503) {
          await options?.onRateLimit?.()
          return {
            success: false,
            data: null,
            error: `Rate limit or service unavailable (${error.status})`,
          }
        }

        // Invalid/expired API key
        if (error.status === 401 || error.status === 403) {
          await options?.onInvalidKey?.()
          return {
            success: false,
            data: null,
            error: 'Invalid or expired API key',
          }
        }

        // Other API errors
        return {
          success: false,
          data: null,
          error: `API error: ${error.message}`,
        }
      }

      // Handle unknown errors
      log.error(
        {
          error,
          provider,
          model,
          duration,
          method: 'completions',
        },
        'Unexpected error during AI completion'
      )

      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}

export const liteLLMService = new LiteLLM()
