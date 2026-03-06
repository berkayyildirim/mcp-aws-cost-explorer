export function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatPercentChange(oldValue: number, newValue: number): string {
  if (oldValue === 0 && newValue === 0) return '→ 0.0%'
  if (oldValue === 0) return '↑ N/A'
  const change = ((newValue - oldValue) / oldValue) * 100
  if (change > 0) return `↑ ${change.toFixed(1)}%`
  if (change < 0) return `↓ ${Math.abs(change).toFixed(1)}%`
  return '→ 0.0%'
}

export function buildMarkdownTable(headers: string[], rows: string[][]): string {
  const separator = headers.map(() => '---')
  const lines = [
    '| ' + headers.join(' | ') + ' |',
    '| ' + separator.join(' | ') + ' |',
    ...rows.map(row => '| ' + row.join(' | ') + ' |'),
  ]
  return lines.join('\n')
}
