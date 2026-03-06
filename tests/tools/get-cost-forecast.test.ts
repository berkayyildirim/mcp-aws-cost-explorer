import { jest } from '@jest/globals'
import { mockSend, resetMocks } from '../__mocks__/aws-client.js'

const { getCostForecast } = await import('../../src/tools/get-cost-forecast.js')

beforeEach(() => resetMocks())

describe('get_cost_forecast handler', () => {
  it('returns forecast with confidence interval', async () => {
    mockSend.mockResolvedValue({
      Total: { Amount: '500.00', Unit: 'USD' },
      ForecastResultsByTime: [
        {
          TimePeriod: { Start: '2024-02-01', End: '2024-03-01' },
          MeanValue: '500.00',
          PredictionIntervalLowerBound: '400.00',
          PredictionIntervalUpperBound: '600.00',
        },
      ],
    })

    const result = await getCostForecast.handler({ days: 30 })

    expect(result.isError).toBeUndefined()
    const text = result.content[0].text
    expect(text).toContain('## AWS Cost Forecast')
    expect(text).toContain('$500.00')
    expect(text).toContain('$400.00')
    expect(text).toContain('$600.00')
    expect(text).toContain('80%')
    expect(text).toContain('Forecast (USD)')
    expect(text).toContain('Lower Bound')
    expect(text).toContain('Upper Bound')
  })

  it('uses tomorrow as start date (checked via command input)', async () => {
    mockSend.mockResolvedValue({
      Total: { Amount: '0' },
      ForecastResultsByTime: [],
    })

    await getCostForecast.handler({})

    const command = mockSend.mock.calls[0][0]
    const todayDate = new Date()
    const tomorrowDate = new Date()
    tomorrowDate.setDate(todayDate.getDate() + 1)
    const expectedStart = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, '0')}-${String(tomorrowDate.getDate()).padStart(2, '0')}`
    expect(command.input.TimePeriod.Start).toBe(expectedStart)
  })

  it('defaults to 30 days and MONTHLY granularity', async () => {
    mockSend.mockResolvedValue({
      Total: { Amount: '0' },
      ForecastResultsByTime: [],
    })

    await getCostForecast.handler({})

    const command = mockSend.mock.calls[0][0]
    expect(command.input.Granularity).toBe('MONTHLY')
  })

  it('validates days is positive integer <= 365', async () => {
    const result1 = await getCostForecast.handler({ days: 0 })
    expect(result1.isError).toBe(true)
    expect(result1.content[0].text).toContain('Validation Error')

    const result2 = await getCostForecast.handler({ days: 366 })
    expect(result2.isError).toBe(true)
    expect(result2.content[0].text).toContain('exceeds maximum')
  })

  it('handles "not enough data" error gracefully', async () => {
    mockSend.mockRejectedValue(new Error('not enough data to forecast'))

    const result = await getCostForecast.handler({ days: 30 })

    expect(result.isError).toBeUndefined()
    expect(result.content[0].text).toContain('not enough historical cost data')
  })

  it('handles general AWS error', async () => {
    mockSend.mockRejectedValue(new Error('Throttling'))

    const result = await getCostForecast.handler({ days: 30 })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('AWS API Error')
    expect(result.content[0].text).toContain('Throttling')
  })
})
