import { AwsCostExplorerError } from './errors.js'

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

export function validateDateString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new AwsCostExplorerError(
      `Invalid ${fieldName}: expected a string, got ${typeof value}`,
      'INVALID_DATE'
    )
  }

  if (!DATE_REGEX.test(value)) {
    throw new AwsCostExplorerError(
      `Invalid ${fieldName}: '${value}' does not match expected format. Expected format: YYYY-MM-DD`,
      'INVALID_DATE'
    )
  }

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new AwsCostExplorerError(
      `Invalid ${fieldName}: '${value}' is not a valid date. Expected format: YYYY-MM-DD`,
      'INVALID_DATE'
    )
  }

  return value
}

export function validateDateRange(startDate: string, endDate: string): void {
  if (startDate >= endDate) {
    throw new AwsCostExplorerError(
      `Invalid date range: startDate '${startDate}' must be before endDate '${endDate}'`,
      'INVALID_DATE_RANGE'
    )
  }
}

export function validateEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fieldName: string
): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new AwsCostExplorerError(
      `Invalid ${fieldName}: '${String(value)}' is not allowed. Must be one of: ${allowed.join(', ')}`,
      'INVALID_ENUM'
    )
  }
  return value as T
}

export function validatePositiveInt(
  value: unknown,
  fieldName: string,
  max?: number
): number {
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(num) || num < 1) {
    throw new AwsCostExplorerError(
      `Invalid ${fieldName}: expected a positive integer, got '${String(value)}'`,
      'INVALID_NUMBER'
    )
  }
  if (max !== undefined && num > max) {
    throw new AwsCostExplorerError(
      `Invalid ${fieldName}: ${num} exceeds maximum allowed value of ${max}`,
      'INVALID_NUMBER'
    )
  }
  return num
}
