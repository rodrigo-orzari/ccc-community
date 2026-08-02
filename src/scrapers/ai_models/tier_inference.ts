/**
 * Shared capability-tier / modality inference, used by every scraper that
 * can't read a genuine "Frontier/Standard/Efficient" tier or a clean
 * modality label straight off the vendor's page.
 *
 * Split out of gcp_vertex_api.ts (2026-07-28) when `modelTier` stopped being
 * overloaded to carry both capability tier ("how powerful is this model
 * relative to its peers") and modality ("what kind of model is this — Chat,
 * Coding, Embedding, ..."). Every scraper needs the same two answers, so the
 * logic lives here once instead of being copy-pasted per vendor.
 *
 * Name-based only (no closures over DOM state) so it's safe to import from
 * both browser-evaluated code paths' *callers* (the Node-side wrapper
 * scrapers) — NOT from generic_table_parser.ts itself, which must stay
 * closure-free because Playwright serializes its source into the browser
 * context (see that file's top-of-file comment).
 */

export const CANONICAL_MODALITIES = [
  'Chat',
  'Coding',
  'Embedding',
  'Reranking',
  'Image',
  'Audio',
  'Reasoning',
] as const;

/**
 * Infers genuine capability tier (Frontier / Standard / Efficient) from a
 * model's name. This is the ladder used site-wide for the "Model Tier"
 * filter — NOT the modality/use-case classification (see normalizeModality
 * below).
 *
 * Heuristic, not authoritative: vendors don't publish a machine-readable
 * capability tier, so this infers from naming conventions ("pro" = frontier,
 * "lite/flash/mini" = efficient, etc). Falls back to 'Standard' when nothing
 * matches — the safe middle default rather than leaving the field blank,
 * since every AI model must have exactly one of the three tier values.
 */
export function inferTier(name: string): string {
  const n = name.toLowerCase();
  if (/\bopus\b/.test(n)) return 'Frontier';
  if (/\bhaiku\b/.test(n)) return 'Efficient';
  if (/pro\b|\bultra\b|\bmax\b/.test(n)) return 'Frontier';
  if (/lite|flash|mini|small|gemma|20b|8b\b|turbo/.test(n)) return 'Efficient';
  return 'Standard';
}

/**
 * Normalizes free-text modality/type values (whatever a vendor's table
 * literally says in its "Type"/"Category" column, or a heuristic guess from
 * the model name) onto the canonical modality vocabulary used site-wide.
 *
 * Defaults to 'Chat' — the large majority of catalogued models are
 * general-purpose chat/completion models, and vendors that don't label type
 * at all are overwhelmingly serving this case (confirmed against AWS
 * Bedrock/Azure AI Foundry tables, which mostly have no Type column).
 */
export function normalizeModality(raw: string | undefined | null, modelName: string): string {
  const r = (raw ?? '').toLowerCase().trim();
  const n = modelName.toLowerCase();

  const test = (re: RegExp) => re.test(r) || re.test(n);

  if (test(/embed/)) return 'Embedding';
  if (test(/rerank/)) return 'Reranking';
  if (test(/\bimage\b|vision|ocr|diffusion|stable-diffusion|dall-?e/)) return 'Image';
  if (test(/\baudio\b|speech|tts|whisper|transcri/)) return 'Audio';
  if (test(/\bcod(e|ing)\b|coder/)) return 'Coding';
  if (test(/reasoning|\bthinking\b|\br1\b/)) return 'Reasoning';
  if (test(/\bchat\b|text|completion|instruct/)) return 'Chat';

  return 'Chat';
}
