"use client";

import {useEffect, useMemo, useRef, useState} from "react";

type Scene = "media" | "genre" | "era" | "recommendations" | "production" | "result";
type MediaType = "movie" | "tv";
type Era = "classic" | "modern" | "recent";

const GENRES = [
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

type AllowedGenre = (typeof GENRES)[number];

type Recommendation = {
  id: string;
  title: string;
  year: number;
  mediaType: MediaType;
  genres: string[];
  premise: string;
  reason: string;
  source: {label: string; url: string};
  era: Era;
};

type RecommendationMeta = {
  remaining: number;
  cycleReset: boolean;
};

const FLOW_STEPS: Array<{scene: Scene; label: string}> = [
  {scene: "media", label: "영화·TV"},
  {scene: "genre", label: "장르"},
  {scene: "era", label: "시대"},
  {scene: "recommendations", label: "작품 선택"},
  {scene: "production", label: "영상 제작"},
  {scene: "result", label: "영상 보기"},
];

const ERAS: Array<{value: Era; label: string; years: string; description: string; symbol: string}> = [
  {value: "classic", label: "고전", years: "1999년까지", description: "시간이 지나도 사랑받는 작품", symbol: "◷"},
  {value: "modern", label: "근래", years: "2000–2019년", description: "익숙함과 새로움이 공존하는 작품", symbol: "◇"},
  {value: "recent", label: "최근", years: "2020년부터", description: "지금의 감각을 담은 작품", symbol: "✦"},
];

const PIPELINE_STEPS = ["대본", "장면 1", "장면 2", "장면 3", "음성", "편집", "검증", "완료"];
const SEEN_STORAGE_PREFIX = "watchmatch:seen:v1";

function BrandMark({small = false}: {small?: boolean}) {
  return (
    <span className={`brand-mark ${small ? "small" : ""}`} aria-hidden="true">
      <span />
    </span>
  );
}

function FlowProgress({scene}: {scene: Scene}) {
  const current = FLOW_STEPS.findIndex((step) => step.scene === scene);
  return (
    <nav className="flow-progress" aria-label="추천 및 쇼츠 제작 단계">
      <ol>
        {FLOW_STEPS.map((step, index) => (
          <li
            key={step.scene}
            className={`${index === current ? "is-active" : ""} ${index < current ? "is-complete" : ""}`}
            aria-current={index === current ? "step" : undefined}
          >
            <span aria-hidden="true">{index < current ? "✓" : String(index + 1).padStart(2, "0")}</span>
            <small>{step.label}</small>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function eraLabel(era: Era): string {
  return ERAS.find((item) => item.value === era)?.label ?? era;
}

function storageKey(mediaType: MediaType, genre: AllowedGenre, era: Era): string {
  return `${SEEN_STORAGE_PREFIX}:${mediaType}:${genre}:${era}`;
}

function readSeenIds(mediaType: MediaType, genre: AllowedGenre, era: Era): string[] {
  try {
    const stored = window.sessionStorage.getItem(storageKey(mediaType, genre, era));
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeSeenIds(mediaType: MediaType, genre: AllowedGenre, era: Era, ids: string[]) {
  try {
    window.sessionStorage.setItem(storageKey(mediaType, genre, era), JSON.stringify([...new Set(ids)]));
  } catch {
    // 추천은 저장 공간이 차단된 환경에서도 정상 동작해야 합니다.
  }
}

function RecommendationCard({
  recommendation,
  index,
  selected,
  onSelect,
}: {
  recommendation: Recommendation;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <article className={`recommendation-card ${selected ? "is-selected" : ""}`}>
      <button
        type="button"
        className="recommendation-select"
        role="radio"
        aria-label={`${recommendation.title} 선택`}
        aria-checked={selected}
        onClick={onSelect}
      >
        <span className="card-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
        <span className="selection-mark" aria-hidden="true">{selected ? "✓" : "+"}</span>
      </button>
      <div className="card-meta">
        <span>{recommendation.year}</span>
        <span>{recommendation.mediaType === "movie" ? "영화" : "TV 시리즈"}</span>
        <span>{eraLabel(recommendation.era)}</span>
        <span className="safe-badge">스포일러 없음</span>
      </div>
      <h3>{recommendation.title}</h3>
      <div className="genre-row" aria-label="장르">
        {recommendation.genres.map((item) => <span key={item}>#{item}</span>)}
      </div>
      <div className="card-copy">
        <p className="copy-label">무스포 전제</p>
        <p>{recommendation.premise}</p>
      </div>
      <div className="reason-box">
        <span className="reason-symbol" aria-hidden="true">✦</span>
        <div>
          <p className="copy-label">이 작품인 이유</p>
          <p>{recommendation.reason}</p>
        </div>
      </div>
      <div className="source-row">
        <span>작품 정보 출처</span>
        <a href={recommendation.source.url} target="_blank" rel="noopener noreferrer">
          {recommendation.source.label}<span aria-hidden="true"> ↗</span>
        </a>
      </div>
    </article>
  );
}

export default function WatchMatchHosted() {
  const [scene, setScene] = useState<Scene>("media");
  const [mediaType, setMediaType] = useState<MediaType | null>(null);
  const [genre, setGenre] = useState<AllowedGenre | null>(null);
  const [era, setEra] = useState<Era | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recommendationMeta, setRecommendationMeta] = useState<RecommendationMeta>({remaining: 0, cycleReset: false});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [productionRun, setProductionRun] = useState(0);
  const searchAbortRef = useRef<AbortController | null>(null);
  const screenTitleRef = useRef<HTMLHeadingElement | null>(null);

  const selected = useMemo(
    () => recommendations.find((item) => item.id === selectedId) ?? null,
    [recommendations, selectedId],
  );

  useEffect(() => {
    screenTitleRef.current?.focus();
  }, [scene]);

  useEffect(() => {
    if (scene !== "production") return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const next = Math.min(100, Math.round(((Date.now() - startedAt) / 8500) * 100));
      setProgress(next);
      if (next >= 100) {
        window.clearInterval(timer);
        setScene("result");
      }
    }, 180);
    return () => window.clearInterval(timer);
  }, [productionRun, scene]);

  useEffect(() => () => {
    searchAbortRef.current?.abort();
  }, []);

  const reset = () => {
    searchAbortRef.current?.abort();
    searchAbortRef.current = null;
    setSearching(false);
    setSearchError("");
    setRecommendations([]);
    setRecommendationMeta({remaining: 0, cycleReset: false});
    setScene("media");
    setMediaType(null);
    setGenre(null);
    setEra(null);
    setSelectedId(null);
    setProgress(0);
  };

  const chooseMediaType = (nextMediaType: MediaType) => {
    setMediaType(nextMediaType);
    setGenre(null);
    setEra(null);
    setSearchError("");
    setRecommendations([]);
    setSelectedId(null);
    setScene("genre");
  };

  const chooseGenre = (nextGenre: AllowedGenre) => {
    setGenre(nextGenre);
    setEra(null);
    setSearchError("");
    setRecommendations([]);
    setSelectedId(null);
    setScene("era");
  };

  const findRecommendations = async (requestedEra: Era) => {
    if (!mediaType || !genre) return;

    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    const excludeIds = readSeenIds(mediaType, genre, requestedEra);

    setEra(requestedEra);
    setScene("recommendations");
    setSearching(true);
    setSearchError("");
    setSelectedId(null);
    setRecommendations([]);
    setRecommendationMeta({remaining: 0, cycleReset: false});

    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({mediaType, genre, era: requestedEra, excludeIds}),
        signal: controller.signal,
      });
      const payload = await response.json() as {
        recommendations?: Recommendation[];
        meta?: Partial<RecommendationMeta>;
        error?: {message?: string};
      };

      if (!response.ok) {
        throw new Error(payload.error?.message || "추천 작품을 불러오지 못했습니다.");
      }
      if (!Array.isArray(payload.recommendations) || payload.recommendations.length !== 3) {
        throw new Error("추천 카탈로그를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.");
      }
      if (controller.signal.aborted) return;

      const nextMeta: RecommendationMeta = {
        remaining: typeof payload.meta?.remaining === "number" ? payload.meta.remaining : 0,
        cycleReset: payload.meta?.cycleReset === true,
      };
      const returnedIds = payload.recommendations.map((item) => item.id);
      writeSeenIds(
        mediaType,
        genre,
        requestedEra,
        nextMeta.cycleReset ? returnedIds : [...excludeIds, ...returnedIds],
      );
      setRecommendations(payload.recommendations);
      setRecommendationMeta(nextMeta);
    } catch (error) {
      if (controller.signal.aborted) return;
      setSearchError(error instanceof Error ? error.message : "추천 작품을 불러오지 못했습니다.");
    } finally {
      if (searchAbortRef.current === controller) {
        searchAbortRef.current = null;
        setSearching(false);
      }
    }
  };

  const startProduction = () => {
    if (!selected) return;
    setProgress(0);
    setProductionRun((run) => run + 1);
    setScene("production");
  };

  const activePipelineIndex = Math.min(7, Math.floor(progress / 12.5));
  const selectionLabel = mediaType && genre && era
    ? `${mediaType === "movie" ? "영화" : "TV 시리즈"} · ${genre} · ${eraLabel(era)}`
    : "";

  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="brand" type="button" aria-label="WatchMatch 처음부터 시작" onClick={reset}>
          <BrandMark />
          <span>WatchMatch</span>
        </button>
        <button type="button" className="header-reset-button" onClick={reset}>처음부터</button>
      </header>

      <main id="top">
        <FlowProgress scene={scene} />

        {scene === "media" ? (
          <section className="selection-screen flow-screen" aria-labelledby="media-title">
            <div className="selection-panel">
              <p className="step-kicker">01 · 작품 유형</p>
              <h1 id="media-title" ref={screenTitleRef} tabIndex={-1}>무엇을 보고 싶나요?</h1>
              <p className="selection-lead">영화와 TV 시리즈 중 하나만 눌러주세요.</p>
              <div className="selection-options media-options" role="group" aria-label="작품 유형 선택">
                <button type="button" onClick={() => chooseMediaType("movie")}>
                  <span className="option-symbol" aria-hidden="true">▶</span>
                  <strong>영화</strong>
                  <small>한 편에 깊게 몰입하기</small>
                  <span className="option-arrow" aria-hidden="true">→</span>
                </button>
                <button type="button" onClick={() => chooseMediaType("tv")}>
                  <span className="option-symbol" aria-hidden="true">▤</span>
                  <strong>TV 시리즈</strong>
                  <small>여러 에피소드로 오래 즐기기</small>
                  <span className="option-arrow" aria-hidden="true">→</span>
                </button>
              </div>
              <p className="three-click-hint"><span aria-hidden="true">✦</span> 세 번만 선택하면 작품 3개를 바로 추천해 드려요.</p>
            </div>
          </section>
        ) : null}

        {scene === "genre" ? (
          <section className="selection-screen flow-screen" aria-labelledby="genre-title">
            <div className="selection-panel">
              <button type="button" className="screen-back-button" onClick={() => setScene("media")}><span aria-hidden="true">←</span> 영화·TV 다시 선택</button>
              <p className="step-kicker">02 · 장르</p>
              <h1 id="genre-title" ref={screenTitleRef} tabIndex={-1}>어떤 이야기가 당기나요?</h1>
              <p className="selection-lead"><strong>{mediaType === "movie" ? "영화" : "TV 시리즈"}</strong>에서 장르 하나를 골라주세요.</p>
              <div className="selection-options genre-options" role="group" aria-label="장르 선택">
                {GENRES.map((item, index) => (
                  <button type="button" key={item} onClick={() => chooseGenre(item)}>
                    <span className="genre-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    <strong>{item}</strong>
                    <span className="option-arrow" aria-hidden="true">→</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {scene === "era" ? (
          <section className="selection-screen flow-screen" aria-labelledby="era-title">
            <div className="selection-panel">
              <button type="button" className="screen-back-button" onClick={() => setScene("genre")}><span aria-hidden="true">←</span> 장르 다시 선택</button>
              <p className="step-kicker">03 · 시대</p>
              <h1 id="era-title" ref={screenTitleRef} tabIndex={-1}>어느 시대의 작품이 좋나요?</h1>
              <p className="selection-lead"><strong>{mediaType === "movie" ? "영화" : "TV 시리즈"} · {genre}</strong>에 시대 감각을 더해볼게요.</p>
              <div className="selection-options era-options" role="group" aria-label="작품 시대 선택">
                {ERAS.map((item) => (
                  <button type="button" key={item.value} onClick={() => void findRecommendations(item.value)}>
                    <span className="option-symbol" aria-hidden="true">{item.symbol}</span>
                    <strong>{item.label}</strong>
                    <span className="era-years">{item.years}</span>
                    <small>{item.description}</small>
                    <span className="option-arrow" aria-hidden="true">→</span>
                  </button>
                ))}
              </div>
              <p className="three-click-hint"><span aria-hidden="true">◇</span> 시대를 누르면 별도 검색 버튼 없이 바로 세 작품이 나옵니다.</p>
            </div>
          </section>
        ) : null}

        {scene === "recommendations" ? (
          <section className="recommendations-section flow-screen" aria-labelledby="recommendations-title">
            <button type="button" className="screen-back-button" onClick={() => setScene("era")}><span aria-hidden="true">←</span> 시대 다시 선택</button>
            <div className="section-heading recommendation-heading">
              <div>
                <p className="step-kicker">04 · 작품 선택</p>
                <h1 id="recommendations-title" ref={screenTitleRef} tabIndex={-1}>{searching ? "딱 맞는 세 작품을 고르는 중…" : "오늘의 후보는 이 세 작품"}</h1>
                <p className="selection-summary">{selectionLabel}</p>
              </div>
              {!searching && recommendations.length === 3 ? <span className="no-spoiler-badge"><span aria-hidden="true">✓</span> 전부 무스포</span> : null}
            </div>

            <div className="catalog-notice" role="note">
              <span aria-hidden="true">i</span>
              <p>일반 작품 카탈로그를 기준으로 추천합니다. <strong>OTT 제공 여부는 각 서비스에서 확인해 주세요.</strong></p>
            </div>

            {searching ? (
              <div className="recommendation-grid" aria-label="추천 작품을 불러오는 중" aria-live="polite">
                {[0, 1, 2].map((item) => <div key={item} className="recommendation-card skeleton-card"><span className="skeleton-line skeleton-meta" /><span className="skeleton-line skeleton-title" /><span className="skeleton-line" /><span className="skeleton-line short" /><span className="skeleton-block" /></div>)}
              </div>
            ) : searchError ? (
              <div className="empty-recommendations" role="alert">
                <span aria-hidden="true">!</span>
                <div><strong>추천을 불러오지 못했습니다.</strong><p>{searchError}</p></div>
                {era ? <button type="button" className="secondary-button" onClick={() => void findRecommendations(era)}>다시 시도</button> : null}
              </div>
            ) : (
              <>
                <div className="recommendation-toolbar" aria-live="polite">
                  <p>{recommendationMeta.cycleReset ? "후보를 한 바퀴 돌아 새 순환을 시작했어요." : `이 조건에서 아직 보지 않은 작품 ${recommendationMeta.remaining}편`}</p>
                  <button type="button" className="secondary-button" onClick={() => era && void findRecommendations(era)} disabled={!era || searching}>다른 3편 추천 <span aria-hidden="true">↻</span></button>
                </div>
                <div className="recommendation-grid" role="radiogroup" aria-label="추천 작품 3개">
                  {recommendations.map((recommendation, index) => <RecommendationCard key={recommendation.id} recommendation={recommendation} index={index} selected={recommendation.id === selectedId} onSelect={() => setSelectedId(recommendation.id)} />)}
                </div>
              </>
            )}

            <div className="create-bar">
              <div><p>선택한 작품</p><strong>{selected?.title ?? "작품을 하나 골라주세요"}</strong></div>
              <button type="button" className="primary-button" onClick={startProduction} disabled={!selected}>25초 쇼츠 체험 <span aria-hidden="true">▶</span></button>
            </div>
          </section>
        ) : null}

        {scene === "production" ? (
          <section className="project-section flow-screen production-screen" aria-labelledby="production-title">
            <section className="pipeline-panel">
              <div className="pipeline-heading"><div><p className="eyebrow">05 · 영상 제작 중</p><h1 id="production-title" ref={screenTitleRef} tabIndex={-1}>{selected?.title}</h1></div><span className="render-id">VIDEO DEMO</span></div>
              <div className="active-job"><div className="job-orbit" aria-hidden="true"><span /></div><div><p aria-live="polite">{PIPELINE_STEPS[activePipelineIndex]}</p><span>공개 체험판용 준비 과정을 보여드리고 있어요.</span></div><strong>{progress}%</strong></div>
              <div className="progress-track" role="progressbar" aria-label="쇼츠 준비 진행률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{width: `${progress}%`}} /></div>
              <ol className="pipeline-steps">
                {PIPELINE_STEPS.map((label, index) => <li key={label} className={`${index < activePipelineIndex ? "is-complete" : ""} ${index === activePipelineIndex ? "is-active" : ""}`}><span className="step-marker" aria-hidden="true">{index < activePipelineIndex ? "✓" : String(index + 1).padStart(2, "0")}</span><span>{label}</span></li>)}
              </ol>
            </section>
            <button type="button" className="text-button cancel-button" onClick={() => setScene("recommendations")}>체험 중단</button>
          </section>
        ) : null}

        {scene === "result" ? (
          <section className="project-section flow-screen result-screen" aria-labelledby="result-title">
            <section className="result-panel">
              <div className="result-copy">
                <p className="step-kicker">06 · 영상 보기</p>
                <h1 id="result-title" ref={screenTitleRef} tabIndex={-1}>25초의 호기심이 완성됐어요.</h1>
                <p>선택 흐름을 확인하는 공개 체험판입니다. 아래 영상은 로컬 Wan·Heami·Remotion 파이프라인으로 만든 검증된 Sintel 기술 샘플입니다.</p>
                <div className="result-facts"><div><span>선택 작품</span><strong>{selected?.title}</strong></div><div><span>샘플 형식</span><strong>9:16 · 25초</strong></div><div><span>샘플 검증</span><strong>H.264 · AAC</strong></div></div>
                <div className="result-actions">
                  <a className="primary-button download-button" href="/demo/watchmatch-demo.mp4" download>샘플 MP4 다운로드 <span aria-hidden="true">↓</span></a>
                  <button type="button" className="secondary-button" onClick={startProduction}>다시 체험하기</button>
                  <button type="button" className="text-button" onClick={reset}>처음부터 추천받기</button>
                </div>
              </div>
              <div className="phone-frame">
                <div className="phone-top" aria-hidden="true"><span /></div>
                <div className="video-shell"><video src="/demo/watchmatch-demo.mp4" controls playsInline preload="metadata" aria-label="WatchMatch Sintel 기술 샘플"><track kind="captions" src="/demo/watchmatch-demo-ko.vtt" srcLang="ko" label="한국어" />브라우저에서 영상을 재생할 수 없습니다.</video><span className="video-label">AI 생성 · Sintel 기술 샘플</span></div>
              </div>
            </section>
          </section>
        ) : null}
      </main>

      <footer className="site-footer">
        <div className="footer-brand"><BrandMark small /><strong>WatchMatch</strong></div>
        <p>작품은 출처가 기록된 일반 카탈로그에서 추천합니다. 포스터·예고편은 사용하지 않으며 OTT 제공 여부는 각 서비스에서 확인해 주세요.</p>
        <span>© 2026 WatchMatch Prototype</span>
      </footer>
    </div>
  );
}
