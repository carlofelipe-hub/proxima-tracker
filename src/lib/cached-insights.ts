"use client"

interface PlanningInsights {
  planningScore: number
  summary: string
  recommendations: string[]
  priorityInsights: string
  timelineOptimization: string
  budgetAlignment: string
  riskAssessment: {
    overallRisk: "LOW" | "MEDIUM" | "HIGH"
    cashFlowRisk: string
    timelineRisk: string
  }
  actionPlan: {
    immediate: string[]
    shortTerm: string[]
    longTerm: string[]
  }
  categoryInsights: string
  confidenceOptimization: string
}

interface CachedInsights {
  data: PlanningInsights
  timestamp: number
  dataHash: string // Hash of the data used to generate insights
}

interface DataForHashing {
  plannedExpensesCount: number
  transactionsCount: number
  walletsCount: number
  lastTransactionDate?: string
  lastPlannedExpenseDate?: string
}

const CACHE_KEY = 'ai_planning_insights'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

// Generate a simple hash from the data that affects insights
function generateDataHash(data: DataForHashing): string {
  const str = JSON.stringify(data)
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}

// Get current financial data summary for cache validation
export async function getCurrentDataSummary(): Promise<DataForHashing> {
  try {
    // Fetch planned expenses count and latest date
    const plannedResponse = await fetch('/api/planned-expenses?limit=1')
    const plannedData = plannedResponse.ok ? await plannedResponse.json() : { plannedExpenses: [], pagination: { total: 0 } }
    
    // Fetch recent transactions count and latest date
    const transactionsResponse = await fetch('/api/transactions?limit=1')
    const transactionsData = transactionsResponse.ok ? await transactionsResponse.json() : { transactions: [], pagination: { total: 0 } }
    
    // Fetch wallets count
    const walletsResponse = await fetch('/api/wallets')
    const walletsData = walletsResponse.ok ? await walletsResponse.json() : []

    const plannedExpenses = plannedData.plannedExpenses || []
    const transactions = transactionsData.transactions || []
    
    return {
      plannedExpensesCount: plannedData.pagination?.total || 0,
      transactionsCount: transactionsData.pagination?.total || 0,
      walletsCount: walletsData.length || 0,
      lastTransactionDate: transactions[0]?.date,
      lastPlannedExpenseDate: plannedExpenses[0]?.updatedAt
    }
  } catch (error) {
    console.error('Error getting data summary:', error)
    // Return default values if API calls fail
    return {
      plannedExpensesCount: 0,
      transactionsCount: 0,
      walletsCount: 0
    }
  }
}

// Save insights to local storage
export function saveInsightsToCache(insights: PlanningInsights, dataHash: string): void {
  try {
    const cachedData: CachedInsights = {
      data: insights,
      timestamp: Date.now(),
      dataHash
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cachedData))
  } catch (error) {
    console.error('Error saving insights to cache:', error)
  }
}

// Get insights from local storage
export function getInsightsFromCache(): CachedInsights | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null
    
    const cachedData: CachedInsights = JSON.parse(cached)
    
    // Check if cache is expired
    const now = Date.now()
    if (now - cachedData.timestamp > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY)
      return null
    }
    
    return cachedData
  } catch (error) {
    console.error('Error reading insights from cache:', error)
    localStorage.removeItem(CACHE_KEY)
    return null
  }
}

// Check if cached insights are still valid
export async function isCacheValid(): Promise<boolean> {
  try {
    const cached = getInsightsFromCache()
    if (!cached) return false
    
    const currentDataSummary = await getCurrentDataSummary()
    const currentHash = generateDataHash(currentDataSummary)
    
    return cached.dataHash === currentHash
  } catch (error) {
    console.error('Error validating cache:', error)
    return false
  }
}

// Clear insights cache
export function clearInsightsCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch (error) {
    console.error('Error clearing insights cache:', error)
  }
}

// Trigger cache invalidation when data changes
export function invalidateInsightsCache(): void {
  clearInsightsCache()
  // Dispatch a custom event that components can listen to
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('insightsCacheInvalidated'))
  }
}

// Main function to get insights (cached or fresh)
export async function getInsights(forceRefresh = false): Promise<{ insights: PlanningInsights; fromCache: boolean }> {
  try {
    // Check if we should use cache
    if (!forceRefresh) {
      const cached = getInsightsFromCache()
      if (cached) {
        const isValid = await isCacheValid()
        if (isValid) {
          return { insights: cached.data, fromCache: true }
        }
      }
    }
    
    // Fetch fresh insights
    const response = await fetch('/api/ai-planning')
    if (!response.ok) {
      throw new Error('Failed to fetch insights')
    }
    
    const data = await response.json()
    const insights = data.insights
    
    // Cache the new insights
    const currentDataSummary = await getCurrentDataSummary()
    const currentHash = generateDataHash(currentDataSummary)
    saveInsightsToCache(insights, currentHash)
    
    return { insights, fromCache: false }
  } catch (error) {
    console.error('Error getting insights:', error)
    
    // Try to return cached data as fallback
    const cached = getInsightsFromCache()
    if (cached) {
      return { insights: cached.data, fromCache: true }
    }
    
    throw error
  }
}
