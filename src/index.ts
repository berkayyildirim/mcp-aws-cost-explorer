#!/usr/bin/env node
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { tools } from './tools/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'))

const server = new Server(
  { name: 'mcp-aws-cost-explorer', version: pkg.version },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map(t => t.definition),
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = tools.find(t => t.definition.name === request.params.name)
  if (!tool) {
    throw new Error(`Unknown tool: ${request.params.name}`)
  }
  return tool.handler(request.params.arguments as Record<string, unknown>)
})

async function run() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('MCP AWS Cost Explorer Server running on stdio')
}

run().catch(console.error)
