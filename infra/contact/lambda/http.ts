import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

const BASE_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

/** CORS headers for an origin that already passed the allowlist check. */
export function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, idempotency-key',
    'Access-Control-Expose-Headers': 'Retry-After, Idempotent-Replay',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export function jsonResponse(
  statusCode: number,
  body: unknown,
  headers: Record<string, string> = {},
): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: { ...BASE_HEADERS, ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  };
}

export function emptyResponse(
  statusCode: number,
  headers: Record<string, string> = {},
): APIGatewayProxyStructuredResultV2 {
  return { statusCode, headers: { ...BASE_HEADERS, ...headers } };
}
