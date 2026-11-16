import { request } from '@/services/axios'

/** API compatible OpenAI de Featherless (même hôte que le classifieur du script `tag:articles`). */
export const FEATHERLESS_API_BASE = 'https://api.featherless.ai/v1'
export const FEATHERLESS_TIMEOUT_MS = 40_000
export const FEATHERLESS_MAX_TOKENS = 2000

export type CompletionFn = (system: string, user: string) => Promise<string>

type ChatCompletion = { choices?: Array<{ message?: { content?: unknown } }> }

/**
 * Appel serveur à `/chat/completions` (modèle par défaut : `FEATHERLESS_CHAT_MODEL` de `configs/env.ts`). Serveur
 * uniquement : la clé ne transite que dans l'en-tête Authorization. L'erreur normalisée rejetée garde l'erreur axios
 * brute (en-têtes compris) : ne jamais la journaliser ni la renvoyer au client.
 */
export const createFeatherlessCompletion =
  (config: { apiKey: string; model: string }): CompletionFn =>
  async (system, user) => {
    const body = await request<ChatCompletion>({
      method: 'POST',
      url: `${FEATHERLESS_API_BASE}/chat/completions`,
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
    if (typeof content !== 'string') throw { status: 0, code: 'INVALID_PROVIDER_RESPONSE', raw: null }
    return content
  }
