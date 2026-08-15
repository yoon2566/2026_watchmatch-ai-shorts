import {
  type AllowedGenre,
  type Recommendation,
  type RecommendationRequest,
} from "@/lib/recommendation-contracts";
import {
  type OpenRouterCitation,
  requestValidatedRecommendations,
} from "@/lib/openrouter-recommendations";

type CandidateSource = {label: string; url: string};
type Candidate = {
  title: string;
  canonicalTitle: string;
  year: number;
  mediaType: "movie" | "tv";
  genres: AllowedGenre[];
  premise: string;
  reason: string;
  rating: string;
  ratingSourceUrl: string;
  sources: CandidateSource[];
};

type CandidateValidationOutcome = {
  recommendations: Recommendation[];
  candidateCount: number;
  validatedCount: number;
  validationFailures: string[];
};

export type PublicDiscoverySource = {
  url: string;
  title: string;
  domain: string;
  excerpt: string;
};

export type LiveRecommendationResult = {
  recommendations: Recommendation[];
  sources: PublicDiscoverySource[];
  status: "complete" | "partial" | "sources_only";
  summary: {
    citationCount: number;
    candidateCount: number;
    rejectedCount: number;
  };
  message: string;
  model: string;
};

const GENRE_ALIASES = new Map<string, AllowedGenre>([
  ["드라마", "드라마"],
  ["drama", "드라마"],
  ["스릴러", "스릴러"],
  ["thriller", "스릴러"],
  ["로맨스", "로맨스"],
  ["romance", "로맨스"],
  ["romantic", "로맨스"],
  ["sf", "SF"],
  ["scifi", "SF"],
  ["sciencefiction", "SF"],
  ["미스터리", "미스터리"],
  ["mystery", "미스터리"],
  ["코미디", "코미디"],
  ["comedy", "코미디"],
  ["판타지", "판타지"],
  ["fantasy", "판타지"],
  ["액션", "액션"],
  ["action", "액션"],
  ["범죄", "범죄"],
  ["crime", "범죄"],
  ["애니메이션", "애니메이션"],
  ["animation", "애니메이션"],
  ["animated", "애니메이션"],
]);

function normalizeGenreLabel(value: string): AllowedGenre | null {
  const key = value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, "");
  return GENRE_ALIASES.get(key) ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requiredString(
  record: Record<string, unknown>,
  field: string,
  minLength: number,
  maxLength: number,
): string {
  const value = record[field];
  if (typeof value !== "string") throw new Error(`${field} must be a string`);
  const trimmed = value.trim();
  if (trimmed.length < minLength || trimmed.length > maxLength) {
    throw new Error(`${field} has an invalid length`);
  }
  return trimmed;
}

function parseCandidate(value: unknown): Candidate {
  if (!isRecord(value)) throw new Error("recommendation must be an object");

  const title = requiredString(value, "title", 1, 160);
  const canonicalTitle = requiredString(value, "canonicalTitle", 1, 160);
  const year = value.year;
  const currentYear = new Date().getUTCFullYear();
  if (!Number.isInteger(year) || (year as number) < 1888 || (year as number) > currentYear + 2) {
    throw new Error("year is invalid");
  }
  const mediaType = value.mediaType;
  if (mediaType !== "movie" && mediaType !== "tv") {
    throw new Error("mediaType is invalid");
  }

  if (!Array.isArray(value.genres) || value.genres.length < 1 || value.genres.length > 10) {
    throw new Error("genres are invalid");
  }
  const genres: AllowedGenre[] = [];
  for (const genre of value.genres) {
    if (typeof genre !== "string") throw new Error("genre is invalid");
    const normalized = normalizeGenreLabel(genre);
    // Search providers and catalog pages sometimes return adjacent labels
    // such as Adventure or Family. Ignore those rather than discarding an
    // otherwise grounded work, but keep only the app's supported taxonomy.
    if (normalized && !genres.includes(normalized)) genres.push(normalized);
  }
  if (genres.length < 1) throw new Error("genres contain no supported labels");

  const premise = requiredString(value, "premise", 10, 300);
  const reason = requiredString(value, "reason", 10, 300);
  const rating = requiredString(value, "rating", 1, 40);
  const ratingSourceUrl = requiredString(value, "ratingSourceUrl", 8, 2_000);

  if (!Array.isArray(value.sources) || value.sources.length < 1 || value.sources.length > 3) {
    throw new Error("sources are invalid");
  }
  const sources = value.sources.map((source) => {
    if (!isRecord(source)) throw new Error("source must be an object");
    return {
      label: requiredString(source, "label", 1, 160),
      url: requiredString(source, "url", 8, 2_000),
    };
  });

  return {
    title,
    canonicalTitle,
    year: year as number,
    mediaType,
    genres,
    premise,
    reason,
    rating,
    ratingSourceUrl,
    sources,
  };
}

function fold(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function normalizeUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("source URL is not public HTTPS");
  }
  return url.toString();
}

const unavailableRatings = [
  /^\s*(?:NR|UR|N\/?A|TBD|UNKNOWN|UNRATED|NOT\s+RATED)\s*$/iu,
  /\b(?:NR|UR|TBD|UNKNOWN|UNRATED|NOT\s+RATED)\b/iu,
  /(?:^|\s|[/,;|:()])N\/?A(?:$|\s|[/,;|:()])/iu,
  /(?:미정|미분류|등급\s*(?:없음|정보\s*없음|확인\s*불가))/u,
];

const adultRatings = [
  /(?:청소년\s*(?:관람|이용)\s*불가|성인\s*(?:전용|등급))/u,
  /(?:^|[^\d])(?:18|19|21)\s*(?:\+|세|금)(?:$|[^\d])/u,
  /\b(?:TV[\s-]?MA|NC[\s-]?17|R[\s-]?18\+?|ADULTS?\s+ONLY|AO)\b/iu,
  /\bR\b/iu,
  /\b(?:XXX|X)\b/iu,
  /(?:^|[/,;|:()\s])(?:18|19|21)(?:\+|세|금)?(?:$|[/,;|:()\s])/u,
  /\b(?:RATED\s+R|R[\s-]?RATED)\b/iu,
  /^\s*(?:R|X|XXX)\s*$/iu,
  /^\s*(?:(?:US|USA|UNITED\s+STATES)\s*[:-]\s*)?R\s*(?:\([^)]*\))?\s*$/iu,
];

const unsafeCopy = [
  /(?:결말|엔딩|범인은|범인인|흑막은|진짜\s*정체|정체는|정체가.{0,10}(?:밝혀|드러)|죽는다|죽었다|사망한다|배신한다|최종\s*커플)/u,
  /\b(?:ending|the killer is|culprit is|true identity|dies|betrays|final couple)\b/iu,
  /(?:19\s*(?:\+|금|세)|청소년\s*(?:관람|이용)\s*불가|성인물)/u,
];

type SafeRatingCategory =
  | "ALL"
  | "G"
  | "PG"
  | "PG13"
  | "TVY"
  | "TVY7"
  | "TVG"
  | "TVPG"
  | "TV14"
  | "U"
  | "AGE7"
  | "AGE12"
  | "AGE12A"
  | "AGE15";

function assertedRatingCategory(rating: string): SafeRatingCategory {
  if (unavailableRatings.some((pattern) => pattern.test(rating))) {
    throw new Error("content rating is unavailable");
  }
  if (adultRatings.some((pattern) => pattern.test(rating))) {
    throw new Error("adult content rating is excluded");
  }

  const normalized = rating.normalize("NFKC").toLocaleUpperCase("en-US");
  if (/\bPG[\s-]?13\b/u.test(normalized)) return "PG13";
  if (/\bTV[\s-]?Y7\b/u.test(normalized)) return "TVY7";
  if (/\bTV[\s-]?Y\b/u.test(normalized)) return "TVY";
  if (/\bTV[\s-]?G\b/u.test(normalized)) return "TVG";
  if (/\bTV[\s-]?PG\b/u.test(normalized)) return "TVPG";
  if (/\bTV[\s-]?14\b/u.test(normalized)) return "TV14";
  if (/(?:전체\s*(?:관람가|이용가)|ALL\s+AGES?)/u.test(normalized)) return "ALL";
  if (/\b12A\b/u.test(normalized)) return "AGE12A";

  const contextualAge = normalized.match(
    /(?:SOUTH\s+KOREA|KOREA|대한민국|한국|RATED|CONTENT\s+RATING|CERTIFICATE|CLASSIFICATION)\s*[:-]?\s*(7|12|15)(?!\d|\s*[.,/]\s*\d)/u,
  )?.[1] ?? normalized.match(/(?:^|[^\d])(7|12|15)\s*(?:세(?:\s*이상)?(?:\s*관람가)?|\+|등급)(?:$|[^\d])/u)?.[1]
    ?? normalized.trim().match(/^(7|12|15)$/u)?.[1];
  if (contextualAge === "7") return "AGE7";
  if (contextualAge === "12") return "AGE12";
  if (contextualAge === "15") return "AGE15";

  if (/\bPG\b(?![\s-]?13)/u.test(normalized)) return "PG";
  if (/^\s*G(?:\s*\([^)]*\))?\s*$/u.test(normalized)) return "G";
  if (/^\s*U(?:\s*\([^)]*\))?\s*$/u.test(normalized)) return "U";
  throw new Error("content rating format is unsupported");
}

function citationConfirmsRating(text: string, category: SafeRatingCategory): boolean {
  const normalized = text.normalize("NFKC").toLocaleUpperCase("en-US");
  const patterns: Record<SafeRatingCategory, RegExp[]> = {
    ALL: [/(?:전체\s*(?:관람가|이용가)|ALL\s+AGES?)/u],
    G: [/(?:RATED|RATING|CERTIFICATE|CLASSIFICATION|MPAA)\s*(?:IS|:|-)?\s*G\b/u],
    PG: [/\bPG\b(?![\s-]?13)/u],
    PG13: [/\bPG[\s-]?13\b/u],
    TVY: [/\bTV[\s-]?Y\b(?!7)/u],
    TVY7: [/\bTV[\s-]?Y7\b/u],
    TVG: [/\bTV[\s-]?G\b/u],
    TVPG: [/\bTV[\s-]?PG\b/u],
    TV14: [/\bTV[\s-]?14\b/u],
    U: [/(?:BBFC|RATED|RATING|CERTIFICATE|CLASSIFICATION)\s*(?:IS|:|-)?\s*U\b/u],
    AGE7: [/(?:SOUTH\s+KOREA|KOREA|대한민국|한국|RATED|CONTENT\s+RATING|CERTIFICATE|CLASSIFICATION)\s*[:-]?\s*7(?!\d|\s*[.,/]\s*\d)/u, /7\s*(?:세(?:\s*이상)?(?:\s*관람가)?|\+)/u],
    AGE12: [/(?:SOUTH\s+KOREA|KOREA|대한민국|한국|RATED|CONTENT\s+RATING|CERTIFICATE|CLASSIFICATION)\s*[:-]?\s*12(?!\d|A|\s*[.,/]\s*\d)/u, /12\s*(?:세(?:\s*이상)?(?:\s*관람가)?|\+)/u],
    AGE12A: [/\b12A\b/u],
    AGE15: [/(?:SOUTH\s+KOREA|KOREA|대한민국|한국|RATED|CONTENT\s+RATING|CERTIFICATE|CLASSIFICATION|BBFC)\s*[:-]?\s*15(?!\d|\s*[.,/]\s*\d)/u, /15\s*(?:세(?:\s*이상)?(?:\s*관람가)?|\+)/u],
  };
  return patterns[category].some((pattern) => pattern.test(normalized));
}

function citationContainsAdultRating(text: string): boolean {
  const normalized = text.normalize("NFKC").toLocaleUpperCase("en-US");
  return [
    /(?:청소년\s*(?:관람|이용)\s*불가|성인\s*(?:전용|등급))/u,
    /(?:^|[^\d])(?:18|19|21)\s*(?:\+|세|금)(?:$|[^\d])/u,
    /\b(?:TV[\s-]?MA|NC[\s-]?17|R[\s-]?18\+?|ADULTS?\s+ONLY|AO)\b/u,
    /(?:RATED|RATING|CERTIFICATE|CLASSIFICATION|MPAA|BBFC|SOUTH\s+KOREA|KOREA|대한민국|한국)\s*(?:IS|:|-)?\s*(?:R|18|19|21)\b/u,
    /(?:UNITED\s+STATES|US|USA)\s*[:-]\s*R\b/u,
    /(?:UNITED\s+KINGDOM|UK|GERMANY|AUSTRALIA|NEW\s+ZEALAND|FRANCE|SPAIN|ITALY|NETHERLANDS|BRAZIL|SINGAPORE|IRELAND|CANADA|JAPAN|CHINA|HONG\s+KONG|TAIWAN|SOUTH\s+AFRICA|INDIA|MEXICO|ARGENTINA|SWEDEN|NORWAY|DENMARK|FINLAND|PORTUGAL|SWITZERLAND|AUSTRIA|BELGIUM|POLAND|RUSSIA|TURKEY|ISRAEL|UNITED\s+ARAB\s+EMIRATES|PHILIPPINES|MALAYSIA|INDONESIA|THAILAND|VIETNAM)\s*:\s*(?:18A?|19|21)\b/u,
    /(?:UNITED\s+STATES|US|USA)\s+(?:CERTIFICATE|RATING|CLASSIFICATION)\s*(?:IS|:|-)?\s*R\b/u,
    /\b(?:RATED\s+R|R[\s-]?RATED)\b/u,
    /(?:RATED|RATING|CERTIFICATE|CLASSIFICATION)\s*(?:IS|:|-)?\s*(?:X|XXX)\b/u,
  ].some((pattern) => pattern.test(normalized));
}

function assertKoreanSpoilerFreeCopy(candidate: Candidate): void {
  const copy = `${candidate.premise}\n${candidate.reason}`;
  if (!/[가-힣]/u.test(candidate.premise) || !/[가-힣]/u.test(candidate.reason)) {
    throw new Error("premise and reason must be Korean");
  }
  if (unsafeCopy.some((pattern) => pattern.test(copy))) {
    throw new Error("recommendation copy may contain a spoiler or adult content");
  }
}

function stableHash(value: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36);
}

function recommendationId(candidate: Candidate): string {
  const slug = fold(candidate.title).slice(0, 36) || "work";
  const identity = `${candidate.mediaType}:${fold(candidate.canonicalTitle)}:${candidate.year}`;
  return `${candidate.mediaType}-${candidate.year}-${slug}-${stableHash(identity)}`;
}

function citationMap(citations: OpenRouterCitation[]): Map<string, OpenRouterCitation> {
  return new Map(citations.map((citation) => [normalizeUrl(citation.url), citation]));
}

function validateCandidates(
  value: unknown,
  request: RecommendationRequest,
  citations: OpenRouterCitation[],
): CandidateValidationOutcome {
  if (!isRecord(value) || !Array.isArray(value.recommendations)) {
    throw new Error("response must contain recommendations");
  }
  if (citations.length < 1) throw new Error("URL citation excerpts are required");

  // The model may return more candidates than requested. Evaluating the first
  // ten is safer and more useful than discarding the entire searched response.
  const rawCandidates = value.recommendations.slice(0, 10);

  const citationsByUrl = citationMap(citations);
  const checkedAt = new Date().toISOString();
  const workIdentities = new Set<string>();
  const ids = new Set<string>();
  const recommendations: Recommendation[] = [];
  let validatedCount = 0;
  const validationFailures: string[] = [];

  rawCandidates.forEach((rawCandidate, index) => {
    try {
      const candidate = parseCandidate(rawCandidate);
      if (candidate.mediaType !== request.mediaType) {
        throw new Error("recommended media type does not match the request");
      }
      if (!candidate.genres.some((genre) => request.genres.includes(genre))) {
        throw new Error("recommendation does not match a selected genre");
      }

      const ratingCategory = assertedRatingCategory(candidate.rating);
      assertKoreanSpoilerFreeCopy(candidate);

      const titleIdentity = `${candidate.mediaType}:${fold(candidate.title)}:${candidate.year}`;
      const canonicalIdentity = `${candidate.mediaType}:${fold(candidate.canonicalTitle)}:${candidate.year}`;
      const titleKeys = [fold(candidate.title), fold(candidate.canonicalTitle)].filter(
        (key) => key.length >= 2,
      );
      if (workIdentities.has(titleIdentity) || workIdentities.has(canonicalIdentity)) {
        throw new Error("duplicate work");
      }

      const seenSourceUrls = new Set<string>();
      const linkedCitations = candidate.sources.map((source) => {
        const url = normalizeUrl(source.url);
        if (seenSourceUrls.has(url)) throw new Error("duplicate source URL");
        seenSourceUrls.add(url);
        const citation = citationsByUrl.get(url);
        if (!citation?.content.trim()) {
          throw new Error("source URL is not an OpenRouter URL citation with content");
        }
        return citation;
      });

      const ratingSourceUrl = normalizeUrl(candidate.ratingSourceUrl);
      if (!seenSourceUrls.has(ratingSourceUrl)) {
        throw new Error("rating source must be included in sources");
      }
      const ratingCitation = citationsByUrl.get(ratingSourceUrl);
      if (!ratingCitation?.content.trim()) throw new Error("rating citation has no content");
      const ratingEvidence = fold(`${ratingCitation.title ?? ""}\n${ratingCitation.content}`);
      if (!titleKeys.some((key) => ratingEvidence.includes(key))) {
        throw new Error("rating citation does not identify the recommended work");
      }
      if (citationContainsAdultRating(ratingCitation.content)) {
        throw new Error("rating citation contains an adult classification");
      }
      if (!citationConfirmsRating(ratingCitation.content, ratingCategory)) {
        throw new Error("content rating is not confirmed by its citation excerpt");
      }

      const workIsCited = linkedCitations.some((citation) => {
        const evidence = fold(`${citation.title ?? ""}\n${citation.content}`);
        return (
          titleKeys.some((key) => evidence.includes(key)) &&
          evidence.includes(String(candidate.year))
        );
      });
      if (!workIsCited) {
        throw new Error("title and year are not both present in a citation excerpt");
      }

      const id = recommendationId(candidate);
      if (ids.has(id)) throw new Error("duplicate recommendation id");

      // Commit identity markers only after every validation has passed. An
      // invalid candidate must not prevent a later valid candidate from using
      // the same title or canonical identity.
      workIdentities.add(titleIdentity);
      workIdentities.add(canonicalIdentity);
      ids.add(id);
      validatedCount += 1;

      if (recommendations.length < 3) {
        recommendations.push({
          id,
          title: candidate.title,
          year: candidate.year,
          mediaType: candidate.mediaType,
          genres: candidate.genres,
          premise: candidate.premise,
          reason: candidate.reason,
          rating: candidate.rating,
          checkedAt,
          sources: linkedCitations.map((citation) => ({
            label: citation.title?.trim() || new URL(citation.url).hostname,
            url: citation.url,
          })),
        });
      }
    } catch (error) {
      validationFailures.push(
        `candidate ${index + 1}: ${error instanceof Error ? error.message : "unknown validation error"}`,
      );
    }
  });

  return {
    recommendations,
    candidateCount: rawCandidates.length,
    validatedCount,
    validationFailures,
  };
}

function mergeValidationOutcomes(
  original: CandidateValidationOutcome,
  repair: CandidateValidationOutcome,
): CandidateValidationOutcome {
  const merged: Recommendation[] = [];
  const seen = new Set<string>();
  for (const recommendation of [...original.recommendations, ...repair.recommendations]) {
    if (seen.has(recommendation.id)) continue;
    seen.add(recommendation.id);
    if (merged.length < 3) merged.push(recommendation);
  }

  return {
    recommendations: merged,
    candidateCount: Math.max(original.candidateCount, repair.candidateCount, merged.length),
    validatedCount: Math.max(original.validatedCount, repair.validatedCount, merged.length),
    validationFailures: [...new Set([
      ...original.validationFailures,
      ...repair.validationFailures,
    ])],
  };
}

function publicDiscoverySources(citations: OpenRouterCitation[]): PublicDiscoverySource[] {
  const sources: PublicDiscoverySource[] = [];
  const seen = new Set<string>();

  for (const citation of citations) {
    const url = normalizeUrl(citation.url);
    if (seen.has(url)) continue;
    seen.add(url);

    const domain = new URL(url).hostname.replace(/^www\./iu, "");
    const excerpt = citation.content.replace(/\s+/gu, " ").trim().slice(0, 280);
    sources.push({
      url,
      title: (citation.title?.trim() || domain).slice(0, 180),
      domain,
      excerpt,
    });
  }

  return sources;
}

const COMMON_SYSTEM_PROMPT = [
  "You are a strict evidence-grounded movie and TV recommendation engine.",
  "Return between one and ten distinct candidate works supported by the citations, ordered by evidence quality and request fit; the server will keep the first three candidates that pass validation.",
  "Every candidate must be a real, already-released work that matches the request.",
  "When several genres are selected, a candidate may match any selected genre; prioritize candidates matching more than one.",
  "Use only facts present in the returned url_citation annotations.",
  "Every source URL and ratingSourceUrl must be copied exactly from a url_citation that includes non-empty content.",
  "For each work, one citation must contain its title and release year, and the ratingSourceUrl citation must contain the exact content rating; these may be two different cited pages.",
  "Exclude adult, 18+, 19+, R, NC-17, TV-MA, youth-restricted, unrated, NR, and unknown-rating works.",
  "Write premise and reason in natural Korean using only the public opening premise.",
  "Never reveal endings, twists, deaths, culprits, secret identities, betrayals, or final couples.",
  "In genres, return at most three labels and use only: 드라마, 스릴러, 로맨스, SF, 미스터리, 코미디, 판타지, 액션, 범죄, 애니메이션.",
  "Return JSON only, without Markdown.",
  "The exact schema is {recommendations:[{title,canonicalTitle,year,mediaType,genres,premise,reason,rating,ratingSourceUrl,sources:[{label,url}]}]}.",
].join("\n");

const SEARCH_SYSTEM_PROMPT = [
  COMMON_SYSTEM_PROMPT,
  "Call the provided web search tool exactly once before returning JSON.",
  "Use one broad search query that gathers evidence for eight to ten suitable works instead of searching for one title.",
  "Search trusted catalog and classification pages for title, release year, genre, and a non-adult content rating.",
].join("\n");

export async function getLiveRecommendations(
  request: RecommendationRequest,
): Promise<LiveRecommendationResult> {
  const userPrompt = JSON.stringify({
    mediaType: request.mediaType,
    genres: request.genres,
    mood: request.mood,
    locale: "ko-KR",
    checkedOn: new Date().toISOString().slice(0, 10),
    resultCount: 3,
    candidateCount: {min: 3, max: 10},
  });

  const result = await requestValidatedRecommendations({
    systemPrompt: SEARCH_SYSTEM_PROMPT,
    repairSystemPrompt: COMMON_SYSTEM_PROMPT,
    userPrompt,
    validate: (value, citations) => validateCandidates(value, request, citations),
    isComplete: (outcome) => outcome.recommendations.length >= 3,
    describeIncomplete: (outcome) => {
      const details = outcome.validationFailures.length > 0
        ? `; ${outcome.validationFailures.join("; ")}`
        : "";
      return `only ${outcome.recommendations.length} of ${outcome.candidateCount} candidates passed validation${details}`;
    },
    selectPreferred: mergeValidationOutcomes,
    createEmpty: () => ({
      recommendations: [],
      candidateCount: 0,
      validatedCount: 0,
      validationFailures: ["the model answer could not be parsed or verified"],
    }),
  });

  const recommendations = result.data.recommendations.slice(0, 3);
  const sources = publicDiscoverySources(result.citations);
  const status = recommendations.length >= 3
    ? "complete"
    : recommendations.length > 0
      ? "partial"
      : "sources_only";
  const candidateCount = result.data.candidateCount;
  const rejectedCount = Math.max(0, candidateCount - result.data.validatedCount);
  const message = status === "complete"
    ? `검색 출처 ${sources.length}개에서 검증된 작품 3개를 찾았습니다.`
    : status === "partial"
      ? `검증된 작품 ${recommendations.length}개를 먼저 표시합니다. 검색 출처 ${sources.length}개도 함께 확인할 수 있습니다.`
      : `작품 카드로 검증된 후보는 없지만 검색 출처 ${sources.length}개를 확인했습니다.`;

  return {
    recommendations,
    sources,
    status,
    summary: {
      citationCount: sources.length,
      candidateCount,
      rejectedCount,
    },
    message,
    model: result.model,
  };
}
