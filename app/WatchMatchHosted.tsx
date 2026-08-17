"use client";

import {useEffect, useMemo, useRef, useState} from "react";
import {getLocalVideo} from "@/lib/local-video-catalog";

type Scene = "provider" | "media" | "genre" | "recommendations" | "production" | "result";
type MediaType = "movie" | "tv";
type ProviderKey = "netflix" | "watcha" | "disney-plus" | "tving" | "wavve" | "prime-video";
type GenreKey = "action" | "comedy" | "drama" | "thriller" | "romance" | "science-fiction" | "fantasy" | "horror" | "mystery" | "animation";

type ProviderOption = {key: ProviderKey; label: string; sourceId: number; available: boolean};
type GenreOption = {key: GenreKey; label: string; genreId: number | null; available: boolean};
type OptionsResponse = {region: "KR"; regionEnabled: boolean; providers: ProviderOption[]; genres: GenreOption[]};
type Recommendation = {
  id: number;
  title: string;
  year: number | null;
  type: MediaType;
  userRating: number | null;
  criticScore: number | null;
  popularityPercentile: number | null;
};
type RecommendationMeta = {
  providerLabel: string;
  genreLabel: string;
  totalResults: number;
  ratingFilterRelaxed: boolean;
  detailsUnavailable: number;
};

const FALLBACK_PROVIDERS: ProviderOption[] = [
  {key: "netflix", label: "넷플릭스", sourceId: 203, available: true},
  {key: "watcha", label: "왓챠", sourceId: 509, available: true},
  {key: "disney-plus", label: "디즈니+", sourceId: 372, available: true},
  {key: "tving", label: "티빙", sourceId: 513, available: true},
  {key: "wavve", label: "웨이브", sourceId: 515, available: true},
  {key: "prime-video", label: "프라임 비디오", sourceId: 26, available: true},
];

const FALLBACK_GENRES: GenreOption[] = [
  ["action", "액션"], ["comedy", "코미디"], ["drama", "드라마"], ["thriller", "스릴러"],
  ["romance", "로맨스"], ["science-fiction", "SF"], ["fantasy", "판타지"], ["horror", "공포"],
  ["mystery", "미스터리"], ["animation", "애니메이션"],
].map(([key, label], index) => ({key: key as GenreKey, label, genreId: index + 1, available: true}));

const FLOW_STEPS: Array<{scene: Scene; label: string}> = [
  {scene: "provider", label: "OTT"},
  {scene: "media", label: "영화·TV"},
  {scene: "genre", label: "장르"},
  {scene: "recommendations", label: "작품 선택"},
  {scene: "production", label: "영상 제작"},
  {scene: "result", label: "영상 보기"},
];

const PIPELINE_STEPS = ["대본", "장면 1", "장면 2", "장면 3", "음성", "편집", "검증", "완료"];

function BrandMark({small = false}: {small?: boolean}) {
  return <span className={`brand-mark ${small ? "small" : ""}`} aria-hidden="true"><span /></span>;
}

function FlowProgress({scene}: {scene: Scene}) {
  const current = FLOW_STEPS.findIndex((step) => step.scene === scene);
  return (
    <nav className="flow-progress" aria-label="추천 및 쇼츠 제작 단계">
      <ol>{FLOW_STEPS.map((step, index) => (
        <li key={step.scene} className={`${index === current ? "is-active" : ""} ${index < current ? "is-complete" : ""}`} aria-current={index === current ? "step" : undefined}>
          <span aria-hidden="true">{index < current ? "✓" : String(index + 1).padStart(2, "0")}</span><small>{step.label}</small>
        </li>
      ))}</ol>
    </nav>
  );
}

function scoreText(score: number | null, suffix = ""): string {
  return score === null ? "정보 없음" : `${score}${suffix}`;
}

function RecommendationCard({item, index, selected, hasVideo, onSelect}: {item: Recommendation; index: number; selected: boolean; hasVideo: boolean; onSelect: () => void}) {
  return (
    <article className={`recommendation-card ${selected ? "is-selected" : ""}`}>
      <button type="button" className="recommendation-select" role="radio" aria-label={`${item.title} 선택`} aria-checked={selected} onClick={onSelect}>
        <span className="card-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
        <span className="selection-mark" aria-hidden="true">{selected ? "✓" : "+"}</span>
      </button>
      <div className="card-meta">
        <span>{item.year ?? "연도 미상"}</span><span>{item.type === "movie" ? "영화" : "TV 시리즈"}</span><span className="safe-badge">한국 OTT 검색</span><span className={hasVideo ? "video-ready-badge" : "video-pending-badge"}>{hasVideo ? "쇼츠 제작 완료" : "쇼츠 준비 중"}</span>
      </div>
      <h3>{item.title}</h3>
      <div className="watchmode-score-grid" aria-label="Watchmode 작품 평가 정보">
        <div><span>사용자 평점</span><strong>{scoreText(item.userRating)}</strong></div>
        <div><span>평론가 점수</span><strong>{scoreText(item.criticScore)}</strong></div>
        <div><span>인기도</span><strong>{scoreText(item.popularityPercentile, "%")}</strong></div>
      </div>
      <div className="reason-box"><span className="reason-symbol" aria-hidden="true">✦</span><div><p className="copy-label">추천 기준</p><p>선택한 OTT·유형·장르에서 평점과 인기도를 기준으로 찾은 작품입니다.</p></div></div>
      <div className="source-row"><span>작품 데이터</span><a href="https://www.watchmode.com/" target="_blank" rel="noopener noreferrer">Watchmode ↗</a></div>
    </article>
  );
}

export default function WatchMatchHosted() {
  const [scene, setScene] = useState<Scene>("provider");
  const [options, setOptions] = useState<OptionsResponse | null>(null);
  const [optionsError, setOptionsError] = useState("");
  const [provider, setProvider] = useState<ProviderKey | null>(null);
  const [mediaType, setMediaType] = useState<MediaType | null>(null);
  const [genre, setGenre] = useState<GenreKey | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [meta, setMeta] = useState<RecommendationMeta | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [availableVideoIds, setAvailableVideoIds] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);
  const [productionRun, setProductionRun] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const screenTitleRef = useRef<HTMLHeadingElement | null>(null);

  const providers = options?.providers ?? FALLBACK_PROVIDERS;
  const genres = options?.genres ?? FALLBACK_GENRES;
  const selected = useMemo(() => recommendations.find((item) => item.id === selectedId) ?? null, [recommendations, selectedId]);
  const selectedVideo = useMemo(() => {
    if (!selected || !availableVideoIds.includes(selected.id)) return null;
    return getLocalVideo(selected.id);
  }, [availableVideoIds, selected]);

  useEffect(() => { screenTitleRef.current?.focus(); }, [scene]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/options", {signal: controller.signal})
      .then(async (response) => {
        const payload = await response.json() as OptionsResponse & {error?: {message?: string}};
        if (!response.ok) throw new Error(payload.error?.message || "OTT 정보를 확인하지 못했습니다.");
        setOptions(payload);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setOptionsError(error instanceof Error ? error.message : "OTT 정보를 확인하지 못했습니다.");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (scene !== "production") return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const next = Math.min(100, Math.round(((Date.now() - startedAt) / 8500) * 100));
      setProgress(next);
      if (next >= 100) { window.clearInterval(timer); setScene("result"); }
    }, 180);
    return () => window.clearInterval(timer);
  }, [productionRun, scene]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const mapped = recommendations
      .map((item) => ({id: item.id, config: getLocalVideo(item.id)}))
      .filter((item): item is {id: number; config: NonNullable<ReturnType<typeof getLocalVideo>>} => item.config !== null);
    if (mapped.length === 0) return;
    const controller = new AbortController();
    void Promise.all(mapped.map(async ({id, config}) => {
      try {
        const response = await fetch(config.src, {method: "HEAD", cache: "no-store", signal: controller.signal});
        return response.ok ? id : null;
      } catch {
        return null;
      }
    })).then((ids) => {
      if (!controller.signal.aborted) setAvailableVideoIds(ids.filter((id): id is number => id !== null));
    });
    return () => controller.abort();
  }, [recommendations]);

  const reset = () => {
    abortRef.current?.abort();
    setScene("provider"); setProvider(null); setMediaType(null); setGenre(null); setRecommendations([]); setMeta(null);
    setSelectedId(null); setAvailableVideoIds([]); setSearchError(""); setSearching(false); setProgress(0);
  };

  const chooseProvider = (value: ProviderKey) => {
    setProvider(value); setMediaType(null); setGenre(null); setRecommendations([]); setSelectedId(null); setAvailableVideoIds([]); setSearchError(""); setScene("media");
  };

  const chooseMedia = (value: MediaType) => {
    setMediaType(value); setGenre(null); setRecommendations([]); setSelectedId(null); setAvailableVideoIds([]); setSearchError(""); setScene("genre");
  };

  const findRecommendations = async (value: GenreKey) => {
    if (!provider || !mediaType) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setGenre(value); setScene("recommendations"); setSearching(true); setSearchError(""); setRecommendations([]); setMeta(null); setSelectedId(null); setAvailableVideoIds([]);
    try {
      const response = await fetch("/api/recommendations", {
        method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({provider, mediaType, genre: value}), signal: controller.signal,
      });
      const payload = await response.json() as {recommendations?: Recommendation[]; meta?: RecommendationMeta; error?: {message?: string}};
      if (!response.ok) throw new Error(payload.error?.message || "실제 작품 검색에 실패했습니다.");
      if (!Array.isArray(payload.recommendations)) throw new Error("검색 결과 형식을 확인하지 못했습니다.");
      if (controller.signal.aborted) return;
      setRecommendations(payload.recommendations);
      setMeta(payload.meta ?? null);
    } catch (error) {
      if (!controller.signal.aborted) setSearchError(error instanceof Error ? error.message : "실제 작품 검색에 실패했습니다.");
    } finally {
      if (abortRef.current === controller) { abortRef.current = null; setSearching(false); }
    }
  };

  const startProduction = () => {
    if (!selected || !selectedVideo) return;
    setProgress(0); setProductionRun((run) => run + 1); setScene("production");
  };

  const activePipelineIndex = Math.min(7, Math.floor(progress / 12.5));
  const providerLabel = providers.find((item) => item.key === provider)?.label ?? "";
  const genreLabel = genres.find((item) => item.key === genre)?.label ?? "";

  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="brand" type="button" aria-label="WatchMatch 처음부터 시작" onClick={reset}><BrandMark /><span>WatchMatch</span></button>
        <span className="live-catalog-badge"><span aria-hidden="true">●</span> WATCHMODE LIVE</span>
        <button type="button" className="header-reset-button" onClick={reset}>처음부터</button>
      </header>
      <main id="top">
        <FlowProgress scene={scene} />

        {scene === "provider" ? <section className="selection-screen flow-screen" aria-labelledby="provider-title"><div className="selection-panel">
          <p className="step-kicker">01 · OTT 선택</p><h1 id="provider-title" ref={screenTitleRef} tabIndex={-1}>어디에서 보고 싶나요?</h1>
          <p className="selection-lead">대한민국 구독형 서비스에서 확인할 OTT 하나를 골라주세요.</p>
          {optionsError ? <p className="inline-warning" role="status">{optionsError} 선택 후 검색할 때 다시 확인합니다.</p> : null}
          <div className="selection-options provider-options" role="group" aria-label="OTT 선택">
            {providers.map((item, index) => <button type="button" key={item.key} onClick={() => chooseProvider(item.key)} disabled={options ? !item.available : false}>
              <span className="genre-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><strong>{item.label}</strong><small>{item.available ? "한국 구독형 검색" : "현재 사용 불가"}</small><span className="option-arrow" aria-hidden="true">→</span>
            </button>)}
          </div><p className="three-click-hint"><span aria-hidden="true">✦</span> OTT·작품 유형·장르를 고르면 실제 작품 3편을 검색합니다.</p>
        </div></section> : null}

        {scene === "media" ? <section className="selection-screen flow-screen" aria-labelledby="media-title"><div className="selection-panel">
          <button type="button" className="screen-back-button" onClick={() => setScene("provider")}><span aria-hidden="true">←</span> OTT 다시 선택</button>
          <p className="step-kicker">02 · 작품 유형</p><h1 id="media-title" ref={screenTitleRef} tabIndex={-1}>영화인가요, TV 시리즈인가요?</h1><p className="selection-lead"><strong>{providerLabel}</strong>에서 찾을 유형을 선택하세요.</p>
          <div className="selection-options media-options" role="group" aria-label="작품 유형 선택">
            <button type="button" onClick={() => chooseMedia("movie")}><span className="option-symbol" aria-hidden="true">▶</span><strong>영화</strong><small>한 편에 깊게 몰입하기</small><span className="option-arrow" aria-hidden="true">→</span></button>
            <button type="button" onClick={() => chooseMedia("tv")}><span className="option-symbol" aria-hidden="true">▤</span><strong>TV 시리즈</strong><small>여러 에피소드로 오래 즐기기</small><span className="option-arrow" aria-hidden="true">→</span></button>
          </div>
        </div></section> : null}

        {scene === "genre" ? <section className="selection-screen flow-screen" aria-labelledby="genre-title"><div className="selection-panel">
          <button type="button" className="screen-back-button" onClick={() => setScene("media")}><span aria-hidden="true">←</span> 영화·TV 다시 선택</button>
          <p className="step-kicker">03 · 장르</p><h1 id="genre-title" ref={screenTitleRef} tabIndex={-1}>어떤 이야기가 당기나요?</h1><p className="selection-lead"><strong>{providerLabel} · {mediaType === "movie" ? "영화" : "TV 시리즈"}</strong>에서 장르 하나를 누르면 바로 검색합니다.</p>
          <div className="selection-options genre-options" role="group" aria-label="장르 선택">
            {genres.map((item, index) => <button type="button" key={item.key} onClick={() => void findRecommendations(item.key)} disabled={options ? !item.available : false}><span className="genre-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><strong>{item.label}</strong><span className="option-arrow" aria-hidden="true">→</span></button>)}
          </div>
        </div></section> : null}

        {scene === "recommendations" ? <section className="recommendations-section flow-screen" aria-labelledby="recommendations-title">
          <button type="button" className="screen-back-button" onClick={() => setScene("genre")}><span aria-hidden="true">←</span> 장르 다시 선택</button>
          <div className="section-heading recommendation-heading"><div><p className="step-kicker">04 · 실제 작품 선택</p><h1 id="recommendations-title" ref={screenTitleRef} tabIndex={-1}>{searching ? "Watchmode에서 실제 작품을 찾는 중…" : "지금 확인된 추천 작품"}</h1><p className="selection-summary">{providerLabel} · {mediaType === "movie" ? "영화" : "TV 시리즈"} · {genreLabel}</p></div>{meta ? <span className="no-spoiler-badge"><span aria-hidden="true">✓</span> 한국 지역 확인</span> : null}</div>
          <div className="catalog-notice" role="note"><span aria-hidden="true">i</span><p>Watchmode의 대한민국 구독형 데이터를 기준으로 검색했습니다. <strong>실제 제공 여부는 OTT 앱에서 최종 확인해 주세요.</strong></p></div>
          {searching ? <div className="recommendation-grid" aria-live="polite">{[0, 1, 2].map((item) => <div key={item} className="recommendation-card skeleton-card"><span className="skeleton-line skeleton-meta" /><span className="skeleton-line skeleton-title" /><span className="skeleton-block" /></div>)}</div>
            : searchError ? <div className="empty-recommendations" role="alert"><span aria-hidden="true">!</span><div><strong>실제 검색에 실패했습니다.</strong><p>{searchError}</p></div>{genre ? <button type="button" className="secondary-button" onClick={() => void findRecommendations(genre)}>다시 검색</button> : null}</div>
            : recommendations.length === 0 ? <div className="empty-recommendations"><span aria-hidden="true">i</span><div><strong>조건에 맞는 작품이 없습니다.</strong><p>다른 장르나 OTT를 선택해 주세요.</p></div></div>
            : <><div className="recommendation-toolbar"><p>전체 후보 {meta?.totalResults ?? recommendations.length}편 중 상위 {recommendations.length}편 · {meta?.ratingFilterRelaxed ? "평점 하한 완화" : "평점 6.5 이상"}</p></div><div className="recommendation-grid" role="radiogroup" aria-label="실제 추천 작품">{recommendations.map((item, index) => <RecommendationCard key={item.id} item={item} index={index} selected={item.id === selectedId} hasVideo={availableVideoIds.includes(item.id)} onSelect={() => setSelectedId(item.id)} />)}</div></>}
          <div className="create-bar"><div><p>{selectedVideo ? "로컬 쇼츠 제작 완료" : selected ? "선택한 작품 · 쇼츠 준비 중" : "선택한 작품"}</p><strong>{selected?.title ?? "작품을 하나 골라주세요"}</strong></div><button type="button" className="primary-button" onClick={startProduction} disabled={!selectedVideo}>{selectedVideo ? "제작된 쇼츠 보기" : "쇼츠 준비 중"} <span aria-hidden="true">▶</span></button></div>
        </section> : null}

        {scene === "production" ? <section className="project-section flow-screen production-screen" aria-labelledby="production-title"><section className="pipeline-panel"><div className="pipeline-heading"><div><p className="eyebrow">05 · 영상 준비 중</p><h1 id="production-title" ref={screenTitleRef} tabIndex={-1}>{selected?.title}</h1></div><span className="render-id">LOCAL VIDEO</span></div><div className="active-job"><div className="job-orbit" aria-hidden="true"><span /></div><div><p aria-live="polite">{PIPELINE_STEPS[activePipelineIndex]}</p><span>선택한 작품에 연결된 로컬 제작 영상을 준비합니다.</span></div><strong>{progress}%</strong></div><div className="progress-track" role="progressbar" aria-label="쇼츠 준비 진행률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{width: `${progress}%`}} /></div><ol className="pipeline-steps">{PIPELINE_STEPS.map((label, index) => <li key={label} className={`${index < activePipelineIndex ? "is-complete" : ""} ${index === activePipelineIndex ? "is-active" : ""}`}><span className="step-marker" aria-hidden="true">{index < activePipelineIndex ? "✓" : String(index + 1).padStart(2, "0")}</span><span>{label}</span></li>)}</ol></section><button type="button" className="text-button cancel-button" onClick={() => setScene("recommendations")}>영상 준비 중단</button></section> : null}

        {scene === "result" && selectedVideo ? <section className="project-section flow-screen result-screen" aria-labelledby="result-title"><section className="result-panel"><div className="result-copy"><p className="step-kicker">06 · 영상 보기</p><h1 id="result-title" ref={screenTitleRef} tabIndex={-1}>{selected?.title} 쇼츠를 확인하세요.</h1><p>Watchmode의 실제 검색 결과에서 선택한 작품 ID와 로컬에서 제작한 전용 MP4를 연결했습니다. 영상 파일은 GitHub가 아니라 이 PC에만 보관됩니다.</p><div className="result-facts"><div><span>선택 작품</span><strong>{selected?.title}</strong></div><div><span>검색 OTT</span><strong>{providerLabel}</strong></div><div><span>영상 검증</span><strong>1080×1920 · H.264/AAC</strong></div></div><div className="result-actions"><a className="primary-button download-button" href={selectedVideo.src} download>로컬 MP4 다운로드 <span aria-hidden="true">↓</span></a><button type="button" className="secondary-button" onClick={startProduction}>다시 보기</button><button type="button" className="text-button" onClick={reset}>처음부터 추천받기</button></div></div><div className="phone-frame"><div className="phone-top" aria-hidden="true"><span /></div><div className="video-shell"><video src={selectedVideo.src} controls playsInline preload="metadata" aria-label={`${selected?.title} WatchMatch 쇼츠`}><track kind="captions" src={selectedVideo.captionsSrc} srcLang="ko" label="한국어" default />브라우저에서 영상을 재생할 수 없습니다.</video><span className="video-label">AI 생성 · {selectedVideo.label}</span></div></div></section></section> : null}
      </main>
      <footer className="site-footer"><div className="footer-brand"><BrandMark small /><strong>WatchMatch</strong></div><p>대한민국 OTT 작품 정보는 Watchmode 검색 결과를 사용합니다. 실제 제공 여부는 각 OTT 서비스에서 확인해 주세요.</p><span>Data provided by Watchmode</span></footer>
    </div>
  );
}
