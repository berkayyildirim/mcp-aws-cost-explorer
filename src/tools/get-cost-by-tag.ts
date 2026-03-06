import { GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer'
import { ToolDefinition } from '../types.js'
import { getCostExplorerClient } from '../client.js'
import { validateDateString, validateDateRange, validateEnum } from '../utils/validation.js'
import { formatCurrency, buildMarkdownTable } from '../utils/formatting.js'
import { AwsCostExplorerError } from '../utils/errors.js'

const GRANULARITY_OPTIONS = ['DAILY', 'MONTHLY'] as const

export const getCostByTag: ToolDefinition = {
  definition: {
    name: 'get_cost_by_tag',
    description:
      'Break down AWS costs by a specific cost allocation tag such as Environment, Team, Project, or any custom tag. Returns cost per tag value ranked by spend. Use this when asked about costs per team, per environment (prod vs dev), per project, or any tag-based cost allocation. The user must specify which tag key to group by. Note: cost allocation tags must be activated in the AWS Billing console for them to appear in Cost Explorer data.',
    inputSchema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
        tag_key: {
          type: 'string',
          description: 'The cost allocation tag key to group by (e.g. "Environment", "Team", "Project")',
        },
        granularity: {
          type: 'string',
          enum: ['DAILY', 'MONTHLY'],
          default: 'MONTHLY',
          description: 'Time granularity (DAILY or MONTHLY)',
        },
      },
      required: ['startDate', 'endDate', 'tag_key'],
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

      if (typeof args.tag_key !== 'string' || args.tag_key.trim() === '') {
        throw new AwsCostExplorerError(
          'Invalid tag_key: must be a non-empty string',
          'INVALID_DATE'
        )
      }
      const tagKey = args.tag_key.trim()

      const client = getCostExplorerClient()
      const response = await client.send(
        new GetCostAndUsageCommand({
          TimePeriod: { Start: startDate, End: endDate },
          Granularity: granularity,
          Metrics: ['UnblendedCost'],
          GroupBy: [{ Type: 'TAG', Key: tagKey }],
        })
      )

      const tagCosts = new Map<string, number>()

      for (const result of response.ResultsByTime ?? []) {
        for (const group of result.Groups ?? []) {
          const rawKey = group.Keys?.[0] ?? ''
          const tagValue = rawKey.includes('$') ? rawKey.split('$')[1] : rawKey
          const label = tagValue === '' ? '(untagged)' : tagValue
          const amount = parseFloat(group.Metrics?.UnblendedCost?.Amount ?? '0')
          tagCosts.set(label, (tagCosts.get(label) ?? 0) + amount)
        }
      }

      const sorted = [...tagCosts.entries()].sort((a, b) => b[1] - a[1])
      const total = sorted.reduce((sum, [, cost]) => sum + cost, 0)

      const rows = sorted.map(([tag, cost]) => {
        const pct = total > 0 ? ((cost / total) * 100).toFixed(1) + '%' : '0.0%'
        return [tag, formatCurrency(cost), pct]
      })

      rows.push(['**Total**', `**${formatCurrency(total)}**`, '**100.0%**'])

      const table = buildMarkdownTable(['Tag Value', 'Cost (USD)', '% of Total'], rows)
      const text = `## AWS Cost by Tag: ${tagKey}\n**${startDate}** to **${endDate}**\n\n${table}`

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
