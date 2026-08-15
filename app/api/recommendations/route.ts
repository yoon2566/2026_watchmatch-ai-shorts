import {getCatalogRecommendations} from "@/lib/catalog-recommendations";
import {parseRecommendationRequest, RequestValidationError} from "@/lib/recommendation-contracts";

function errorResponse(code: string, message: string, status: number): Response {
  return Response.json({error: {code, message, retryable: false}}, {status, headers: {"Cache-Control": "no-store"}});
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_JSON", "요청 JSON을 읽을 수 없습니다.", 400);
  }
  try {
    const result = await getCatalogRecommendations(parseRecommendationRequest(body));
    return Response.json(result, {headers: {"Cache-Control": "no-store"}});
  } catch (error) {
    if (error instanceof RequestValidationError) return errorResponse("INVALID_REQUEST", error.message, 400);
    console.error("Netflix catalog recommendation failed", error instanceof Error ? error.message : "unknown error");
    return errorResponse("CATALOG_FAILED", "Netflix 검증 카탈로그를 읽지 못했습니다.", 500);
  }
}
