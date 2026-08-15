import assert from "node:assert/strict";
import {readFile, stat} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import test from "node:test";
import {createServer as createViteServer} from "vite";

const templateRoot = new URL("../", import.meta.url);
const mediaTypes = ["movie", "tv"];
const genres = ["드라마", "스릴러", "로맨스", "SF", "미스터리", "코미디", "판타지", "액션", "범죄", "애니메이션"];
const eras = ["classic", "modern", "recent"];
const eraRanges = {
  classic: {min: Number.NEGATIVE_INFINITY, max: 1999},
  modern: {min: 2000, max: 2019},
  recent: {min: 2020, max: Number.POSITIVE_INFINITY},
};
const validRequest = {mediaType: "movie", genre: "스릴러", era: "recent", excludeIds: []};

let workerPromise;
async function dispatch(path = "/", init = {}) {
  if (!workerPromise) {
    const workerUrl = new URL("../dist/server/index.js", import.meta.url);
    workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
    workerPromise = import(workerUrl.href).then(({default: worker}) => worker);
  }
  const worker = await workerPromise;
  return worker.fetch(
    new Request(new URL(path, "http://localhost"), init),
    {ASSETS: {fetch: async () => new Response("Not found", {status: 404})}},
    {waitUntil() {}, passThroughOnException() {}},
  );
}

async function withVite(run) {
  const vite = await createViteServer({
    appType: "custom",
    configFile: false,
    logLevel: "silent",
    root: fileURLToPath(templateRoot),
    server: {middlewareMode: true},
  });
  try {
    return await run(vite);
  } finally {
    await vite.close();
  }
}

async function postRecommendations(body) {
  return dispatch("/api/recommendations", {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify(body),
  });
}

async function loadCatalogDocument() {
  return JSON.parse(await readFile(new URL("../data/works-catalog.json", import.meta.url), "utf8"));
}

function bucketWorks(works, mediaType, genre, era) {
  const range = eraRanges[era];
  return works.filter((work) => (
    work.mediaType === mediaType
    && work.genres.includes(genre)
    && work.year >= range.min
    && work.year <= range.max
  ));
}

function ids(items) {
  return items.map((item) => item.id);
}

test("server-renders the three-click first screen without the retired discovery UI", async () => {
  const response = await dispatch("/", {headers: {accept: "text/html"}});
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<html[^>]+lang="ko"/i);
  assert.match(html, /무엇을 보고 싶나요/);
  assert.match(html, />영화</);
  assert.match(html, /TV 시리즈/);
  assert.match(html, /세 번만 선택하면 작품 3개/);
  assert.doesNotMatch(html, /Netflix|LIVE DISCOVERY|VERIFIED OTT CATALOG|원하는 분위기|추천 시작하기/);
});

test("request contract rejects malformed media, genre, era, and reroll history", async () => {
  const invalidBodies = [
    {...validRequest, mediaType: "web"},
    {...validRequest, genre: "다큐멘터리"},
    {...validRequest, genre: ["스릴러"]},
    {...validRequest, era: "future"},
    {...validRequest, excludeIds: "movie-recent-the-batman"},
    {...validRequest, excludeIds: ["INVALID ID"]},
    {...validRequest, excludeIds: Array.from({length: 101}, (_, index) => `valid-id-${index}`)},
  ];

  for (const body of invalidBodies) {
    const response = await postRecommendations(body);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, "INVALID_REQUEST");
  }

  const invalidJson = await dispatch("/api/recommendations", {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: "{invalid",
  });
  assert.equal(invalidJson.status, 400);
  assert.equal((await invalidJson.json()).error.code, "INVALID_JSON");
});

test("catalog schema is unique, source-grounded, and covers all 60 buckets with at least six works", async () => {
  const catalog = await loadCatalogDocument();
  assert.equal(catalog.version, 1);
  assert.ok(Array.isArray(catalog.works));

  const seenIds = new Set();
  const seenWikidataIds = new Set();
  for (const work of catalog.works) {
    assert.match(work.id, /^[a-z0-9][a-z0-9-]{2,79}$/u);
    assert.equal(seenIds.has(work.id), false, `duplicate work id: ${work.id}`);
    seenIds.add(work.id);
    assert.match(work.wikidataId, /^Q[1-9][0-9]*$/u);
    assert.equal(seenWikidataIds.has(work.wikidataId), false, `duplicate Wikidata id: ${work.wikidataId}`);
    seenWikidataIds.add(work.wikidataId);
    assert.equal(work.sourceUrl, `https://www.wikidata.org/wiki/${work.wikidataId}`);
    assert.ok(Number.isInteger(work.year));
    assert.ok(mediaTypes.includes(work.mediaType));
    assert.ok(Array.isArray(work.genres) && work.genres.length > 0);
    assert.ok(work.genres.every((genre) => genres.includes(genre)));
    assert.ok(typeof work.spoilerFreePremise === "string" && work.spoilerFreePremise.length > 0);
    assert.ok(Array.isArray(work.recommendationTags) && work.recommendationTags.length > 0);
    assert.ok(Number.isFinite(work.priority));
  }

  let bucketCount = 0;
  for (const mediaType of mediaTypes) {
    for (const genre of genres) {
      for (const era of eras) {
        const matches = bucketWorks(catalog.works, mediaType, genre, era);
        assert.ok(matches.length >= 6, `${mediaType}/${genre}/${era} has only ${matches.length} works`);
        bucketCount += 1;
      }
    }
  }
  assert.equal(bucketCount, 60);
});

test("catalog validator rejects duplicate IDs, duplicate Wikidata IDs, and malformed fields", async () => {
  const catalog = await loadCatalogDocument();
  await withVite(async (vite) => {
    const {validateCatalog} = await vite.ssrLoadModule("/lib/works-catalog.ts");
    const invalidMutations = [
      (copy) => { copy.works[1].id = copy.works[0].id; },
      (copy) => { copy.works[1].wikidataId = copy.works[0].wikidataId; },
      (copy) => { copy.works[0].year = "1999"; },
      (copy) => { copy.works[0].mediaType = "short"; },
      (copy) => { copy.works[0].genres = ["다큐멘터리"]; },
      (copy) => { copy.works[0].sourceUrl = "http://www.wikidata.org/wiki/Q1"; },
    ];

    assert.doesNotThrow(() => validateCatalog(structuredClone(catalog)));
    for (const mutate of invalidMutations) {
      const invalid = structuredClone(catalog);
      mutate(invalid);
      assert.throws(() => validateCatalog(invalid));
    }

    const missingBucket = structuredClone(catalog);
    missingBucket.works = missingBucket.works.filter((work) => !(
      work.mediaType === "movie"
      && work.year >= 2020
      && work.genres.includes("애니메이션")
    ));
    assert.throws(() => validateCatalog(missingBucket), /catalog|bucket|coverage|카탈로그|조합/i);
  });
});

test("era boundaries classify 1999, 2000, 2019, and 2020 exactly", async () => {
  await withVite(async (vite) => {
    const {eraForYear} = await vite.ssrLoadModule("/lib/works-catalog.ts");
    assert.equal(eraForYear(1999), "classic");
    assert.equal(eraForYear(2000), "modern");
    assert.equal(eraForYear(2019), "modern");
    assert.equal(eraForYear(2020), "recent");
  });
});

test("every valid combination deterministically returns exactly three distinct matching works", async () => {
  await withVite(async (vite) => {
    const {getRecommendations} = await vite.ssrLoadModule("/lib/works-catalog.ts");
    for (const mediaType of mediaTypes) {
      for (const genre of genres) {
        for (const era of eras) {
          const result = getRecommendations({mediaType, genre, era, excludeIds: []});
          assert.equal(result.recommendations.length, 3, `${mediaType}/${genre}/${era}`);
          assert.equal(new Set(ids(result.recommendations)).size, 3);
          assert.equal(result.meta.cycleReset, false);
          for (const recommendation of result.recommendations) {
            assert.equal(recommendation.mediaType, mediaType);
            assert.ok(recommendation.genres.includes(genre));
            assert.equal(recommendation.era, era);
            assert.match(recommendation.source.url, /^https:\/\/www\.wikidata\.org\/wiki\/Q[1-9][0-9]*$/u);
          }
        }
      }
    }
  });
});

test("the first reroll is disjoint and a fully exhausted bucket starts one new cycle", async () => {
  const catalog = await loadCatalogDocument();
  await withVite(async (vite) => {
    const {getRecommendations} = await vite.ssrLoadModule("/lib/works-catalog.ts");
    for (const mediaType of mediaTypes) {
      for (const genre of genres) {
        for (const era of eras) {
          const request = {mediaType, genre, era, excludeIds: []};
          const first = getRecommendations(request);
          const firstIds = ids(first.recommendations);
          const second = getRecommendations({...request, excludeIds: firstIds});
          const overlap = ids(second.recommendations).filter((id) => firstIds.includes(id));
          assert.equal(second.recommendations.length, 3, `${mediaType}/${genre}/${era}`);
          assert.deepEqual(overlap, [], `${mediaType}/${genre}/${era} repeated a first-page work`);
          assert.equal(second.meta.cycleReset, false, `${mediaType}/${genre}/${era}`);
        }
      }
    }

    const first = getRecommendations(validRequest);
    const firstIds = ids(first.recommendations);
    const allBucketIds = ids(bucketWorks(catalog.works, validRequest.mediaType, validRequest.genre, validRequest.era));
    const reset = getRecommendations({...validRequest, excludeIds: allBucketIds});
    assert.equal(reset.recommendations.length, 3);
    assert.equal(reset.meta.cycleReset, true);
    assert.deepEqual(ids(reset.recommendations), firstIds);
  });
});

test("recommendation API returns the offline catalog shape with no-store caching", async () => {
  const response = await postRecommendations(validRequest);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json();
  assert.equal(body.recommendations.length, 3);
  assert.equal(new Set(ids(body.recommendations)).size, 3);
  assert.equal(typeof body.meta.remaining, "number");
  assert.equal(body.meta.cycleReset, false);
  assert.ok(body.recommendations.every((item) => item.mediaType === "movie" && item.genres.includes("스릴러") && item.era === "recent"));
});

test("runtime recommendation code has no external network or AI dependency", async () => {
  const routeSource = await readFile(new URL("../app/api/recommendations/route.ts", import.meta.url), "utf8");
  const catalogSource = await readFile(new URL("../lib/works-catalog.ts", import.meta.url), "utf8");
  const runtimeSource = `${routeSource}\n${catalogSource}`;
  assert.doesNotMatch(runtimeSource, /\bfetch\s*\(/u);
  assert.doesNotMatch(runtimeSource, /OpenRouter|OPENROUTER|web_search|web_fetch|TMDB|JustWatch|themoviedb/iu);

  await withVite(async (vite) => {
    const {getRecommendations} = await vite.ssrLoadModule("/lib/works-catalog.ts");
    const previousFetch = globalThis.fetch;
    let fetchCalls = 0;
    globalThis.fetch = async () => {
      fetchCalls += 1;
      throw new Error("external network access is forbidden in recommendation runtime");
    };
    try {
      const result = getRecommendations(validRequest);
      assert.equal(result.recommendations.length, 3);
      assert.equal(fetchCalls, 0);
    } finally {
      globalThis.fetch = previousFetch;
    }
  });
});

test("client implements three automatic choices, session rerolls, and no automatic work selection", async () => {
  const source = await readFile(new URL("../app/WatchMatchHosted.tsx", import.meta.url), "utf8");
  for (const scene of ["media", "genre", "era", "recommendations", "production", "result"]) {
    assert.match(source, new RegExp(`"${scene}"`));
  }
  for (const label of ["영화·TV", "장르", "시대", "작품 선택", "영상 제작", "영상 보기"]) {
    assert.match(source, new RegExp(label));
  }
  assert.match(source, /useState<Scene>\("media"\)/);
  assert.match(source, /setScene\("genre"\)/);
  assert.match(source, /setScene\("era"\)/);
  assert.match(source, /onClick=\{\(\) => void findRecommendations\(item\.value\)\}/);
  assert.match(source, /body: JSON\.stringify\(\{mediaType, genre, era: requestedEra, excludeIds\}\)/);
  assert.match(source, /window\.sessionStorage\.getItem/);
  assert.match(source, /window\.sessionStorage\.setItem/);
  assert.match(source, /nextMeta\.cycleReset \? returnedIds : \[\.\.\.excludeIds, \.\.\.returnedIds\]/);
  assert.match(source, /const \[selectedId, setSelectedId\] = useState<string \| null>\(null\)/);
  assert.match(source, /onSelect=\{\(\) => setSelectedId\(recommendation\.id\)\}/);
  assert.match(source, /disabled=\{!selected\}/);
  assert.doesNotMatch(source, /setSelectedId\([^\n]*recommendations\[0\]/);
  assert.doesNotMatch(source, /Netflix|OPENROUTER|web_search|web_fetch|ottProvider|accessMode|원하는 분위기/i);
  assert.match(source, /OTT 제공 여부는 각 서비스에서 확인해 주세요/);
});

test("production and video-result demo remain wired to playable local assets", async () => {
  const source = await readFile(new URL("../app/WatchMatchHosted.tsx", import.meta.url), "utf8");
  assert.match(source, /PIPELINE_STEPS/);
  assert.match(source, /대본/);
  assert.match(source, /영상 제작 중/);
  assert.match(source, /25초의 호기심이 완성됐어요/);
  assert.match(source, /\/demo\/watchmatch-demo\.mp4/);
  assert.match(source, /\/demo\/watchmatch-demo-ko\.vtt/);
  assert.match(source, /disabled=\{!selected\}/);

  const video = await stat(new URL("../public/demo/watchmatch-demo.mp4", import.meta.url));
  const captions = await readFile(new URL("../public/demo/watchmatch-demo-ko.vtt", import.meta.url), "utf8");
  assert.ok(video.size > 0);
  assert.match(captions, /^WEBVTT/u);
  assert.match(captions, /-->/u);
});
