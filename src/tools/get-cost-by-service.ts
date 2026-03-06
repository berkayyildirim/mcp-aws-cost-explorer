import { GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer'
import { ToolDefinition } from '../types.js'
import { getCostExplorerClient } from '../client.js'
import { validateDateString, validateDateRange, validateEnum } from '../utils/validation.js'
import { formatCurrency, buildMarkdownTable } from '../utils/formatting.js'
import { AwsCostExplorerError } from '../utils/errors.js'

const GRANULARITY_OPTIONS = ['DAILY', 'MONTHLY'] as const

export const getCostByService: ToolDefinition = {
  definition: {
    name: 'get_cost_by_service',
    description:
      'Break down AWS costs by service (EC2, S3, Lambda, RDS, etc.) for a date range. Returns services ranked by spend with percentage of total. Use this when you need to identify which AWS services are driving costs or answer questions like \'what am I spending the most on?\'',
    inputSchema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
        granularity: {
          type: 'string',
          enum: ['DAILY', 'MONTHLY'],
          default: 'MONTHLY',
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
        : 'MONTHLY'

      const client = getCostExplorerClient()
      const response = await client.send(
        new GetCostAndUsageCommand({
          TimePeriod: { Start: startDate, End: endDate },
          Granularity: granularity,
          Metrics: ['UnblendedCost'],
          GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
        })
      )

      const serviceCosts = new Map<string, number>()

      for (const result of response.ResultsByTime ?? []) {
        for (const group of result.Groups ?? []) {
          const service = group.Keys?.[0] ?? 'Unknown'
          const amount = parseFloat(group.Metrics?.UnblendedCost?.Amount ?? '0')
          serviceCosts.set(service, (serviceCosts.get(service) ?? 0) + amount)
        }
      }

      const sorted = [...serviceCosts.entries()].sort((a, b) => b[1] - a[1])
      const total = sorted.reduce((sum, [, cost]) => sum + cost, 0)

      const rows = sorted.map(([service, cost]) => {
        const pct = total > 0 ? ((cost / total) * 100).toFixed(1) + '%' : '0.0%'
        return [service, formatCurrency(cost), pct]
      })

      rows.push(['**Total**', `**${formatCurrency(total)}**`, '**100.0%**'])

      const table = buildMarkdownTable(['Service', 'Cost (USD)', '% of Total'], rows)
      const text = `## AWS Cost by Service\n**${startDate}** to **${endDate}**\n\n${table}`

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
