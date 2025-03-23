import dayjs from 'dayjs'

/**
 * Formatiert einen Betrag als Währung
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}

/**
 * Formatiert ein Datum im deutschen Format
 */
export function formatDate(dateString: string): string {
  return dayjs(dateString).format('DD.MM.YYYY')
}

/**
 * Formatiert ein Datum mit Uhrzeit im deutschen Format
 */
export function formatDateTime(dateString: string): string {
  return dayjs(dateString).format('DD.MM.YYYY HH:mm')
}

/**
 * Gibt die CSS-Klasse für einen Betrag zurück (positiv, negativ, neutral)
 */
export function getAmountClass(amount: number): string {
  if (amount > 0) return 'text-success'
  if (amount < 0) return 'text-error'
  return ''
}

/**
 * Rundet einen Betrag für statistische Zwecke (2 Nachkommastellen)
 */
export function roundForStats(amount: number): number {
  return Math.round(amount * 100) / 100
}

/**
 * Formatiert eine Zahl mit Tausendertrennzeichen und zwei Nachkommastellen
 */
export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Formatiert einen Prozentsatz
 */
export function formatPercent(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value / 100)
}
