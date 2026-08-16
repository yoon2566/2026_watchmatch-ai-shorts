import {toApiErrorResponse} from "@/lib/api-response";
import {getRuntimeWatchmodeClient} from "@/lib/runtime-watchmode";
import {parseRecommendationRequest} from "@/lib/watchmode";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      {error: {code: "INVALID_JSON", message: "요청 JSON을 읽을 수 없습니다."}},
      {status: 400, headers: {"Cache-Control": "no-store"}},
    );
  }

  try {
    const result = await getRuntimeWatchmodeClient().getRecommendations(parseRecommendationRequest(body));
    return Response.json(result, {headers: {"Cache-Control": "no-store"}});
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
