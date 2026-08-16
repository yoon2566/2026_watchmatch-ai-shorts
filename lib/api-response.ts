import {
  ConfigurationError,
  OptionUnavailableError,
  RequestValidationError,
  WatchmodeApiError,
} from "./watchmode";

function errorResponse(code: string, message: string, status: number): Response {
  return Response.json({error: {code, message}}, {status, headers: {"Cache-Control": "no-store"}});
}

export function toApiErrorResponse(error: unknown): Response {
  if (error instanceof RequestValidationError) return errorResponse("INVALID_REQUEST", error.message, 400);
  if (error instanceof ConfigurationError) return errorResponse("CONFIGURATION_ERROR", error.message, 503);
  if (error instanceof OptionUnavailableError) return errorResponse("OPTION_UNAVAILABLE", error.message, 503);
  if (error instanceof WatchmodeApiError) return errorResponse(error.code, error.message, error.responseStatus);
  console.error("Unexpected recommendation API error", error instanceof Error ? error.message : "unknown");
  return errorResponse("INTERNAL_ERROR", "검색 기능에서 예상하지 못한 오류가 발생했습니다.", 500);
}
