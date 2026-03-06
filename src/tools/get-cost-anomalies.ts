import { GetAnomaliesCommand } from '@aws-sdk/client-cost-explorer'
import { ToolDefinition } from '../types.js'
import { getCostExplorerClient } from '../client.js'
import { validatePositiveInt } from '../utils/validation.js'
import { formatCurrency } from '../utils/formatting.js'
import { today, daysAgo } from '../utils/dates.js'
import { AwsCostExplorerError } from '../utils/errors.js'

export const getCostAnomalies: ToolDefinition = {
  definition: {
    name: 'get_cost_anomalies',
    description:
      "Retrieve cost anomalies detected by AWS Cost Anomaly Detection service. Shows unexpected spend spikes with root cause analysis including affected service, expected vs actual spend, and impact assessment. Use this when investigating unusual charges, unexpected bill increases, or when asked 'why did my costs spike?' Note: requires Cost Anomaly Detection monitors to be configured in the AWS console.",
    inputSchema: {
      type: 'object',
      properties: {
        days_back: {
          type: 'number',
          default: 90,
          description: 'Number of days to look back for anomalies (1-365)',
        },
      },
    },
  },

  handler: async (args: Record<string, unknown>) => {
    try {
      const daysBack = args.days_back !== undefined
        ? validatePositiveInt(args.days_back, 'days_back', 365)
        : 90

      const endDate = today()
      const startDate = daysAgo(daysBack)

      const client = getCostExplorerClient()
      let response
      try {
        response = await client.send(
          new GetAnomaliesCommand({
            DateInterval: { StartDate: startDate, EndDate: endDate },
          })
        )
      } catch (apiError: unknown) {
        const apiMessage = apiError instanceof Error ? apiError.message : ''
        if (apiMessage.includes('no anomaly monitor') || apiMessage.includes('UnknownMonitor')) {
          return {
            content: [{
              type: 'text',
              text: '## AWS Cost Anomalies\n\nNo Cost Anomaly Detection monitors are configured. To use this feature, create an anomaly monitor in the AWS Cost Management console under Cost Anomaly Detection. You can set up monitors by service, linked account, cost category, or cost allocation tag.',
            }],
          }
        }
        throw apiError
      }

      const anomalies = response.Anomalies ?? []

      if (anomalies.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `## AWS Cost Anomalies\n**${startDate}** to **${endDate}**\n\nNo cost anomalies detected in the specified time period.`,
          }],
        }
      }

      const sections = anomalies.map((anomaly, i) => {
        const rootCauses = anomaly.RootCauses ?? []
        const rootCauseText = rootCauses.length > 0
          ? rootCauses.map(rc => {
              const parts: string[] = []
              if (rc.Service) parts.push(`**Service:** ${rc.Service}`)
              if (rc.Region) parts.push(`**Region:** ${rc.Region}`)
              if (rc.LinkedAccount) parts.push(`**Account:** ${rc.LinkedAccount}`)
              if (rc.UsageType) parts.push(`**Usage Type:** ${rc.UsageType}`)
              return parts.join(' | ')
            }).join('\n')
          : 'No root cause details available'

        const impact = anomaly.Impact
        const expectedSpend = parseFloat(impact?.TotalExpectedSpend?.toString() ?? '0')
        const actualSpend = parseFloat(impact?.TotalActualSpend?.toString() ?? '0')
        const impactAmount = parseFloat(impact?.TotalImpact?.toString() ?? '0')

        return [
          `### Anomaly ${i + 1}: ${anomaly.AnomalyId}`,
          `- **Status:** ${anomaly.AnomalyScore?.CurrentScore !== undefined ? 'Score: ' + anomaly.AnomalyScore.CurrentScore.toFixed(2) : 'N/A'}`,
          `- **Expected Spend:** ${formatCurrency(expectedSpend)}`,
          `- **Actual Spend:** ${formatCurrency(actualSpend)}`,
          `- **Impact:** ${formatCurrency(impactAmount)}`,
          `- **Root Cause:** ${rootCauseText}`,
        ].join('\n')
      })

      const text = [
        '## AWS Cost Anomalies',
        `**${startDate}** to **${endDate}** — **${anomalies.length} anomaly(s) detected**`,
        '',
        ...sections,
      ].join('\n\n')

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
