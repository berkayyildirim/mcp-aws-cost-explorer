import { jest } from '@jest/globals'
import { mockSend, resetMocks } from '../__mocks__/aws-client.js'

const { getCostComparison } = await import('../../src/tools/get-cost-comparison.js')

beforeEach(() => resetMocks())

function makeCostResponse(groups: Array<{ key: string; amount: string }>) {
  return {
    ResultsByTime: [
      {
        Groups: groups.map(g => ({
          Keys: [g.key],
          Metrics: { UnblendedCost: { Amount: g.amount } },
        })),
      },
    ],
  }
}

describe('get_cost_comparison handler', () => {
  it('returns comparison with defaults (current month vs previous)', async () => {
    mockSend
      .mockResolvedValueOnce(makeCostResponse([
        { key: 'Amazon EC2', amount: '150.00' },
        { key: 'Amazon S3', amount: '50.00' },
      ]))
      .mockResolvedValueOnce(makeCostResponse([
        { key: 'Amazon EC2', amount: '100.00' },
        { key: 'Amazon S3', amount: '60.00' },
      ]))

    const result = await getCostComparison.handler({})

    expect(result.isError).toBeUndefined()
    const text = result.content[0].text
    expect(text).toContain('## AWS Cost Comparison')
    expect(text).toContain('Amazon EC2')
    expect(text).toContain('Amazon S3')
    expect(text).toContain('Name')
    expect(text).toContain('Previous ($)')
    expect(text).toContain('Current ($)')
    expect(text).toContain('Change ($)')
    expect(text).toContain('Change (%)')
  })

  it('works with custom date ranges', async () => {
    mockSend
      .mockResolvedValueOnce(makeCostResponse([{ key: 'Lambda', amount: '30.00' }]))
      .mockResolvedValueOnce(makeCostResponse([{ key: 'Lambda', amount: '20.00' }]))

    const result = await getCostComparison.handler({
      current_start: '2024-02-01',
      current_end: '2024-02-28',
      previous_start: '2024-01-01',
      previous_end: '2024-01-31',
    })

    expect(result.isError).toBeUndefined()
    const text = result.content[0].text
    expect(text).toContain('2024-02-01')
    expect(text).toContain('2024-01-01')
  })

  it('correctly calculates percentage change', async () => {
    mockSend
      .mockResolvedValueOnce(makeCostResponse([{ key: 'EC2', amount: '200.00' }]))
      .mockResolvedValueOnce(makeCostResponse([{ key: 'EC2', amount: '100.00' }]))

    const result = await getCostComparison.handler({
      current_start: '2024-02-01',
      current_end: '2024-02-28',
      previous_start: '2024-01-01',
      previous_end: '2024-01-31',
    })

    const text = result.content[0].text
    // EC2 went from $100 to $200 = 100% increase
    expect(text).toContain('100.0%')
  })

  it('sorts by absolute change descending', async () => {
    mockSend
      .mockResolvedValueOnce(makeCostResponse([
        { key: 'EC2', amount: '150.00' },
        { key: 'S3', amount: '10.00' },
        { key: 'RDS', amount: '80.00' },
      ]))
      .mockResolvedValueOnce(makeCostResponse([
        { key: 'EC2', amount: '100.00' },
        { key: 'S3', amount: '10.00' },
        { key: 'RDS', amount: '100.00' },
      ]))

    const result = await getCostComparison.handler({
      current_start: '2024-02-01',
      current_end: '2024-02-28',
      previous_start: '2024-01-01',
      previous_end: '2024-01-31',
    })

    const text = result.content[0].text
    // EC2 changed by +50, RDS by -20, S3 by 0
    // So EC2 first, then RDS, then S3
    const ec2Pos = text.indexOf('EC2')
    const rdsPos = text.indexOf('RDS')
    const s3Pos = text.indexOf('S3')
    expect(ec2Pos).toBeLessThan(rdsPos)
    expect(rdsPos).toBeLessThan(s3Pos)
  })

  it('handles services only in one period', async () => {
    mockSend
      .mockResolvedValueOnce(makeCostResponse([
        { key: 'NewService', amount: '75.00' },
      ]))
      .mockResolvedValueOnce(makeCostResponse([
        { key: 'OldService', amount: '50.00' },
      ]))

    const result = await getCostComparison.handler({
      current_start: '2024-02-01',
      current_end: '2024-02-28',
      previous_start: '2024-01-01',
      previous_end: '2024-01-31',
    })

    const text = result.content[0].text
    expect(text).toContain('NewService')
    expect(text).toContain('OldService')
  })

  it('validates date inputs', async () => {
    const result = await getCostComparison.handler({
      current_start: 'bad',
    })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('Validation Error')
  })

  it('validates invalid group_by', async () => {
    const result = await getCostComparison.handler({
      current_start: '2024-02-01',
      current_end: '2024-02-28',
      previous_start: '2024-01-01',
      previous_end: '2024-01-31',
      group_by: 'INVALID',
    })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('Validation Error')
  })
})
