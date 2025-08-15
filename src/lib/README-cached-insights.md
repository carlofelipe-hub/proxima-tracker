# AI Insights Caching System

## Overview

The AI Planning Insights feature now includes intelligent local storage caching to improve performance and reduce unnecessary API calls. This system automatically manages cache invalidation based on relevant data changes.

## How It Works

### 1. Smart Caching

- **Cache Duration**: 24 hours by default
- **Cache Key**: `ai_planning_insights` in localStorage
- **Data Validation**: Uses data fingerprinting to detect when underlying data changes

### 2. Cache Invalidation Triggers

The cache is automatically invalidated when:

- **Planned Expenses**: Created, updated, deleted, or status changed
- **Transactions**: New transactions added (income/expense/transfer)
- **Confidence Updates**: When confidence levels are recalculated

### 3. Cache Validation

The system creates a hash based on:

- Number of planned expenses
- Number of transactions
- Number of wallets
- Last transaction date
- Last planned expense update date

When any of these values change, the cache is automatically invalidated.

## Key Features

### 1. Automatic Cache Management

```typescript
// Cache is checked automatically
const result = await getInsights(); // Returns cached or fresh data
```

### 2. Manual Refresh

Users can force refresh insights with the refresh button, which bypasses the cache.

### 3. Visual Indicators

- **"Cached" badge**: Shows when data is loaded from cache
- **"Clear Cache" button**: Appears when using cached data
- **Loading states**: Clear indication when fetching fresh data

### 4. Fallback Strategy

If API calls fail, the system falls back to cached data as a graceful degradation.

## Implementation Details

### Files Modified:

1. **`/src/lib/cached-insights.ts`**: Core caching logic
2. **`/src/components/planning/ai-planning-insights.tsx`**: Updated component with caching
3. **`/src/app/planned-expenses/page.tsx`**: Added cache invalidation triggers
4. **`/src/components/planned-expenses/edit-planned-expense-dialog.tsx`**: Cache invalidation on edits
5. **`/src/components/transactions/add-transaction-form.tsx`**: Cache invalidation on new transactions

### Key Functions:

- `getInsights(forceRefresh)`: Main function to get insights (cached or fresh)
- `invalidateInsightsCache()`: Triggers cache clearing and notifies components
- `isCacheValid()`: Checks if cached data is still relevant
- `getCurrentDataSummary()`: Gets current state for cache validation

## Usage

The caching system is completely transparent to users. The insights will:

1. Load from cache when available and valid
2. Automatically refresh when underlying data changes
3. Allow manual refresh via the UI
4. Show clear indicators of cache status

## Benefits

- **Performance**: Faster loading of insights (no API delay)
- **Cost Efficiency**: Reduces OpenAI API calls
- **User Experience**: Immediate display of insights with cache indicators
- **Smart Updates**: Only refreshes when actually needed
- **Offline Resilience**: Falls back to cached data if API is unavailable

## Future Enhancements

Consider adding:

- Cache versioning for schema changes
- Different cache durations for different data types
- Background cache refresh for better UX
- Cache size management for storage limits
