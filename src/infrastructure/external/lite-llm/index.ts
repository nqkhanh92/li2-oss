import { LiteLLM } from './lite-llm'

export const liteLLMService =
  process.env.NODE_ENV !== 'production'
    ? new LiteLLM()
    : globalThis._liteLLMService ?? (globalThis._liteLLMService = new LiteLLM())
