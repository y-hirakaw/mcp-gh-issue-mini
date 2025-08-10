import { logger } from '../utils/logger.js';
import { parseResponseBody, createGitHubError } from '../utils/helpers.js';
const GITHUB_API_BASE = 'https://api.github.com';
const AI_COMMENT_IDENTIFIER = '[AI] Generated using MCP\n\n';
const USER_AGENT = 'mcp-gh-issue-mini/1.1.1';
export class GitHubAPI {
    token = null;
    async initialize() {
        logger.debug('Initializing GitHub API client');
        this.token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN || null;
        if (!this.token) {
            throw new Error('GitHub authentication failed: GITHUB_PERSONAL_ACCESS_TOKEN が未設定です。');
        }
        logger.info('GitHub API authenticated using PAT');
    }
    async request(url, options = {}) {
        const fullUrl = url.startsWith('http') ? url : `${GITHUB_API_BASE}${url}`;
        const headers = {
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': USER_AGENT,
            'X-GitHub-Api-Version': '2022-11-28',
            ...options.headers,
        };
        if (this.token) {
            headers.Authorization = `Bearer ${this.token}`;
        }
        else {
            throw new Error('GitHub authentication required');
        }
        logger.debug(`Making request: ${options.method || 'GET'} ${fullUrl}`);
        const response = await fetch(fullUrl, {
            method: options.method || 'GET',
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined,
        });
        const body = await parseResponseBody(response);
        if (!response.ok) {
            logger.debug(`Request failed: ${response.status}`, body);
            throw createGitHubError(response.status, body);
        }
        logger.debug(`Request successful: ${response.status}`);
        return body;
    }
    // Issue Management Methods
    async createIssue(owner, repo, title, body) {
        logger.debug(`Creating issue in ${owner}/${repo}: ${title}`);
        return this.request(`/repos/${owner}/${repo}/issues`, {
            method: 'POST',
            body: { title, body: body || '' }
        });
    }
    async listOpenIssues(owner, repo, limit = 10) {
        logger.debug(`Listing ${limit} open issues in ${owner}/${repo}`);
        return this.request(`/repos/${owner}/${repo}/issues?state=open&per_page=${limit}`);
    }
    async getIssue(owner, repo, issueNumber) {
        logger.debug(`Getting issue #${issueNumber} from ${owner}/${repo}`);
        return this.request(`/repos/${owner}/${repo}/issues/${issueNumber}`);
    }
    async updateIssue(owner, repo, issueNumber, updates) {
        logger.debug(`Updating issue #${issueNumber} in ${owner}/${repo}`);
        return this.request(`/repos/${owner}/${repo}/issues/${issueNumber}`, {
            method: 'PATCH',
            body: updates
        });
    }
    async closeIssue(owner, repo, issueNumber) {
        logger.debug(`Closing issue #${issueNumber} in ${owner}/${repo}`);
        return this.updateIssue(owner, repo, issueNumber, { state: 'closed' });
    }
    async searchIssues(owner, repo, query, limit = 10) {
        logger.debug(`Searching issues in ${owner}/${repo} with query: ${query}`);
        const searchQuery = encodeURIComponent(`repo:${owner}/${repo} is:issue ${query}`);
        const response = await this.request(`/search/issues?q=${searchQuery}&per_page=${limit}`);
        return response.items;
    }
    // Comment Methods
    async addIssueComment(owner, repo, issueNumber, body) {
        logger.debug(`Adding comment to issue #${issueNumber} in ${owner}/${repo}`);
        return this.request(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
            method: 'POST',
            body: { body: AI_COMMENT_IDENTIFIER + body }
        });
    }
    async getIssueComments(owner, repo, issueNumber) {
        logger.debug(`Getting comments for issue #${issueNumber} in ${owner}/${repo}`);
        return this.request(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`);
    }
    // Utility Methods
    getAuthStatus() {
        return {
            authenticated: !!this.token,
            method: this.token ? 'PAT' : undefined
        };
    }
    async testConnection() {
        try {
            await this.request('/user');
            return true;
        }
        catch (error) {
            logger.error('Connection test failed:', error);
            return false;
        }
    }
}
