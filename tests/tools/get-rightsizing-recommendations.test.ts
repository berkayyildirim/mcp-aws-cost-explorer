import { jest } from '@jest/globals'
import { mockSend, resetMocks } from '../__mocks__/aws-client.js'

const { getRightsizingRecommendations } = await import('../../src/tools/get-rightsizing-recommendations.js')

beforeEach(() => resetMocks())

describe('get_rightsizing_recommendations handler', () => {
  it('returns recommendations sorted by savings', async () => {
    mockSend.mockResolvedValue({
      RightsizingRecommendations: [
        {
          CurrentInstance: {
            ResourceId: 'i-small',
            ResourceDetails: { EC2ResourceDetails: { InstanceType: 'm5.large' } },
          },
          RightsizingType: 'MODIFY',
          ModifyRecommendationDetail: {
            TargetInstances: [
              {
                ResourceDetails: { EC2ResourceDetails: { InstanceType: 'm5.medium' } },
                EstimatedMonthlySavings: '30.00',
              },
            ],
          },
        },
        {
          CurrentInstance: {
            ResourceId: 'i-big',
            ResourceDetails: { EC2ResourceDetails: { InstanceType: 'c5.2xlarge' } },
          },
          RightsizingType: 'MODIFY',
          ModifyRecommendationDetail: {
            TargetInstances: [
              {
                ResourceDetails: { EC2ResourceDetails: { InstanceType: 'c5.xlarge' } },
                EstimatedMonthlySavings: '120.00',
              },
            ],
          },
        },
      ],
    })

    const result = await getRightsizingRecommendations.handler({})

    expect(result.isError).toBeUndefined()
    const text = result.content[0].text
    expect(text).toContain('## Rightsizing Recommendations')
    expect(text).toContain('$150.00')
    expect(text).toContain('2 instance(s)')
    // i-big ($120) should appear before i-small ($30)
    expect(text.indexOf('i-big')).toBeLessThan(text.indexOf('i-small'))
  })

  it('handles TERMINATE recommendations', async () => {
    mockSend.mockResolvedValue({
      RightsizingRecommendations: [
        {
          CurrentInstance: {
            ResourceId: 'i-idle',
            ResourceDetails: { EC2ResourceDetails: { InstanceType: 't3.micro' } },
            MonthlyCost: '10.00',
          },
          RightsizingType: 'TERMINATE',
        },
      ],
    })

    const result = await getRightsizingRecommendations.handler({})

    const text = result.content[0].text
    expect(text).toContain('TERMINATE')
    expect(text).toContain('$10.00')
  })

  it('handles no recommendations', async () => {
    mockSend.mockResolvedValue({ RightsizingRecommendations: [] })

    const result = await getRightsizingRecommendations.handler({})

    expect(result.isError).toBeUndefined()
    expect(result.content[0].text).toContain('No rightsizing opportunities found')
  })

  it('validates lookback_period enum', async () => {
    const result = await getRightsizingRecommendations.handler({
      lookback_period: 'NINETY_DAYS',
    })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('Validation Error')
  })

  it('handles OptedOut error gracefully', async () => {
    mockSend.mockRejectedValue(new Error('OptedOut: rightsizing is not enabled'))

    const result = await getRightsizingRecommendations.handler({})

    expect(result.isError).toBeUndefined()
    expect(result.content[0].text).toContain('not enabled')
  })

  it('shows instance name from tags when available', async () => {
    mockSend.mockResolvedValue({
      RightsizingRecommendations: [
        {
          CurrentInstance: {
            ResourceId: 'i-named',
            Tags: [{ Key: 'Name', Values: ['web-server-1'] }],
            ResourceDetails: { EC2ResourceDetails: { InstanceType: 'm5.large' } },
          },
          RightsizingType: 'MODIFY',
          ModifyRecommendationDetail: {
            TargetInstances: [
              {
                ResourceDetails: { EC2ResourceDetails: { InstanceType: 'm5.medium' } },
                EstimatedMonthlySavings: '50.00',
              },
            ],
          },
        },
      ],
    })

    const result = await getRightsizingRecommendations.handler({})

    const text = result.content[0].text
    expect(text).toContain('web-server-1')
    expect(text).toContain('i-named')
  })
})
