import { GetRightsizingRecommendationCommand } from '@aws-sdk/client-cost-explorer'
import { ToolDefinition } from '../types.js'
import { getCostExplorerClient } from '../client.js'
import { validateEnum } from '../utils/validation.js'
import { formatCurrency, buildMarkdownTable } from '../utils/formatting.js'
import { AwsCostExplorerError } from '../utils/errors.js'

const LOOKBACK_OPTIONS = ['SEVEN_DAYS', 'THIRTY_DAYS', 'SIXTY_DAYS'] as const

export const getRightsizingRecommendations: ToolDefinition = {
  definition: {
    name: 'get_rightsizing_recommendations',
    description:
      'Get EC2 rightsizing recommendations showing over-provisioned or idle instances with specific instance type change suggestions and estimated monthly savings. Use this when asked about cost optimization, reducing AWS spend, finding waste, or right-sizing infrastructure. Recommendations are based on CloudWatch utilization metrics over the specified lookback period.',
    inputSchema: {
      type: 'object',
      properties: {
        service: {
          type: 'string',
          default: 'AmazonEC2',
          description: 'AWS service to get recommendations for',
        },
        lookback_period: {
          type: 'string',
          enum: ['SEVEN_DAYS', 'THIRTY_DAYS', 'SIXTY_DAYS'],
          default: 'THIRTY_DAYS',
          description: 'Lookback period for utilization metrics',
        },
      },
    },
  },

  handler: async (args: Record<string, unknown>) => {
    try {
      const service = typeof args.service === 'string' ? args.service : 'AmazonEC2'
      const lookbackPeriod = args.lookback_period
        ? validateEnum(args.lookback_period, LOOKBACK_OPTIONS, 'lookback_period')
        : 'THIRTY_DAYS'

      const client = getCostExplorerClient()
      let response
      try {
        response = await client.send(
          new GetRightsizingRecommendationCommand({
            Service: service,
            Configuration: {
              RecommendationTarget: 'SAME_INSTANCE_FAMILY',
              BenefitsConsidered: true,
            },
          })
        )
      } catch (apiError: unknown) {
        const apiMessage = apiError instanceof Error ? apiError.message : ''
        if (apiMessage.includes('OptedOut') || apiMessage.includes('not enabled')) {
          return {
            content: [{
              type: 'text',
              text: `## Rightsizing Recommendations\n\nRightsizing recommendations are not enabled for ${service}. To enable them, go to the AWS Cost Explorer console and opt in to rightsizing recommendations.`,
            }],
          }
        }
        throw apiError
      }

      const recommendations = response.RightsizingRecommendations ?? []

      if (recommendations.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `## Rightsizing Recommendations\n**Service:** ${service} | **Lookback:** ${lookbackPeriod}\n\nNo rightsizing opportunities found. Your instances appear to be appropriately sized based on utilization metrics.`,
          }],
        }
      }

      const rows: Array<{ row: string[]; savings: number }> = []
      let totalSavings = 0

      for (const rec of recommendations) {
        const currentInstance = rec.CurrentInstance
        const instanceId = currentInstance?.ResourceId ?? 'N/A'
        const nameTag = currentInstance?.Tags?.find(t => t.Key === 'Name')
        const instanceName = nameTag?.Values?.[0] ?? ''
        const currentType = currentInstance?.ResourceDetails?.EC2ResourceDetails?.InstanceType ?? 'N/A'
        const action = rec.RightsizingType ?? 'N/A'

        let recommendedType = 'N/A'
        let monthlySavings = 0

        if (rec.ModifyRecommendationDetail?.TargetInstances?.[0]) {
          const target = rec.ModifyRecommendationDetail.TargetInstances[0]
          recommendedType = target.ResourceDetails?.EC2ResourceDetails?.InstanceType ?? 'N/A'
          monthlySavings = parseFloat(target.EstimatedMonthlySavings ?? '0')
        } else if (rec.RightsizingType === 'TERMINATE') {
          monthlySavings = parseFloat(rec.CurrentInstance?.MonthlyCost ?? '0')
        }

        totalSavings += monthlySavings

        const displayName = instanceName ? `${instanceId} (${instanceName})` : instanceId

        rows.push({
          row: [displayName, currentType, action, recommendedType, formatCurrency(monthlySavings)],
          savings: monthlySavings,
        })
      }

      rows.sort((a, b) => b.savings - a.savings)

      const table = buildMarkdownTable(
        ['Instance', 'Current Type', 'Action', 'Recommended Type', 'Est. Monthly Savings'],
        rows.map(r => r.row)
      )

      const text = [
        '## Rightsizing Recommendations',
        `**Service:** ${service} | **Lookback:** ${lookbackPeriod}`,
        '',
        `**Total potential monthly savings: ${formatCurrency(totalSavings)} across ${recommendations.length} instance(s)**`,
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
