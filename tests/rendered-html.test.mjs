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

function groundedWork({
  title,
  canonicalTitle = title,
  year,
  url,
  rating = "PG-13",
  genres = ["미스터리"],
}) {
  return {
    title,
    canonicalTitle,
    year,
    mediaType: "movie",
    genres,
    premise: `${title}의 인물들이 낯선 단서와 마주치며 시작하는 무스포 미스터리입니다.`,
    reason: "공개된 초반 설정을 따라가며 긴장감과 추리 분위기를 즐기기에 잘 맞습니다.",
    rating,
    ratingSourceUrl: url,
    sources: [{label: `${title} guide`, url}],
  };
}

function citationFor(work) {
  return {
    type: "url_citation",
    url_citation: {
      url: work.ratingSourceUrl,
      title: `${work.title} guide`,
      content: `${work.title} (${work.year}) carries a ${work.rating} content rating.`,
    },
  };
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
  let openRouterCalls = 0;
  let openRouterRequest;

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
    openRouterCalls += 1;
    authenticated = new Headers(init?.headers).get("authorization") ===
      "Bearer unit-key";
    openRouterRequest = JSON.parse(init?.body ?? "{}");
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
    assert.equal(openRouterCalls, 1);
    assert.equal(openRouterRequest.model, "google/gemini-3.6-flash");
    assert.deepEqual(openRouterRequest.models, ["google/gemini-3.5-flash"]);
    assert.equal(openRouterRequest.max_tool_calls, 1);
    assert.equal(openRouterRequest.tool_choice, "required");
    assert.equal(openRouterRequest.tools[0].parameters.mode, "fast");
    assert.equal(openRouterRequest.tools[0].parameters.max_uses, 1);
    assert.equal(openRouterRequest.tools[0].parameters.max_results, 10);
    assert.equal(openRouterRequest.tools[0].parameters.max_total_results, 10);
    assert.equal(openRouterRequest.tools[0].parameters.max_characters, 3_000);
    assert.deepEqual(openRouterRequest.tools[0].parameters.allowed_domains, [
      "imdb.com",
      "rottentomatoes.com",
      "commonsensemedia.org",
      "bbfc.co.uk",
      "wikipedia.org",
    ]);
    assert.equal(body.recommendations.length, 3);
    assert.deepEqual(body.recommendations.map((item) => item.title), [
      "Knives Out",
      "Enola Holmes",
      "Missing",
    ]);
    assert.equal(body.recommendations.every((item) => item.sources.length === 1), true);
    assert.equal(body.status, "complete");
    assert.equal(body.sources.length, 3);
    assert.deepEqual(body.sources.map((source) => source.domain), [
      "example.com",
      "example.org",
      "example.net",
    ]);
    assert.deepEqual(body.summary, {
      citationCount: 3,
      candidateCount: 3,
      rejectedCount: 0,
    });
    assert.equal(body.model, "test/model");
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousKey;
  }
});

test("keeps all six search sources while selecting the first three verified thriller works", async () => {
  const previousKey = process.env.OPENROUTER_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.OPENROUTER_API_KEY = "unit-key";
  let calls = 0;

  const works = Array.from({length: 6}, (_, index) => groundedWork({
    title: `Thriller Candidate ${index + 1}`,
    year: 2018 + index,
    url: `https://source-${index + 1}.example/thriller-${index + 1}`,
    genres: ["스릴러"],
  }));

  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.url;
    if (url !== "https://openrouter.ai/api/v1/chat/completions") {
      return previousFetch(input, init);
    }
    calls += 1;
    return Response.json({
      model: "test/model",
      choices: [{
        message: {
          content: JSON.stringify({recommendations: works}),
          annotations: works.map(citationFor),
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
        genres: ["스릴러"],
        mood: "thrilling",
      }),
    });
    assert.equal(response.status, 200);
    assert.equal(calls, 1);
    const body = await response.json();
    assert.equal(body.status, "complete");
    assert.deepEqual(body.recommendations.map((item) => item.title), [
      "Thriller Candidate 1",
      "Thriller Candidate 2",
      "Thriller Candidate 3",
    ]);
    assert.equal(body.sources.length, 6);
    assert.deepEqual(body.sources.map((source) => source.domain), [
      "source-1.example",
      "source-2.example",
      "source-3.example",
      "source-4.example",
      "source-5.example",
      "source-6.example",
    ]);
    assert.deepEqual(body.summary, {
      citationCount: 6,
      candidateCount: 6,
      rejectedCount: 0,
    });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousKey;
  }
});

test("accepts equivalent safe rating formats only when the citation states the category", async () => {
  const previousKey = process.env.OPENROUTER_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.OPENROUTER_API_KEY = "unit-key";

  const works = [
    groundedWork({
      title: "Formatted Rating",
      year: 2019,
      url: "https://example.com/formatted-rating",
      rating: "PG-13 (United States)",
    }),
    groundedWork({
      title: "Korean Rating",
      year: 2021,
      url: "https://example.com/korean-rating",
      rating: "15세 이상 관람가",
    }),
    groundedWork({
      title: "Third Safe",
      year: 2023,
      url: "https://example.com/third-safe",
    }),
  ];

  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.url;
    if (url !== "https://openrouter.ai/api/v1/chat/completions") {
      return previousFetch(input, init);
    }
    return Response.json({
      model: "test/model",
      choices: [{
        message: {
          content: JSON.stringify({recommendations: works}),
          annotations: [
            {
              type: "url_citation",
              url_citation: {
                url: works[0].ratingSourceUrl,
                title: `${works[0].title} guide`,
                content: `${works[0].title} (${works[0].year}) is rated PG-13.`,
              },
            },
            {
              type: "url_citation",
              url_citation: {
                url: works[1].ratingSourceUrl,
                title: `${works[1].title} guide`,
                content: `${works[1].title} (${works[1].year}) South Korea: 15.`,
              },
            },
            citationFor(works[2]),
          ],
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
    assert.deepEqual(body.recommendations.map((item) => item.rating), [
      "PG-13 (United States)",
      "15세 이상 관람가",
      "PG-13",
    ]);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousKey;
  }
});

test("does not mistake a review score for an age rating", async () => {
  const previousKey = process.env.OPENROUTER_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.OPENROUTER_API_KEY = "unit-key";
  let calls = 0;

  const works = [
    groundedWork({
      title: "Score Only",
      year: 2019,
      url: "https://example.com/score-only",
      rating: "7",
    }),
    groundedWork({
      title: "Second Safe",
      year: 2021,
      url: "https://example.com/second-safe",
    }),
    groundedWork({
      title: "Third Safe",
      year: 2023,
      url: "https://example.com/third-safe-score-test",
    }),
  ];

  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.url;
    if (url !== "https://openrouter.ai/api/v1/chat/completions") {
      return previousFetch(input, init);
    }
    calls += 1;
    return Response.json({
      model: "test/model",
      choices: [{
        message: {
          content: JSON.stringify({recommendations: works}),
          annotations: [
            {
              type: "url_citation",
              url_citation: {
                url: works[0].ratingSourceUrl,
                title: `${works[0].title} review`,
                content: `${works[0].title} (${works[0].year}) has an IMDb rating: 7.4 and a review score of 7 / 10.`,
              },
            },
            citationFor(works[1]),
            citationFor(works[2]),
          ],
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
    assert.equal(calls, 2);
    const body = await response.json();
    assert.equal(body.status, "partial");
    assert.deepEqual(body.recommendations.map((item) => item.title), [
      "Second Safe",
      "Third Safe",
    ]);
    assert.equal(body.sources.length, 3);
    assert.deepEqual(body.summary, {
      citationCount: 3,
      candidateCount: 3,
      rejectedCount: 1,
    });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousKey;
  }
});

test("returns all search sources even when no candidate passes verification", async () => {
  const previousKey = process.env.OPENROUTER_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.OPENROUTER_API_KEY = "unit-key";
  let calls = 0;

  const candidates = [
    groundedWork({
      title: "Score Only One",
      year: 2020,
      url: "https://example.com/score-only-one",
      rating: "7",
      genres: ["스릴러"],
    }),
    groundedWork({
      title: "Score Only Two",
      year: 2022,
      url: "https://example.org/score-only-two",
      rating: "8",
      genres: ["스릴러"],
    }),
  ];

  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.url;
    if (url !== "https://openrouter.ai/api/v1/chat/completions") {
      return previousFetch(input, init);
    }
    calls += 1;
    return Response.json({
      model: "test/model",
      choices: [{
        message: {
          content: JSON.stringify({recommendations: candidates}),
          annotations: candidates.map((work, index) => ({
            type: "url_citation",
            url_citation: {
              url: work.ratingSourceUrl,
              title: `${work.title} review`,
              content: `${work.title} (${work.year}) has an IMDb review score of ${index + 7}.4/10.`,
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
        genres: ["스릴러"],
        mood: "thrilling",
      }),
    });
    assert.equal(response.status, 200);
    assert.equal(calls, 2);
    const body = await response.json();
    assert.equal(body.status, "sources_only");
    assert.deepEqual(body.recommendations, []);
    assert.equal(body.sources.length, 2);
    assert.deepEqual(body.sources.map((source) => source.url), [
      "https://example.com/score-only-one",
      "https://example.org/score-only-two",
    ]);
    assert.deepEqual(body.summary, {
      citationCount: 2,
      candidateCount: 2,
      rejectedCount: 2,
    });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousKey;
  }
});

test("rejects a safe claim when its citation also states an adult classification", async () => {
  const previousKey = process.env.OPENROUTER_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.OPENROUTER_API_KEY = "unit-key";

  const conflictingUs = groundedWork({
    title: "Conflicting US Certificate",
    year: 2020,
    url: "https://example.com/conflicting-us-certificate",
    rating: "PG-13",
  });
  const conflictingUk = groundedWork({
    title: "Conflicting UK Certificate",
    year: 2021,
    url: "https://example.com/conflicting-uk-certificate",
    rating: "PG-13",
  });
  const validWorks = [
    groundedWork({title: "Safe First", year: 2019, url: "https://example.com/safe-first"}),
    groundedWork({title: "Safe Second", year: 2022, url: "https://example.com/safe-second"}),
    groundedWork({title: "Safe Third", year: 2024, url: "https://example.com/safe-third"}),
  ];
  const candidates = [conflictingUs, conflictingUk, ...validWorks];

  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.url;
    if (url !== "https://openrouter.ai/api/v1/chat/completions") {
      return previousFetch(input, init);
    }
    return Response.json({
      model: "test/model",
      choices: [{
        message: {
          content: JSON.stringify({recommendations: candidates}),
          annotations: [
            {
              type: "url_citation",
              url_citation: {
                url: conflictingUs.ratingSourceUrl,
                title: "Conflicting US Certificate guide",
                content: "Conflicting US Certificate (2020). United States: R. Elsewhere classified PG-13.",
              },
            },
            {
              type: "url_citation",
              url_citation: {
                url: conflictingUk.ratingSourceUrl,
                title: "Conflicting UK Certificate guide",
                content: "Conflicting UK Certificate (2021). United Kingdom:18. United States:PG-13.",
              },
            },
            ...validWorks.map(citationFor),
          ],
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
    assert.deepEqual(body.recommendations.map((item) => item.title), [
      "Safe First",
      "Safe Second",
      "Safe Third",
    ]);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousKey;
  }
});

test("rejects mixed unrated claims and ratings borrowed from another work", async () => {
  const previousKey = process.env.OPENROUTER_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.OPENROUTER_API_KEY = "unit-key";

  const mixedUnrated = groundedWork({
    title: "Mixed Unrated",
    year: 2018,
    url: "https://example.com/mixed-unrated",
    rating: "PG-13 / NR",
  });
  const misbound = groundedWork({
    title: "Misbound Rating",
    year: 2020,
    url: "https://example.com/misbound-title",
  });
  misbound.ratingSourceUrl = "https://example.com/other-work-rating";
  misbound.sources = [
    {label: "Misbound title", url: "https://example.com/misbound-title"},
    {label: "Other work rating", url: misbound.ratingSourceUrl},
  ];
  const validWorks = [
    groundedWork({title: "Valid One", year: 2019, url: "https://example.com/valid-one"}),
    groundedWork({title: "Valid Two", year: 2022, url: "https://example.com/valid-two"}),
    groundedWork({title: "Valid Three", year: 2024, url: "https://example.com/valid-three"}),
  ];
  const candidates = [mixedUnrated, misbound, ...validWorks];

  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.url;
    if (url !== "https://openrouter.ai/api/v1/chat/completions") {
      return previousFetch(input, init);
    }
    return Response.json({
      model: "test/model",
      choices: [{
        message: {
          content: JSON.stringify({recommendations: candidates}),
          annotations: [
            citationFor(mixedUnrated),
            {
              type: "url_citation",
              url_citation: {
                url: "https://example.com/misbound-title",
                title: "Misbound Rating overview",
                content: "Misbound Rating (2020) is a mystery film.",
              },
            },
            {
              type: "url_citation",
              url_citation: {
                url: misbound.ratingSourceUrl,
                title: "Other Work parents guide",
                content: "Other Work (2020) is rated PG-13.",
              },
            },
            ...validWorks.map(citationFor),
          ],
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
    assert.deepEqual(body.recommendations.map((item) => item.title), [
      "Valid One",
      "Valid Two",
      "Valid Three",
    ]);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousKey;
  }
});

test("skips invalid extras and returns the first three valid distinct candidates", async () => {
  const previousKey = process.env.OPENROUTER_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.OPENROUTER_API_KEY = "unit-key";
  let openRouterCalls = 0;

  const adultCandidate = groundedWork({
    title: "Adult Candidate",
    year: 2021,
    url: "https://example.com/adult-candidate",
    rating: "PG-13 / R (United States)",
  });
  const firstValid = groundedWork({
    title: "First Valid",
    year: 2019,
    url: "https://example.com/first-valid",
    genres: ["Mystery", "Romance", "Drama", "Thriller", "Adventure"],
  });
  const wrongGenreCandidate = groundedWork({
    title: "Wrong Genre",
    year: 2020,
    url: "https://example.com/wrong-genre",
    genres: ["코미디"],
  });
  const secondValid = groundedWork({
    title: "Second Valid",
    year: 2022,
    url: "https://example.com/second-valid",
  });
  const thirdValid = groundedWork({
    title: "Third Valid",
    year: 2023,
    url: "https://example.com/third-valid",
  });
  const candidates = [
    adultCandidate,
    firstValid,
    wrongGenreCandidate,
    secondValid,
    thirdValid,
  ];

  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.url;
    if (url !== "https://openrouter.ai/api/v1/chat/completions") {
      return previousFetch(input, init);
    }
    openRouterCalls += 1;
    return Response.json({
      model: "test/model",
      choices: [{
        message: {
          content: JSON.stringify({recommendations: candidates}),
          annotations: candidates.map(citationFor),
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
    assert.equal(openRouterCalls, 1);
    assert.deepEqual(body.recommendations.map((item) => item.title), [
      "First Valid",
      "Second Valid",
      "Third Valid",
    ]);
    assert.deepEqual(body.recommendations[0].genres, [
      "미스터리",
      "로맨스",
      "드라마",
      "스릴러",
    ]);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousKey;
  }
});

test("treats swapped localized and canonical titles as the same work", async () => {
  const previousKey = process.env.OPENROUTER_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.OPENROUTER_API_KEY = "unit-key";

  const localized = groundedWork({
    title: "첫 번째 작품",
    canonicalTitle: "First Work",
    year: 2019,
    url: "https://example.com/first-localized",
  });
  const aliasSwappedDuplicate = groundedWork({
    title: "First Work",
    canonicalTitle: "첫 번째 작품",
    year: 2019,
    url: "https://example.com/first-alias",
  });
  const second = groundedWork({
    title: "Second Work",
    year: 2021,
    url: "https://example.com/second-work",
  });
  const third = groundedWork({
    title: "Third Work",
    year: 2023,
    url: "https://example.com/third-work",
  });
  const candidates = [localized, aliasSwappedDuplicate, second, third];

  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.url;
    if (url !== "https://openrouter.ai/api/v1/chat/completions") {
      return previousFetch(input, init);
    }
    return Response.json({
      model: "test/model",
      choices: [{
        message: {
          content: JSON.stringify({recommendations: candidates}),
          annotations: candidates.map(citationFor),
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
    assert.deepEqual(body.recommendations.map((item) => item.title), [
      "첫 번째 작품",
      "Second Work",
      "Third Work",
    ]);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousKey;
  }
});

test("repairs two candidates using only existing citations and never searches twice", async () => {
  const previousKey = process.env.OPENROUTER_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.OPENROUTER_API_KEY = "unit-key";
  const openRouterRequests = [];

  const first = groundedWork({
    title: "First Cited",
    year: 2018,
    url: "https://example.com/first-cited",
  });
  const second = groundedWork({
    title: "Second Cited",
    year: 2020,
    url: "https://example.com/second-cited",
  });
  const third = groundedWork({
    title: "Third Cited",
    year: 2024,
    url: "https://example.com/third-cited",
  });
  const allWorks = [first, second, third];

  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.url;
    if (url !== "https://openrouter.ai/api/v1/chat/completions") {
      return previousFetch(input, init);
    }

    const request = JSON.parse(init?.body ?? "{}");
    openRouterRequests.push(request);
    if (openRouterRequests.length === 1) {
      return Response.json({
        model: "test/search-model",
        choices: [{
          message: {
            content: JSON.stringify({recommendations: [first, second]}),
            // The first and only web search already found evidence for the
            // third work, even though the first answer omitted it.
            annotations: allWorks.map(citationFor),
          },
        }],
      });
    }

    return Response.json({
      model: "test/repair-model",
      choices: [{
        message: {
          content: JSON.stringify({recommendations: allWorks}),
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
    assert.equal(openRouterRequests.length, 2);
    assert.equal(openRouterRequests.filter((request) => request.tools).length, 1);
    assert.equal(openRouterRequests[0].max_tool_calls, 1);
    assert.equal(openRouterRequests[0].tool_choice, "required");
    assert.equal(openRouterRequests[0].tools[0].parameters.max_uses, 1);
    assert.equal(openRouterRequests[0].tools[0].parameters.max_results, 10);
    assert.equal(openRouterRequests[0].tools[0].parameters.max_total_results, 10);
    assert.equal(openRouterRequests[1].tools, undefined);
    assert.equal(openRouterRequests[1].max_tool_calls, undefined);
    assert.equal(openRouterRequests[1].tool_choice, undefined);
    assert.match(
      openRouterRequests[1].messages[1].content,
      /Validation failure: only 2 of 2 candidates passed validation/,
    );
    assert.match(
      openRouterRequests[1].messages[1].content,
      /https:\/\/example\.com\/third-cited/,
    );
    assert.deepEqual(body.recommendations.map((item) => item.title), [
      "First Cited",
      "Second Cited",
      "Third Cited",
    ]);
    assert.equal(body.model, "test/repair-model");
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
