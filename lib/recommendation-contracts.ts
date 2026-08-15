export type MediaType = "movie" | "tv";

export const ALLOWED_GENRES = [
  "드라마", "스릴러", "로맨스", "SF", "미스터리", "코미디", "판타지", "액션", "범죄", "애니메이션",
] as const;
export const ALLOWED_MOODS = ["thrilling", "warm", "mysterious", "funny", "moving", "spectacular"] as const;
export const SUPPORTED_OTT_PROVIDER = "netflix" as const;
export const SUPPORTED_REGION = "KR" as const;
export const SUPPORTED_ACCESS_MODE = "subscription" as const;

export type Mood = (typeof ALLOWED_MOODS)[number];
export type AllowedGenre = (typeof ALLOWED_GENRES)[number];
export type RecommendationRequest = {
  mediaType: MediaType;
  genres: AllowedGenre[];
  mood: Mood;
  ottProvider: typeof SUPPORTED_OTT_PROVIDER;
  region: typeof SUPPORTED_REGION;
  accessMode: typeof SUPPORTED_ACCESS_MODE;
};
export type RecommendationAvailability = {
  provider: typeof SUPPORTED_OTT_PROVIDER;
  region: typeof SUPPORTED_REGION;
  accessMode: typeof SUPPORTED_ACCESS_MODE;
  status: "verified_manual";
  checkedAt: string;
  expiresAt: string;
  sourceUrl: string;
};
export type Recommendation = {
  id: string;
  title: string;
  year: number;
  mediaType: MediaType;
  genres: string[];
  premise: string;
  reason: string;
  rating: string;
  checkedAt: string;
  availability: RecommendationAvailability;
  sources: Array<{label: string; url: string}>;
};

export class RequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequestValidationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseRecommendationRequest(value: unknown): RecommendationRequest {
  if (!isRecord(value)) throw new RequestValidationError("추천 조건을 확인해 주세요.");
  const mediaType = value.mediaType;
  if (mediaType !== "movie" && mediaType !== "tv") throw new RequestValidationError("영화 또는 TV를 선택해 주세요.");
  if (!Array.isArray(value.genres) || value.genres.length < 1 || value.genres.length > 3) {
    throw new RequestValidationError("장르는 1개에서 3개까지 선택해 주세요.");
  }
  const allowedGenres = new Set<string>(ALLOWED_GENRES);
  const genres: AllowedGenre[] = [];
  for (const genre of value.genres) {
    if (typeof genre !== "string" || !allowedGenres.has(genre)) throw new RequestValidationError("지원하지 않는 장르가 포함되어 있습니다.");
    if (!genres.includes(genre as AllowedGenre)) genres.push(genre as AllowedGenre);
  }
  if (genres.length !== value.genres.length) throw new RequestValidationError("장르를 중복해서 선택할 수 없습니다.");
  const mood = value.mood;
  if (typeof mood !== "string" || !(ALLOWED_MOODS as readonly string[]).includes(mood)) {
    throw new RequestValidationError("지원하지 않는 분위기입니다.");
  }
  if (value.ottProvider !== SUPPORTED_OTT_PROVIDER) throw new RequestValidationError("현재는 Netflix만 지원합니다.");
  if (value.region !== SUPPORTED_REGION) throw new RequestValidationError("현재는 Netflix 대한민국 목록만 지원합니다.");
  if (value.accessMode !== SUPPORTED_ACCESS_MODE) throw new RequestValidationError("현재는 구독에 포함된 작품만 지원합니다.");
  return {
    mediaType,
    genres,
    mood: mood as Mood,
    ottProvider: SUPPORTED_OTT_PROVIDER,
    region: SUPPORTED_REGION,
    accessMode: SUPPORTED_ACCESS_MODE,
  };
}
