import { today, tomorrow, daysAgo, daysFromNow, startOfMonth, endOfMonth, startOfPreviousMonth, endOfPreviousMonth } from '../../src/utils/dates.js'

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

describe('today', () => {
  it('returns YYYY-MM-DD format', () => {
    expect(today()).toMatch(DATE_REGEX)
  })

  it('matches current date', () => {
    const now = new Date()
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    expect(today()).toBe(expected)
  })
})

describe('tomorrow', () => {
  it('returns YYYY-MM-DD format', () => {
    expect(tomorrow()).toMatch(DATE_REGEX)
  })

  it('is one day after today', () => {
    const t = parseDate(today())
    const tom = parseDate(tomorrow())
    const diffMs = tom.getTime() - t.getTime()
    expect(diffMs).toBe(24 * 60 * 60 * 1000)
  })
})

describe('daysAgo', () => {
  it('returns YYYY-MM-DD format', () => {
    expect(daysAgo(7)).toMatch(DATE_REGEX)
  })

  it('returns date N days before today', () => {
    const t = parseDate(today())
    const ago = parseDate(daysAgo(7))
    const diffDays = (t.getTime() - ago.getTime()) / (24 * 60 * 60 * 1000)
    expect(diffDays).toBe(7)
  })

  it('handles daysAgo(0) as today', () => {
    expect(daysAgo(0)).toBe(today())
  })
})

describe('daysFromNow', () => {
  it('returns YYYY-MM-DD format', () => {
    expect(daysFromNow(30)).toMatch(DATE_REGEX)
  })

  it('returns date N days after today', () => {
    const t = parseDate(today())
    const future = parseDate(daysFromNow(10))
    const diffDays = (future.getTime() - t.getTime()) / (24 * 60 * 60 * 1000)
    expect(diffDays).toBe(10)
  })

  it('daysFromNow(1) equals tomorrow', () => {
    expect(daysFromNow(1)).toBe(tomorrow())
  })
})

describe('startOfMonth', () => {
  it('returns first day of current month when no arg', () => {
    const result = startOfMonth()
    expect(result).toMatch(DATE_REGEX)
    expect(result.endsWith('-01')).toBe(true)
  })

  it('returns first day of given date\'s month', () => {
    const d = new Date(2024, 5, 15) // June 15
    expect(startOfMonth(d)).toBe('2024-06-01')
  })
})

describe('endOfMonth', () => {
  it('returns last day of current month when no arg', () => {
    const result = endOfMonth()
    expect(result).toMatch(DATE_REGEX)
  })

  it('returns correct last day for given month', () => {
    expect(endOfMonth(new Date(2024, 1, 10))).toBe('2024-02-29') // Feb leap year
    expect(endOfMonth(new Date(2023, 1, 10))).toBe('2023-02-28') // Feb non-leap
    expect(endOfMonth(new Date(2024, 0, 5))).toBe('2024-01-31')  // Jan
  })
})

describe('startOfPreviousMonth', () => {
  it('returns YYYY-MM-DD format', () => {
    expect(startOfPreviousMonth()).toMatch(DATE_REGEX)
  })

  it('returns first day and is before start of current month', () => {
    const prev = startOfPreviousMonth()
    const curr = startOfMonth()
    expect(prev.endsWith('-01')).toBe(true)
    expect(prev < curr).toBe(true)
  })
})

describe('endOfPreviousMonth', () => {
  it('returns YYYY-MM-DD format', () => {
    expect(endOfPreviousMonth()).toMatch(DATE_REGEX)
  })

  it('is the day before start of current month', () => {
    const end = parseDate(endOfPreviousMonth())
    const start = parseDate(startOfMonth())
    const diffMs = start.getTime() - end.getTime()
    expect(diffMs).toBe(24 * 60 * 60 * 1000)
  })
})
