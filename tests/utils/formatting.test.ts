import { formatCurrency, formatPercentChange, buildMarkdownTable } from '../../src/utils/formatting.js'

describe('formatCurrency', () => {
  it('formats positive amount', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56')
  })

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('formats large numbers with comma separators', () => {
    const result = formatCurrency(1234567.89)
    expect(result).toBe('$1,234,567.89')
  })

  it('rounds small decimals to two places', () => {
    expect(formatCurrency(0.1)).toBe('$0.10')
    expect(formatCurrency(0.999)).toBe('$1.00')
  })

  it('formats negative amounts', () => {
    const result = formatCurrency(-50.5)
    expect(result).toContain('50.50')
  })
})

describe('formatPercentChange', () => {
  it('shows increase with up arrow', () => {
    expect(formatPercentChange(100, 123.4)).toBe('↑ 23.4%')
  })

  it('shows decrease with down arrow', () => {
    expect(formatPercentChange(100, 87.9)).toBe('↓ 12.1%')
  })

  it('shows no change with right arrow', () => {
    expect(formatPercentChange(100, 100)).toBe('→ 0.0%')
  })

  it('handles both values zero', () => {
    expect(formatPercentChange(0, 0)).toBe('→ 0.0%')
  })

  it('handles old value zero with new value positive', () => {
    expect(formatPercentChange(0, 50)).toBe('↑ N/A')
  })
})

describe('buildMarkdownTable', () => {
  it('builds basic table with headers and rows', () => {
    const result = buildMarkdownTable(['Name', 'Value'], [['A', '1'], ['B', '2']])
    const lines = result.split('\n')
    expect(lines).toHaveLength(4) // header + separator + 2 rows
    expect(lines[0]).toBe('| Name | Value |')
    expect(lines[1]).toBe('| --- | --- |')
    expect(lines[2]).toBe('| A | 1 |')
    expect(lines[3]).toBe('| B | 2 |')
  })

  it('handles empty rows', () => {
    const result = buildMarkdownTable(['Col1'], [])
    const lines = result.split('\n')
    expect(lines).toHaveLength(2) // header + separator only
  })

  it('handles special characters in content', () => {
    const result = buildMarkdownTable(['Name'], [['$1,000.00']])
    expect(result).toContain('$1,000.00')
  })

  it('handles single column', () => {
    const result = buildMarkdownTable(['X'], [['val']])
    expect(result).toContain('| X |')
    expect(result).toContain('| val |')
  })
})
