# mcp-gh-issue-mini

A minimal MCP (Model Context Protocol) server for interacting with **GitHub Issues**.

With this server you can create, search, update, comment on, and close issues in any repository—directly from an MCP-compatible client such as Copilot Agent.

## ✨ Features

- **Create** a new issue in a GitHub repository
- **List** open issues
- **Get** detailed information for a single issue
- **Search** issues with full GitHub search-query syntax  
  *e.g.* `is:open label:bug "unexpected error"`
- **Update** an issue  
  - Change title, body, or open/closed state
- **Add comments** to an issue  
  - All comments are automatically prefixed with **`[AI] Generated using MCP`** for traceability
- **Retrieve** all comments from an issue
- **Close** an issue

## 🛠️ Setup

This tool runs locally as an MCP server that your editor (VS Code, JetBrains, etc.) can talk to.

### Requirements

- **Node.js ≥ 18** (ES2022 modules)
- An MCP-capable client  
  - *Example:* GitHub Copilot Agent VS Code extension

### Configure in `settings.json`

```jsonc
// .vscode/settings.json (sample)
"mcp": {
  "servers": {
    "mcp-gh-issue-mini": {
      "command": "npx",
      "args": ["mcp-gh-issue-mini"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${env:GITHUB_PERSONAL_ACCESS_TOKEN}"
      }
    }
  }
}
```

## 🔐 Token Permissions

When you create a **Fine-grained Personal Access Token**, grant these minimum scopes for the repositories you’ll manage:

| Permission group | Access level      |
|------------------|-------------------|
| **Issues**       | **Read & Write**  |
| Metadata (implicit) | Read-only     |

> **Need more?**  
> If you later expand this server to handle pull requests or repository contents, add the corresponding **Pull requests** or **Contents** permissions.

---

## 🤔 Why?

This project delivers an intentionally minimal, easy-to-read MCP server that focuses solely on GitHub Issue workflows.  
Use it as a boilerplate, explore how the MCP server SDK works, or fork it to build your own custom tools.

---

## 🙏 Note

I’m still learning MCP best practices—bug reports, suggestions, and PRs are always welcome!