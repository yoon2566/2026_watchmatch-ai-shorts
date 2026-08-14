import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

async function dispatch(path = "/", init = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(new URL(path, "http://localhost"), init),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the WatchMatch live discovery shell", async () => {
  const response = await dispatch("/", {headers: {accept: "text/html"}});
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html[^>]+lang="ko"/i);
  assert.match(html, /<title>WatchMatch \| 25초 무스포 추천 쇼츠<\/title>/i);
  assert.match(html, /WatchMatch/);
  assert.match(html, /볼까 말까/);
  assert.match(html, /LIVE DISCOVERY/);
  assert.match(html, /추천 시작하기/);
  assert.match(
    html,
    /<meta(?=[^>]*\bproperty=["']og:image["'])(?=[^>]*\bcontent=["']http:\/\/localhost\/og-watchmatch\.png["'])[^>]*>/i,
  );
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("rejects invalid recommendation filters before any search", async () => {
  const response = await dispatch("/api/recommendations", {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify({mediaType: "movie", genres: [], mood: "mysterious"}),
  });
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error.code, "INVALID_REQUEST");
});

test("does not substitute fixed works when the OpenRouter secret is absent", async () => {
  const response = await dispatch("/api/recommendations", {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify({
      mediaType: "movie",
      genres: ["미스터리"],
      mood: "mysterious",
    }),
  });
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.error.code, "OPENROUTER_NOT_CONFIGURED");
  assert.equal(body.recommendations, undefined);
});

test("returns three grounded real-work recommendations from OpenRouter", async () => {
  const previousKey = process.env.OPENROUTER_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.OPENROUTER_API_KEY = "unit-key";
  let authenticated = false;

  const works = [
    {
      title: "Knives Out",
      canonicalTitle: "Knives Out",
      year: 2019,
      mediaType: "movie",
      genres: ["미스터리"],
      premise: "유명 작가의 저택에 모인 가족과 탐정의 첫 만남에서 시작하는 미스터리입니다.",
      reason: "재치 있는 대화와 촘촘한 추리 분위기를 좋아한다면 잘 맞습니다.",
      rating: "PG-13",
      ratingSourceUrl: "https://example.com/knives-out",
      sources: [{label: "Knives Out guide", url: "https://example.com/knives-out"}],
    },
    {
      title: "Enola Holmes",
      canonicalTitle: "Enola Holmes",
      year: 2020,
      mediaType: "movie",
      genres: ["미스터리"],
      premise: "사라진 어머니를 찾아 나선 어린 탐정의 첫 여정을 따라가는 미스터리입니다.",
      reason: "경쾌한 모험과 밝은 추리극의 조합을 선호할 때 어울립니다.",
      rating: "PG-13",
      ratingSourceUrl: "https://example.org/enola-holmes",
      sources: [{label: "Enola Holmes guide", url: "https://example.org/enola-holmes"}],
    },
    {
      title: "Missing",
      canonicalTitle: "Missing",
      year: 2023,
      mediaType: "movie",
      genres: ["미스터리"],
      premise: "여행 중 연락이 끊긴 가족을 디지털 단서로 찾아가는 현대 미스터리입니다.",
      reason: "빠른 전개와 화면 속 단서를 따라가는 긴장감을 좋아한다면 잘 맞습니다.",
      rating: "PG-13",
      ratingSourceUrl: "https://example.net/missing-2023",
      sources: [{label: "Missing guide", url: "https://example.net/missing-2023"}],
    },
  ];

  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.url;
    if (url !== "https://openrouter.ai/api/v1/chat/completions") {
      return previousFetch(input, init);
    }
    authenticated = new Headers(init?.headers).get("authorization") ===
      "Bearer unit-key";
    return Response.json({
      model: "test/model",
      choices: [{
        message: {
          content: JSON.stringify({recommendations: works}),
          annotations: works.map((work) => ({
            type: "url_citation",
            url_citation: {
              url: work.ratingSourceUrl,
              title: `${work.title} guide`,
              content: `${work.title} (${work.year}) carries a ${work.rating} content rating.`,
            },
          })),
        },
      }],
    });
  };

  try {
    const response = await dispatch("/api/recommendations", {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({
        mediaType: "movie",
        genres: ["미스터리"],
        mood: "mysterious",
      }),
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(authenticated, true);
    assert.equal(body.recommendations.length, 3);
    assert.deepEqual(body.recommendations.map((item) => item.title), [
      "Knives Out",
      "Enola Holmes",
      "Missing",
    ]);
    assert.equal(body.recommendations.every((item) => item.sources.length === 1), true);
    assert.equal(body.model, "test/model");
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousKey;
  }
});

test("removes the disposable Sites loading preview", async () => {
  await assert.rejects(
    access(new URL("app/_sites-preview/SkeletonPreview.tsx", templateRoot)),
  );
});
