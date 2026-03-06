import { GetCostForecastCommand } from '@aws-sdk/client-cost-explorer'
import { ToolDefinition } from '../types.js'
import { getCostExplorerClient } from '../client.js'
import { validatePositiveInt, validateEnum } from '../utils/validation.js'
import { formatCurrency, buildMarkdownTable } from '../utils/formatting.js'
import { tomorrow, daysFromNow } from '../utils/dates.js'
import { AwsCostExplorerError } from '../utils/errors.js'

const GRANULARITY_OPTIONS = ['DAILY', 'MONTHLY'] as const

export const getCostForecast: ToolDefinition = {
  definition: {
    name: 'get_cost_forecast',
    description:
      "Forecast future AWS spending for the next N days using AWS's built-in ML-based predictions. Returns predicted total spend with 80% confidence interval and period-by-period breakdown. Use this when asked about expected future costs, budget projections, or 'how much will I spend next month?'",
    inputSchema: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          default: 30,
          description: 'Number of days to forecast (1-365)',
        },
        granularity: {
          type: 'string',
          enum: ['DAILY', 'MONTHLY'],
          default: 'MONTHLY',
          description: 'Time granularity (DAILY or MONTHLY)',
        },
      },
    },
  },

  handler: async (args: Record<string, unknown>) => {
    try {
      const days = args.days !== undefined
        ? validatePositiveInt(args.days, 'days', 365)
        : 30
      const granularity = args.granularity
        ? validateEnum(args.granularity, GRANULARITY_OPTIONS, 'granularity')
        : 'MONTHLY'

      const startDate = tomorrow()
      const endDate = daysFromNow(days + 1)

      const client = getCostExplorerClient()
      const response = await client.send(
        new GetCostForecastCommand({
          TimePeriod: { Start: startDate, End: endDate },
          Granularity: granularity,
          Metric: 'UNBLENDED_COST',
          PredictionIntervalLevel: 80,
        })
      )

      const totalMean = parseFloat(response.Total?.Amount ?? '0')
      const rows: string[][] = []

      for (const result of response.ForecastResultsByTime ?? []) {
        const period = `${result.TimePeriod?.Start} - ${result.TimePeriod?.End}`
        const mean = parseFloat(result.MeanValue ?? '0')
        const lower = parseFloat(result.PredictionIntervalLowerBound ?? '0')
        const upper = parseFloat(result.PredictionIntervalUpperBound ?? '0')
        rows.push([
          period,
          formatCurrency(mean),
          formatCurrency(lower),
          formatCurrency(upper),
        ])
      }

      const table = buildMarkdownTable(
        ['Period', 'Forecast (USD)', 'Lower Bound', 'Upper Bound'],
        rows
      )

      const text = [
        '## AWS Cost Forecast',
        `**${startDate}** to **${endDate}** (${granularity})`,
        '',
        `**Total Forecasted Spend:** ${formatCurrency(totalMean)}`,
        `**Confidence Level:** 80%`,
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
      if (message.includes('not enough data') || message.includes('BillEstimateNotFoundException')) {
        return {
          content: [{
            type: 'text',
            text: 'Unable to generate forecast: there is not enough historical cost data available. AWS Cost Explorer typically needs at least 30 days of billing data to produce forecasts.',
          }],
        }
      }
      return {
        content: [{ type: 'text', text: `AWS API Error: ${message}` }],
        isError: true,
      }
    }
  },
}
