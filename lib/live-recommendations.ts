import {
  ALLOWED_GENRES,
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

  if (!Array.isArray(value.genres) || value.genres.length < 1 || value.genres.length > 4) {
    throw new Error("genres are invalid");
  }
  const allowedGenres = new Set<string>(ALLOWED_GENRES);
  const genres = value.genres.map((genre): AllowedGenre => {
    if (typeof genre !== "string" || !allowedGenres.has(genre)) {
      throw new Error("genre is invalid");
    }
    return genre as AllowedGenre;
  });
  if (new Set(genres).size !== genres.length) throw new Error("genres are duplicated");

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
  /(?:미정|미분류|등급\s*(?:없음|정보\s*없음|확인\s*불가))/u,
];

const adultRatings = [
  /(?:청소년\s*(?:관람|이용)\s*불가|성인\s*(?:전용|등급))/u,
  /(?:^|[^\d])(?:18|19|21)\s*(?:\+|세|금)(?:$|[^\d])/u,
  /\b(?:TV[\s-]?MA|NC[\s-]?17|R[\s-]?18\+?|ADULTS?\s+ONLY|AO)\b/iu,
  /^\s*(?:R|X|XXX)\s*$/iu,
];

const unsafeCopy = [
  /(?:결말|엔딩|범인은|범인인|흑막은|진짜\s*정체|정체는|정체가.{0,10}(?:밝혀|드러)|죽는다|죽었다|사망한다|배신한다|최종\s*커플)/u,
  /\b(?:ending|the killer is|culprit is|true identity|dies|betrays|final couple)\b/iu,
  /(?:19\s*(?:\+|금|세)|청소년\s*(?:관람|이용)\s*불가|성인물)/u,
];

function assertSafeRating(rating: string): void {
  if (unavailableRatings.some((pattern) => pattern.test(rating))) {
    throw new Error("content rating is unavailable");
  }
  if (adultRatings.some((pattern) => pattern.test(rating))) {
    throw new Error("adult content rating is excluded");
  }
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
): Recommendation[] {
  if (!isRecord(value) || !Array.isArray(value.recommendations)) {
    throw new Error("response must contain recommendations");
  }
  if (value.recommendations.length !== 3) {
    throw new Error("response must contain exactly three recommendations");
  }
  if (citations.length < 1) throw new Error("URL citation excerpts are required");

  const citationsByUrl = citationMap(citations);
  const checkedAt = new Date().toISOString();
  const titleIdentities = new Set<string>();
  const canonicalIdentities = new Set<string>();
  const ids = new Set<string>();

  return value.recommendations.map((rawCandidate) => {
    const candidate = parseCandidate(rawCandidate);
    if (candidate.mediaType !== request.mediaType) {
      throw new Error("recommended media type does not match the request");
    }
    if (!candidate.genres.some((genre) => request.genres.includes(genre))) {
      throw new Error("recommendation does not match a selected genre");
    }

    assertSafeRating(candidate.rating);
    assertKoreanSpoilerFreeCopy(candidate);

    const titleIdentity = `${candidate.mediaType}:${fold(candidate.title)}:${candidate.year}`;
    const canonicalIdentity = `${candidate.mediaType}:${fold(candidate.canonicalTitle)}:${candidate.year}`;
    if (titleIdentities.has(titleIdentity) || canonicalIdentities.has(canonicalIdentity)) {
      throw new Error("duplicate work");
    }
    titleIdentities.add(titleIdentity);
    canonicalIdentities.add(canonicalIdentity);

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
    if (!fold(ratingCitation.content).includes(fold(candidate.rating))) {
      throw new Error("content rating is not present in its citation excerpt");
    }

    const titleKeys = [fold(candidate.title), fold(candidate.canonicalTitle)].filter(
      (key) => key.length >= 2,
    );
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
    ids.add(id);

    return {
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
    };
  });
}

const SYSTEM_PROMPT = [
  "You are a strict web-grounded movie and TV recommendation engine.",
  "Call the provided web search tool exactly once before returning JSON.",
  "Recommend exactly three distinct, real, already-released works that match the request.",
  "Use only facts present in the returned url_citation annotations.",
  "Every source URL and ratingSourceUrl must be copied exactly from a url_citation that includes non-empty content.",
  "For each work, the cited content must explicitly contain its title, release year, and exact content rating.",
  "Exclude adult, 18+, 19+, R, NC-17, TV-MA, youth-restricted, unrated, NR, and unknown-rating works.",
  "Write premise and reason in natural Korean using only the public opening premise.",
  "Never reveal endings, twists, deaths, culprits, secret identities, betrayals, or final couples.",
  "Use only these genre labels: 드라마, 스릴러, 로맨스, SF, 미스터리, 코미디, 판타지, 액션, 범죄, 애니메이션.",
  "Return JSON only, without Markdown.",
  "The exact schema is {recommendations:[{title,canonicalTitle,year,mediaType,genres,premise,reason,rating,ratingSourceUrl,sources:[{label,url}]}]}.",
].join("\n");

export async function getLiveRecommendations(request: RecommendationRequest): Promise<{
  recommendations: Recommendation[];
  model: string;
}> {
  const userPrompt = JSON.stringify({
    mediaType: request.mediaType,
    genres: request.genres,
    mood: request.mood,
    locale: "ko-KR",
    checkedOn: new Date().toISOString().slice(0, 10),
    resultCount: 3,
  });

  const result = await requestValidatedRecommendations({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    validate: (value, citations) => validateCandidates(value, request, citations),
  });

  return {recommendations: result.data, model: result.model};
}
