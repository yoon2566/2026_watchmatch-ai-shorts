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

test("only the mapped Watchmode work exposes its local-only video", async () => {
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
  assert.match(catalog, /\/local-videos\/swapped_watchmatch_30s\.mp4/);
  assert.match(gitignore, /\/public\/local-videos\/\*\.mp4/);
  const captions = await readFile(new URL("../public/local-videos/swapped_watchmatch_30s.ko.vtt", import.meta.url), "utf8");
  assert.match(captions, /^WEBVTT/u);
});
