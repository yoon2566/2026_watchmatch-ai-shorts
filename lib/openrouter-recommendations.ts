const OPENROUTER_CHAT_COMPLETIONS_URL =
  "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_PRIMARY_MODEL = "google/gemini-3.6-flash";
const DEFAULT_FALLBACK_MODEL = "google/gemini-3.5-flash";

export type OpenRouterCitation = {
  url: string;
  title: string | null;
  content: string;
};

type RawCompletion = {
  text: string;
  citations: OpenRouterCitation[];
  model: string;
};

export type ValidatedOpenRouterResult<T> = {
  data: T;
  citations: OpenRouterCitation[];
  model: string;
  repaired: boolean;
  complete: boolean;
};

export class OpenRouterRequestError extends Error {
  readonly code: string;
  readonly httpStatus: number;
  readonly retryable: boolean;

  constructor(
    code: string,
    message: string,
    httpStatus: number,
    retryable: boolean,
  ) {
    super(message);
    this.name = "OpenRouterRequestError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.retryable = retryable;
  }
}

async function configuredModels(): Promise<string[]> {
  const primary =
    await readServerSecret("OPENROUTER_MODEL") || DEFAULT_PRIMARY_MODEL;
  const fallback =
    await readServerSecret("OPENROUTER_FALLBACK_MODEL") || DEFAULT_FALLBACK_MODEL;
  return primary === fallback ? [primary, DEFAULT_FALLBACK_MODEL] : [primary, fallback];
}

async function readServerSecret(name: string): Promise<string> {
  try {
    const {env} = await import("cloudflare:workers");
    const binding = (env as unknown as Record<string, unknown>)[name];
    if (typeof binding === "string" && binding.trim()) return binding.trim();
  } catch {
    // Node-based contract tests do not provide the Cloudflare native module.
  }
  return process.env[name]?.trim() || "";
}

function normalizeExternalHttpsUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;

    const hostname = url.hostname.toLocaleLowerCase("en-US");
    if (
      !hostname.includes(".") ||
      hostname === "localhost" ||
      hostname === "0.0.0.0" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.endsWith(".local")
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function collectAnnotations(payload: unknown): unknown[] {
  const annotations: unknown[] = [];
  const seen = new Set<unknown>();

  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object" || seen.has(value)) return;
    seen.add(value);

    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    const record = value as Record<string, unknown>;
    if (Array.isArray(record.annotations)) {
      annotations.push(...record.annotations);
    }
    Object.values(record).forEach(visit);
  };

  visit(payload);
  return annotations;
}

function extractUrlCitations(payload: unknown): OpenRouterCitation[] {
  const citations = new Map<string, OpenRouterCitation>();

  for (const annotation of collectAnnotations(payload)) {
    if (!annotation || typeof annotation !== "object") continue;
    const record = annotation as Record<string, unknown>;
    if (record.type !== "url_citation") continue;

    const nested =
      record.url_citation && typeof record.url_citation === "object"
        ? (record.url_citation as Record<string, unknown>)
        : record;
    if (typeof nested.url !== "string") continue;
    const url = normalizeExternalHttpsUrl(nested.url);
    if (!url) continue;

    const title = typeof nested.title === "string" ? nested.title.trim() : "";
    const content =
      typeof nested.content === "string" ? nested.content.trim().slice(0, 20_000) : "";
    const existing = citations.get(url);
    const mergedContent = [existing?.content, content]
      .filter((part): part is string => Boolean(part))
      .filter((part, index, parts) => parts.indexOf(part) === index)
      .join("\n[...]\n")
      .slice(0, 20_000);

    citations.set(url, {
      url,
      title: existing?.title || title || null,
      content: mergedContent,
    });
  }

  // A URL without an extract cannot verify a work or its content rating.
  return [...citations.values()].filter((citation) => citation.content.length > 0);
}

function extractText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const record = payload as Record<string, unknown>;
  if (!Array.isArray(record.choices)) return "";

  const choice = record.choices[0];
  if (!choice || typeof choice !== "object") return "";
  const message = (choice as Record<string, unknown>).message;
  if (!message || typeof message !== "object") return "";
  const content = (message as Record<string, unknown>).content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      const text = (part as Record<string, unknown>).text;
      return typeof text === "string" ? text : "";
    })
    .filter(Boolean)
    .join("\n");
}

function extractModel(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const model = (payload as Record<string, unknown>).model;
  return typeof model === "string" && model.trim() ? model : fallback;
}

function parseJson(text: string): unknown {
  const withoutFence = text
    .trim()
    .replace(/^```(?:json)?\s*/iu, "")
    .replace(/\s*```$/u, "")
    .trim();

  try {
    return JSON.parse(withoutFence) as unknown;
  } catch {
    const start = withoutFence.indexOf("{");
    const end = withoutFence.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(withoutFence.slice(start, end + 1)) as unknown;
    }
    throw new Error("OpenRouter response did not contain a JSON object");
  }
}

function errorForStatus(status: number): OpenRouterRequestError {
  if (status === 401 || status === 403) {
    return new OpenRouterRequestError(
      "OPENROUTER_AUTH_ERROR",
      "OpenRouter API 키가 유효하지 않습니다.",
      503,
      false,
    );
  }
  if (status === 402) {
    return new OpenRouterRequestError(
      "OPENROUTER_PAYMENT_REQUIRED",
      "OpenRouter 크레딧 또는 결제 설정을 확인해 주세요.",
      503,
      false,
    );
  }
  if (status === 429) {
    return new OpenRouterRequestError(
      "OPENROUTER_RATE_LIMITED",
      "추천 요청이 많습니다. 잠시 후 다시 시도해 주세요.",
      429,
      true,
    );
  }
  if (status >= 500) {
    return new OpenRouterRequestError(
      "OPENROUTER_UPSTREAM_ERROR",
      "추천 검색 서비스가 일시적으로 응답하지 않습니다.",
      502,
      true,
    );
  }
  return new OpenRouterRequestError(
    "OPENROUTER_REQUEST_REJECTED",
    "추천 검색 요청을 처리할 수 없습니다.",
    502,
    false,
  );
}

async function callOpenRouter(
  systemPrompt: string,
  userPrompt: string,
  withWebSearch: boolean,
): Promise<RawCompletion> {
  const apiKey = await readServerSecret("OPENROUTER_API_KEY");
  if (!apiKey) {
    throw new OpenRouterRequestError(
      "OPENROUTER_NOT_CONFIGURED",
      "실시간 작품 검색이 아직 설정되지 않았습니다.",
      503,
      false,
    );
  }

  const models = await configuredModels();
  const [model, ...fallbackModels] = models;
  const body: Record<string, unknown> = {
    model,
    ...(fallbackModels.length > 0 ? {models: fallbackModels} : {}),
    messages: [
      {role: "system", content: systemPrompt},
      {role: "user", content: userPrompt},
    ],
    temperature: 0.1,
    max_tokens: 2_200,
    reasoning: {effort: "minimal", exclude: true},
  };

  if (withWebSearch) {
    body.tools = [
      {
        type: "openrouter:web_search",
        parameters: {
          engine: "exa",
          mode: "fast",
          max_results: 10,
          max_uses: 1,
          max_total_results: 10,
          max_characters: 3_000,
          allowed_domains: [
            "imdb.com",
            "rottentomatoes.com",
            "commonsensemedia.org",
            "bbfc.co.uk",
            "wikipedia.org",
          ],
        },
      },
    ];
    // The recommendation budget allows exactly one server-side web search.
    // max_uses limits this specific tool, while max_tool_calls prevents the
    // model from starting additional tool steps in the same HTTP request.
    body.max_tool_calls = 1;
    body.tool_choice = "required";
  }

  let response: Response;
  try {
    response = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(55_000),
    });
  } catch {
    throw new OpenRouterRequestError(
      "OPENROUTER_UNAVAILABLE",
      "추천 검색 서비스에 연결할 수 없습니다.",
      503,
      true,
    );
  }

  if (!response.ok) throw errorForStatus(response.status);

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new OpenRouterRequestError(
      "OPENROUTER_INVALID_RESPONSE",
      "추천 검색 서비스의 응답을 읽을 수 없습니다.",
      502,
      true,
    );
  }

  const text = extractText(payload);
  const citations = extractUrlCitations(payload);
  if (!text.trim() && citations.length < 1) {
    throw new OpenRouterRequestError(
      "OPENROUTER_EMPTY_RESPONSE",
      "추천 검색 결과가 비어 있습니다.",
      502,
      true,
    );
  }

  return {
    text,
    citations,
    model: extractModel(payload, models[0]),
  };
}

function repairCitationContext(citations: OpenRouterCitation[]): string {
  return JSON.stringify(
    citations.map((citation) => ({
      url: citation.url,
      title: citation.title,
      content: citation.content.slice(0, 3_000),
    })),
  ).slice(0, 45_000);
}

export async function requestValidatedRecommendations<T>(options: {
  systemPrompt: string;
  repairSystemPrompt?: string;
  userPrompt: string;
  validate: (value: unknown, citations: OpenRouterCitation[]) => T;
  isComplete?: (value: T) => boolean;
  describeIncomplete?: (value: T) => string;
  selectPreferred?: (original: T, repair: T) => T;
  createEmpty?: () => T;
}): Promise<ValidatedOpenRouterResult<T>> {
  const original = await callOpenRouter(
    options.systemPrompt,
    options.userPrompt,
    true,
  );

  let originalData: T | undefined;
  let validationReason = "unknown validation error";
  try {
    originalData = options.validate(parseJson(original.text), original.citations);
    const complete = options.isComplete?.(originalData) ?? true;
    if (complete) {
      return {
        data: originalData,
        citations: original.citations,
        model: original.model,
        repaired: false,
        complete: true,
      };
    }
    validationReason = options.describeIncomplete?.(originalData)
      ?? "the response did not contain enough verified recommendations";
  } catch (error) {
    validationReason = error instanceof Error ? error.message : "unknown validation error";
  }

  console.warn(
    "OpenRouter recommendation validation failed before repair:",
    validationReason,
    `(citations: ${original.citations.length})`,
  );

  let repair: RawCompletion;
  try {
    // Exactly one repair is allowed. It deliberately has no tools, so it
    // cannot search again or introduce a second set of unreviewed citations.
    repair = await callOpenRouter(
      [
        options.repairSystemPrompt ?? options.systemPrompt,
        "This is a correction pass. No web-search tool is available: do not call, simulate, or request another search.",
        "The previous answer failed the JSON or evidence contract.",
        "Return only corrected JSON containing one to ten candidate works, ordered by evidence quality.",
        "You may add, remove, or replace a work only when its title, release year, exact content rating, and every URL are explicitly evidenced by the supplied citation excerpts.",
        "Do not invent a work, fact, rating, or URL, and do not use knowledge outside the supplied citations.",
      ].join("\n"),
      [
        `Original request: ${options.userPrompt}`,
        `Validation failure: ${validationReason.slice(0, 2_000)}`,
        `Original answer: ${original.text.slice(0, 16_000)}`,
        `Allowed citations: ${repairCitationContext(original.citations)}`,
      ].join("\n\n"),
      false,
    );
  } catch (error) {
    if (originalData !== undefined) {
      return {
        data: originalData,
        citations: original.citations,
        model: original.model,
        repaired: false,
        complete: false,
      };
    }
    if (options.createEmpty && original.citations.length > 0) {
      return {
        data: options.createEmpty(),
        citations: original.citations,
        model: original.model,
        repaired: false,
        complete: false,
      };
    }
    throw error;
  }

  try {
    const repairData = options.validate(parseJson(repair.text), original.citations);
    const selected = originalData !== undefined && options.selectPreferred
      ? options.selectPreferred(originalData, repairData)
      : repairData;
    const complete = options.isComplete?.(selected) ?? true;
    return {
      data: selected,
      citations: original.citations,
      model: repair.model,
      repaired: true,
      complete,
    };
  } catch (error) {
    console.warn(
      "OpenRouter recommendation repair validation failed:",
      error instanceof Error ? error.message : "unknown validation error",
      `(citations: ${original.citations.length})`,
    );
    if (originalData !== undefined) {
      return {
        data: originalData,
        citations: original.citations,
        model: original.model,
        repaired: false,
        complete: false,
      };
    }
    if (options.createEmpty && original.citations.length > 0) {
      return {
        data: options.createEmpty(),
        citations: original.citations,
        model: original.model,
        repaired: true,
        complete: false,
      };
    }
    throw new OpenRouterRequestError(
      "RECOMMENDATIONS_UNVERIFIED",
      "검색 응답의 작품 정보를 검증할 수 없습니다.",
      502,
      true,
    );
  }
}
