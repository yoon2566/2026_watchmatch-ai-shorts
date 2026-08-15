"use client";

import {useEffect, useMemo, useRef, useState} from "react";

type Scene = "home" | "preferences" | "recommendations" | "production" | "result";
type MediaType = "movie" | "tv";

type Recommendation = {
  id: string;
  title: string;
  year: number;
  mediaType: MediaType;
  genres: string[];
  premise: string;
  reason: string;
  rating: string;
  checkedAt: string;
  sources: Array<{label: string; url: string}>;
};

type DiscoverySource = {
  url: string;
  title: string;
  domain: string;
  excerpt: string;
};

type DiscoveryStatus = "complete" | "partial" | "sources_only";

type DiscoverySummary = {
  citationCount: number;
  candidateCount: number;
  rejectedCount: number;
};

const FLOW_STEPS: Array<{scene: Scene; label: string}> = [
  {scene: "home", label: "메인"},
  {scene: "preferences", label: "취향 선택"},
  {scene: "recommendations", label: "작품 선택"},
  {scene: "production", label: "영상 제작"},
  {scene: "result", label: "영상 보기"},
];

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
];

const MOODS = [
  {value: "thrilling", label: "쫄깃한", symbol: "↗"},
  {value: "warm", label: "따뜻한", symbol: "○"},
  {value: "mysterious", label: "미스터리한", symbol: "?"},
  {value: "funny", label: "유쾌한", symbol: "+"},
  {value: "moving", label: "먹먹한", symbol: "≈"},
  {value: "spectacular", label: "압도적인", symbol: "✦"},
];

const PIPELINE_STEPS = ["대본", "장면 1", "장면 2", "장면 3", "음성", "편집", "검증", "완료"];

function formatCheckedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "방금";
  return new Intl.DateTimeFormat("ko-KR", {dateStyle: "medium"}).format(date);
}

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
    <nav className="flow-progress" aria-label="쇼츠 제작 단계">
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
        <span>등급 {recommendation.rating}</span>
        <span className="safe-badge">스포일러 없음</span>
        <span className="demo-badge">실시간 검색</span>
      </div>
      <h3>{recommendation.title}</h3>
      <div className="genre-row" aria-label="장르">
        {recommendation.genres.map((genre) => <span key={genre}>#{genre}</span>)}
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
        <span>정보 확인 · {formatCheckedAt(recommendation.checkedAt)}</span>
        <span className="source-links">
          {recommendation.sources.map((source) => (
            <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
              {source.label}<span aria-hidden="true"> ↗</span>
            </a>
          ))}
        </span>
      </div>
    </article>
  );
}

function DiscoverySources({sources}: {sources: DiscoverySource[]}) {
  return (
    <details className="discovery-sources" open>
      <summary>
        <span>
          <span className="source-summary-symbol" aria-hidden="true">↗</span>
          이번 검색에서 확인한 출처 {sources.length}개
        </span>
        <small>목록 접기·펼치기</small>
      </summary>
      {sources.length > 0 ? (
        <ol className="discovery-source-list">
          {sources.map((source, index) => (
            <li key={`${source.url}-${index}`}>
              <div className="discovery-source-heading">
                <span className="source-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{source.title || source.domain || "검색 출처"}</h3>
                  <span className="source-domain">{source.domain || "웹 출처"}</span>
                </div>
              </div>
              <p>{source.excerpt || "이 페이지에서 작품 정보와 검증 근거를 확인했습니다."}</p>
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`${source.title || source.domain || "검색 출처"} 원문 새 창에서 보기`}
              >
                원문 보기 <span aria-hidden="true">↗</span>
              </a>
            </li>
          ))}
        </ol>
      ) : (
        <p className="empty-source-note">이번 검색에는 공개할 수 있는 출처가 없습니다.</p>
      )}
    </details>
  );
}

export default function WatchMatchHosted() {
  const [scene, setScene] = useState<Scene>("home");
  const [mediaType, setMediaType] = useState<MediaType>("movie");
  const [genres, setGenres] = useState<string[]>(["미스터리"]);
  const [mood, setMood] = useState("mysterious");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [discoverySources, setDiscoverySources] = useState<DiscoverySource[]>([]);
  const [discoveryStatus, setDiscoveryStatus] = useState<DiscoveryStatus>("complete");
  const [discoveryMessage, setDiscoveryMessage] = useState("");
  const [discoverySummary, setDiscoverySummary] = useState<DiscoverySummary>({
    citationCount: 0,
    candidateCount: 0,
    rejectedCount: 0,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [productionRun, setProductionRun] = useState(0);
  const searchAbortRef = useRef<AbortController | null>(null);

  const selected = useMemo(
    () => recommendations.find((item) => item.id === selectedId) ?? null,
    [recommendations, selectedId],
  );

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
    setDiscoverySources([]);
    setDiscoveryStatus("complete");
    setDiscoveryMessage("");
    setDiscoverySummary({citationCount: 0, candidateCount: 0, rejectedCount: 0});
    setScene("home");
    setSelectedId(null);
    setProgress(0);
  };

  const toggleGenre = (genre: string) => {
    setGenres((current) => {
      if (current.includes(genre)) {
        return current.length === 1 ? current : current.filter((item) => item !== genre);
      }
      return current.length >= 3 ? current : [...current, genre];
    });
  };

  const findRecommendations = async () => {
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    setSearching(true);
    setSearchError("");
    setSelectedId(null);
    setRecommendations([]);
    setDiscoverySources([]);
    setDiscoveryStatus("complete");
    setDiscoveryMessage("");
    setDiscoverySummary({citationCount: 0, candidateCount: 0, rejectedCount: 0});

    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({mediaType, genres, mood}),
        signal: controller.signal,
      });
      const payload = await response.json() as {
        recommendations?: Recommendation[];
        sources?: DiscoverySource[];
        status?: DiscoveryStatus;
        summary?: DiscoverySummary;
        message?: string;
        model?: string;
        error?: {message?: string};
      };

      if (!response.ok) {
        throw new Error(payload.error?.message || "작품을 검색하지 못했습니다.");
      }
      if (!Array.isArray(payload.recommendations) || !Array.isArray(payload.sources)) {
        throw new Error("검색 결과 형식을 확인하지 못했습니다. 다시 시도해 주세요.");
      }
      if (controller.signal.aborted) return;
      setRecommendations(payload.recommendations);
      setDiscoverySources(payload.sources);
      setDiscoveryStatus(
        payload.recommendations.length === 0
          ? "sources_only"
          : payload.recommendations.length < 3
            ? "partial"
            : payload.status ?? "complete",
      );
      setDiscoveryMessage(payload.message ?? "");
      setDiscoverySummary(payload.summary ?? {
        citationCount: payload.sources.length,
        candidateCount: payload.recommendations.length,
        rejectedCount: 0,
      });
      setScene("recommendations");
    } catch (error) {
      if (controller.signal.aborted) return;
      setSearchError(error instanceof Error ? error.message : "작품 검색에 실패했습니다.");
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

  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="brand" type="button" aria-label="WatchMatch 메인화면" onClick={reset}>
          <BrandMark />
          <span>WatchMatch</span>
        </button>
        <span className="hosted-demo-pill"><span aria-hidden="true">●</span> LIVE DISCOVERY</span>
      </header>

      <main id="top">
        <FlowProgress scene={scene} />

        {scene === "home" ? (
          <section className="hero flow-screen home-screen" aria-labelledby="hero-title">
            <div className="hero-orb hero-orb-one" aria-hidden="true" />
            <div className="hero-orb hero-orb-two" aria-hidden="true" />
            <p className="eyebrow hero-eyebrow"><span aria-hidden="true">✦</span> AI 무스포 작품 큐레이터</p>
            <h1 id="hero-title">볼까 말까,<br /><span>25초면 충분해.</span></h1>
            <p className="hero-copy">장르와 분위기를 고르고, 검증 가능한 출처를 바탕으로 준비한 작품 세 편과 쇼츠 제작 흐름을 체험해 보세요.</p>
            <div className="hero-actions">
              <button type="button" className="primary-button hero-start-button" onClick={() => setScene("preferences")}>
                추천 시작하기 <span aria-hidden="true">→</span>
              </button>
              <span>작품 추천은 실시간 검색이며, 영상 단계는 검증된 기술 샘플을 사용합니다.</span>
            </div>
            <div className="mode-notice demo" role="status">
              <span className="notice-icon" aria-hidden="true">◇</span>
              <div><strong>LIVE DISCOVERY</strong><p>OpenRouter 웹 검색으로 실제 영화·TV 작품 3개를 찾아요.</p></div>
              <span className="notice-status">실시간 검색</span>
            </div>
          </section>
        ) : null}

        {scene === "preferences" ? (
          <section className="preference-panel flow-screen" aria-labelledby="preference-title">
            <button type="button" className="screen-back-button" onClick={reset}><span aria-hidden="true">←</span> 메인으로</button>
            <div className="section-heading">
              <div><p className="step-kicker">02 · 장르 및 세부 사항 선택</p><h2 id="preference-title">오늘은 어떤 이야기가 당기나요?</h2></div>
              <p>장르는 최대 3개까지 고를 수 있어요.</p>
            </div>
            <fieldset className="choice-group media-choice">
              <legend>작품 유형</legend>
              <div className="segmented-control">
                <button type="button" className={mediaType === "movie" ? "is-selected" : ""} aria-pressed={mediaType === "movie"} onClick={() => {setMediaType("movie"); setSelectedId(null); setRecommendations([]); setDiscoverySources([]); setSearchError("");}}><span>영화</span><small>한 편에 몰입</small></button>
                <button type="button" className={mediaType === "tv" ? "is-selected" : ""} aria-pressed={mediaType === "tv"} onClick={() => {setMediaType("tv"); setSelectedId(null); setRecommendations([]); setDiscoverySources([]); setSearchError("");}}><span>TV 시리즈</span><small>길게 정주행</small></button>
              </div>
            </fieldset>
            <fieldset className="choice-group">
              <legend>장르 <span>{genres.length}/3 선택</span></legend>
              <div className="chip-grid">
                {GENRES.map((genre) => {
                  const chosen = genres.includes(genre);
                  const disabled = !chosen && genres.length >= 3;
                  return <button type="button" key={genre} className={chosen ? "is-selected" : ""} aria-pressed={chosen} disabled={disabled} onClick={() => toggleGenre(genre)}><span aria-hidden="true">{chosen ? "✓" : "+"}</span>{genre}</button>;
                })}
              </div>
            </fieldset>
            <fieldset className="choice-group">
              <legend>원하는 분위기</legend>
              <div className="mood-grid">
                {MOODS.map((option) => <button type="button" key={option.value} className={mood === option.value ? "is-selected" : ""} aria-pressed={mood === option.value} onClick={() => setMood(option.value)}><span className="mood-symbol" aria-hidden="true">{option.symbol}</span><span>{option.label}</span></button>)}
              </div>
            </fieldset>
            <p className="demo-choice-note"><span aria-hidden="true">◇</span> 선택한 조건으로 최신 웹 정보를 검색하고, 출처와 시청 등급을 확인한 작품만 보여줍니다.</p>
            {searchError ? <p className="inline-error" role="alert">{searchError}</p> : null}
            <button type="button" className="primary-button search-button" onClick={findRecommendations} disabled={searching}>
              {searching ? <><span className="button-spinner" aria-hidden="true" /> 실제 작품을 검색하는 중</> : <>내 취향 실제 작품 3개 찾기 <span aria-hidden="true">→</span></>}
            </button>
          </section>
        ) : null}

        {scene === "recommendations" ? (
          <section className="recommendations-section flow-screen" aria-labelledby="recommendations-title">
            <button type="button" className="screen-back-button" onClick={() => setScene("preferences")}><span aria-hidden="true">←</span> 조건 다시 선택</button>
            <div className="section-heading recommendation-heading">
              <div>
                <p className="step-kicker">03 · 작품 선택</p>
                <h2 id="recommendations-title">
                  {recommendations.length === 3
                    ? "오늘의 후보는 이 세 작품"
                    : recommendations.length > 0
                      ? `검증된 후보 ${recommendations.length}개를 찾았어요`
                      : "작품 확정 전, 검색 근거부터 보여드릴게요"}
                </h2>
              </div>
              {recommendations.length > 0 ? <span className="no-spoiler-badge"><span aria-hidden="true">✓</span> 전부 무스포</span> : null}
            </div>

            <section className={`discovery-result-notice is-${discoveryStatus}`} aria-live="polite" aria-label="검색 결과 안내">
              <span className="discovery-result-icon" aria-hidden="true">{discoveryStatus === "complete" ? "✓" : discoveryStatus === "partial" ? "!" : "i"}</span>
              <div>
                <strong>
                  {discoveryStatus === "complete"
                    ? "작품과 근거 확인을 마쳤습니다."
                    : discoveryStatus === "partial"
                      ? "확인된 작품만 먼저 보여드립니다."
                      : "검색 출처는 찾았지만 작품 검증은 완료하지 못했습니다."}
                </strong>
                <p>{discoveryMessage || (recommendations.length > 0 ? "아래 작품을 선택하거나 확인한 출처 전체를 살펴보세요." : "아래 출처를 직접 확인한 뒤 조건을 바꿔 다시 검색할 수 있습니다.")}</p>
              </div>
              <dl className="discovery-result-stats" aria-label="검색 검증 요약">
                <div><dt>확인 출처</dt><dd>{discoverySummary.citationCount}</dd></div>
                <div><dt>검색 후보</dt><dd>{discoverySummary.candidateCount}</dd></div>
                <div><dt>검증 제외</dt><dd>{discoverySummary.rejectedCount}</dd></div>
              </dl>
            </section>

            {recommendations.length > 0 ? (
              <div className="recommendation-grid" role="radiogroup" aria-label={`추천 작품 ${recommendations.length}개`}>
                {recommendations.map((recommendation, index) => <RecommendationCard key={recommendation.id} recommendation={recommendation} index={index} selected={recommendation.id === selectedId} onSelect={() => setSelectedId(recommendation.id)} />)}
              </div>
            ) : (
              <div className="empty-recommendations" role="status">
                <span aria-hidden="true">◇</span>
                <div><strong>지금 선택할 수 있는 작품은 없습니다.</strong><p>검색 자체는 완료됐습니다. 아래 출처를 확인하거나 조건을 바꿔 다시 검색해 주세요.</p></div>
              </div>
            )}

            <DiscoverySources sources={discoverySources} />
            <div className="create-bar">
              <div><p>선택한 작품</p><strong>{selected?.title ?? (recommendations.length > 0 ? "작품을 골라주세요" : "선택 가능한 작품 없음")}</strong></div>
              <button type="button" className="primary-button" onClick={startProduction} disabled={!selected}>25초 쇼츠 체험 <span aria-hidden="true">▶</span></button>
            </div>
          </section>
        ) : null}

        {scene === "production" ? (
          <section className="project-section flow-screen production-screen" aria-labelledby="production-title">
            <section className="pipeline-panel">
              <div className="pipeline-heading"><div><p className="eyebrow">04 · 영상 제작 중</p><h2 id="production-title">{selected?.title}</h2></div><span className="render-id">VIDEO DEMO</span></div>
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
                <p className="step-kicker">05 · 영상 보기</p>
                <h2 id="result-title">25초의 호기심이 완성됐어요.</h2>
                <p>선택 흐름을 확인하는 공개 체험판입니다. 아래 영상은 로컬 Wan·Heami·Remotion 파이프라인으로 만든 검증된 Sintel 기술 샘플입니다.</p>
                <div className="result-facts"><div><span>선택 작품</span><strong>{selected?.title}</strong></div><div><span>샘플 형식</span><strong>9:16 · 25초</strong></div><div><span>샘플 검증</span><strong>H.264 · AAC</strong></div></div>
                <div className="result-actions">
                  <a className="primary-button download-button" href="/demo/watchmatch-demo.mp4" download>샘플 MP4 다운로드 <span aria-hidden="true">↓</span></a>
                  <button type="button" className="secondary-button" onClick={startProduction}>다시 체험하기</button>
                  <button type="button" className="text-button" onClick={() => {setScene("preferences"); setSelectedId(null);}}>새 작품 찾기</button>
                </div>
              </div>
              <div className="phone-frame">
                <div className="phone-top" aria-hidden="true"><span /></div>
                <div className="video-shell"><video src="/demo/watchmatch-demo.mp4" controls playsInline preload="metadata" aria-label="WatchMatch Sintel 기술 샘플"><track kind="captions" src="/demo/watchmatch-demo-ko.vtt" srcLang="ko" label="한국어" />브라우저에서 영상을 재생할 수 없습니다.</video><span className="video-label">AI 생성 · Sintel 기술 샘플</span></div>
              </div>
            </section>
          </section>
        ) : null}

        {scene === "home" ? (
          <section className="trust-strip" aria-label="WatchMatch 제작 원칙">
            <div><span aria-hidden="true">01</span><p><strong>공식 출처 우선</strong>확인 가능한 정보만 추천에 사용해요.</p></div>
            <div><span aria-hidden="true">02</span><p><strong>결말은 비밀</strong>반전과 결말을 보여주지 않아요.</p></div>
            <div><span aria-hidden="true">03</span><p><strong>원작 자산 미사용</strong>포스터·예고편·배우 음성을 쓰지 않아요.</p></div>
          </section>
        ) : null}
      </main>

      <footer className="site-footer">
        <div className="footer-brand"><BrandMark small /><strong>WatchMatch</strong></div>
        <p>작품 추천은 OpenRouter 웹 검색으로 처리합니다. 영상 단계는 AI 생성 기술 샘플이며, 실제 새 영상 생성은 로컬 WatchMatch 앱에서 처리됩니다.</p>
        <span>© 2026 WatchMatch Prototype</span>
      </footer>
    </div>
  );
}
