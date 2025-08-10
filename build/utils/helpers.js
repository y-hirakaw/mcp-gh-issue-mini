import { logger } from './logger.js';
export async function parseResponseBody(res) {
    const ct = res.headers.get('content-type') ?? '';
    try {
        return ct.includes('application/json') ? res.json() : res.text();
    }
    catch (error) {
        logger.error('Failed to parse response body', error);
        return res.text();
    }
}
export function createGitHubError(status, body) {
    const msg = typeof body === 'string' ? body : JSON.stringify(body);
    return new Error(`GitHub API error! Status: ${status}. Message: ${msg}`);
}
export function isTokenValid(token) {
    return Boolean(token && token.startsWith('gh') && token.length > 10);
}
