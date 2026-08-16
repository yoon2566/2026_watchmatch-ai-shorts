import {toApiErrorResponse} from "@/lib/api-response";
import {getRuntimeWatchmodeClient} from "@/lib/runtime-watchmode";

export async function GET(): Promise<Response> {
  try {
    return Response.json(await getRuntimeWatchmodeClient().getOptions(), {headers: {"Cache-Control": "no-store"}});
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
