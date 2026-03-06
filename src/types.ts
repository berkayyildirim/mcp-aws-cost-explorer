import { Tool } from '@modelcontextprotocol/sdk/types.js'

export interface ToolResult {
  [key: string]: unknown
  content: Array<{ type: string; text: string }>
  isError?: boolean
}

export interface ToolDefinition {
  definition: Tool
  handler: (args: Record<string, unknown>) => Promise<ToolResult>
}
