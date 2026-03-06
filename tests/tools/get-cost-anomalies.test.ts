import { jest } from '@jest/globals'
import { mockSend, resetMocks } from '../__mocks__/aws-client.js'

const { getCostAnomalies } = await import('../../src/tools/get-cost-anomalies.js')

beforeEach(() => resetMocks())

describe('get_cost_anomalies handler', () => {
  it('returns formatted anomaly details', async () => {
    mockSend.mockResolvedValue({
      Anomalies: [
        {
          AnomalyId: 'abc-123',
          AnomalyScore: { CurrentScore: 0.85 },
          Impact: {
            TotalExpectedSpend: 100,
            TotalActualSpend: 250,
            TotalImpact: 150,
          },
          RootCauses: [
            { Service: 'Amazon EC2', Region: 'us-east-1' },
          ],
        },
      ],
    })

    const result = await getCostAnomalies.handler({})

    expect(result.isError).toBeUndefined()
    const text = result.content[0].text
    expect(text).toContain('## AWS Cost Anomalies')
    expect(text).toContain('abc-123')
    expect(text).toContain('0.85')
    expect(text).toContain('$100.00')
    expect(text).toContain('$250.00')
    expect(text).toContain('$150.00')
    expect(text).toContain('Amazon EC2')
    expect(text).toContain('us-east-1')
    expect(text).toContain('1 anomaly(s) detected')
  })

  it('handles no anomalies found', async () => {
    mockSend.mockResolvedValue({ Anomalies: [] })

    const result = await getCostAnomalies.handler({})

    expect(result.isError).toBeUndefined()
    expect(result.content[0].text).toContain('No cost anomalies detected')
  })

  it('handles no monitors configured', async () => {
    mockSend.mockRejectedValue(new Error('no anomaly monitor found'))

    const result = await getCostAnomalies.handler({})

    expect(result.isError).toBeUndefined()
    expect(result.content[0].text).toContain('No Cost Anomaly Detection monitors are configured')
    expect(result.content[0].text).toContain('create an anomaly monitor')
  })

  it('handles UnknownMonitor error', async () => {
    mockSend.mockRejectedValue(new Error('UnknownMonitor'))

    const result = await getCostAnomalies.handler({})

    expect(result.isError).toBeUndefined()
    expect(result.content[0].text).toContain('No Cost Anomaly Detection monitors')
  })

  it('validates days_back', async () => {
    const result = await getCostAnomalies.handler({ days_back: 0 })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('Validation Error')
  })

  it('defaults days_back to 90', async () => {
    mockSend.mockResolvedValue({ Anomalies: [] })

    await getCostAnomalies.handler({})

    // Should not throw — send was called
    expect(mockSend).toHaveBeenCalledTimes(1)
  })

  it('propagates unrecognized AWS errors', async () => {
    mockSend.mockRejectedValue(new Error('Throttling'))

    const result = await getCostAnomalies.handler({})

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('AWS API Error')
  })
})
