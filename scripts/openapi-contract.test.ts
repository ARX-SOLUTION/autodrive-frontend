import {
  assertOpenApiDocument,
  buildOpenApiHeaders,
  DEFAULT_OPENAPI_URL,
  resolveOpenApiUrl,
} from './openapi-contract.mjs';

describe('OpenAPI contract configuration', () => {
  it('uses the production contract URL only as the default', () => {
    expect(resolveOpenApiUrl({})).toBe(DEFAULT_OPENAPI_URL);
  });

  it('rejects insecure production contract URLs', () => {
    expect(() =>
      resolveOpenApiUrl({
        NODE_ENV: 'production',
        OPENAPI_URL: 'http://localhost:3000/api/openapi.json',
      }),
    ).toThrow('https in production');
  });

  it('supports runtime bearer and basic authentication without logging secrets', () => {
    expect(
      buildOpenApiHeaders({ OPENAPI_TOKEN: 'token-value' }).authorization,
    ).toBe('Bearer token-value');
    expect(
      buildOpenApiHeaders({
        OPENAPI_USERNAME: 'contract-user',
        OPENAPI_PASSWORD: 'secret-value',
      }).authorization,
    ).toBe(
      `Basic ${Buffer.from('contract-user:secret-value').toString('base64')}`,
    );
  });

  it('fails before the network when no runtime credential is configured', () => {
    expect(() => buildOpenApiHeaders({})).toThrow(
      'OPENAPI_USERNAME and OPENAPI_PASSWORD',
    );
  });

  it('accepts only a complete OpenAPI 3 document', () => {
    expect(
      assertOpenApiDocument({
        openapi: '3.0.3',
        info: { title: 'Auto Drive API', version: '1.0.0' },
        paths: {},
      }),
    ).toMatchObject({ openapi: '3.0.3' });
    expect(() => assertOpenApiDocument({ openapi: '2.0' })).toThrow(
      'OpenAPI 3',
    );
  });
});
