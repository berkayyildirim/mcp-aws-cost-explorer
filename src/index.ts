#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { CostExplorerClient, GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer'

// Initialize the MCP Server
const server = new Server(
  { name: 'mcp-aws-cost-explorer', version: '0.0.0' },
  { capabilities: { tools: {} } },
)

// Initialize AWS Client
const ceClient = new CostExplorerClient({ region: process.env.AWS_REGION || 'us-east-1' })

// Define the tools exposed to the AI agent
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_aws_cost_and_usage',
        description: 'Retrieve AWS cost and usage data for a specific date range.',
        inputSchema: {
          type: 'object',
          properties: {
            startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
            granularity: { type: 'string', enum: ['DAILY', 'MONTHLY'], default: 'DAILY' },
          },
          required: ['startDate', 'endDate'],
        },
      },
    ],
  }
})

// Handle the execution of the tool
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'get_aws_cost_and_usage') {
    const { startDate, endDate, granularity } = request.params.arguments as any

    try {
      const command = new GetCostAndUsageCommand({
        TimePeriod: { Start: startDate, End: endDate },
        Granularity: granularity,
        Metrics: ['UnblendedCost'],
      })

      const response = await ceClient.send(command)

      return {
        content: [{ type: 'text', text: JSON.stringify(response.ResultsByTime, null, 2) }],
      }
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `AWS API Error: ${error.message}` }],
        isError: true,
      }
    }
  }
  throw new Error('Tool not found')
})

// Start the stdio transport
async function run() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('MCP AWS Cost Explorer Server running on stdio')
}

run().catch(console.error)
