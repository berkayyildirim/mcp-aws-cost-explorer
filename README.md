# 💸 MCP AWS Cost Explorer

[![npm version](https://img.shields.io/npm/v/mcp-aws-cost-explorer.svg)](https://www.npmjs.com/package/mcp-aws-cost-explorer)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Release](https://github.com/berkayyildirim/mcp-aws-cost-explorer/actions/workflows/release.yml/badge.svg)](https://github.com/berkayyildirim/mcp-aws-cost-explorer/actions/workflows/release.yml)

A Model Context Protocol (MCP) server that gives AI agents secure, read-only access to your AWS Cost Explorer data.

**The UI Moat is Dead.** Built for the Agentic Era, this tool allows orchestration layers (like Claude Desktop or LangChain agents) to autonomously diagnose infrastructure spend anomalies using natural language, without ever touching the AWS Console.

## ⚡ Features

- **Zero-Trust AI:** Agents receive strictly scoped read-only access via local standard input/output (`stdio`).
- **FinOps Automation:** Instantly query daily and monthly Unblended Costs across your AWS organization.
- **Developer First:** Managed seamlessly via a standard `Makefile`.

## 🛠️ Quickstart

### Prerequisites

- Node.js >= 18
- AWS CLI configured with active credentials (`~/.aws/credentials` or AWS SSO)

### Installation

Clone the repository and build the binary:

```bash
git clone https://github.com/berkayyildirim/mcp-aws-cost-explorer.git
cd mcp-aws-cost-explorer
make install
make build
```

### Claude Desktop Integration

First, locate your Claude Desktop configuration file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add the following configuration to the file.

_(Note: GUI applications like Claude Desktop often do not inherit your terminal's `$PATH`. It is highly recommended to use the absolute path to your Node executable, which you can find by running `which node` (Mac/Linux) or `where node` (Windows) in your terminal)._

```json
{
  "mcpServers": {
    "aws-cost-explorer": {
      "command": "/ABSOLUTE/PATH/TO/node",
      "args": ["/absolute/path/to/mcp-aws-cost-explorer/dist/index.js"],
      "env": {
        "AWS_PROFILE": "default",
        "AWS_REGION": "us-east-1"
      }
    }
  }
}
```

## 🏗️ Commands

Use the provided `Makefile` for rapid local execution:

- `make install`: Install NPM dependencies.
- `make build`: Compile the TypeScript binary.
- `make dev`: Run the compiler in watch mode.

## 🐛 Troubleshooting

**Error: "Server disconnected" in Claude Desktop**
This occurs when Claude cannot locate your Node.js runtime.

1. Open your terminal and run `which node`.
2. Copy the output (e.g., `/Users/username/.nvm/versions/node/v20.x.x/bin/node`).
3. Replace `"node"` in the `"command"` field of your `claude_desktop_config.json` with this absolute path.
4. Fully restart Claude Desktop.

**Error: "Authentication error / invalid security token"**
This means the MCP server is working perfectly, but your host machine lacks an active AWS session. Run your standard AWS login command (e.g., `aws sso login`) in your terminal and try your prompt again.

## 🤝 Contributing

Automated versioning and changelog generation are handled natively by Google's Release Please action following Conventional Commits format (`feat:`, `fix:`, `chore:`).
