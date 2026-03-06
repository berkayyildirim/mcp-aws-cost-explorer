import { CostExplorerClient } from '@aws-sdk/client-cost-explorer'

let client: CostExplorerClient | null = null

export function getCostExplorerClient(): CostExplorerClient {
  if (!client) {
    client = new CostExplorerClient({
      region: process.env.AWS_REGION || 'us-east-1',
    })
  }
  return client
}
