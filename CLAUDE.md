# CLAUDE.md

## Project Overview

MCP AWS Cost Explorer is a Model Context Protocol (MCP) server that gives AI agents secure, read-only access to AWS Cost Explorer. It exposes 7 tools covering cost analysis, forecasting, anomaly detection, period comparison, and rightsizing recommendations — all formatted as markdown for clean agent consumption. Built with TypeScript, it runs over stdio and integrates with Claude Desktop, LangChain, and any MCP-compatible orchestrator.

## Architecture

```
src/
  index.ts              Thin orchestrator: server setup, transport, dynamic tool registration
  types.ts              Shared interfaces: ToolDefinition, ToolResult
  client.ts             Singleton CostExplorerClient factory (AWS_REGION env var, us-east-1 fallback)
  tools/
    index.ts            Barrel export: array of all ToolDefinition objects
    get-cost-and-usage.ts
    get-cost-by-service.ts
    get-cost-by-tag.ts
    get-cost-forecast.ts
    get-cost-anomalies.ts
    get-cost-comparison.ts
    get-rightsizing-recommendations.ts
  utils/
    dates.ts            Date helpers: today, tomorrow, daysAgo, daysFromNow, startOfMonth, etc.
    validation.ts       Input validators: validateDateString, validateDateRange, validateEnum, validatePositiveInt
    formatting.ts       Output helpers: formatCurrency, formatPercentChange, buildMarkdownTable
    errors.ts           AwsCostExplorerError class with code, message, context fields
tests/
  __mocks__/aws-client.ts   Shared mock factory for CostExplorerClient
  utils/                    Unit tests for all utility modules
  tools/                    Integration tests for each tool handler + registration tests
```

**Key design decisions:**
- `src/index.ts` contains zero business logic — it imports the tools array and wires up ListTools/CallTool handlers dynamically
- Each tool file exports a `ToolDefinition` with a `definition` (JSON Schema) and `handler` (async function)
- Adding a new tool requires no changes to `src/index.ts` — just add the file and register in `src/tools/index.ts`
- Version is read dynamically from `package.json` at runtime

## Tools

| Tool | What it does | Inputs | AWS API |
|------|-------------|--------|---------|
| `get_aws_cost_and_usage` | Raw cost time series for a date range | `startDate` (string, required), `endDate` (string, required), `granularity` (DAILY\|MONTHLY, default DAILY) | `GetCostAndUsage` |
| `get_cost_by_service` | Cost breakdown by AWS service, ranked by spend | `startDate` (string, required), `endDate` (string, required), `granularity` (DAILY\|MONTHLY, default MONTHLY) | `GetCostAndUsage` with GroupBy SERVICE |
| `get_cost_by_tag` | Cost breakdown by a cost allocation tag | `startDate` (string, required), `endDate` (string, required), `tag_key` (string, required), `granularity` (DAILY\|MONTHLY, default MONTHLY) | `GetCostAndUsage` with GroupBy TAG |
| `get_cost_forecast` | ML-based spend prediction with confidence interval | `days` (number, default 30, max 365), `granularity` (DAILY\|MONTHLY, default MONTHLY) | `GetCostForecast` |
| `get_cost_anomalies` | Unexpected spend spikes with root cause analysis | `days_back` (number, default 90, max 365) | `GetAnomalies` |
| `get_cost_comparison` | Period-over-period comparison with change analysis | `current_start`, `current_end`, `previous_start`, `previous_end` (all optional strings), `group_by` (SERVICE\|REGION\|LINKED_ACCOUNT, default SERVICE) | `GetCostAndUsage` x2 |
| `get_rightsizing_recommendations` | EC2 rightsizing with instance type suggestions and savings | `service` (string, default AmazonEC2), `lookback_period` (SEVEN_DAYS\|THIRTY_DAYS\|SIXTY_DAYS, default THIRTY_DAYS) | `GetRightsizingRecommendation` |

## Adding a New Tool

1. Create `src/tools/my-new-tool.ts` exporting a `ToolDefinition` with `definition` and `handler`
2. Follow the existing pattern: validate inputs with `src/utils/validation.ts`, format output as markdown with `src/utils/formatting.ts`, handle errors with try/catch returning `isError: true`
3. Import and add to the `tools` array in `src/tools/index.ts`
4. Create `tests/tools/my-new-tool.test.ts` — use `tests/__mocks__/aws-client.ts` to mock the AWS client
5. The tool is automatically registered — no changes to `src/index.ts` needed

## AWS Credentials

The server inherits AWS credentials from the host machine. It never stores or manages credentials itself.

**Environment variables:**
- `AWS_REGION` — AWS region (default: `us-east-1`)
- `AWS_PROFILE` — AWS CLI profile name (passed through to the SDK)

**Required IAM permissions:**
```
ce:GetCostAndUsage
ce:GetCostForecast
ce:GetAnomalies
ce:GetRightsizingRecommendation
```

All operations are read-only. No write permissions are needed.

## Build & Test

```bash
make install        # npm install
make build          # tsc
make test           # jest --forceExit
make test-coverage  # jest --coverage --forceExit
```

**Testing approach:**
- AWS SDK is mocked at the module level via `jest.unstable_mockModule` — tests never make real API calls
- `tests/__mocks__/aws-client.ts` provides a shared `mockSend` function that all tool tests import
- Each tool test file dynamically imports the tool after the mock is registered
- Utility tests (`tests/utils/`) are pure unit tests with no mocking needed

## Conventions

- **Commits:** Conventional Commits format (`feat:`, `fix:`, `chore:`)
- **Releases:** Google Release Please handles versioning and changelogs automatically
- **Tool output:** Always markdown-formatted, never raw JSON
- **Input validation:** All inputs are validated before any AWS API call is made
- **Error handling:** Errors return `{ isError: true }` with human-friendly messages; validation errors and AWS API errors are distinguished
- **ESM:** The project uses ES modules (`"type": "module"` in package.json, `Node16` module resolution)
- **No `any`:** Source code uses strict TypeScript; test mocks use typed `jest.fn` signatures
