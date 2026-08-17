import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/", init) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const {default: worker} = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${pathname}`, init),
    {ASSETS: {fetch: async () => new Response("Not found", {status: 404})}},
    {waitUntil() {}, passThroughOnException() {}},
  );
}

test("server-renders the Watchmode three-click first screen", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<html[^>]+lang="ko"/i);
  assert.match(html, /어디에서 보고 싶나요/);
  assert.match(html, /넷플릭스/);
  assert.match(html, /WATCHMODE LIVE/);
  assert.match(html, /Data provided by Watchmode/);
  assert.doesNotMatch(html, /고전|근래|최근|미리 저장한|일반 작품 카탈로그/);
});

test("recommendation API rejects invalid JSON without contacting Watchmode", async () => {
  const response = await render("/api/recommendations", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: "{",
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {error: {code: "INVALID_JSON", message: "요청 JSON을 읽을 수 없습니다."}});
});

test("client implements OTT to media to genre live search without automatic work selection", async () => {
  const source = await readFile(new URL("../app/WatchMatchHosted.tsx", import.meta.url), "utf8");
  for (const scene of ["provider", "media", "genre", "recommendations", "production", "result"]) {
    assert.match(source, new RegExp(`"${scene}"`));
  }
  assert.match(source, /useState<Scene>\("provider"\)/);
  assert.match(source, /fetch\("\/api\/options"/);
  assert.match(source, /JSON\.stringify\(\{provider, mediaType, genre: value\}\)/);
  assert.match(source, /disabled=\{!selectedVideo\}/);
  assert.doesNotMatch(source, /setSelectedId\([^\n]*recommendations\[0\]/);
  assert.doesNotMatch(source, /OPENROUTER|web_search|web_fetch|TMDB|JustWatch/iu);
});

test("mapped Watchmode works expose their finished Grok videos", async () => {
  const source = await readFile(new URL("../app/WatchMatchHosted.tsx", import.meta.url), "utf8");
  const catalog = await readFile(new URL("../lib/local-video-catalog.ts", import.meta.url), "utf8");
  const gitignore = await readFile(new URL("../.gitignore", import.meta.url), "utf8");
  assert.match(source, /PIPELINE_STEPS/);
  assert.match(source, /method: "HEAD"/);
  assert.match(source, /disabled=\{!selectedVideo\}/);
  assert.match(source, /쇼츠 제작 완료/);
  assert.match(source, /쇼츠 준비 중/);
  assert.match(source, /영상 크게 보기/);
  assert.match(source, /requestFullscreen/);
  assert.doesNotMatch(source, /\/demo\/watchmatch-demo\.mp4/);
  assert.match(catalog, /1901214/);
  assert.match(catalog, /\/local-videos\/swapped_watchmatch_30s_sites\.mp4/);
  for (const id of [1357316, 1357314, 1357317, 11014446, 1972561, 1893263, 1418767, 1132806, 1810796, 1805677, 1583724, 1468618, 1824277, 1404363, 1780773, 1700166]) {
    assert.match(catalog, new RegExp(String(id)));
  }
  for (const slug of ["spider-man-homecoming", "spider-man-far-from-home", "spider-man-into-the-spider-verse", "dont-say-good-luck", "la-casa", "kpop-demon-hunters", "the-shawshank-redemption", "fight-club", "28-years-later-bone-temple", "war-machine", "voice-message-arrived", "wicked", "anora", "the-lord-of-the-rings-return-of-the-king", "28-years-later", "frankenstein"]) {
    assert.match(catalog, new RegExp(`/local-videos/${slug}_watchmatch_30s_sites\\.mp4`));
  }
  assert.match(source, /사이트에서 바로 재생하거나 내려받을 수 있습니다/);
  assert.doesNotMatch(source, /이 PC에만 보관됩니다/);
  assert.match(gitignore, /\/public\/local-videos\/\*\.mp4/);
  const captions = await readFile(new URL("../public/local-videos/swapped_watchmatch_30s.ko.vtt", import.meta.url), "utf8");
  assert.match(captions, /^WEBVTT/u);
});
