import assert from "node:assert/strict";
import test from "node:test";
import {RequestValidationError, createWatchmodeClient, parseRecommendationRequest} from "../lib/watchmode.ts";

function json(value, status = 200) {
  return Response.json(value, {status});
}

test("validates OTT, media type, and genre inputs", () => {
  assert.deepEqual(parseRecommendationRequest({provider: "netflix", mediaType: "movie", genre: "action"}), {provider: "netflix", mediaType: "movie", genre: "action"});
  assert.throws(() => parseRecommendationRequest({provider: "unknown", mediaType: "movie", genre: "action"}), RequestValidationError);
  assert.throws(() => parseRecommendationRequest({provider: "netflix", mediaType: "short", genre: "action"}), RequestValidationError);
});

test("uses header auth, keeps KR/provider/type/genre filters, and returns three real candidates", async () => {
  const calls = [];
  const fakeFetch = async (input, init = {}) => {
    const url = new URL(input.toString());
    calls.push({url, headers: new Headers(init.headers)});
    if (url.pathname.endsWith("/regions/")) return json([{country: "KR", plan_enabled: true}]);
    if (url.pathname.endsWith("/sources/")) return json([{id: 203, type: "sub", regions: ["KR"]}]);
    if (url.pathname.endsWith("/genres/")) return json([{id: 1, name: "Action"}]);
    if (url.pathname.endsWith("/list-titles/")) {
      const titles = [
        {id: 101, title: "One", year: 2024, type: "movie", popularity_percentile: 98},
        {id: 102, title: "Two", year: 2023, type: "movie", popularity_percentile: 95},
        {id: 103, title: "Three", year: 2022, type: "movie", popularity_percentile: 91},
      ];
      return json({titles: url.searchParams.has("user_rating_low") ? titles.slice(0, 2) : titles, total_results: 3});
    }
    if (url.pathname.endsWith("/title/101/details/")) return json({title: "하나", year: 2024, type: "movie", user_rating: 8.2, critic_score: 80, popularity_percentile: 99});
    if (url.pathname.endsWith("/title/102/details/")) return json({}, 500);
    if (url.pathname.endsWith("/title/103/details/")) return json({title: "셋", year: 2022, type: "movie", user_rating: 7.4});
    return json({}, 404);
  };

  const client = createWatchmodeClient({apiKey: "test-secret", fetchImpl: fakeFetch});
  const result = await client.getRecommendations({provider: "netflix", mediaType: "movie", genre: "action"});
  assert.equal(result.recommendations.length, 3);
  assert.equal(result.recommendations[0].title, "하나");
  assert.equal(result.recommendations[1].title, "Two");
  assert.equal(result.meta.ratingFilterRelaxed, true);
  assert.equal(result.meta.detailsUnavailable, 1);

  const listCalls = calls.filter((call) => call.url.pathname.endsWith("/list-titles/"));
  assert.equal(listCalls.length, 2);
  assert.equal(listCalls[0].url.searchParams.get("regions"), "KR");
  assert.equal(listCalls[0].url.searchParams.get("source_ids"), "203");
  assert.equal(listCalls[0].url.searchParams.get("types"), "movie");
  assert.equal(listCalls[0].url.searchParams.get("genres"), "1");
  assert.equal(listCalls[1].url.searchParams.has("user_rating_low"), false);
  for (const call of calls) {
    assert.equal(call.headers.get("X-API-Key"), "test-secret");
    assert.doesNotMatch(call.url.toString(), /test-secret/);
  }
});
