import { GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer'
import { ToolDefinition } from '../types.js'
import { getCostExplorerClient } from '../client.js'
import { validateDateString, validateDateRange, validateEnum } from '../utils/validation.js'
import { formatCurrency, buildMarkdownTable } from '../utils/formatting.js'
import { AwsCostExplorerError } from '../utils/errors.js'

const GRANULARITY_OPTIONS = ['DAILY', 'MONTHLY'] as const

export const getCostAndUsage: ToolDefinition = {
  definition: {
    name: 'get_aws_cost_and_usage',
    description:
      'Retrieve raw AWS cost and usage data for a specific date range. Returns daily or monthly unblended cost time series. Best for seeing exact spend over time. For period-over-period comparison, use get_cost_comparison instead. For breakdown by service, use get_cost_by_service.',
    inputSchema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
        granularity: {
          type: 'string',
          enum: ['DAILY', 'MONTHLY'],
          default: 'DAILY',
          description: 'Time granularity (DAILY or MONTHLY)',
        },
      },
      required: ['startDate', 'endDate'],
    },
  },

  handler: async (args: Record<string, unknown>) => {
    try {
      const startDate = validateDateString(args.startDate, 'startDate')
      const endDate = validateDateString(args.endDate, 'endDate')
      validateDateRange(startDate, endDate)
      const granularity = args.granularity
        ? validateEnum(args.granularity, GRANULARITY_OPTIONS, 'granularity')
        : 'DAILY'

      const client = getCostExplorerClient()
      const response = await client.send(
        new GetCostAndUsageCommand({
          TimePeriod: { Start: startDate, End: endDate },
          Granularity: granularity,
          Metrics: ['UnblendedCost'],
        })
      )

      const rows: string[][] = []
      let total = 0

      for (const result of response.ResultsByTime ?? []) {
        const period = `${result.TimePeriod?.Start} - ${result.TimePeriod?.End}`
        const amount = parseFloat(result.Total?.UnblendedCost?.Amount ?? '0')
        total += amount
        rows.push([period, formatCurrency(amount)])
      }

      rows.push(['**Total**', `**${formatCurrency(total)}**`])

      const table = buildMarkdownTable(['Period', 'Cost (USD)'], rows)
      const text = `## AWS Cost and Usage\n**${startDate}** to **${endDate}** (${granularity})\n\n${table}`

      return { content: [{ type: 'text', text }] }
    } catch (error: unknown) {
      if (error instanceof AwsCostExplorerError) {
        return {
          content: [{ type: 'text', text: `Validation Error: ${error.message}` }],
          isError: true,
        }
      }
      const message = error instanceof Error ? error.message : 'Unknown error occurred'
      return {
        content: [{ type: 'text', text: `AWS API Error: ${message}` }],
        isError: true,
      }
    }
  },
}
