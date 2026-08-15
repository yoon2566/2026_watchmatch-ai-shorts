import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import test from "node:test";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {createServer as createViteServer} from "vite";

const templateRoot = new URL("../", import.meta.url);
async function dispatch(path = "/", init = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const {default: worker} = await import(workerUrl.href);
  return worker.fetch(new Request(new URL(path, "http://localhost"), init), {ASSETS: {fetch: async () => new Response("Not found", {status: 404})}}, {waitUntil() {}, passThroughOnException() {}});
}
async function withVite(run) {
  const vite = await createViteServer({appType: "custom", configFile: false, logLevel: "silent", root: fileURLToPath(templateRoot), server: {middlewareMode: true}});
  try { return await run(vite); } finally { await vite.close(); }
}

const request = {mediaType: "movie", genres: ["스릴러"], mood: "thrilling", ottProvider: "netflix", region: "KR", accessMode: "subscription"};
function entry(id, overrides = {}) {
  return {
    id, title: `검증 작품 ${id}`, year: 2024, mediaType: "movie", genres: ["스릴러"], moodTags: ["thrilling"],
    spoilerFreePremise: "낯선 사건과 마주한 인물들의 초반 상황만 담은 무스포 전제입니다.",
    provider: "netflix", region: "KR", accessMode: "subscription",
    availabilityCheckedAt: "2026-08-15T00:00:00.000Z", availabilityExpiresAt: "2026-08-29T00:00:00.000Z",
    availabilitySourceUrl: `https://www.netflix.com/kr/title/${id}`, ratingStatus: "verified_safe", rating: "15세 이상 관람가",
    ratingSourceUrl: `https://rating.example/${id}`, ...overrides,
  };
}

test("server-renders the verified Netflix catalog shell", async () => {
  const response = await dispatch("/", {headers: {accept: "text/html"}});
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<html[^>]+lang="ko"/i);
  assert.match(html, /VERIFIED OTT CATALOG/);
  assert.match(html, /Netflix 대한민국/);
  assert.match(html, /추천 시작하기/);
  assert.doesNotMatch(html, /LIVE DISCOVERY/);
});

test("renders manual verification sources with safe links", async () => {
  await withVite(async (vite) => {
    const {DiscoverySources} = await vite.ssrLoadModule("/app/WatchMatchHosted.tsx");
    const html = renderToStaticMarkup(createElement(DiscoverySources, {sources: [{url: "https://netflix.example/title/1", title: "제공 확인", domain: "netflix.example", excerpt: "관리자가 직접 확인했습니다."}]}));
    assert.match(html, /수동 검증 기록 1개/);
    assert.match(html, /관리자가 직접 확인했습니다/);
    assert.match(html, /target="_blank"/);
    assert.match(html, /rel="noopener noreferrer"/);
  });
});

test("rejects unsupported OTT scope and invalid filters", async () => {
  for (const body of [{...request, ottProvider: "disney-plus"}, {...request, region: "US"}, {...request, accessMode: "rent"}, {...request, genres: []}]) {
    const response = await dispatch("/api/recommendations", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(body)});
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, "INVALID_REQUEST");
  }
});

test("returns HTTP 200 empty while the approved catalog is empty", async () => {
  const response = await dispatch("/api/recommendations", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(request)});
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, "empty");
  assert.deepEqual(body.recommendations, []);
  assert.deepEqual(body.sources, []);
  assert.equal(body.model, "deterministic");
});

test("catalog validation rejects duplicate IDs, invalid TTL, URL, and adult rating", async () => {
  await withVite(async (vite) => {
    const {validateCatalog} = await vite.ssrLoadModule("/lib/netflix-catalog.ts");
    assert.throws(() => validateCatalog({version: 1, entries: [entry("same"), entry("same")]}), /duplicate catalog id/);
    assert.throws(() => validateCatalog({version: 1, entries: [entry("ttl", {availabilityExpiresAt: "2026-08-28T00:00:00.000Z"})]}), /exactly 14 days/);
    assert.throws(() => validateCatalog({version: 1, entries: [entry("url", {ratingSourceUrl: "http://rating.example/url"})]}), /HTTPS URL/);
    assert.throws(() => validateCatalog({version: 1, entries: [entry("adult", {rating: "청소년 관람불가"})]}), /adult or invalid rating/);
    assert.throws(() => validateCatalog({version: 1, entries: [entry("pending", {ratingStatus: "pending"})]}), /not rating verified/);
  });
});

test("14-day expiry boundary is inclusive and expires one millisecond later", async () => {
  await withVite(async (vite) => {
    const {selectCatalogCandidates} = await vite.ssrLoadModule("/lib/netflix-catalog.ts");
    assert.equal(selectCatalogCandidates(request, [entry("boundary")], new Date("2026-08-29T00:00:00.000Z")).eligible.length, 1);
    assert.equal(selectCatalogCandidates(request, [entry("boundary")], new Date("2026-08-29T00:00:00.001Z")).eligible.length, 0);
  });
});

test("filters media and genre then returns all four public statuses", async () => {
  await withVite(async (vite) => {
    const {buildCatalogResult, selectCatalogCandidates} = await vite.ssrLoadModule("/lib/netflix-catalog.ts");
    const entries = [entry("one"), entry("two"), entry("three"), entry("tv", {mediaType: "tv"}), entry("drama", {genres: ["드라마"]})];
    assert.deepEqual(selectCatalogCandidates(request, entries, new Date("2026-08-16T00:00:00.000Z")).eligible.map((item) => item.id), ["one", "three", "two"]);
    assert.equal(buildCatalogResult(request, entries, ["three", "one", "two"], "test", new Date("2026-08-16T00:00:00.000Z")).status, "complete");
    assert.equal(buildCatalogResult(request, entries.slice(0, 2), ["one", "two"], "test", new Date("2026-08-16T00:00:00.000Z")).status, "partial");
    assert.equal(buildCatalogResult(request, [entry("old", {availabilityCheckedAt: "2026-07-01T00:00:00.000Z", availabilityExpiresAt: "2026-07-15T00:00:00.000Z"})], [], "deterministic", new Date("2026-08-16T00:00:00.000Z")).status, "sources_only");
    assert.equal(buildCatalogResult(request, [entry("tv-only", {mediaType: "tv"})], [], "deterministic", new Date("2026-08-16T00:00:00.000Z")).status, "empty");
  });
});

test("reasons use verified tags and cards expose manual availability", async () => {
  await withVite(async (vite) => {
    const {buildCatalogResult} = await vite.ssrLoadModule("/lib/netflix-catalog.ts");
    const result = buildCatalogResult(request, [entry("safe")], ["safe"], "deterministic", new Date("2026-08-16T00:00:00.000Z"));
    assert.match(result.recommendations[0].reason, /스릴러 장르 쫄깃한 분위기/);
    assert.equal(result.recommendations[0].availability.status, "verified_manual");
    assert.equal(result.recommendations[0].availability.expiresAt, "2026-08-29T00:00:00.000Z");
  });
});

test("OpenRouter uses only allowed IDs with no tools and safely falls back", async () => {
  await withVite(async (vite) => {
    const {rankCatalogCandidates} = await vite.ssrLoadModule("/lib/catalog-ranker.ts");
    const previousKey = process.env.OPENROUTER_API_KEY;
    const previousFetch = globalThis.fetch;
    process.env.OPENROUTER_API_KEY = "unit-key";
    const candidates = [entry("one"), entry("two"), entry("three")];
    let sentBody;
    globalThis.fetch = async (_input, init) => {
      sentBody = JSON.parse(init.body);
      return Response.json({choices: [{message: {content: JSON.stringify({ids: ["three", "one"]})}}]});
    };
    try {
      assert.deepEqual((await rankCatalogCandidates(request, candidates)).ids, ["three", "one"]);
      assert.equal("tools" in sentBody, false);
      assert.equal(JSON.stringify(sentBody).includes("web_search"), false);
      assert.equal(JSON.stringify(sentBody).includes("web_fetch"), false);
      globalThis.fetch = async () => Response.json({choices: [{message: {content: JSON.stringify({ids: ["outside"]})}}]});
      assert.deepEqual((await rankCatalogCandidates(request, candidates)).ids, ["one", "two", "three"]);
      globalThis.fetch = async () => new Response("rate limited", {status: 429});
      assert.deepEqual((await rankCatalogCandidates(request, candidates)).ids, ["one", "two", "three"]);
      for (const status of [401, 500, 503]) {
        globalThis.fetch = async () => new Response("upstream error", {status});
        assert.deepEqual((await rankCatalogCandidates(request, candidates)).ids, ["one", "two", "three"]);
      }
      globalThis.fetch = async () => Response.json({choices: [{message: {content: "not json"}}]});
      assert.deepEqual((await rankCatalogCandidates(request, candidates)).ids, ["one", "two", "three"]);
    } finally {
      globalThis.fetch = previousFetch;
      if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
      else process.env.OPENROUTER_API_KEY = previousKey;
    }
  });
});

test("missing key uses deterministic ranking", async () => {
  await withVite(async (vite) => {
    const {rankCatalogCandidates} = await vite.ssrLoadModule("/lib/catalog-ranker.ts");
    const previousKey = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    try { assert.deepEqual((await rankCatalogCandidates(request, [entry("one"), entry("two")])).ids, ["one", "two"]); }
    finally { if (previousKey !== undefined) process.env.OPENROUTER_API_KEY = previousKey; }
  });
});

test("pending candidates never enter the public catalog", async () => {
  const approved = JSON.parse(await readFile(new URL("../data/ott-catalog/netflix-kr.json", import.meta.url), "utf8"));
  const review = JSON.parse(await readFile(new URL("../data/ott-catalog/netflix-kr.review.json", import.meta.url), "utf8"));
  assert.equal(approved.entries.length, 0);
  assert.equal(review.candidates.length, 16);
  assert.ok(review.candidates.every((candidate) => candidate.reviewStatus === "pending"));
});

test("client preserves five stages, OTT scope, and disabled preselection", async () => {
  const source = await readFile(new URL("../app/WatchMatchHosted.tsx", import.meta.url), "utf8");
  for (const label of ["메인", "취향 선택", "작품 선택", "영상 제작", "영상 보기"]) assert.match(source, new RegExp(label));
  for (const contract of ['ottProvider: "netflix"', 'region: "KR"', 'accessMode: "subscription"']) assert.match(source, new RegExp(contract));
  assert.match(source, /Netflix 검증 목록에서 찾기/);
  assert.match(source, /disabled=\{!selected\}/);
});

test("review form documents the human approval gate", async () => {
  const form = await readFile(new URL("../docs/NETFLIX_REVIEW_FORM.md", import.meta.url), "utf8");
  assert.match(form, /Netflix 대한민국 로그인 상태에서 직접 확인/);
  assert.match(form, /정확히 14일/);
  assert.match(form, /청소년 관람불가/);
});

test("candidate discovery uses exactly one search for movie and one for TV", async () => {
  const script = await readFile(new URL("../scripts/discover-netflix-candidates.mjs", import.meta.url), "utf8");
  assert.match(script, /await discover\("movie"\)/);
  assert.match(script, /await discover\("tv"\)/);
  assert.match(script, /max_uses: 1/);
  assert.match(script, /max_tool_calls: 1/);
  assert.doesNotMatch(script, /openrouter:web_fetch/);
  assert.match(script, /Never claim that a work is currently playable in Netflix Korea/);
});
