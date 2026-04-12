# MCP AWS Cost Explorer

[![npm version](https://img.shields.io/npm/v/mcp-aws-cost-explorer.svg)](https://www.npmjs.com/package/mcp-aws-cost-explorer)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Release](https://github.com/berkayildi/mcp-aws-cost-explorer/actions/workflows/release.yml/badge.svg)](https://github.com/berkayildi/mcp-aws-cost-explorer/actions/workflows/release.yml)

A Model Context Protocol (MCP) server that gives AI agents secure, read-only access to AWS Cost Explorer.

## Why?

AWS cost management shouldn't require clicking through console dashboards. This MCP server turns Claude (or any MCP-compatible agent) into an autonomous cost analyst — it can query your spend, break it down by service or team, forecast next month's bill, detect anomalies, compare periods to explain what changed, and surface rightsizing opportunities to cut waste. Seven purpose-built tools cover the full cost intelligence lifecycle, all through natural language. This is the most comprehensive AWS cost MCP server available.

## Features

| Tool | What It Does | AWS API |
|------|-------------|---------|
| `get_aws_cost_and_usage` | Daily/monthly cost time series for any date range | `GetCostAndUsage` |
| `get_cost_by_service` | Cost breakdown by AWS service, ranked by spend | `GetCostAndUsage` |
| `get_cost_by_tag` | Cost breakdown by any cost allocation tag (team, env, project) | `GetCostAndUsage` |
| `get_cost_forecast` | ML-based spend prediction with 80% confidence interval | `GetCostForecast` |
| `get_cost_anomalies` | Unexpected spend spikes with root cause analysis | `GetAnomalies` |
| `get_cost_comparison` | Period-over-period comparison sorted by biggest movers | `GetCostAndUsage` |
| `get_rightsizing_recommendations` | EC2 rightsizing suggestions with estimated monthly savings | `GetRightsizingRecommendation` |

## Quickstart

### Prerequisites

- Node.js >= 18
- AWS CLI configured with active credentials (`~/.aws/credentials` or AWS SSO)

### Installation

```bash
git clone https://github.com/berkayildi/mcp-aws-cost-explorer.git
cd mcp-aws-cost-explorer
make install
make build
```

Or install from npm:

```bash
npm install -g mcp-aws-cost-explorer
```

### Claude Desktop Integration

Locate your Claude Desktop configuration file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add the following configuration:

> **Important:** GUI applications like Claude Desktop often do not inherit your terminal's `$PATH`. Use the absolute path to your Node executable, which you can find by running `which node` (Mac/Linux) or `where node` (Windows).

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

## Available Tools

Here's what you can ask Claude and which tool handles it:

### "What am I spending on AWS this month?"
**Tool:** `get_aws_cost_and_usage`

Returns a daily or monthly cost time series with totals. Provide a start date, end date, and optionally a granularity (DAILY or MONTHLY).

### "Which services cost the most?"
**Tool:** `get_cost_by_service`

Breaks down costs by AWS service (EC2, S3, Lambda, RDS, etc.), sorted highest to lowest with percentage of total.

### "How much does each team spend?" / "What's the cost per environment?"
**Tool:** `get_cost_by_tag` with `tag_key: "Team"` or `tag_key: "Environment"`

Groups costs by any activated cost allocation tag. Works with Team, Environment, Project, or any custom tag. Untagged resources are labelled as `(untagged)`.

> Note: Cost allocation tags must be activated in the AWS Billing console to appear in Cost Explorer data.

### "What will I spend next month?"
**Tool:** `get_cost_forecast`

Uses AWS's ML-based predictions to forecast spend for the next N days (default 30). Returns total predicted spend with 80% confidence interval and period-by-period breakdown.

### "Why did my bill spike?" / "Are there any unusual charges?"
**Tool:** `get_cost_anomalies` + `get_cost_comparison`

`get_cost_anomalies` retrieves anomalies detected by AWS Cost Anomaly Detection with root cause analysis — which service, region, or account caused the spike, plus expected vs actual spend.

`get_cost_comparison` compares two time periods (defaults to this month vs last month) and identifies which services drove the biggest changes, sorted by absolute impact.

> Note: Anomaly detection requires Cost Anomaly Detection monitors configured in the AWS console.

### "How can I reduce costs?" / "Are any instances over-provisioned?"
**Tool:** `get_rightsizing_recommendations`

Returns EC2 rightsizing recommendations: which instances to downsize or terminate, what instance type to switch to, and estimated monthly savings. Sorted by savings potential.

## Required IAM Permissions

Attach this minimum policy to the IAM user or role used by the MCP server:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ce:GetCostAndUsage",
        "ce:GetCostForecast",
        "ce:GetAnomalies",
        "ce:GetRightsizingRecommendation"
      ],
      "Resource": "*"
    }
  ]
}
```

All operations are read-only. No write permissions are required.

## Commands

Use the provided `Makefile` for local development:

| Command | Description |
|---------|-------------|
| `make install` | Install dependencies |
| `make build` | Compile TypeScript |
| `make dev` | Run compiler in watch mode |
| `make test` | Run test suite |
| `make test-coverage` | Run tests with coverage report |
| `make clean` | Remove dist, node_modules, coverage |

## Troubleshooting

**"Server disconnected" in Claude Desktop**

Claude cannot locate your Node.js runtime.

1. Run `which node` in your terminal.
2. Copy the full path (e.g., `/Users/username/.nvm/versions/node/v20.x.x/bin/node`).
3. Replace `"node"` in the `"command"` field of `claude_desktop_config.json` with this absolute path.
4. Fully restart Claude Desktop.

**"Authentication error / invalid security token"**

Your host machine lacks an active AWS session. Run your standard AWS login command (e.g., `aws sso login`) and try again.

**"No Cost Anomaly Detection monitors are configured"**

The `get_cost_anomalies` tool requires anomaly monitors. Set them up in the AWS Cost Management console under Cost Anomaly Detection.

**"Rightsizing recommendations are not enabled"**

Opt in to rightsizing recommendations in the AWS Cost Explorer console settings.

**Forecast returns "not enough historical data"**

AWS needs at least 30 days of billing history to generate forecasts. This is expected for new accounts.

## Contributing

Automated versioning and changelog generation are handled by Google's Release Please action following [Conventional Commits](https://www.conventionalcommits.org/) format (`feat:`, `fix:`, `chore:`).
