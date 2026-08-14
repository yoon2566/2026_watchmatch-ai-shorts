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
  sources: Array<{label: string; url: string}>;
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

const MOOD_GENRES: Record<string, string[]> = {
  thrilling: ["스릴러", "액션", "범죄", "SF"],
  warm: ["드라마", "로맨스", "코미디", "애니메이션", "가족"],
  mysterious: ["미스터리", "스릴러", "판타지", "SF"],
  funny: ["코미디", "애니메이션", "가족"],
  moving: ["드라마", "로맨스", "판타지", "애니메이션"],
  spectacular: ["액션", "SF", "판타지", "모험"],
};

const MOVIES: Recommendation[] = [
  {
    id: "big-buck-bunny",
    title: "Big Buck Bunny",
    year: 2008,
    mediaType: "movie",
    genres: ["애니메이션", "코미디"],
    premise: "평온을 방해하는 작은 동물들에게 맞서는 큰 토끼의 짧은 애니메이션입니다.",
    reason: "유쾌한 애니메이션과 짧은 역전의 흐름을 가볍게 즐기기 좋습니다.",
    rating: "TV-PG",
    sources: [
      {label: "Blender Studio", url: "https://studio.blender.org/films/big-buck-bunny/"},
      {label: "Netflix", url: "https://www.netflix.com/title/70159351"},
    ],
  },
  {
    id: "sintel",
    title: "Sintel",
    year: 2010,
    mediaType: "movie",
    genres: ["애니메이션", "판타지"],
    premise: "한 젊은 여성이 소중한 용을 찾아 낯선 여정을 떠나는 단편 애니메이션입니다.",
    reason: "판타지 여정의 분위기와 짧고 집중도 높은 서사를 선호한다면 잘 맞습니다.",
    rating: "TV-PG",
    sources: [
      {label: "Blender Studio", url: "https://studio.blender.org/films/sintel/"},
      {label: "Netflix", url: "https://www.netflix.com/title/70229101"},
    ],
  },
  {
    id: "tears-of-steel",
    title: "Tears of Steel",
    year: 2012,
    mediaType: "movie",
    genres: ["SF", "애니메이션"],
    premise: "인간과 로봇이 충돌하는 미래를 배경으로 한 실사·시각효과 단편입니다.",
    reason: "SF 분위기와 실사·시각효과가 만나는 짧은 이야기를 보고 싶을 때 잘 맞습니다.",
    rating: "TV-14",
    sources: [
      {label: "Blender Studio", url: "https://studio.blender.org/films/tears-of-steel/"},
      {label: "Netflix", url: "https://www.netflix.com/title/80006943"},
    ],
  },
];

const TELEVISION: Recommendation[] = [
  {
    id: "bluey",
    title: "Bluey",
    year: 2018,
    mediaType: "tv",
    genres: ["애니메이션", "가족"],
    premise: "상상력 넘치는 놀이를 즐기는 강아지 가족의 일상을 그린 애니메이션입니다.",
    reason: "짧고 따뜻한 에피소드와 가족의 유쾌한 호흡을 편안하게 즐기기 좋습니다.",
    rating: "TV-Y",
    sources: [
      {label: "Bluey", url: "https://www.bluey.tv/"},
      {label: "Disney+", url: "https://www.disneyplus.com/browse/entity-fa6973b9-e7cf-49fb-81a2-d4908e4bf694"},
    ],
  },
  {
    id: "strange-new-worlds",
    title: "Star Trek: Strange New Worlds",
    year: 2022,
    mediaType: "tv",
    genres: ["SF", "모험"],
    premise: "우주 탐사선의 승무원들이 새로운 세계를 향해 항해하는 SF 시리즈입니다.",
    reason: "새로운 세계를 탐험하는 모험과 팀의 호흡을 좋아한다면 잘 맞습니다.",
    rating: "TV-14",
    sources: [
      {label: "Star Trek", url: "https://www.startrek.com/en-un/series/star-trek-strange-new-worlds"},
      {label: "Paramount+", url: "https://www.paramountplus.com/shows/star-trek-strange-new-worlds/"},
    ],
  },
  {
    id: "the-mandalorian",
    title: "The Mandalorian",
    year: 2019,
    mediaType: "tv",
    genres: ["SF", "모험"],
    premise: "은하 변방을 떠도는 현상금 사냥꾼의 여정을 따라가는 시리즈입니다.",
    reason: "서부극 같은 우주 모험과 과묵한 주인공의 여정을 보고 싶을 때 어울립니다.",
    rating: "TV-14",
    sources: [
      {label: "Star Wars", url: "https://www.starwars.com/series/the-mandalorian"},
      {label: "Disney+", url: "https://www.disneyplus.com/browse/entity-422f6dcc-226f-44e7-98d4-22de69b31cf3"},
    ],
  },
];

const PIPELINE_STEPS = ["대본", "장면 1", "장면 2", "장면 3", "음성", "편집", "검증", "완료"];

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
        <span className="demo-badge">공개 데모</span>
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
        <span>고정 데모 정보 · 2026.08.10</span>
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

export default function WatchMatchHosted() {
  const [scene, setScene] = useState<Scene>("home");
  const [mediaType, setMediaType] = useState<MediaType>("movie");
  const [genres, setGenres] = useState<string[]>(["미스터리"]);
  const [mood, setMood] = useState("mysterious");
  const [searching, setSearching] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [productionRun, setProductionRun] = useState(0);
  const recommendationTimerRef = useRef<number | null>(null);

  const recommendations = useMemo(() => {
    const base = mediaType === "movie" ? MOVIES : TELEVISION;
    const moodGenres = MOOD_GENRES[mood] ?? [];
    const score = (item: Recommendation) =>
      item.genres.filter((genre) => genres.includes(genre)).length * 3
      + item.genres.filter((genre) => moodGenres.includes(genre)).length;

    return [...base].sort((left, right) => score(right) - score(left));
  }, [genres, mediaType, mood]);
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
    if (recommendationTimerRef.current !== null) {
      window.clearTimeout(recommendationTimerRef.current);
    }
  }, []);

  const reset = () => {
    if (recommendationTimerRef.current !== null) {
      window.clearTimeout(recommendationTimerRef.current);
      recommendationTimerRef.current = null;
    }
    setSearching(false);
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

  const findRecommendations = () => {
    if (recommendationTimerRef.current !== null) {
      window.clearTimeout(recommendationTimerRef.current);
    }
    setSearching(true);
    setSelectedId(null);
    recommendationTimerRef.current = window.setTimeout(() => {
      recommendationTimerRef.current = null;
      setSearching(false);
      setScene("recommendations");
    }, 650);
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
        <span className="hosted-demo-pill"><span aria-hidden="true">●</span> PUBLIC DEMO</span>
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
              <span>공개본은 미리 검증한 추천·영상 샘플을 사용하는 체험판입니다.</span>
            </div>
            <div className="mode-notice demo" role="status">
              <span className="notice-icon" aria-hidden="true">◇</span>
              <div><strong>PUBLIC DEMO</strong><p>새 영상 생성 없이 5단계 화면과 완성 샘플을 체험할 수 있어요.</p></div>
              <span className="notice-status">체험 준비됨</span>
            </div>
          </section>
        ) : null}

        {scene === "preferences" ? (
          <section className="preference-panel flow-screen" aria-labelledby="preference-title">
            <button type="button" className="screen-back-button" onClick={() => setScene("home")}><span aria-hidden="true">←</span> 메인으로</button>
            <div className="section-heading">
              <div><p className="step-kicker">02 · 장르 및 세부 사항 선택</p><h2 id="preference-title">오늘은 어떤 이야기가 당기나요?</h2></div>
              <p>장르는 최대 3개까지 고를 수 있어요.</p>
            </div>
            <fieldset className="choice-group media-choice">
              <legend>작품 유형</legend>
              <div className="segmented-control">
                <button type="button" className={mediaType === "movie" ? "is-selected" : ""} aria-pressed={mediaType === "movie"} onClick={() => {setMediaType("movie"); setSelectedId(null);}}><span>영화</span><small>한 편에 몰입</small></button>
                <button type="button" className={mediaType === "tv" ? "is-selected" : ""} aria-pressed={mediaType === "tv"} onClick={() => {setMediaType("tv"); setSelectedId(null);}}><span>TV 시리즈</span><small>길게 정주행</small></button>
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
            <p className="demo-choice-note"><span aria-hidden="true">◇</span> 공개 데모에서는 선택한 취향이 고정 후보 3개의 추천 순서에 반영됩니다.</p>
            <button type="button" className="primary-button search-button" onClick={findRecommendations} disabled={searching}>
              {searching ? <><span className="button-spinner" aria-hidden="true" /> 작품을 찾는 중</> : <>내 취향 작품 3개 찾기 <span aria-hidden="true">→</span></>}
            </button>
          </section>
        ) : null}

        {scene === "recommendations" ? (
          <section className="recommendations-section flow-screen" aria-labelledby="recommendations-title">
            <button type="button" className="screen-back-button" onClick={() => setScene("preferences")}><span aria-hidden="true">←</span> 조건 다시 선택</button>
            <div className="section-heading recommendation-heading">
              <div><p className="step-kicker">03 · 작품 선택</p><h2 id="recommendations-title">오늘의 후보는 이 세 작품</h2></div>
              <span className="no-spoiler-badge"><span aria-hidden="true">✓</span> 전부 무스포</span>
            </div>
            <div className="recommendation-grid" role="radiogroup" aria-label="추천 작품 3개">
              {recommendations.map((recommendation, index) => <RecommendationCard key={recommendation.id} recommendation={recommendation} index={index} selected={recommendation.id === selectedId} onSelect={() => setSelectedId(recommendation.id)} />)}
            </div>
            <div className="create-bar">
              <div><p>선택한 작품</p><strong>{selected?.title ?? "작품을 골라주세요"}</strong></div>
              <button type="button" className="primary-button" onClick={startProduction} disabled={!selected}>25초 쇼츠 체험 <span aria-hidden="true">▶</span></button>
            </div>
          </section>
        ) : null}

        {scene === "production" ? (
          <section className="project-section flow-screen production-screen" aria-labelledby="production-title">
            <section className="pipeline-panel">
              <div className="pipeline-heading"><div><p className="eyebrow">04 · 영상 제작 중</p><h2 id="production-title">{selected?.title}</h2></div><span className="render-id">PUBLIC DEMO</span></div>
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
        <p>공개본은 체험용 고정 추천과 AI 생성 기술 샘플을 사용합니다. 실제 새 영상 생성은 로컬 WatchMatch 앱에서 처리됩니다.</p>
        <span>© 2026 WatchMatch Prototype</span>
      </footer>
    </div>
  );
}
