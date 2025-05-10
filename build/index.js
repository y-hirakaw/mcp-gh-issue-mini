#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
/* ------------------------------------------------------------------ */
/*  定数                                                              */
/* ------------------------------------------------------------------ */
const GITHUB_API_BASE = "https://api.github.com";
const USER_AGENT = "mcp-gh-issue-mini/1.1.0";
const AI_COMMENT_IDENTIFIER = "[AI] Generated using MCP\n\n";
/* ------------------------------------------------------------------ */
/*  MCP Server                                                        */
/* ------------------------------------------------------------------ */
const server = new McpServer({
    name: "mcp-gh-issue-mini",
    version: "1.1.0",
    capabilities: { resources: {}, tools: {} },
});
/* ------------------------------------------------------------------ */
/*  共通ヘルパ                                                        */
/* ------------------------------------------------------------------ */
async function parseResponseBody(res) {
    const ct = res.headers.get("content-type") ?? "";
    return ct.includes("application/json") ? res.json() : res.text();
}
function createGitHubError(status, body) {
    const msg = typeof body === "string" ? body : JSON.stringify(body);
    return new Error(`GitHub API error! Status: ${status}. Message: ${msg}`);
}
async function githubRequest(url, opts = {}) {
    const headers = {
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
        "X-GitHub-Api-Version": "2022-11-28",
        ...opts.headers,
    };
    if (process.env.GITHUB_PERSONAL_ACCESS_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_PERSONAL_ACCESS_TOKEN}`;
    }
    else {
        throw new Error("GITHUB_PERSONAL_ACCESS_TOKEN が未設定です。");
    }
    const res = await fetch(url, {
        method: opts.method ?? "GET",
        headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const body = await parseResponseBody(res);
    if (!res.ok)
        throw createGitHubError(res.status, body);
    return body;
}
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
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues`;
    const issue = await githubRequest(url, { method: "POST", body: { title, body } });
    return {
        content: [{ type: "text", text: `Issue created! #${issue.number}: ${issue.title}\nURL: ${issue.html_url}` }],
    };
});
/* ---------- 2. list_open_issues ---------- */
server.tool("list_open_issues", "List open issues in a GitHub repository（未クローズの Issue を一覧表示する）", {
    owner: z.string(),
    repo: z.string(),
    limit: z.number().optional(),
}, async ({ owner, repo, limit = 10 }) => {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues?state=open&per_page=${limit}`;
    const issues = await githubRequest(url);
    if (issues.length === 0)
        return { content: [{ type: "text", text: "No open issues 🎉" }] };
    const formatted = issues
        .map((is) => `#${is.number}: ${is.title}\n` +
        `By: ${is.user.login} | ${new Date(is.created_at).toLocaleString()}\n` +
        `URL: ${is.html_url}\n---`)
        .join("\n");
    return { content: [{ type: "text", text: formatted }] };
});
/* ---------- 3. add_issue_comment ---------- */
server.tool("add_issue_comment", "Add a comment to a GitHub issue（Issue にコメントを追加する）", {
    owner: z.string(),
    repo: z.string(),
    issue_number: z.number(),
    body: z.string(),
}, async ({ owner, repo, issue_number, body }) => {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${issue_number}/comments`;
    const c = await githubRequest(url, {
        method: "POST",
        body: { body: AI_COMMENT_IDENTIFIER + body },
    });
    return {
        content: [{ type: "text", text: `Comment added to issue #${issue_number}\nURL: ${c.html_url}` }],
    };
});
/* ---------- 4. get_issue_comments ---------- */
server.tool("get_issue_comments", "Get comments from a GitHub issue（Issue のコメントを取得する）", {
    owner: z.string(),
    repo: z.string(),
    issue_number: z.number(),
}, async ({ owner, repo, issue_number }) => {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${issue_number}/comments`;
    const comments = await githubRequest(url);
    if (comments.length === 0)
        return { content: [{ type: "text", text: `No comments on issue #${issue_number}` }] };
    const formatted = comments
        .map((c) => `By: ${c.user.login} at ${new Date(c.created_at).toLocaleString()}\n${c.body}\nURL: ${c.html_url}\n---`)
        .join("\n");
    return { content: [{ type: "text", text: formatted }] };
});
/* ---------- 5. close_issue ---------- */
server.tool("close_issue", "Close a GitHub issue（Issue をクローズする）", {
    owner: z.string(),
    repo: z.string(),
    issue_number: z.number(),
}, async ({ owner, repo, issue_number }) => {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${issue_number}`;
    const issue = await githubRequest(url, { method: "PATCH", body: { state: "closed" } });
    return { content: [{ type: "text", text: `Issue #${issue.number} closed. URL: ${issue.html_url}` }] };
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
    if (!title && !body && !state)
        return { content: [{ type: "text", text: "Nothing to update. Specify at least one field." }] };
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${issue_number}`;
    const payload = {};
    if (title)
        payload.title = title;
    if (body)
        payload.body = body;
    if (state)
        payload.state = state;
    const issue = await githubRequest(url, { method: "PATCH", body: payload });
    return {
        content: [
            {
                type: "text",
                text: `Issue #${issue.number} updated.\nTitle: ${issue.title}\nState: ${issue.state}\nURL: ${issue.html_url}`,
            },
        ],
    };
});
/* ---------- 7. get_issue ---------- */
server.tool("get_issue", "Get details of a GitHub issue（Issue の詳細を取得する）", {
    owner: z.string(),
    repo: z.string(),
    issue_number: z.number(),
}, async ({ owner, repo, issue_number }) => {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${issue_number}`;
    const issue = await githubRequest(url);
    const labels = issue.labels?.map((l) => l.name).join(", ") ?? "(none)";
    const text = `#${issue.number}: ${issue.title}\n` +
        `State: ${issue.state}\n` +
        `Author: ${issue.user.login}\n` +
        `Created: ${new Date(issue.created_at).toLocaleString()}\n` +
        `Updated: ${new Date(issue.updated_at).toLocaleString()}\n` +
        `Labels: ${labels}\n\n` +
        `${issue.body ?? ""}\n\nURL: ${issue.html_url}`;
    return { content: [{ type: "text", text }] };
});
/* ---------- 8. search_issues ---------- */
server.tool("search_issues", "Search issues in a repository（リポジトリ内の Issue を検索する）", {
    owner: z.string(),
    repo: z.string(),
    query: z.string().describe("Search keywords (GitHub search syntax)"),
    limit: z.number().optional(),
}, async ({ owner, repo, query, limit = 10 }) => {
    const searchQuery = encodeURIComponent(`repo:${owner}/${repo} is:issue ${query}`);
    const url = `${GITHUB_API_BASE}/search/issues?q=${searchQuery}&per_page=${limit}`;
    const res = await githubRequest(url);
    if (res.items.length === 0)
        return { content: [{ type: "text", text: "No issues matched your query." }] };
    const formatted = res.items
        .map((is) => `#${is.number}: ${is.title}\n` +
        `State: ${is.state} | By: ${is.user.login}\n` +
        `URL: ${is.html_url}\n---`)
        .join("\n");
    return { content: [{ type: "text", text: formatted }] };
});
/* ------------------------------------------------------------------ */
/*  Main                                                              */
/* ------------------------------------------------------------------ */
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("GitHub Issue MCP Server running on stdio");
}
main().catch((err) => {
    console.error("Fatal error in main():", err);
    process.exit(1);
});
