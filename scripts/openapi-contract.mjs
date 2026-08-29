export const DEFAULT_OPENAPI_URL = 'https://api.automaktab.uz/api/openapi.json';

const isRecord = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function resolveOpenApiUrl(env = process.env) {
  const value = env.OPENAPI_URL?.trim() || DEFAULT_OPENAPI_URL;
  let url;

  try {
    url = new URL(value);
  } catch {
    throw new Error('OPENAPI_URL must be a valid absolute URL.');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('OPENAPI_URL must use http or https.');
  }

  if (env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new Error('OPENAPI_URL must use https in production.');
  }

  return url.toString();
}

export function buildOpenApiHeaders(env = process.env) {
  const headers = { accept: 'application/json' };
  const token = env.OPENAPI_TOKEN?.trim();

  if (token) {
    headers.authorization = token.startsWith('Bearer ')
      ? token
      : `Bearer ${token}`;
    return headers;
  }

  const username = env.OPENAPI_USERNAME?.trim();
  const password = env.OPENAPI_PASSWORD;
  if (username && password) {
    headers.authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    return headers;
  }

  throw new Error(
    'Set OPENAPI_TOKEN or both OPENAPI_USERNAME and OPENAPI_PASSWORD.',
  );
}

export function assertOpenApiDocument(value) {
  if (!isRecord(value)) {
    throw new Error('OpenAPI endpoint returned a non-object JSON value.');
  }

  if (
    typeof value.openapi !== 'string' ||
    !/^3\.\d+\.\d+$/.test(value.openapi)
  ) {
    throw new Error('OpenAPI endpoint must return an OpenAPI 3 document.');
  }

  if (
    !isRecord(value.info) ||
    typeof value.info.title !== 'string' ||
    typeof value.info.version !== 'string'
  ) {
    throw new Error(
      'OpenAPI document must include info.title and info.version.',
    );
  }

  if (!isRecord(value.paths)) {
    throw new Error('OpenAPI document must include a paths object.');
  }

  return value;
}
