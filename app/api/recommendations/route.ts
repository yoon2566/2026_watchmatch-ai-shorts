import {
  parseRecommendationRequest,
  RequestValidationError,
} from "@/lib/recommendation-contracts";
import {
  getLiveRecommendations,
} from "@/lib/live-recommendations";
import {OpenRouterRequestError} from "@/lib/openrouter-recommendations";

function errorResponse(
  code: string,
  message: string,
  status: number,
  retryable: boolean,
): Response {
  return Response.json(
    {error: {code, message, retryable}},
    {status, headers: {"Cache-Control": "no-store"}},
  );
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_JSON", "요청 JSON을 읽을 수 없습니다.", 400, false);
  }

  try {
    const input = parseRecommendationRequest(body);
    const result = await getLiveRecommendations(input);
    return Response.json(result, {headers: {"Cache-Control": "no-store"}});
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return errorResponse("INVALID_REQUEST", error.message, 400, false);
    }
    if (error instanceof OpenRouterRequestError) {
      return errorResponse(error.code, error.message, error.httpStatus, error.retryable);
    }
    return errorResponse(
      "RECOMMENDATION_FAILED",
      "실시간 작품 추천을 만들지 못했습니다.",
      500,
      true,
    );
  }
}
