import { validateDateString, validateDateRange, validateEnum, validatePositiveInt } from '../../src/utils/validation.js'
import { AwsCostExplorerError } from '../../src/utils/errors.js'

describe('validateDateString', () => {
  it('returns valid date string', () => {
    expect(validateDateString('2024-01-15', 'startDate')).toBe('2024-01-15')
  })

  it('accepts leap day', () => {
    expect(validateDateString('2024-02-29', 'date')).toBe('2024-02-29')
  })

  it('throws on non-string input', () => {
    expect(() => validateDateString(123, 'startDate')).toThrow(AwsCostExplorerError)
    expect(() => validateDateString(123, 'startDate')).toThrow('expected a string')
  })

  it('throws on invalid format', () => {
    expect(() => validateDateString('01-15-2024', 'startDate')).toThrow('does not match expected format')
  })

  it('throws on empty string', () => {
    expect(() => validateDateString('', 'startDate')).toThrow(AwsCostExplorerError)
  })

  it('throws on invalid calendar date (Feb 30)', () => {
    expect(() => validateDateString('2024-02-30', 'startDate')).toThrow('is not a valid date')
  })

  it('throws on invalid calendar date (month 13)', () => {
    expect(() => validateDateString('2024-13-01', 'startDate')).toThrow('is not a valid date')
  })

  it('throws on non-leap year Feb 29', () => {
    expect(() => validateDateString('2023-02-29', 'startDate')).toThrow('is not a valid date')
  })

  it('error has INVALID_DATE code', () => {
    try {
      validateDateString('bad', 'field')
      fail('should throw')
    } catch (e) {
      expect(e).toBeInstanceOf(AwsCostExplorerError)
      expect((e as AwsCostExplorerError).code).toBe('INVALID_DATE')
    }
  })
})

describe('validateDateRange', () => {
  it('accepts valid range', () => {
    expect(() => validateDateRange('2024-01-01', '2024-01-31')).not.toThrow()
  })

  it('throws when start equals end', () => {
    expect(() => validateDateRange('2024-01-01', '2024-01-01')).toThrow(AwsCostExplorerError)
    expect(() => validateDateRange('2024-01-01', '2024-01-01')).toThrow('must be before')
  })

  it('throws when start is after end', () => {
    expect(() => validateDateRange('2024-02-01', '2024-01-01')).toThrow('must be before')
  })

  it('error has INVALID_DATE_RANGE code', () => {
    try {
      validateDateRange('2024-02-01', '2024-01-01')
      fail('should throw')
    } catch (e) {
      expect((e as AwsCostExplorerError).code).toBe('INVALID_DATE_RANGE')
    }
  })
})

describe('validateEnum', () => {
  const allowed = ['DAILY', 'MONTHLY'] as const

  it('returns valid enum value', () => {
    expect(validateEnum('DAILY', allowed, 'granularity')).toBe('DAILY')
  })

  it('throws on invalid value', () => {
    expect(() => validateEnum('WEEKLY', allowed, 'granularity')).toThrow('is not allowed')
    expect(() => validateEnum('WEEKLY', allowed, 'granularity')).toThrow('Must be one of: DAILY, MONTHLY')
  })

  it('is case sensitive', () => {
    expect(() => validateEnum('daily', allowed, 'granularity')).toThrow(AwsCostExplorerError)
  })

  it('throws on non-string input', () => {
    expect(() => validateEnum(42, allowed, 'granularity')).toThrow(AwsCostExplorerError)
  })

  it('error has INVALID_ENUM code', () => {
    try {
      validateEnum('bad', allowed, 'field')
      fail('should throw')
    } catch (e) {
      expect((e as AwsCostExplorerError).code).toBe('INVALID_ENUM')
    }
  })
})

describe('validatePositiveInt', () => {
  it('returns valid positive integer', () => {
    expect(validatePositiveInt(10, 'days')).toBe(10)
  })

  it('accepts string that parses to positive int', () => {
    expect(validatePositiveInt('5', 'days')).toBe(5)
  })

  it('throws on zero', () => {
    expect(() => validatePositiveInt(0, 'days')).toThrow('expected a positive integer')
  })

  it('throws on negative number', () => {
    expect(() => validatePositiveInt(-3, 'days')).toThrow(AwsCostExplorerError)
  })

  it('throws on float', () => {
    expect(() => validatePositiveInt(3.5, 'days')).toThrow('expected a positive integer')
  })

  it('throws on non-numeric string', () => {
    expect(() => validatePositiveInt('abc', 'days')).toThrow(AwsCostExplorerError)
  })

  it('respects max parameter', () => {
    expect(validatePositiveInt(365, 'days', 365)).toBe(365)
    expect(() => validatePositiveInt(366, 'days', 365)).toThrow('exceeds maximum')
  })

  it('error has INVALID_NUMBER code', () => {
    try {
      validatePositiveInt(-1, 'field')
      fail('should throw')
    } catch (e) {
      expect((e as AwsCostExplorerError).code).toBe('INVALID_NUMBER')
    }
  })
})
