import {ConfigurationError, createWatchmodeClient} from "./watchmode";

type Client = ReturnType<typeof createWatchmodeClient>;
type WatchmodeGlobal = typeof globalThis & {__WATCHMODE_API_KEY__?: string};

let runtimeClient: Client | null = null;
let runtimeKey = "";

export function getRuntimeWatchmodeClient(): Client {
  const workerKey = (globalThis as WatchmodeGlobal).__WATCHMODE_API_KEY__?.trim() ?? "";
  const apiKey = workerKey || process.env.WATCHMODE_API_KEY?.trim() || process.env["4_WATCHMODE_API_KEY"]?.trim() || "";
  if (!apiKey) throw new ConfigurationError("WATCHMODE_API_KEY가 설정되지 않았습니다.");
  if (!runtimeClient || runtimeKey !== apiKey) {
    runtimeKey = apiKey;
    runtimeClient = createWatchmodeClient({apiKey});
  }
  return runtimeClient;
}
