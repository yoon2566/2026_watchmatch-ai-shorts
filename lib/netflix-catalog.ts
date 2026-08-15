import catalogData from "../data/ott-catalog/netflix-kr.json";
import type {AllowedGenre, MediaType, Mood, Recommendation, RecommendationRequest} from "./recommendation-contracts";
import {ALLOWED_GENRES, ALLOWED_MOODS, SUPPORTED_ACCESS_MODE, SUPPORTED_OTT_PROVIDER, SUPPORTED_REGION} from "./recommendation-contracts";

const DAY_MS = 86_400_000;
export const AVAILABILITY_TTL_DAYS = 14;

export type VerifiedCatalogEntry = {
  id: string;
  title: string;
  year: number;
  mediaType: MediaType;
  genres: AllowedGenre[];
  moodTags: Mood[];
  spoilerFreePremise: string;
  provider: "netflix";
  region: "KR";
  accessMode: "subscription";
  availabilityCheckedAt: string;
  availabilityExpiresAt: string;
  availabilitySourceUrl: string;
  ratingStatus: "verified_safe";
  rating: string;
  ratingSourceUrl: string;
};

export type CatalogRecommendationResult = {
  recommendations: Recommendation[];
  sources: Array<{url: string; title: string; domain: string; excerpt: string}>;
  status: "complete" | "partial" | "sources_only" | "empty";
  summary: {citationCount: number; candidateCount: number; rejectedCount: number};
  message: string;
  model: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseHttpsUrl(value: unknown, field: string): string {
  if (typeof value !== "string") throw new Error(`${field} must be an HTTPS URL`);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${field} must be an HTTPS URL`);
  }
  if (url.protocol !== "https:" || url.username || url.password || !url.hostname.includes(".")) {
    throw new Error(`${field} must be an HTTPS URL`);
  }
  url.search = "";
  url.hash = "";
  return url.toString();
}

function parseIsoDate(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/u.test(value)) throw new Error(`${field} must be an ISO date-time`);
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error(`${field} must be an ISO date-time`);
  return new Date(timestamp).toISOString();
}

function parseStringArray<T extends string>(value: unknown, allowed: readonly T[], field: string): T[] {
  if (!Array.isArray(value) || value.length < 1) throw new Error(`${field} must not be empty`);
  const parsed = value.map((item) => {
    if (typeof item !== "string" || !allowed.includes(item as T)) throw new Error(`${field} contains an unsupported value`);
    return item as T;
  });
  if (new Set(parsed).size !== parsed.length) throw new Error(`${field} contains duplicates`);
  return parsed;
}

export function validateCatalog(value: unknown): {entries: VerifiedCatalogEntry[]} {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.entries)) {
    throw new Error("catalog must use version 1 and contain entries");
  }
  const ids = new Set<string>();
  const entries = value.entries.map((raw, index): VerifiedCatalogEntry => {
    if (!isRecord(raw)) throw new Error(`entry ${index + 1} must be an object`);
    const id = typeof raw.id === "string" ? raw.id.trim() : "";
    if (!/^[a-z0-9][a-z0-9-]{2,79}$/u.test(id)) throw new Error(`entry ${index + 1} has invalid id`);
    if (ids.has(id)) throw new Error(`duplicate catalog id: ${id}`);
    ids.add(id);
    const title = typeof raw.title === "string" ? raw.title.trim() : "";
    if (title.length < 1 || title.length > 160) throw new Error(`${id} has invalid title`);
    if (!Number.isInteger(raw.year) || Number(raw.year) < 1900 || Number(raw.year) > 2100) throw new Error(`${id} has invalid year`);
    if (raw.mediaType !== "movie" && raw.mediaType !== "tv") throw new Error(`${id} has invalid mediaType`);
    if (raw.provider !== SUPPORTED_OTT_PROVIDER || raw.region !== SUPPORTED_REGION || raw.accessMode !== SUPPORTED_ACCESS_MODE) {
      throw new Error(`${id} has unsupported availability scope`);
    }
    if (raw.ratingStatus !== "verified_safe") throw new Error(`${id} is not rating verified`);
    const rating = typeof raw.rating === "string" ? raw.rating.trim() : "";
    if (!rating || /(?:청소년\s*관람불가|제한상영가|\bNC-17\b|\bTV-MA\b|\bR18\+?\b|(?:^|\D)(?:18|19|21)\+?(?:\D|$))/iu.test(rating)) {
      throw new Error(`${id} has an adult or invalid rating`);
    }
    const checkedAt = parseIsoDate(raw.availabilityCheckedAt, `${id}.availabilityCheckedAt`);
    const expiresAt = parseIsoDate(raw.availabilityExpiresAt, `${id}.availabilityExpiresAt`);
    if (Date.parse(expiresAt) !== Date.parse(checkedAt) + AVAILABILITY_TTL_DAYS * DAY_MS) {
      throw new Error(`${id} availability must expire after exactly 14 days`);
    }
    const premise = typeof raw.spoilerFreePremise === "string" ? raw.spoilerFreePremise.trim() : "";
    if (premise.length < 10 || premise.length > 400) throw new Error(`${id} has invalid spoiler-free premise`);
    return {
      id,
      title,
      year: Number(raw.year),
      mediaType: raw.mediaType,
      genres: parseStringArray(raw.genres, ALLOWED_GENRES, `${id}.genres`),
      moodTags: parseStringArray(raw.moodTags, ALLOWED_MOODS, `${id}.moodTags`),
      spoilerFreePremise: premise,
      provider: SUPPORTED_OTT_PROVIDER,
      region: SUPPORTED_REGION,
      accessMode: SUPPORTED_ACCESS_MODE,
      availabilityCheckedAt: checkedAt,
      availabilityExpiresAt: expiresAt,
      availabilitySourceUrl: parseHttpsUrl(raw.availabilitySourceUrl, `${id}.availabilitySourceUrl`),
      ratingStatus: "verified_safe",
      rating,
      ratingSourceUrl: parseHttpsUrl(raw.ratingSourceUrl, `${id}.ratingSourceUrl`),
    };
  });
  return {entries};
}

export function loadVerifiedCatalog(): VerifiedCatalogEntry[] {
  return validateCatalog(catalogData).entries;
}

function scoreEntry(entry: VerifiedCatalogEntry, request: RecommendationRequest): number {
  return request.genres.filter((genre) => entry.genres.includes(genre)).length * 100 + (entry.moodTags.includes(request.mood) ? 40 : 0);
}

export function selectCatalogCandidates(request: RecommendationRequest, entries: VerifiedCatalogEntry[], now = new Date()) {
  const scope = entries.filter((entry) =>
    entry.provider === request.ottProvider && entry.region === request.region && entry.accessMode === request.accessMode &&
    entry.mediaType === request.mediaType && request.genres.some((genre) => entry.genres.includes(genre)),
  );
  const eligible = scope.filter((entry) => Date.parse(entry.availabilityExpiresAt) >= now.getTime())
    .sort((a, b) => scoreEntry(b, request) - scoreEntry(a, request) || a.id.localeCompare(b.id, "en"))
    .slice(0, 12);
  return {eligible, evidence: scope, rejectedCount: scope.length - eligible.length};
}

function reasonFor(entry: VerifiedCatalogEntry, request: RecommendationRequest): string {
  const moodLabels: Record<Mood, string> = {thrilling: "쫄깃한", warm: "따뜻한", mysterious: "미스터리한", funny: "유쾌한", moving: "먹먹한", spectacular: "압도적인"};
  const genres = request.genres.filter((genre) => entry.genres.includes(genre)).join("·");
  const mood = entry.moodTags.includes(request.mood) ? ` ${moodLabels[request.mood]} 분위기` : "";
  return `${genres} 장르${mood}를 찾는 조건과 잘 맞는 검증 작품입니다.`;
}

function publicSource(entry: VerifiedCatalogEntry) {
  const url = new URL(entry.availabilitySourceUrl);
  return {
    url: entry.availabilitySourceUrl,
    title: `${entry.title} · Netflix 대한민국 제공 확인`,
    domain: url.hostname.replace(/^www\./u, ""),
    excerpt: `${entry.availabilityCheckedAt.slice(0, 10)}에 관리자가 Netflix 대한민국 구독 제공 여부를 직접 확인했습니다.`,
  };
}

export function buildCatalogResult(request: RecommendationRequest, entries: VerifiedCatalogEntry[], orderedIds: string[], model: string, now = new Date()): CatalogRecommendationResult {
  const {eligible, evidence, rejectedCount} = selectCatalogCandidates(request, entries, now);
  const eligibleById = new Map(eligible.map((entry) => [entry.id, entry]));
  const ordered: VerifiedCatalogEntry[] = [];
  for (const id of orderedIds) {
    const entry = eligibleById.get(id);
    if (entry && !ordered.some((item) => item.id === id)) ordered.push(entry);
    if (ordered.length === 3) break;
  }
  for (const entry of eligible) {
    if (!ordered.some((item) => item.id === entry.id)) ordered.push(entry);
    if (ordered.length === 3) break;
  }
  const recommendations: Recommendation[] = ordered.map((entry) => ({
    id: entry.id,
    title: entry.title,
    year: entry.year,
    mediaType: entry.mediaType,
    genres: entry.genres,
    premise: entry.spoilerFreePremise,
    reason: reasonFor(entry, request),
    rating: entry.rating,
    checkedAt: entry.availabilityCheckedAt,
    availability: {provider: entry.provider, region: entry.region, accessMode: entry.accessMode, status: "verified_manual", checkedAt: entry.availabilityCheckedAt, expiresAt: entry.availabilityExpiresAt, sourceUrl: entry.availabilitySourceUrl},
    sources: [
      {label: "Netflix 제공 확인", url: entry.availabilitySourceUrl},
      ...(entry.ratingSourceUrl === entry.availabilitySourceUrl ? [] : [{label: "관람 등급", url: entry.ratingSourceUrl}]),
    ],
  }));
  const sources = evidence.map(publicSource);
  const status = recommendations.length >= 3 ? "complete" : recommendations.length > 0 ? "partial" : sources.length > 0 ? "sources_only" : "empty";
  const message = status === "complete" ? "최근 14일 안에 직접 확인한 Netflix 대한민국 작품만 보여드립니다."
    : status === "partial" ? "현재 조건에서 유효한 Netflix 검증 작품만 보여드립니다."
      : status === "sources_only" ? "관련 검토 기록은 있지만 제공 확인이 만료되어 선택할 수 없습니다."
        : "현재 조건과 일치하는 수동 검증 작품이 없습니다. 관리자의 확인이 필요합니다.";
  return {recommendations, sources, status, summary: {citationCount: sources.length, candidateCount: eligible.length, rejectedCount}, message, model};
}
