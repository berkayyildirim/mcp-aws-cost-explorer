import { jest } from '@jest/globals'
import { mockSend, resetMocks } from '../__mocks__/aws-client.js'

const { getCostAndUsage } = await import('../../src/tools/get-cost-and-usage.js')

beforeEach(() => resetMocks())

describe('get_aws_cost_and_usage handler', () => {
  it('returns formatted markdown table on success', async () => {
    mockSend.mockResolvedValue({
      ResultsByTime: [
        {
          TimePeriod: { Start: '2024-01-01', End: '2024-01-02' },
          Total: { UnblendedCost: { Amount: '12.50', Unit: 'USD' } },
        },
        {
          TimePeriod: { Start: '2024-01-02', End: '2024-01-03' },
          Total: { UnblendedCost: { Amount: '8.75', Unit: 'USD' } },
        },
      ],
    })

    const result = await getCostAndUsage.handler({
      startDate: '2024-01-01',
      endDate: '2024-01-03',
      granularity: 'DAILY',
    })

    expect(result.isError).toBeUndefined()
    const text = result.content[0].text
    expect(text).toContain('## AWS Cost and Usage')
    expect(text).toContain('$12.50')
    expect(text).toContain('$8.75')
    expect(text).toContain('$21.25')
    expect(text).toContain('**Total**')
    expect(text).toContain('Period')
    expect(text).toContain('Cost (USD)')
  })

  it('defaults granularity to DAILY', async () => {
    mockSend.mockResolvedValue({ ResultsByTime: [] })

    await getCostAndUsage.handler({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    })

    const command = mockSend.mock.calls[0][0]
    expect(command.input.Granularity).toBe('DAILY')
  })

  it('rejects missing startDate', async () => {
    const result = await getCostAndUsage.handler({
      endDate: '2024-01-31',
    })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('Validation Error')
  })

  it('rejects invalid date format', async () => {
    const result = await getCostAndUsage.handler({
      startDate: '01-01-2024',
      endDate: '2024-01-31',
    })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('Validation Error')
  })

  it('rejects start date after end date', async () => {
    const result = await getCostAndUsage.handler({
      startDate: '2024-02-01',
      endDate: '2024-01-01',
    })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('must be before')
  })

  it('handles AWS API error gracefully', async () => {
    mockSend.mockRejectedValue(new Error('Access Denied'))

    const result = await getCostAndUsage.handler({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('AWS API Error')
    expect(result.content[0].text).toContain('Access Denied')
  })
})
