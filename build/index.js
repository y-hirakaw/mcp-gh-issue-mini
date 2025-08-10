#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { GitHubAPI } from './api/github-api.js';
import { logger, enableDebugLogging } from './utils/logger.js';
// Enable debug logging if environment variable is set
if (process.env.DEBUG_MCP_GH_ISSUE) {
    enableDebugLogging();
}
/* ------------------------------------------------------------------ */
/*  MCP Server                                                        */
/* ------------------------------------------------------------------ */
const server = new McpServer({
    name: "mcp-gh-issue-mini",
    version: "1.1.1",
    capabilities: { resources: {}, tools: {} },
});
// Initialize GitHub API client
const githubAPI = new GitHubAPI();
/* ------------------------------------------------------------------ */
/*  Tools                                                             */
/* ------------------------------------------------------------------ */
/* ---------- 1. create_issue ---------- */
server.tool("create_issue", "Create a new issue in a GitHub repository（GitHub リポジトリで新しい Issue を作成する）", {
    owner: z.string(),
    repo: z.string(),
    title: z.string(),
    body: z.string().optional(),
}, async ({ owner, repo, title, body = "" }) => {
    try {
        const issue = await githubAPI.createIssue(owner, repo, title, body);
        return {
            content: [{ type: "text", text: `Issue created! #${issue.number}: ${issue.title}\nURL: ${issue.html_url}` }],
        };
    }
    catch (error) {
        logger.error('Failed to create issue:', error);
        return {
            content: [{ type: "text", text: `Error creating issue: ${error instanceof Error ? error.message : 'Unknown error'}` }],
        };
    }
});
/* ---------- 2. list_open_issues ---------- */
server.tool("list_open_issues", "List open issues in a GitHub repository（未クローズの Issue を一覧表示する）", {
    owner: z.string(),
    repo: z.string(),
    limit: z.number().optional(),
}, async ({ owner, repo, limit = 10 }) => {
    try {
        const issues = await githubAPI.listOpenIssues(owner, repo, limit);
        if (issues.length === 0) {
            return { content: [{ type: "text", text: "No open issues 🎉" }] };
        }
        const formatted = issues
            .map((issue) => `#${issue.number}: ${issue.title}\n` +
            `By: ${issue.user.login} | ${new Date(issue.created_at).toLocaleString()}\n` +
            `URL: ${issue.html_url}\n---`)
            .join("\n");
        return { content: [{ type: "text", text: formatted }] };
    }
    catch (error) {
        logger.error('Failed to list open issues:', error);
        return {
            content: [{ type: "text", text: `Error listing issues: ${error instanceof Error ? error.message : 'Unknown error'}` }],
        };
    }
});
/* ---------- 3. add_issue_comment ---------- */
server.tool("add_issue_comment", "Add a comment to a GitHub issue（Issue にコメントを追加する）", {
    owner: z.string(),
    repo: z.string(),
    issue_number: z.number(),
    body: z.string(),
}, async ({ owner, repo, issue_number, body }) => {
    try {
        const comment = await githubAPI.addIssueComment(owner, repo, issue_number, body);
        return {
            content: [{ type: "text", text: `Comment added to issue #${issue_number}\nURL: ${comment.html_url}` }],
        };
    }
    catch (error) {
        logger.error('Failed to add comment:', error);
        return {
            content: [{ type: "text", text: `Error adding comment: ${error instanceof Error ? error.message : 'Unknown error'}` }],
        };
    }
});
/* ---------- 4. get_issue_comments ---------- */
server.tool("get_issue_comments", "Get comments from a GitHub issue（Issue のコメントを取得する）", {
    owner: z.string(),
    repo: z.string(),
    issue_number: z.number(),
}, async ({ owner, repo, issue_number }) => {
    try {
        const comments = await githubAPI.getIssueComments(owner, repo, issue_number);
        if (comments.length === 0) {
            return { content: [{ type: "text", text: `No comments on issue #${issue_number}` }] };
        }
        const formatted = comments
            .map((comment) => `By: ${comment.user.login} at ${new Date(comment.created_at).toLocaleString()}\n${comment.body}\nURL: ${comment.html_url}\n---`)
            .join("\n");
        return { content: [{ type: "text", text: formatted }] };
    }
    catch (error) {
        logger.error('Failed to get comments:', error);
        return {
            content: [{ type: "text", text: `Error getting comments: ${error instanceof Error ? error.message : 'Unknown error'}` }],
        };
    }
});
/* ---------- 5. close_issue ---------- */
server.tool("close_issue", "Close a GitHub issue（Issue をクローズする）", {
    owner: z.string(),
    repo: z.string(),
    issue_number: z.number(),
}, async ({ owner, repo, issue_number }) => {
    try {
        const issue = await githubAPI.closeIssue(owner, repo, issue_number);
        return { content: [{ type: "text", text: `Issue #${issue.number} closed. URL: ${issue.html_url}` }] };
    }
    catch (error) {
        logger.error('Failed to close issue:', error);
        return {
            content: [{ type: "text", text: `Error closing issue: ${error instanceof Error ? error.message : 'Unknown error'}` }],
        };
    }
});
/* ---------- 6. update_issue ---------- */
server.tool("update_issue", "Update an existing GitHub issue（Issue を更新する）", {
    owner: z.string(),
    repo: z.string(),
    issue_number: z.number(),
    title: z.string().optional().describe("New title"),
    body: z.string().optional().describe("New body (markdown)"),
    state: z.enum(["open", "closed"]).optional(),
}, async ({ owner, repo, issue_number, title, body, state }) => {
    if (!title && !body && !state) {
        return { content: [{ type: "text", text: "Nothing to update. Specify at least one field." }] };
    }
    try {
        const updates = {};
        if (title)
            updates.title = title;
        if (body)
            updates.body = body;
        if (state)
            updates.state = state;
        const issue = await githubAPI.updateIssue(owner, repo, issue_number, updates);
        return {
            content: [
                {
                    type: "text",
                    text: `Issue #${issue.number} updated.\nTitle: ${issue.title}\nState: ${issue.state}\nURL: ${issue.html_url}`,
                },
            ],
        };
    }
    catch (error) {
        logger.error('Failed to update issue:', error);
        return {
            content: [{ type: "text", text: `Error updating issue: ${error instanceof Error ? error.message : 'Unknown error'}` }],
        };
    }
});
/* ---------- 7. get_issue ---------- */
server.tool("get_issue", "Get details of a GitHub issue（Issue の詳細を取得する）", {
    owner: z.string(),
    repo: z.string(),
    issue_number: z.number(),
}, async ({ owner, repo, issue_number }) => {
    try {
        const issue = await githubAPI.getIssue(owner, repo, issue_number);
        const labels = issue.labels?.map((l) => l.name).join(", ") ?? "(none)";
        const text = `#${issue.number}: ${issue.title}\n` +
            `State: ${issue.state}\n` +
            `Author: ${issue.user.login}\n` +
            `Created: ${new Date(issue.created_at).toLocaleString()}\n` +
            `Updated: ${new Date(issue.updated_at).toLocaleString()}\n` +
            `Labels: ${labels}\n\n` +
            `${issue.body ?? ""}\n\nURL: ${issue.html_url}`;
        return { content: [{ type: "text", text }] };
    }
    catch (error) {
        logger.error('Failed to get issue:', error);
        return {
            content: [{ type: "text", text: `Error getting issue: ${error instanceof Error ? error.message : 'Unknown error'}` }],
        };
    }
});
/* ---------- 8. search_issues ---------- */
server.tool("search_issues", "Search issues in a repository（リポジトリ内の Issue を検索する）", {
    owner: z.string(),
    repo: z.string(),
    query: z.string().describe("Search keywords (GitHub search syntax)"),
    limit: z.number().optional(),
}, async ({ owner, repo, query, limit = 10 }) => {
    try {
        const issues = await githubAPI.searchIssues(owner, repo, query, limit);
        if (issues.length === 0) {
            return { content: [{ type: "text", text: "No issues matched your query." }] };
        }
        const formatted = issues
            .map((issue) => `#${issue.number}: ${issue.title}\n` +
            `State: ${issue.state} | By: ${issue.user.login}\n` +
            `URL: ${issue.html_url}\n---`)
            .join("\n");
        return { content: [{ type: "text", text: formatted }] };
    }
    catch (error) {
        logger.error('Failed to search issues:', error);
        return {
            content: [{ type: "text", text: `Error searching issues: ${error instanceof Error ? error.message : 'Unknown error'}` }],
        };
    }
});
/* ------------------------------------------------------------------ */
/*  Main                                                              */
/* ------------------------------------------------------------------ */
async function main() {
    try {
        logger.info('Initializing GitHub Issue MCP Server...');
        // Initialize GitHub API authentication
        await githubAPI.initialize();
        // Log authentication status
        const authStatus = githubAPI.getAuthStatus();
        logger.info(`Authentication successful: ${authStatus.method}`);
        const transport = new StdioServerTransport();
        await server.connect(transport);
        logger.info("GitHub Issue MCP Server running on stdio");
    }
    catch (error) {
        logger.error('Failed to initialize server:', error);
        process.exit(1);
    }
}
main().catch((err) => {
    logger.error("Fatal error in main():", err);
    process.exit(1);
});
