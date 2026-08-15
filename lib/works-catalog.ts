import rawCatalog from "../data/works-catalog.json";

export const ALLOWED_GENRES = [
  "드라마", "스릴러", "로맨스", "SF", "미스터리",
  "코미디", "판타지", "액션", "범죄", "애니메이션",
] as const;
export const ERAS = ["classic", "modern", "recent"] as const;

export type MediaType = "movie" | "tv";
export type AllowedGenre = (typeof ALLOWED_GENRES)[number];
export type Era = (typeof ERAS)[number];

export type WorkCatalogEntry = {
  id: string;
  wikidataId: string;
  title: string;
  year: number;
  mediaType: MediaType;
  genres: AllowedGenre[];
  spoilerFreePremise: string;
  recommendationTags: string[];
  priority: number;
  sourceUrl: string;
};

export type WorkRecommendationRequest = {
  mediaType: MediaType;
  genre: AllowedGenre;
  era: Era;
  excludeIds?: string[];
};

export type WorkRecommendation = {
  id: string;
  title: string;
  year: number;
  mediaType: MediaType;
  genres: AllowedGenre[];
  premise: string;
  reason: string;
  era: Era;
  source: {label: string; url: string};
};

export type WorkRecommendationResult = {
  recommendations: WorkRecommendation[];
  meta: {remaining: number; cycleReset: boolean};
};

export class CatalogValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogValidationError";
  }
}

export class CatalogIntegrityError extends Error {
  readonly code = "CATALOG_INTEGRITY_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "CatalogIntegrityError";
  }
}

const genreSet = new Set<string>(ALLOWED_GENRES);
const eraSet = new Set<string>(ERAS);
const entryKeys = [
  "genres", "id", "mediaType", "priority", "recommendationTags",
  "sourceUrl", "spoilerFreePremise", "title", "wikidataId", "year",
].sort();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertExactKeys(value: Record<string, unknown>, expected: string[], path: string) {
  const actual = Object.keys(value).sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new CatalogValidationError(`${path} 필드 구성이 올바르지 않습니다.`);
  }
}

function requiredString(value: unknown, path: string, min = 1, max = 240): string {
  if (typeof value !== "string" || value.trim() !== value || value.length < min || value.length > max) {
    throw new CatalogValidationError(`${path} 값이 올바르지 않습니다.`);
  }
  return value;
}

function uniqueStrings(value: unknown, path: string, allowed?: Set<string>): string[] {
  if (!Array.isArray(value) || value.length === 0) throw new CatalogValidationError(`${path} 배열이 비어 있습니다.`);
  const parsed = value.map((item, index) => requiredString(item, `${path}[${index}]`, 1, 40));
  if (new Set(parsed).size !== parsed.length) throw new CatalogValidationError(`${path} 값이 중복되었습니다.`);
  if (allowed && parsed.some((item) => !allowed.has(item))) throw new CatalogValidationError(`${path}에 지원하지 않는 값이 있습니다.`);
  return parsed;
}

export function eraForYear(year: number): Era {
  if (!Number.isInteger(year) || year < 1888 || year > 2100) {
    throw new CatalogValidationError("작품 연도가 올바르지 않습니다.");
  }
  if (year <= 1999) return "classic";
  if (year <= 2019) return "modern";
  return "recent";
}

function parseEntry(value: unknown, index: number): WorkCatalogEntry {
  const path = `works[${index}]`;
  if (!isRecord(value)) throw new CatalogValidationError(`${path}는 객체여야 합니다.`);
  assertExactKeys(value, entryKeys, path);

  const id = requiredString(value.id, `${path}.id`, 3, 100);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new CatalogValidationError(`${path}.id 형식이 올바르지 않습니다.`);
  const wikidataId = requiredString(value.wikidataId, `${path}.wikidataId`, 2, 20);
  if (!/^Q[1-9]\d*$/.test(wikidataId)) throw new CatalogValidationError(`${path}.wikidataId 형식이 올바르지 않습니다.`);
  const title = requiredString(value.title, `${path}.title`, 1, 120);
  if (!Number.isInteger(value.year)) throw new CatalogValidationError(`${path}.year 값이 올바르지 않습니다.`);
  const year = value.year as number;
  eraForYear(year);
  if (value.mediaType !== "movie" && value.mediaType !== "tv") throw new CatalogValidationError(`${path}.mediaType 값이 올바르지 않습니다.`);
  const mediaType = value.mediaType;
  const genres = uniqueStrings(value.genres, `${path}.genres`, genreSet) as AllowedGenre[];
  const spoilerFreePremise = requiredString(value.spoilerFreePremise, `${path}.spoilerFreePremise`, 10, 240);
  const recommendationTags = uniqueStrings(value.recommendationTags, `${path}.recommendationTags`);
  if (!Number.isInteger(value.priority) || (value.priority as number) < 1 || (value.priority as number) > 1000) {
    throw new CatalogValidationError(`${path}.priority 값이 올바르지 않습니다.`);
  }
  const priority = value.priority as number;
  const sourceUrl = requiredString(value.sourceUrl, `${path}.sourceUrl`, 20, 100);
  if (sourceUrl !== `https://www.wikidata.org/wiki/${wikidataId}`) {
    throw new CatalogValidationError(`${path}.sourceUrl은 해당 Wikidata 항목이어야 합니다.`);
  }

  return {id, wikidataId, title, year, mediaType, genres, spoilerFreePremise, recommendationTags, priority, sourceUrl};
}

export function getBucketCoverage(entries: readonly WorkCatalogEntry[] = loadWorksCatalog()): Record<string, number> {
  const coverage: Record<string, number> = {};
  for (const mediaType of ["movie", "tv"] as const) {
    for (const genre of ALLOWED_GENRES) {
      for (const era of ERAS) coverage[`${mediaType}:${genre}:${era}`] = 0;
    }
  }
  for (const entry of entries) {
    const era = eraForYear(entry.year);
    for (const genre of entry.genres) coverage[`${entry.mediaType}:${genre}:${era}`] += 1;
  }
  return coverage;
}

export function validateCatalog(value: unknown): WorkCatalogEntry[] {
  if (!isRecord(value)) throw new CatalogValidationError("카탈로그 루트는 객체여야 합니다.");
  assertExactKeys(value, ["version", "works"], "catalog");
  if (value.version !== 1) throw new CatalogValidationError("지원하지 않는 카탈로그 버전입니다.");
  if (!Array.isArray(value.works) || value.works.length === 0) throw new CatalogValidationError("카탈로그에 작품이 없습니다.");

  const entries = value.works.map(parseEntry);
  const ids = new Set<string>();
  const wikidataIds = new Set<string>();
  for (const entry of entries) {
    if (ids.has(entry.id)) throw new CatalogValidationError(`중복 작품 ID: ${entry.id}`);
    if (wikidataIds.has(entry.wikidataId)) throw new CatalogValidationError(`중복 Wikidata ID: ${entry.wikidataId}`);
    ids.add(entry.id);
    wikidataIds.add(entry.wikidataId);
  }

  const coverage = getBucketCoverage(entries);
  const shortBuckets = Object.entries(coverage).filter(([, count]) => count < 6);
  if (shortBuckets.length > 0) {
    throw new CatalogValidationError(`작품이 6편 미만인 조합: ${shortBuckets.map(([key, count]) => `${key}=${count}`).join(", ")}`);
  }
  return entries;
}

let cachedCatalog: WorkCatalogEntry[] | undefined;

export function loadWorksCatalog(): WorkCatalogEntry[] {
  if (!cachedCatalog) cachedCatalog = validateCatalog(rawCatalog as unknown);
  return cachedCatalog;
}

function validateRequest(request: WorkRecommendationRequest) {
  if (request.mediaType !== "movie" && request.mediaType !== "tv") throw new CatalogValidationError("지원하지 않는 작품 유형입니다.");
  if (!genreSet.has(request.genre)) throw new CatalogValidationError("지원하지 않는 장르입니다.");
  if (!eraSet.has(request.era)) throw new CatalogValidationError("지원하지 않는 시대입니다.");
  if (request.excludeIds !== undefined) {
    if (!Array.isArray(request.excludeIds) || request.excludeIds.length > 1000 || request.excludeIds.some((id) => typeof id !== "string" || id.length === 0)) {
      throw new CatalogValidationError("excludeIds 값이 올바르지 않습니다.");
    }
  }
}

const eraLabels: Record<Era, string> = {classic: "고전", modern: "근래", recent: "최근"};

function toRecommendation(entry: WorkCatalogEntry, request: WorkRecommendationRequest): WorkRecommendation {
  const tags = entry.recommendationTags.slice(0, 2).join("·");
  return {
    id: entry.id,
    title: entry.title,
    year: entry.year,
    mediaType: entry.mediaType,
    genres: [...entry.genres],
    premise: entry.spoilerFreePremise,
    reason: `${eraLabels[request.era]} ${request.genre} 작품 중 ${tags} 매력이 돋보이는 선택입니다.`,
    era: request.era,
    source: {label: "Wikidata 작품 정보", url: entry.sourceUrl},
  };
}

export function recommendWorks(
  request: WorkRecommendationRequest,
  entries: readonly WorkCatalogEntry[] = loadWorksCatalog(),
): WorkRecommendationResult {
  validateRequest(request);
  const candidates = entries
    .filter((entry) => entry.mediaType === request.mediaType && entry.genres.includes(request.genre) && eraForYear(entry.year) === request.era)
    .sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id, "en"));

  if (candidates.length < 3) {
    throw new CatalogIntegrityError(`${request.mediaType}/${request.genre}/${request.era} 조합의 작품이 3편 미만입니다.`);
  }

  const excluded = new Set(request.excludeIds ?? []);
  const unseen = candidates.filter((entry) => !excluded.has(entry.id));
  const cycleReset = unseen.length < 3;
  const pool = cycleReset ? candidates : unseen;
  const selected = pool.slice(0, 3);

  return {
    recommendations: selected.map((entry) => toRecommendation(entry, request)),
    meta: {remaining: pool.length - selected.length, cycleReset},
  };
}

/** Public API alias used by the recommendation route. */
export const getRecommendations = recommendWorks;
