import type {RecommendationRequest} from "@/lib/recommendation-contracts";
import type {VerifiedCatalogEntry} from "@/lib/netflix-catalog";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-3.6-flash";
const DEFAULT_FALLBACK_MODEL = "google/gemini-3.5-flash";

async function readSecret(name: string): Promise<string> {
  try {
    const {env} = await import("cloudflare:workers");
    const value = (env as unknown as Record<string, unknown>)[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  } catch {
    // Local Node/Vinext development uses process.env.
  }
  return process.env[name]?.trim() || "";
}

function extractIds(payload: unknown, allowed: Set<string>): string[] | null {
  if (!payload || typeof payload !== "object") return null;
  const choices = (payload as {choices?: unknown}).choices;
  if (!Array.isArray(choices) || choices.length < 1) return null;
  const choice = choices[0];
  const message = choice && typeof choice === "object" ? (choice as {message?: unknown}).message : null;
  const content = message && typeof message === "object" ? (message as {content?: unknown}).content : null;
  if (typeof content !== "string") return null;
  let decoded: unknown;
  try {
    decoded = JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/gu, ""));
  } catch {
    return null;
  }
  if (!decoded || typeof decoded !== "object" || !Array.isArray((decoded as {ids?: unknown}).ids)) return null;
  const ids = (decoded as {ids: unknown[]}).ids;
  if (ids.length < 1 || ids.length > 3 || ids.some((id) => typeof id !== "string" || !allowed.has(id))) return null;
  return Array.from(new Set(ids as string[]));
}

export async function rankCatalogCandidates(request: RecommendationRequest, candidates: VerifiedCatalogEntry[]): Promise<{ids: string[]; model: string}> {
  const deterministicIds = candidates.slice(0, 3).map((entry) => entry.id);
  const apiKey = await readSecret("OPENROUTER_API_KEY");
  if (!apiKey || candidates.length < 2) return {ids: deterministicIds, model: "deterministic"};
  const primary = await readSecret("OPENROUTER_MODEL") || DEFAULT_MODEL;
  const fallback = await readSecret("OPENROUTER_FALLBACK_MODEL") || DEFAULT_FALLBACK_MODEL;
  const allowed = new Set(candidates.map((entry) => entry.id));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Title": "WatchMatch verified Netflix catalog"},
      body: JSON.stringify({
        models: primary === fallback ? [primary] : [primary, fallback],
        messages: [
          {role: "system", content: "Rank only the supplied catalog IDs. Do not add facts, titles, URLs, or IDs. Return JSON only as {\"ids\":[\"id\"]}, with one to three unique IDs."},
          {role: "user", content: JSON.stringify({preference: {mediaType: request.mediaType, genres: request.genres, mood: request.mood}, candidates: candidates.map((entry) => ({id: entry.id, genres: entry.genres, moodTags: entry.moodTags}))})},
        ],
        temperature: 0,
        max_tokens: 160,
        response_format: {type: "json_object"},
      }),
      signal: controller.signal,
    });
    if (!response.ok) return {ids: deterministicIds, model: "deterministic"};
    const ids = extractIds(await response.json(), allowed);
    return ids ? {ids, model: primary} : {ids: deterministicIds, model: "deterministic"};
  } catch {
    return {ids: deterministicIds, model: "deterministic"};
  } finally {
    clearTimeout(timeout);
  }
}
