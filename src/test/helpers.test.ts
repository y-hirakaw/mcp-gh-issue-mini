import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseResponseBody, createGitHubError, isTokenValid } from '../utils/helpers.js';

describe('Helper Functions', () => {
  describe('parseResponseBody', () => {
    it('should parse JSON response correctly', async () => {
      const mockResponse = {
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null
        },
        json: () => Promise.resolve({ test: 'data' }),
        text: () => Promise.resolve('{"test":"data"}')
      } as unknown as Response;

      const result = await parseResponseBody(mockResponse);
      assert.deepStrictEqual(result, { test: 'data' });
    });

    it('should parse text response correctly', async () => {
      const mockResponse = {
        headers: {
          get: (name: string) => name === 'content-type' ? 'text/plain' : null
        },
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('plain text response')
      } as unknown as Response;

      const result = await parseResponseBody(mockResponse);
      assert.strictEqual(result, 'plain text response');
    });

    it('should handle missing content-type header', async () => {
      const mockResponse = {
        headers: {
          get: () => null
        },
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('fallback text')
      } as unknown as Response;

      const result = await parseResponseBody(mockResponse);
      assert.strictEqual(result, 'fallback text');
    });
  });

  describe('createGitHubError', () => {
    it('should create error with string body', () => {
      const error = createGitHubError(404, 'Not Found');
      assert.strictEqual(error.message, 'GitHub API error! Status: 404. Message: Not Found');
    });

    it('should create error with object body', () => {
      const errorBody = { message: 'Repository not found', documentation_url: 'https://docs.github.com' };
      const error = createGitHubError(404, errorBody);
      assert(error.message.includes('Status: 404'));
      assert(error.message.includes('Repository not found'));
    });
  });

  describe('isTokenValid', () => {
    it('should validate GitHub token format', () => {
      assert.strictEqual(isTokenValid('ghp_1234567890abcdef'), true);
      assert.strictEqual(isTokenValid('gho_1234567890abcdef'), true);
      assert.strictEqual(isTokenValid('ghu_1234567890abcdef'), true);
      assert.strictEqual(isTokenValid('ghs_1234567890abcdef'), true);
      assert.strictEqual(isTokenValid('ghr_1234567890abcdef'), true);
    });

    it('should reject invalid token formats', () => {
      assert.strictEqual(isTokenValid(''), false);
      assert.strictEqual(isTokenValid('invalid'), false);
      assert.strictEqual(isTokenValid('bearer_token'), false);
      assert.strictEqual(isTokenValid('gh_short'), false);
    });

    it('should handle edge cases', () => {
      assert.strictEqual(isTokenValid('gh_'), false); // 3 chars - fails on prefix
      assert.strictEqual(isTokenValid('ghp_'), false); // 4 chars - fails on length  
      assert.strictEqual(isTokenValid('ghp_123456'), false); // 10 chars - fails on >10 condition
      assert.strictEqual(isTokenValid('ghp_1234567'), true); // 11 chars - passes all conditions
      assert.strictEqual(isTokenValid('ghp_123456789'), true); // 13 chars - passes
      assert.strictEqual(isTokenValid('ghp_1234567890123456789012345678901234567890'), true); // long token
    });
  });
});