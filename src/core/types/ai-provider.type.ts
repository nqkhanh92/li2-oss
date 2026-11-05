export enum AIProviderStatus {
  ACTIVE = 'active',
  EXHAUSTED = 'exhausted',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
}
export enum AIProviderType {
  FPT_CLOUD = 'fpt_cloud',
  GEMINI = 'gemini',
  OPENAI = 'openai',
}

export const MODEL_MAPPING: Record<AIProviderType, string> = {
  [AIProviderType.GEMINI]: 'gemini/gemini-flash-lite-latest',
  [AIProviderType.OPENAI]: 'gpt-4.1',
  [AIProviderType.FPT_CLOUD]: 'gpt-oss-120b',
}

export const EXTERNAL_BASE_URL_MAPPING: Partial<Record<AIProviderType, string>> = {
  [AIProviderType.FPT_CLOUD]: 'https://mkp-api.fptcloud.com',
}
