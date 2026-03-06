import { GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer'
import { ToolDefinition } from '../types.js'
import { getCostExplorerClient } from '../client.js'
import { validateDateString, validateDateRange, validateEnum } from '../utils/validation.js'
import { formatCurrency, formatPercentChange, buildMarkdownTable } from '../utils/formatting.js'
import { today, startOfMonth, startOfPreviousMonth } from '../utils/dates.js'
import { AwsCostExplorerError } from '../utils/errors.js'

const GROUP_BY_OPTIONS = ['SERVICE', 'REGION', 'LINKED_ACCOUNT'] as const
type GroupByOption = (typeof GROUP_BY_OPTIONS)[number]

function getDefaultDates() {
  const now = new Date()
  const currentStart = startOfMonth()
  const currentEnd = today()

  const dayOfMonth = now.getDate()
  const prevMonthStart = startOfPreviousMonth()
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevEnd = new Date(now.getFullYear(), now.getMonth() - 1, dayOfMonth)
  const prevEndStr = `${prevEnd.getFullYear()}-${String(prevEnd.getMonth() + 1).padStart(2, '0')}-${String(prevEnd.getDate()).padStart(2, '0')}`

  return {
    currentStart,
    currentEnd,
    previousStart: prevMonthStart,
    previousEnd: prevEndStr,
  }
}

export const getCostComparison: ToolDefinition = {
  definition: {
    name: 'get_cost_comparison',
    description:
      "Compare AWS costs between two time periods with automatic change analysis. Defaults to comparing current month-to-date vs the same number of days in the previous month. Identifies which services, regions, or linked accounts drove the biggest cost changes, sorted by impact. This is the best tool for answering 'why did my bill go up?', 'how does this month compare to last month?', or 'what changed in my AWS spending?' The group_by parameter lets you slice the comparison by service, region, or linked account.",
    inputSchema: {
      type: 'object',
      properties: {
        current_start: {
          type: 'string',
          description: 'Start date of current period (YYYY-MM-DD). Defaults to start of current month.',
        },
        current_end: {
          type: 'string',
          description: 'End date of current period (YYYY-MM-DD). Defaults to today.',
        },
        previous_start: {
          type: 'string',
          description: 'Start date of previous period (YYYY-MM-DD). Defaults to start of previous month.',
        },
        previous_end: {
          type: 'string',
          description: 'End date of previous period (YYYY-MM-DD). Defaults to same day-of-month in previous month.',
        },
        group_by: {
          type: 'string',
          enum: ['SERVICE', 'REGION', 'LINKED_ACCOUNT'],
          default: 'SERVICE',
          description: 'Dimension to group comparison by',
        },
      },
    },
  },

  handler: async (args: Record<string, unknown>) => {
    try {
      const defaults = getDefaultDates()

      const currentStart = args.current_start
        ? validateDateString(args.current_start, 'current_start')
        : defaults.currentStart
      const currentEnd = args.current_end
        ? validateDateString(args.current_end, 'current_end')
        : defaults.currentEnd
      const previousStart = args.previous_start
        ? validateDateString(args.previous_start, 'previous_start')
        : defaults.previousStart
      const previousEnd = args.previous_end
        ? validateDateString(args.previous_end, 'previous_end')
        : defaults.previousEnd

      validateDateRange(currentStart, currentEnd)
      validateDateRange(previousStart, previousEnd)

      const groupBy: GroupByOption = args.group_by
        ? validateEnum(args.group_by, GROUP_BY_OPTIONS, 'group_by')
        : 'SERVICE'

      const client = getCostExplorerClient()

      const [currentResponse, previousResponse] = await Promise.all([
        client.send(
          new GetCostAndUsageCommand({
            TimePeriod: { Start: currentStart, End: currentEnd },
            Granularity: 'MONTHLY',
            Metrics: ['UnblendedCost'],
            GroupBy: [{ Type: 'DIMENSION', Key: groupBy }],
          })
        ),
        client.send(
          new GetCostAndUsageCommand({
            TimePeriod: { Start: previousStart, End: previousEnd },
            Granularity: 'MONTHLY',
            Metrics: ['UnblendedCost'],
            GroupBy: [{ Type: 'DIMENSION', Key: groupBy }],
          })
        ),
      ])

      const currentCosts = new Map<string, number>()
      const previousCosts = new Map<string, number>()

      for (const result of currentResponse.ResultsByTime ?? []) {
        for (const group of result.Groups ?? []) {
          const name = group.Keys?.[0] ?? 'Unknown'
          const amount = parseFloat(group.Metrics?.UnblendedCost?.Amount ?? '0')
          currentCosts.set(name, (currentCosts.get(name) ?? 0) + amount)
        }
      }

      for (const result of previousResponse.ResultsByTime ?? []) {
        for (const group of result.Groups ?? []) {
          const name = group.Keys?.[0] ?? 'Unknown'
          const amount = parseFloat(group.Metrics?.UnblendedCost?.Amount ?? '0')
          previousCosts.set(name, (previousCosts.get(name) ?? 0) + amount)
        }
      }

      const allNames = new Set([...currentCosts.keys(), ...previousCosts.keys()])
      const comparisons: Array<{
        name: string
        previous: number
        current: number
        change: number
        absChange: number
      }> = []

      for (const name of allNames) {
        const prev = previousCosts.get(name) ?? 0
        const curr = currentCosts.get(name) ?? 0
        comparisons.push({
          name,
          previous: prev,
          current: curr,
          change: curr - prev,
          absChange: Math.abs(curr - prev),
        })
      }

      comparisons.sort((a, b) => b.absChange - a.absChange)

      const totalPrevious = [...previousCosts.values()].reduce((s, v) => s + v, 0)
      const totalCurrent = [...currentCosts.values()].reduce((s, v) => s + v, 0)
      const summaryArrow = formatPercentChange(totalPrevious, totalCurrent)

      const rows = comparisons.map(c => {
        const changeStr = c.change >= 0 ? `↑ ${formatCurrency(c.change)}` : `↓ ${formatCurrency(Math.abs(c.change))}`
        const pctStr = formatPercentChange(c.previous, c.current)
        return [c.name, formatCurrency(c.previous), formatCurrency(c.current), changeStr, pctStr]
      })

      const table = buildMarkdownTable(
        ['Name', 'Previous ($)', 'Current ($)', 'Change ($)', 'Change (%)'],
        rows
      )

      const text = [
        '## AWS Cost Comparison',
        `**Current:** ${currentStart} to ${currentEnd} | **Previous:** ${previousStart} to ${previousEnd}`,
        `**Group by:** ${groupBy}`,
        '',
        `### Total: ${formatCurrency(totalPrevious)} → ${formatCurrency(totalCurrent)} (${summaryArrow})`,
        '',
        table,
      ].join('\n')

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
