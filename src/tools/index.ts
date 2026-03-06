import { ToolDefinition } from '../types.js'
import { getCostAndUsage } from './get-cost-and-usage.js'
import { getCostByService } from './get-cost-by-service.js'
import { getCostByTag } from './get-cost-by-tag.js'
import { getCostForecast } from './get-cost-forecast.js'
import { getCostAnomalies } from './get-cost-anomalies.js'
import { getCostComparison } from './get-cost-comparison.js'
import { getRightsizingRecommendations } from './get-rightsizing-recommendations.js'

export const tools: ToolDefinition[] = [
  getCostAndUsage,
  getCostByService,
  getCostByTag,
  getCostForecast,
  getCostAnomalies,
  getCostComparison,
  getRightsizingRecommendations,
]
