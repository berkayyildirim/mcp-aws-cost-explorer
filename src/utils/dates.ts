function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function today(): string {
  return formatDate(new Date())
}

export function tomorrow(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return formatDate(d)
}

export function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return formatDate(d)
}

export function daysFromNow(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return formatDate(d)
}

export function startOfMonth(date?: Date): string {
  const d = date ?? new Date()
  return formatDate(new Date(d.getFullYear(), d.getMonth(), 1))
}

export function endOfMonth(date?: Date): string {
  const d = date ?? new Date()
  return formatDate(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

export function startOfPreviousMonth(): string {
  const d = new Date()
  return formatDate(new Date(d.getFullYear(), d.getMonth() - 1, 1))
}

export function endOfPreviousMonth(): string {
  const d = new Date()
  return formatDate(new Date(d.getFullYear(), d.getMonth(), 0))
}
