/**
 * Format amount to Philippine Peso currency
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "₱0.00"
  
  const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount
  
  if (isNaN(numericAmount)) return "₱0.00"
  
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount)
}

/**
 * Parse currency string to number
 */
export function parseCurrency(value: string): number {
  // Remove PHP symbol, commas, and spaces
  const cleanValue = value.replace(/[₱,\s]/g, "")
  return parseFloat(cleanValue) || 0
}

/**
 * Format number input for currency display
 */
export function formatCurrencyInput(value: string): string {
  const numericValue = parseCurrency(value)
  if (isNaN(numericValue)) return ""
  return numericValue.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}