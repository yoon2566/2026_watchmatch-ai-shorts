export const PROVIDERS = [
  {key: "netflix", label: "넷플릭스", sourceId: 203},
  {key: "watcha", label: "왓챠", sourceId: 509},
  {key: "disney-plus", label: "디즈니+", sourceId: 372},
  {key: "tving", label: "티빙", sourceId: 513},
  {key: "wavve", label: "웨이브", sourceId: 515},
  {key: "prime-video", label: "프라임 비디오", sourceId: 26},
] as const;

export const WATCHMODE_GENRES = [
  {key: "action", label: "액션", aliases: ["Action"]},
  {key: "comedy", label: "코미디", aliases: ["Comedy"]},
  {key: "drama", label: "드라마", aliases: ["Drama"]},
  {key: "thriller", label: "스릴러", aliases: ["Thriller"]},
  {key: "romance", label: "로맨스", aliases: ["Romance"]},
  {key: "science-fiction", label: "SF", aliases: ["Science Fiction", "Sci-Fi"]},
  {key: "fantasy", label: "판타지", aliases: ["Fantasy"]},
  {key: "horror", label: "공포", aliases: ["Horror"]},
  {key: "mystery", label: "미스터리", aliases: ["Mystery"]},
  {key: "animation", label: "애니메이션", aliases: ["Animation", "Anime"]},
] as const;

export type ProviderKey = (typeof PROVIDERS)[number]["key"];
export type GenreKey = (typeof WATCHMODE_GENRES)[number]["key"];
export type MediaType = "movie" | "tv";

export type RecommendationRequest = {
  provider: ProviderKey;
  mediaType: MediaType;
  genre: GenreKey;
};

export type Recommendation = {
  id: number;
  title: string;
  year: number | null;
  type: MediaType;
  userRating: number | null;
  criticScore: number | null;
  popularityPercentile: number | null;
};

export type OptionsResponse = {
  region: "KR";
  regionEnabled: boolean;
  providers: Array<{key: ProviderKey; label: string; sourceId: number; available: boolean}>;
  genres: Array<{key: GenreKey; label: string; genreId: number | null; available: boolean}>;
};

export type RecommendationResponse = {
  recommendations: Recommendation[];
  meta: {
    region: "KR";
    provider: ProviderKey;
    providerLabel: string;
    mediaType: MediaType;
    genre: GenreKey;
    genreLabel: string;
    totalResults: number;
    ratingFilterRelaxed: boolean;
    detailsUnavailable: number;
  };
};

type RegionItem = {country?: string; plan_enabled?: boolean};
type SourceItem = {id?: number; type?: string; regions?: string[]};
type GenreItem = {id?: number; name?: string};
type ListTitleItem = {
  id?: number;
  title?: string;
  year?: number;
  type?: string;
  popularity_percentile?: number | null;
};
type ListTitlesResponse = {titles?: ListTitleItem[]; total_results?: number};
type TitleDetails = {
  title?: string;
  year?: number;
  type?: string;
  user_rating?: number | null;
  critic_score?: number | null;
  popularity_percentile?: number | null;
};

export class RequestValidationError extends Error {}
export class ConfigurationError extends Error {}
export class OptionUnavailableError extends Error {}

export class WatchmodeApiError extends Error {
  readonly code: string;
  readonly responseStatus: number;

  constructor(
    code: string,
    message: string,
    responseStatus: number,
  ) {
    super(message);
    this.code = code;
    this.responseStatus = responseStatus;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseRecommendationRequest(value: unknown): RecommendationRequest {
  if (!isRecord(value)) throw new RequestValidationError("추천 조건을 확인해 주세요.");
  const provider = PROVIDERS.find((item) => item.key === value.provider);
  const genre = WATCHMODE_GENRES.find((item) => item.key === value.genre);
  if (!provider) throw new RequestValidationError("지원하는 OTT를 선택해 주세요.");
  if (value.mediaType !== "movie" && value.mediaType !== "tv") {
    throw new RequestValidationError("영화 또는 TV 시리즈를 선택해 주세요.");
  }
  if (!genre) throw new RequestValidationError("지원하는 장르를 선택해 주세요.");
  return {provider: provider.key, mediaType: value.mediaType, genre: genre.key};
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/gu, "");
}

function safeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function mapMediaType(value: string | undefined, fallback: MediaType): MediaType {
  return value === "movie" ? "movie" : value?.startsWith("tv_") ? "tv" : fallback;
}

export function createWatchmodeClient({
  apiKey,
  fetchImpl = fetch,
}: {
  apiKey: string;
  fetchImpl?: typeof fetch;
}) {
  const secret = apiKey.trim();
  if (!secret) throw new ConfigurationError("WATCHMODE_API_KEY가 설정되지 않았습니다.");
  let optionsPromise: Promise<OptionsResponse> | null = null;

  async function request<T>(pathname: string, params?: URLSearchParams): Promise<T> {
    const url = new URL(pathname, "https://api.watchmode.com/v1/");
    if (params) url.search = params.toString();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetchImpl(url, {
        headers: {"X-API-Key": secret, Accept: "application/json"},
        signal: controller.signal,
      });
      if (!response.ok) {
        if (response.status === 401) {
          throw new WatchmodeApiError("WATCHMODE_AUTH_ERROR", "Watchmode API 키 또는 한국 지역 사용 권한을 확인해 주세요.", 502);
        }
        if (response.status === 429) {
          throw new WatchmodeApiError("WATCHMODE_QUOTA_EXCEEDED", "Watchmode API 요청 한도에 도달했습니다.", 429);
        }
        throw new WatchmodeApiError("WATCHMODE_REQUEST_FAILED", `Watchmode API 요청에 실패했습니다. (상태 ${response.status})`, 502);
      }
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof WatchmodeApiError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new WatchmodeApiError("WATCHMODE_TIMEOUT", "Watchmode 응답 시간이 초과되었습니다.", 502);
      }
      throw new WatchmodeApiError("WATCHMODE_NETWORK_ERROR", "Watchmode에 연결하지 못했습니다.", 502);
    } finally {
      clearTimeout(timeout);
    }
  }

  async function loadOptions(): Promise<OptionsResponse> {
    const [regions, sources, genres] = await Promise.all([
      request<RegionItem[]>("regions/"),
      request<SourceItem[]>("sources/", new URLSearchParams({regions: "KR", types: "sub"})),
      request<GenreItem[]>("genres/"),
    ]);
    const regionEnabled = regions.find((item) => item.country?.toUpperCase() === "KR")?.plan_enabled === true;
    const sourceIds = new Set(
      sources
        .filter((item) => item.type === "sub" && item.regions?.some((region) => region.toUpperCase() === "KR") && typeof item.id === "number")
        .map((item) => item.id as number),
    );
    const genreByName = new Map(
      genres
        .filter((item): item is GenreItem & {id: number; name: string} => typeof item.id === "number" && typeof item.name === "string")
        .map((item) => [normalizeName(item.name), item.id]),
    );
    return {
      region: "KR",
      regionEnabled,
      providers: PROVIDERS.map((provider) => ({...provider, available: regionEnabled && sourceIds.has(provider.sourceId)})),
      genres: WATCHMODE_GENRES.map((genre) => {
        const genreId = genre.aliases.map((alias) => genreByName.get(normalizeName(alias))).find((id): id is number => typeof id === "number") ?? null;
        return {key: genre.key, label: genre.label, genreId, available: regionEnabled && genreId !== null};
      }),
    };
  }

  async function getOptions(): Promise<OptionsResponse> {
    optionsPromise ??= loadOptions().catch((error) => {
      optionsPromise = null;
      throw error;
    });
    return optionsPromise;
  }

  async function listTitles(input: RecommendationRequest, sourceId: number, genreId: number, withRatingFloor: boolean) {
    const params = new URLSearchParams({
      regions: "KR",
      source_ids: String(sourceId),
      types: input.mediaType === "movie" ? "movie" : "tv_series,tv_miniseries",
      genres: String(genreId),
      sort_by: "popularity_desc",
      page: "1",
      limit: "3",
    });
    if (withRatingFloor) params.set("user_rating_low", "6.5");
    return request<ListTitlesResponse>("list-titles/", params);
  }

  async function getRecommendations(input: RecommendationRequest): Promise<RecommendationResponse> {
    const options = await getOptions();
    if (!options.regionEnabled) throw new OptionUnavailableError("Watchmode 계정에서 한국 지역이 활성화되지 않았습니다.");
    const provider = options.providers.find((item) => item.key === input.provider);
    const genre = options.genres.find((item) => item.key === input.genre);
    if (!provider?.available) throw new OptionUnavailableError("선택한 OTT를 한국 지역에서 확인할 수 없습니다.");
    if (!genre?.available || genre.genreId === null) throw new OptionUnavailableError("선택한 장르를 Watchmode에서 확인할 수 없습니다.");

    let ratingFilterRelaxed = false;
    let listing = await listTitles(input, provider.sourceId, genre.genreId, true);
    if ((listing.titles?.length ?? 0) < 3) {
      ratingFilterRelaxed = true;
      listing = await listTitles(input, provider.sourceId, genre.genreId, false);
    }
    const candidates = Array.from(
      new Map(
        (listing.titles ?? [])
          .filter((item): item is ListTitleItem & {id: number; title: string} => typeof item.id === "number" && typeof item.title === "string")
          .map((item) => [item.id, item]),
      ).values(),
    ).slice(0, 3);

    let detailsUnavailable = 0;
    const recommendations = await Promise.all(candidates.map(async (item): Promise<Recommendation> => {
      let details: TitleDetails | null = null;
      try {
        details = await request<TitleDetails>(`title/${item.id}/details/`, new URLSearchParams({language: "ko"}));
      } catch {
        detailsUnavailable += 1;
      }
      return {
        id: item.id,
        title: details?.title?.trim() || item.title,
        year: safeNumber(details?.year) ?? safeNumber(item.year),
        type: mapMediaType(details?.type ?? item.type, input.mediaType),
        userRating: safeNumber(details?.user_rating),
        criticScore: safeNumber(details?.critic_score),
        popularityPercentile: safeNumber(details?.popularity_percentile) ?? safeNumber(item.popularity_percentile),
      };
    }));

    return {
      recommendations,
      meta: {
        region: "KR",
        provider: input.provider,
        providerLabel: provider.label,
        mediaType: input.mediaType,
        genre: input.genre,
        genreLabel: genre.label,
        totalResults: typeof listing.total_results === "number" ? listing.total_results : recommendations.length,
        ratingFilterRelaxed,
        detailsUnavailable,
      },
    };
  }

  return {getOptions, getRecommendations};
}
