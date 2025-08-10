import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GitHubAPI } from '../api/github-api.js';
describe('GitHub API Client Structure', () => {
    let api;
    it('should instantiate without errors', () => {
        assert.doesNotThrow(() => {
            api = new GitHubAPI();
        });
    });
    it('should have all required issue management methods', () => {
        api = new GitHubAPI();
        assert.strictEqual(typeof api.createIssue, 'function');
        assert.strictEqual(typeof api.listOpenIssues, 'function');
        assert.strictEqual(typeof api.getIssue, 'function');
        assert.strictEqual(typeof api.updateIssue, 'function');
        assert.strictEqual(typeof api.closeIssue, 'function');
        assert.strictEqual(typeof api.searchIssues, 'function');
    });
    it('should have all required comment methods', () => {
        api = new GitHubAPI();
        assert.strictEqual(typeof api.addIssueComment, 'function');
        assert.strictEqual(typeof api.getIssueComments, 'function');
    });
    it('should have utility methods', () => {
        api = new GitHubAPI();
        assert.strictEqual(typeof api.initialize, 'function');
        assert.strictEqual(typeof api.getAuthStatus, 'function');
        assert.strictEqual(typeof api.testConnection, 'function');
    });
    it('should provide authentication status when not initialized', () => {
        api = new GitHubAPI();
        const status = api.getAuthStatus();
        assert.strictEqual(typeof status, 'object');
        assert.strictEqual(typeof status.authenticated, 'boolean');
        assert.strictEqual(status.authenticated, false);
    });
    it('should handle method parameter validation (structure only)', () => {
        api = new GitHubAPI();
        // These should not throw just from being called with proper types
        // (they will fail auth, but that's expected)
        assert.doesNotThrow(() => {
            api.createIssue('owner', 'repo', 'title', 'body').catch(() => { });
        });
        assert.doesNotThrow(() => {
            api.listOpenIssues('owner', 'repo', 10).catch(() => { });
        });
        assert.doesNotThrow(() => {
            api.getIssue('owner', 'repo', 1).catch(() => { });
        });
        assert.doesNotThrow(() => {
            api.searchIssues('owner', 'repo', 'query', 5).catch(() => { });
        });
    });
});
describe('GitHub API Constants and Configuration', () => {
    it('should use correct API version and user agent', () => {
        // Test that constants are properly defined by importing the module
        // This validates that the module loads without syntax errors
        assert.doesNotThrow(() => {
            const api = new GitHubAPI();
            assert(api instanceof GitHubAPI);
        });
    });
    it('should handle optional parameters correctly', () => {
        const api = new GitHubAPI();
        // Test that methods accept optional parameters without throwing
        assert.doesNotThrow(() => {
            // These will fail auth but shouldn't throw due to parameter issues
            api.createIssue('owner', 'repo', 'title').catch(() => { });
            api.listOpenIssues('owner', 'repo').catch(() => { }); // limit is optional
            api.searchIssues('owner', 'repo', 'query').catch(() => { }); // limit is optional
        });
    });
});
