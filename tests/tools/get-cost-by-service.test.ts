import { jest } from '@jest/globals'
import { mockSend, resetMocks } from '../__mocks__/aws-client.js'

const { getCostByService } = await import('../../src/tools/get-cost-by-service.js')

beforeEach(() => resetMocks())

describe('get_cost_by_service handler', () => {
  it('returns services sorted by cost with percentages', async () => {
    mockSend.mockResolvedValue({
      ResultsByTime: [
        {
          Groups: [
            { Keys: ['Amazon EC2'], Metrics: { UnblendedCost: { Amount: '100.00' } } },
            { Keys: ['Amazon S3'], Metrics: { UnblendedCost: { Amount: '50.00' } } },
            { Keys: ['AWS Lambda'], Metrics: { UnblendedCost: { Amount: '25.00' } } },
          ],
        },
      ],
    })

    const result = await getCostByService.handler({
      startDate: '2024-01-01',
      endDate: '2024-02-01',
    })

    expect(result.isError).toBeUndefined()
    const text = result.content[0].text
    expect(text).toContain('## AWS Cost by Service')
    expect(text).toContain('Amazon EC2')
    expect(text).toContain('$100.00')
    expect(text).toContain('57.1%')
    expect(text).toContain('$175.00')
    // EC2 should appear before S3 (sorted by cost)
    expect(text.indexOf('Amazon EC2')).toBeLessThan(text.indexOf('Amazon S3'))
    expect(text.indexOf('Amazon S3')).toBeLessThan(text.indexOf('AWS Lambda'))
  })

  it('handles empty results', async () => {
    mockSend.mockResolvedValue({ ResultsByTime: [] })

    const result = await getCostByService.handler({
      startDate: '2024-01-01',
      endDate: '2024-02-01',
    })

    expect(result.isError).toBeUndefined()
    const text = result.content[0].text
    expect(text).toContain('$0.00')
  })

  it('validates inputs', async () => {
    const result = await getCostByService.handler({
      startDate: '2024-01-01',
      endDate: 'bad-date',
    })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('Validation Error')
  })

  it('defaults granularity to MONTHLY', async () => {
    mockSend.mockResolvedValue({ ResultsByTime: [] })

    await getCostByService.handler({
      startDate: '2024-01-01',
      endDate: '2024-02-01',
    })

    const command = mockSend.mock.calls[0][0]
    expect(command.input.Granularity).toBe('MONTHLY')
  })

  it('aggregates across multiple time periods', async () => {
    mockSend.mockResolvedValue({
      ResultsByTime: [
        { Groups: [{ Keys: ['Amazon EC2'], Metrics: { UnblendedCost: { Amount: '50.00' } } }] },
        { Groups: [{ Keys: ['Amazon EC2'], Metrics: { UnblendedCost: { Amount: '30.00' } } }] },
      ],
    })

    const result = await getCostByService.handler({
      startDate: '2024-01-01',
      endDate: '2024-03-01',
      granularity: 'MONTHLY',
    })

    const text = result.content[0].text
    expect(text).toContain('$80.00')
  })
})
