import {parseRecommendationRequest, RequestValidationError} from "@/lib/recommendation-contracts";
import {getRecommendations} from "@/lib/works-catalog";

function errorResponse(code: string, message: string, status: number): Response {
  return Response.json(
    {error: {code, message, retryable: false}},
    {status, headers: {"Cache-Control": "no-store"}},
  );
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_JSON", "요청 JSON을 읽을 수 없습니다.", 400);
  }

  try {
    const result = getRecommendations(parseRecommendationRequest(body));
    return Response.json(result, {headers: {"Cache-Control": "no-store"}});
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return errorResponse("INVALID_REQUEST", error.message, 400);
    }
    console.error("Offline recommendation catalog failed", error instanceof Error ? error.message : "unknown error");
    return errorResponse(
      "CATALOG_INTEGRITY_ERROR",
      "추천 카탈로그를 확인하지 못했습니다.",
      503,
    );
  }
}
