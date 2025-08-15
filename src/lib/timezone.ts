/**
 * Timezone utilities for Philippine Time (UTC+8)
 * Ensures all dates are consistently handled in Philippine timezone
 */

// Philippine timezone offset (UTC+8)
const PHILIPPINE_TIMEZONE_OFFSET = 8 * 60 // 8 hours in minutes

/**
 * Get current date and time in Philippine timezone
 */
export function getNowInPhilippineTime(): Date {
  const now = new Date()
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
  return new Date(utc + (PHILIPPINE_TIMEZONE_OFFSET * 60000))
}

/**
 * Convert any date to Philippine timezone
 */
export function toPhilippineTime(date: Date | string): Date {
  const inputDate = typeof date === 'string' ? new Date(date) : date
  const utc = inputDate.getTime() + (inputDate.getTimezoneOffset() * 60000)
  return new Date(utc + (PHILIPPINE_TIMEZONE_OFFSET * 60000))
}

/**
 * Get Philippine time formatted for datetime-local input (YYYY-MM-DDTHH:MM)
 */
export function getPhilippineTimeForInput(): string {
  const philippineTime = getNowInPhilippineTime()
  return philippineTime.toISOString().slice(0, 16)
}

/**
 * Get Philippine date formatted for date input (YYYY-MM-DD)
 */
export function getPhilippineDateForInput(): string {
  const philippineTime = getNowInPhilippineTime()
  return philippineTime.toISOString().slice(0, 10)
}

/**
 * Convert datetime-local input to Philippine timezone Date object
 */
export function fromDateTimeLocalToPhilippineTime(dateTimeString: string): Date {
  // datetime-local input gives us YYYY-MM-DDTHH:MM format
  // We need to treat this as Philippine time, not local time
  const date = new Date(dateTimeString)
  
  // Adjust for the difference between user's timezone and Philippine timezone
  const userOffset = date.getTimezoneOffset()
  const philippineOffset = -480 // UTC+8 = -480 minutes from UTC
  const offsetDiff = userOffset - philippineOffset
  
  return new Date(date.getTime() + (offsetDiff * 60000))
}

/**
 * Convert date input to Philippine timezone Date object at start of day
 */
export function fromDateInputToPhilippineTime(dateString: string): Date {
  // Date input gives us YYYY-MM-DD format
  // We want this to represent the start of day in Philippine timezone
  const parts = dateString.split('-')
  const year = parseInt(parts[0])
  const month = parseInt(parts[1]) - 1 // Month is 0-indexed
  const day = parseInt(parts[2])
  
  // Create date in Philippine timezone (as if it were UTC+8)
  const philippineDate = new Date()
  philippineDate.setUTCFullYear(year, month, day)
  philippineDate.setUTCHours(0, 0, 0, 0)
  
  // Convert from UTC to Philippine time
  return new Date(philippineDate.getTime() - (PHILIPPINE_TIMEZONE_OFFSET * 60 * 60 * 1000))
}

/**
 * Format date for display in Philippine timezone
 */
export function formatPhilippineDate(date: Date | string, options: Intl.DateTimeFormatOptions = {}): string {
  const inputDate = typeof date === 'string' ? new Date(date) : date
  const philippineTime = toPhilippineTime(inputDate)
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  }
  
  return philippineTime.toLocaleDateString('en-PH', defaultOptions)
}

/**
 * Format datetime for display in Philippine timezone
 */
export function formatPhilippineDateTime(date: Date | string, options: Intl.DateTimeFormatOptions = {}): string {
  const inputDate = typeof date === 'string' ? new Date(date) : date
  const philippineTime = toPhilippineTime(inputDate)
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...options
  }
  
  return philippineTime.toLocaleDateString('en-PH', defaultOptions)
}

/**
 * Add days to a date in Philippine timezone
 */
export function addDaysInPhilippineTime(date: Date, days: number): Date {
  const philippineTime = toPhilippineTime(date)
  philippineTime.setDate(philippineTime.getDate() + days)
  return philippineTime
}

/**
 * Get start of day in Philippine timezone
 */
export function getStartOfDayInPhilippineTime(date: Date | string = new Date()): Date {
  const inputDate = typeof date === 'string' ? new Date(date) : date
  const philippineTime = toPhilippineTime(inputDate)
  philippineTime.setHours(0, 0, 0, 0)
  return philippineTime
}

/**
 * Get end of day in Philippine timezone
 */
export function getEndOfDayInPhilippineTime(date: Date | string = new Date()): Date {
  const inputDate = typeof date === 'string' ? new Date(date) : date
  const philippineTime = toPhilippineTime(inputDate)
  philippineTime.setHours(23, 59, 59, 999)
  return philippineTime
}

/**
 * Calculate days between two dates in Philippine timezone
 */
export function getDaysBetweenInPhilippineTime(startDate: Date | string, endDate: Date | string): number {
  const start = getStartOfDayInPhilippineTime(startDate)
  const end = getStartOfDayInPhilippineTime(endDate)
  const diffTime = end.getTime() - start.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Convert a date to ISO string but ensure it represents Philippine time
 */
export function toPhilippineISOString(date: Date | string): string {
  const inputDate = typeof date === 'string' ? new Date(date) : date
  const philippineTime = toPhilippineTime(inputDate)
  return philippineTime.toISOString()
}
