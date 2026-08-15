import {writeFile} from "node:fs/promises";

const apiKey = process.env.OPENROUTER_API_KEY?.trim();
if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured");

const endpoint = "https://openrouter.ai/api/v1/chat/completions";
const outputUrl = new URL("../data/ott-catalog/netflix-kr.review.json", import.meta.url);
const allowedGenres = new Set(["드라마", "스릴러", "로맨스", "SF", "미스터리", "코미디", "판타지", "액션", "범죄", "애니메이션"]);
const allowedMoods = new Set(["thrilling", "warm", "mysterious", "funny", "moving", "spectacular"]);

function safeUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || !url.hostname.includes(".")) return null;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function citations(payload) {
  const annotations = payload?.choices?.[0]?.message?.annotations;
  if (!Array.isArray(annotations)) return [];
  return [...new Set(annotations.map((item) => safeUrl(item?.url_citation?.url ?? item?.url)).filter(Boolean))];
}

async function discover(mediaType) {
  const label = mediaType === "movie" ? "films" : "TV series";
  const primaryModel = process.env.OPENROUTER_MODEL || "google/gemini-3.6-flash";
  const fallbackModel = process.env.OPENROUTER_FALLBACK_MODEL || "google/gemini-3.5-flash";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Title": "WatchMatch pending catalog review"},
    body: JSON.stringify({
      model: primaryModel,
      ...(fallbackModel !== primaryModel ? {models: [fallbackModel]} : {}),
      messages: [
        {role: "system", content: "Prepare a human review queue, not availability claims. Return JSON only. Never claim that a work is currently playable in Netflix Korea."},
        {role: "user", content: `Find 8 real ${label} plausibly worth checking manually in Netflix Korea. Use only public identity or editorial sources such as IMDb, Wikipedia, Rotten Tomatoes, or reputable press. Do not use or cite TMDB, JustWatch, or OTT pages. Return {"candidates":[{"title":"","year":2024,"genres":["스릴러"],"moodTags":["thrilling"],"sourceUrls":["exact cited URL"]}]}. Genres and moods must use the supplied Korean genre and English mood labels.`},
      ],
      tools: [{type: "openrouter:web_search", parameters: {engine: "exa", max_uses: 1, max_results: 10, max_total_results: 10, max_characters: 2000, allowed_domains: ["imdb.com", "wikipedia.org", "rottentomatoes.com"]}}],
      tool_choice: "required",
      max_tool_calls: 1,
      temperature: 0.2,
      max_tokens: 1800,
      response_format: {type: "json_object"},
    }),
  });
  if (!response.ok) throw new Error(`OpenRouter candidate discovery failed: HTTP ${response.status}`);
  const payload = await response.json();
  const allowedUrls = new Set(citations(payload));
  let decoded;
  try {
    const rawContent = payload?.choices?.[0]?.message?.content;
    const text = typeof rawContent === "string" ? rawContent.trim() : "";
    const withoutFence = text.replace(/^```(?:json)?\s*/iu, "").replace(/\s*```$/u, "");
    const firstBrace = withoutFence.indexOf("{");
    const lastBrace = withoutFence.lastIndexOf("}");
    decoded = JSON.parse(firstBrace >= 0 && lastBrace > firstBrace ? withoutFence.slice(firstBrace, lastBrace + 1) : withoutFence);
  }
  catch { throw new Error(`OpenRouter returned invalid ${mediaType} candidate JSON`); }
  if (!Array.isArray(decoded?.candidates)) throw new Error(`OpenRouter returned no ${mediaType} candidates`);
  return decoded.candidates.flatMap((item, index) => {
    const title = typeof item?.title === "string" ? item.title.trim() : "";
    const year = Number(item?.year);
    const genres = Array.isArray(item?.genres) ? [...new Set(item.genres.filter((value) => allowedGenres.has(value)))].slice(0, 4) : [];
    const moodTags = Array.isArray(item?.moodTags) ? [...new Set(item.moodTags.filter((value) => allowedMoods.has(value)))].slice(0, 3) : [];
    const sourceUrls = Array.isArray(item?.sourceUrls) ? [...new Set(item.sourceUrls.map(safeUrl).filter((url) => url && allowedUrls.has(url)))] : [];
    if (!title || !Number.isInteger(year) || year < 1900 || year > 2100 || genres.length === 0 || moodTags.length === 0 || sourceUrls.length === 0) return [];
    return [{id: `review-${mediaType}-${String(index + 1).padStart(2, "0")}`, title, year, mediaType, suggestedGenres: genres, suggestedMoodTags: moodTags, sourceUrls, reviewStatus: "pending"}];
  }).slice(0, 10);
}

const movie = await discover("movie");
const tv = await discover("tv");
const candidates = [...movie, ...tv];
if (candidates.length < 12 || candidates.length > 20) throw new Error(`Expected 12-20 review candidates, received ${candidates.length}`);

const output = {
  version: 1,
  provider: "netflix",
  region: "KR",
  accessMode: "subscription",
  generatedAt: new Date().toISOString(),
  notice: "이 후보는 검색으로 준비한 수동 확인 대기 목록일 뿐 현재 Netflix 대한민국 제공을 뜻하지 않습니다.",
  candidates,
};
await writeFile(outputUrl, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`Prepared ${candidates.length} pending candidates (${movie.length} movie, ${tv.length} TV).`);
