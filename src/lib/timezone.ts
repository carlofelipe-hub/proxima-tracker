/**
 * Timezone utilities for Philippine Time (UTC+8)
 * Database stores UTC, display converts to Philippine time, input converts to UTC
 */

export const PHILIPPINE_TIMEZONE = 'Asia/Manila';

/**
 * Get current UTC date (for database storage)
 * Database should always store UTC dates
 */
export function getNowInPhilippineTime(): Date {
  // Return current UTC time - database stores in UTC
  return new Date()
}

/**
 * Convert UTC date to Philippine timezone for display (string format)
 * Use this when displaying dates from the database
 */
export function toPhilippineTime(date: Date | string): string {
  const inputDate = typeof date === 'string' ? new Date(date) : date
  return inputDate.toLocaleString('en-PH', {
    timeZone: PHILIPPINE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

/**
 * Convert UTC date to Philippine timezone as Date object
 * Use this for date operations/comparisons that need Date methods
 */
export function toPhilippineDate(date: Date | string): Date {
  const inputDate = typeof date === 'string' ? new Date(date) : date
  
  // Get the time in Philippine timezone
  const philippineTimeMs = inputDate.getTime() + (8 * 60 * 60 * 1000) // Add 8 hours
  
  return new Date(philippineTimeMs)
}

/**
 * Get current Philippine time formatted for datetime-local input (YYYY-MM-DDTHH:MM)
 */
export function getPhilippineTimeForInput(): string {
  const now = new Date()
  // Convert current UTC to Philippine time for input display
  const philippineTime = now.toLocaleString('sv-SE', {
    timeZone: PHILIPPINE_TIMEZONE
  }).replace(' ', 'T').slice(0, 16)
  return philippineTime
}

/**
 * Get current Philippine date formatted for date input (YYYY-MM-DD)
 */
export function getPhilippineDateForInput(): string {
  const now = new Date()
  return now.toLocaleDateString('en-CA', {
    timeZone: PHILIPPINE_TIMEZONE
  })
}

/**
 * Convert datetime-local input (assumed to be Philippine time) to UTC Date for database
 */
export function fromDateTimeLocalToPhilippineTime(dateTimeString: string): Date {
  // Input format: YYYY-MM-DDTHH:MM (assumed to be Philippine time)
  // Convert to UTC for database storage
  const date = new Date(dateTimeString)
  
  // Get Philippine timezone offset (UTC+8 = -480 minutes)
  const philippineOffset = -8 * 60 // UTC+8 in minutes
  const localOffset = date.getTimezoneOffset()
  
  // Adjust to convert from Philippine time to UTC
  const offsetDifference = (localOffset - philippineOffset) * 60 * 1000
  return new Date(date.getTime() + offsetDifference)
}

/**
 * Convert date input (assumed to be Philippine date) to UTC Date for database
 */
export function fromDateInputToPhilippineTime(dateString: string): Date {
  // Input format: YYYY-MM-DD (assumed to be Philippine date)
  // Convert to UTC start of day for that Philippine date
  
  // Create date in Philippine timezone
  const [year, month, day] = dateString.split('-').map(Number)
  
  // Create a date object representing start of day in Philippine timezone
  const philippineDate = new Date()
  philippineDate.setFullYear(year, month - 1, day) // month is 0-indexed
  philippineDate.setHours(0, 0, 0, 0)
  
  // Convert from local time to Philippine time, then to UTC
  const localOffset = philippineDate.getTimezoneOffset()
  const philippineOffset = -8 * 60 // UTC+8
  const offsetDifference = (localOffset - philippineOffset) * 60 * 1000
  
  return new Date(philippineDate.getTime() + offsetDifference)
}

/**
 * Format UTC date for display in Philippine timezone (date only)
 */
export function formatPhilippineDate(date: Date | string, options: Intl.DateTimeFormatOptions = {}): string {
  const inputDate = typeof date === 'string' ? new Date(date) : date
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: PHILIPPINE_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  }
  
  return inputDate.toLocaleDateString('en-PH', defaultOptions)
}

/**
 * Format UTC datetime for display in Philippine timezone (date and time)
 */
export function formatPhilippineDateTime(date: Date | string, options: Intl.DateTimeFormatOptions = {}): string {
  const inputDate = typeof date === 'string' ? new Date(date) : date
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: PHILIPPINE_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...options
  }
  
  return inputDate.toLocaleString('en-PH', defaultOptions)
}

/**
 * Add days to a UTC date
 */
export function addDaysInPhilippineTime(date: Date, days: number): Date {
  const newDate = new Date(date)
  newDate.setUTCDate(newDate.getUTCDate() + days)
  return newDate
}

/**
 * Get start of day in Philippine timezone as UTC date
 */
export function getStartOfDayInPhilippineTime(date: Date | string = new Date()): Date {
  const inputDate = typeof date === 'string' ? new Date(date) : date
  
  // Get the date string in Philippine timezone
  const philippineDateString = inputDate.toLocaleDateString('en-CA', {
    timeZone: PHILIPPINE_TIMEZONE
  })
  
  // Create start of day (00:00:00) in Philippine timezone
  // This represents midnight Philippine time as a UTC date
  const startOfDay = new Date(`${philippineDateString}T00:00:00+08:00`)
  return startOfDay
}

/**
 * Get end of day in Philippine timezone as UTC date
 */
export function getEndOfDayInPhilippineTime(date: Date | string = new Date()): Date {
  const inputDate = typeof date === 'string' ? new Date(date) : date
  
  // Get the date string in Philippine timezone
  const philippineDateString = inputDate.toLocaleDateString('en-CA', {
    timeZone: PHILIPPINE_TIMEZONE
  })
  
  // Create end of day (23:59:59.999) in Philippine timezone
  const endOfDay = new Date(`${philippineDateString}T23:59:59.999+08:00`)
  return endOfDay
}

/**
 * Calculate days between two dates (UTC dates)
 */
export function getDaysBetweenInPhilippineTime(startDate: Date | string, endDate: Date | string): number {
  const start = getStartOfDayInPhilippineTime(startDate)
  const end = getStartOfDayInPhilippineTime(endDate)
  const diffTime = end.getTime() - start.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Check if a UTC date is today in Philippine timezone
 */
export function isToday(date: Date | string): boolean {
  const inputDate = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  
  const inputDatePH = inputDate.toLocaleDateString('en-CA', {
    timeZone: PHILIPPINE_TIMEZONE
  })
  const todayPH = today.toLocaleDateString('en-CA', {
    timeZone: PHILIPPINE_TIMEZONE
  })
  
  return inputDatePH === todayPH
}

/**
 * Convert UTC date to Philippine timezone ISO string (for display)
 */
export function toPhilippineISOString(date: Date | string): string {
  const inputDate = typeof date === 'string' ? new Date(date) : date
  
  // Get Philippine time components
  const year = inputDate.toLocaleString('en-CA', { timeZone: PHILIPPINE_TIMEZONE, year: 'numeric' })
  const month = inputDate.toLocaleString('en-CA', { timeZone: PHILIPPINE_TIMEZONE, month: '2-digit' })
  const day = inputDate.toLocaleString('en-CA', { timeZone: PHILIPPINE_TIMEZONE, day: '2-digit' })
  const hour = inputDate.toLocaleString('en-CA', { timeZone: PHILIPPINE_TIMEZONE, hour: '2-digit', hour12: false })
  const minute = inputDate.toLocaleString('en-CA', { timeZone: PHILIPPINE_TIMEZONE, minute: '2-digit' })
  const second = inputDate.toLocaleString('en-CA', { timeZone: PHILIPPINE_TIMEZONE, second: '2-digit' })
  
  return `${year}-${month}-${day}T${hour}:${minute}:${second}+08:00`
}
