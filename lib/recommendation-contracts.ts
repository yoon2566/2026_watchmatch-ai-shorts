export type MediaType = "movie" | "tv";
export type Era = "classic" | "modern" | "recent";

export const ALLOWED_GENRES = [
  "드라마",
  "스릴러",
  "로맨스",
  "SF",
  "미스터리",
  "코미디",
  "판타지",
  "액션",
  "범죄",
  "애니메이션",
] as const;

export const ALLOWED_ERAS = ["classic", "modern", "recent"] as const;
export type AllowedGenre = (typeof ALLOWED_GENRES)[number];

export type RecommendationRequest = {
  mediaType: MediaType;
  genre: AllowedGenre;
  era: Era;
  excludeIds?: string[];
};

export type Recommendation = {
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

export type RecommendationResponse = {
  recommendations: Recommendation[];
  meta: {remaining: number; cycleReset: boolean};
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
  if (value.mediaType !== "movie" && value.mediaType !== "tv") {
    throw new RequestValidationError("영화 또는 TV를 선택해 주세요.");
  }
  if (typeof value.genre !== "string" || !(ALLOWED_GENRES as readonly string[]).includes(value.genre)) {
    throw new RequestValidationError("지원하는 장르 하나를 선택해 주세요.");
  }
  if (typeof value.era !== "string" || !(ALLOWED_ERAS as readonly string[]).includes(value.era)) {
    throw new RequestValidationError("고전, 근래 또는 최근을 선택해 주세요.");
  }

  const rawExcludeIds = value.excludeIds ?? [];
  if (!Array.isArray(rawExcludeIds) || rawExcludeIds.length > 100) {
    throw new RequestValidationError("재추천 기록을 확인해 주세요.");
  }
  const excludeIds: string[] = [];
  for (const id of rawExcludeIds) {
    if (typeof id !== "string" || !/^[a-z0-9][a-z0-9-]{2,79}$/u.test(id)) {
      throw new RequestValidationError("재추천 기록에 잘못된 작품 ID가 있습니다.");
    }
    if (!excludeIds.includes(id)) excludeIds.push(id);
  }

  return {
    mediaType: value.mediaType,
    genre: value.genre as AllowedGenre,
    era: value.era as Era,
    excludeIds,
  };
}
