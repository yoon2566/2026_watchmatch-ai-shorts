import {readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.resolve(scriptDir, "../data/works-catalog.json");
const API_URL = "https://www.wikidata.org/w/api.php";
const USER_AGENT = "WatchMatchCatalogVerifier/1.0 (https://github.com/yoon2566/2026_watchmatch-ai-shorts)";
const ROOTS = {movie: new Set(["Q11424"]), tv: new Set(["Q5398426", "Q15416"])};

function chunks(values, size = 50) {
  const result = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

function claimIds(entity, property) {
  return (entity?.claims?.[property] ?? [])
    .map((claim) => claim?.mainsnak?.datavalue?.value?.id)
    .filter((value) => typeof value === "string");
}

function claimYears(entity, properties) {
  return properties.flatMap((property) => entity?.claims?.[property] ?? [])
    .map((claim) => claim?.mainsnak?.datavalue?.value?.time)
    .filter((time) => typeof time === "string")
    .map((time) => Number.parseInt(time.slice(1, 5), 10))
    .filter(Number.isInteger);
}

function normalizeTitle(value) {
  return value.normalize("NFKC").toLocaleLowerCase("ko-KR").replace(/[^\p{L}\p{N}]+/gu, "");
}

function entityTitles(entity) {
  const labels = Object.values(entity?.labels ?? {})
    .map((label) => label?.value)
    .filter((value) => typeof value === "string");
  const aliases = Object.values(entity?.aliases ?? {})
    .flatMap((items) => items ?? [])
    .map((alias) => alias?.value)
    .filter((value) => typeof value === "string");
  return [...new Set([...labels, ...aliases])];
}

async function fetchJson(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {Accept: "application/json", "User-Agent": USER_AGENT},
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }
  throw lastError;
}

async function fetchEntities(ids) {
  const entities = {};
  for (const batch of chunks([...new Set(ids)], 50)) {
    const params = new URLSearchParams({
      action: "wbgetentities",
      format: "json",
      props: "claims|labels|aliases",
      languages: "ko|en",
      ids: batch.join("|"),
      origin: "*",
    });
    const payload = await fetchJson(`${API_URL}?${params}`);
    Object.assign(entities, payload.entities ?? {});
  }
  return entities;
}

async function buildClassParentMap(instanceIds) {
  const parentMap = new Map();
  const visited = new Set();
  let frontier = new Set(instanceIds);
  for (let depth = 0; depth < 7 && frontier.size > 0; depth += 1) {
    const ids = [...frontier].filter((id) => !visited.has(id));
    if (ids.length === 0) break;
    const entities = await fetchEntities(ids);
    const next = new Set();
    for (const id of ids) {
      visited.add(id);
      const parents = claimIds(entities[id], "P279");
      parentMap.set(id, parents);
      for (const parent of parents) if (!visited.has(parent)) next.add(parent);
    }
    frontier = next;
  }
  return parentMap;
}

function reachesRoot(instanceId, roots, parentMap) {
  const pending = [instanceId];
  const seen = new Set();
  while (pending.length > 0) {
    const current = pending.pop();
    if (roots.has(current)) return true;
    if (!current || seen.has(current)) continue;
    seen.add(current);
    pending.push(...(parentMap.get(current) ?? []));
  }
  return false;
}

const raw = JSON.parse(await readFile(catalogPath, "utf8"));
if (raw?.version !== 1 || !Array.isArray(raw.works) || raw.works.length === 0) {
  throw new Error("data/works-catalog.json 형식이 올바르지 않습니다.");
}

const ids = raw.works.map((work) => work.wikidataId);
if (new Set(ids).size !== ids.length) throw new Error("카탈로그에 중복 Wikidata ID가 있습니다.");

const entities = await fetchEntities(ids);
const instanceIds = [...new Set(Object.values(entities).flatMap((entity) => claimIds(entity, "P31")))];
const classParentMap = await buildClassParentMap(instanceIds);

const errors = [];
for (const work of raw.works) {
  const entity = entities[work.wikidataId];
  if (!entity || entity.missing !== undefined) {
    errors.push(`${work.id}: ${work.wikidataId} 항목이 없습니다.`);
    continue;
  }
  const knownTitles = entityTitles(entity);
  const normalizedCatalogTitle = normalizeTitle(work.title);
  if (!knownTitles.some((title) => normalizeTitle(title) === normalizedCatalogTitle)) {
    errors.push(`${work.id}: 카탈로그 제목 '${work.title}'이 Wikidata 한국어/영어 라벨·별칭과 일치하지 않습니다 (${knownTitles.join(" / ") || "없음"}).`);
  }

  const yearProperties = work.mediaType === "movie" ? ["P577"] : ["P577", "P580", "P571"];
  const years = claimYears(entity, yearProperties);
  if (!years.includes(work.year)) errors.push(`${work.id}: 카탈로그 연도 ${work.year}, Wikidata ${yearProperties.join("/")} ${years.join(", ") || "없음"}`);

  const roots = ROOTS[work.mediaType];
  const instances = claimIds(entity, "P31");
  const matchesType = instances.some((instanceId) => reachesRoot(instanceId, roots, classParentMap));
  if (!matchesType) errors.push(`${work.id}: P31 계층에서 ${work.mediaType} 유형을 확인하지 못했습니다 (${instances.join(", ") || "없음"}).`);
}

console.log(`Wikidata 검증: ${raw.works.length}편, ${ids.length}개 고유 QID`);
if (errors.length > 0) {
  console.error(`검증 실패 ${errors.length}건:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log("PASS: 모든 QID의 존재, 제목, 연도, P31 작품 유형을 확인했습니다.");
}
