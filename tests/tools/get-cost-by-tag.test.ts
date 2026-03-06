import { jest } from '@jest/globals'
import { mockSend, resetMocks } from '../__mocks__/aws-client.js'

const { getCostByTag } = await import('../../src/tools/get-cost-by-tag.js')

beforeEach(() => resetMocks())

describe('get_cost_by_tag handler', () => {
  it('returns tag values sorted by cost', async () => {
    mockSend.mockResolvedValue({
      ResultsByTime: [
        {
          Groups: [
            { Keys: ['Environment$production'], Metrics: { UnblendedCost: { Amount: '200.00' } } },
            { Keys: ['Environment$staging'], Metrics: { UnblendedCost: { Amount: '50.00' } } },
          ],
        },
      ],
    })

    const result = await getCostByTag.handler({
      startDate: '2024-01-01',
      endDate: '2024-02-01',
      tag_key: 'Environment',
    })

    expect(result.isError).toBeUndefined()
    const text = result.content[0].text
    expect(text).toContain('## AWS Cost by Tag: Environment')
    expect(text).toContain('production')
    expect(text).toContain('staging')
    expect(text).toContain('$200.00')
    // production should appear before staging
    expect(text.indexOf('production')).toBeLessThan(text.indexOf('staging'))
  })

  it('labels empty tag values as (untagged)', async () => {
    mockSend.mockResolvedValue({
      ResultsByTime: [
        {
          Groups: [
            { Keys: ['Environment$'], Metrics: { UnblendedCost: { Amount: '100.00' } } },
            { Keys: ['Environment$prod'], Metrics: { UnblendedCost: { Amount: '50.00' } } },
          ],
        },
      ],
    })

    const result = await getCostByTag.handler({
      startDate: '2024-01-01',
      endDate: '2024-02-01',
      tag_key: 'Environment',
    })

    const text = result.content[0].text
    expect(text).toContain('(untagged)')
  })

  it('validates tag_key is provided', async () => {
    const result = await getCostByTag.handler({
      startDate: '2024-01-01',
      endDate: '2024-02-01',
    })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('Validation Error')
  })

  it('validates tag_key is non-empty', async () => {
    const result = await getCostByTag.handler({
      startDate: '2024-01-01',
      endDate: '2024-02-01',
      tag_key: '  ',
    })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('non-empty string')
  })

  it('validates date inputs', async () => {
    const result = await getCostByTag.handler({
      startDate: 'not-a-date',
      endDate: '2024-02-01',
      tag_key: 'Team',
    })

    expect(result.isError).toBe(true)
  })
})
