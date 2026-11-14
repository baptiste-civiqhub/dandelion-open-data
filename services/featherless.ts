import { request } from '@/services/axios'

export const FEATHERLESS_DEFAULT_BASE = 'https://api.featherless.ai/v1'
export const FEATHERLESS_DEFAULT_MODEL = 'zai-org/GLM-5.2'
export const FEATHERLESS_TIMEOUT_MS = 20_000
export const FEATHERLESS_MAX_TOKENS = 400

export type CompletionFn = (system: string, user: string) => Promise<string>

type ChatCompletion = { choices?: Array<{ message?: { content?: unknown } }> }

/**
 * Appel serveur à /chat/completions (API compatible OpenAI de Featherless). Serveur uniquement : la clé ne
 * transite que dans l'en-tête Authorization et n'est jamais journalisée.
 */
export const createFeatherlessCompletion =
  (config: { apiKey: string; baseUrl: string; model: string }): CompletionFn =>
  async (system, user) => {
    const body = await request<ChatCompletion>({
      method: 'POST',
      url: `${config.baseUrl.replace(/\/$/, '')}/chat/completions`,
      timeout: FEATHERLESS_TIMEOUT_MS,
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      data: {
        model: config.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        temperature: 0,
        max_tokens: FEATHERLESS_MAX_TOKENS
      }
    })
    const content = body.choices?.[0]?.message?.content
    if (typeof content !== 'string') throw { status: 0, code: 'INVALID_PROVIDER_RESPONSE', detail: 'no content' }
    return content
  }
