import { logger } from '../utils/logger.js';
import { parseResponseBody, createGitHubError } from '../utils/helpers.js';
import { GitHubCLIAuth } from '../auth/github-cli-auth.js';
const GITHUB_API_BASE = 'https://api.github.com';
const AI_COMMENT_IDENTIFIER = '[AI] Generated using MCP\n\n';
const USER_AGENT = 'mcp-gh-issue-mini/1.1.1';
export class GitHubAPI {
    token = null;
    authMethod = null;
    async initialize() {
        logger.debug('Initializing GitHub API client');
        // 1. Personal Access Token を試行
        this.token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN || null;
        if (this.token) {
            this.authMethod = 'PAT';
            logger.info('GitHub API authenticated using Personal Access Token');
            return;
        }
        // 2. GitHub CLI フォールバック
        logger.debug('PAT not found, attempting GitHub CLI authentication');
        const cliAuth = await GitHubCLIAuth.getToken();
        if (cliAuth && cliAuth.authenticated) {
            this.token = cliAuth.token;
            this.authMethod = 'GitHub CLI';
            logger.info('GitHub API authenticated using GitHub CLI');
            return;
        }
        // 3. 認証失敗
        throw new Error(`GitHub authentication failed: 
- GITHUB_PERSONAL_ACCESS_TOKEN が未設定です
- GitHub CLI認証も利用できません (gh auth login を実行してください)`);
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
        logger.debug(`Making request: ${options.method || 'GET'} ${fullUrl} using ${this.authMethod}`);
        const response = await fetch(fullUrl, {
            method: options.method || 'GET',
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined,
        });
        const body = await parseResponseBody(response);
        if (!response.ok) {
            // 401エラー（認証失敗）の場合、GitHub CLI認証へのフォールバックを試行
            if (response.status === 401 && this.authMethod === 'PAT') {
                logger.warn('PAT authentication failed (401), attempting GitHub CLI fallback');
                try {
                    const cliAuth = await GitHubCLIAuth.getToken();
                    if (cliAuth && cliAuth.authenticated) {
                        this.token = cliAuth.token;
                        this.authMethod = 'GitHub CLI';
                        logger.info('Successfully switched to GitHub CLI authentication');
                        // GitHub CLI認証で再試行
                        const retryHeaders = { ...headers, Authorization: `Bearer ${this.token}` };
                        const retryResponse = await fetch(fullUrl, {
                            method: options.method || 'GET',
                            headers: retryHeaders,
                            body: options.body ? JSON.stringify(options.body) : undefined,
                        });
                        const retryBody = await parseResponseBody(retryResponse);
                        if (!retryResponse.ok) {
                            logger.debug(`GitHub CLI retry also failed: ${retryResponse.status}`, retryBody);
                            throw createGitHubError(retryResponse.status, retryBody);
                        }
                        logger.debug(`GitHub CLI retry successful: ${retryResponse.status}`);
                        return retryBody;
                    }
                }
                catch (fallbackError) {
                    logger.error('GitHub CLI fallback failed:', fallbackError);
                }
            }
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
            method: this.authMethod || undefined
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
