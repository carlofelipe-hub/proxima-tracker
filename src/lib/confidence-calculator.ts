import { prisma } from "./prisma"
import { ConfidenceLevel } from "@prisma/client"
import { Decimal } from "@prisma/client/runtime/library"

interface ConfidenceCalculationInput {
  userId: string
  plannedExpenseId: string
  targetAmount: number
  targetDate: Date
  walletId?: string
}

interface ConfidenceResult {
  confidenceLevel: ConfidenceLevel
  currentBalance: number
  projectedBalance: number
  totalProjectedIncome: number
  projectedExpenses: number
  riskFactors: string[]
  canAfford: boolean
}

/**
 * Calculates confidence level for a planned expense based on:
 * - Current wallet balances
 * - Projected income until target date
 * - Historical spending patterns
 * - Other planned expenses
 * - Risk factors
 */
export async function calculateConfidenceLevel(
  input: ConfidenceCalculationInput
): Promise<ConfidenceResult> {
  const { userId, plannedExpenseId, targetAmount, targetDate, walletId } = input
  
  // Get current date
  const now = new Date()
  const daysUntilTarget = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  
  // 1. Calculate current total balance or specific wallet balance
  let currentBalance = 0
  if (walletId) {
    const wallet = await prisma.wallet.findFirst({
      where: { id: walletId, userId, isActive: true }
    })
    currentBalance = wallet ? Number(wallet.balance) : 0
  } else {
    const wallets = await prisma.wallet.findMany({
      where: { userId, isActive: true }
    })
    currentBalance = wallets.reduce((sum, wallet) => sum + Number(wallet.balance), 0)
  }

  // 2. Calculate projected income until target date
  const incomeSources = await prisma.incomeSource.findMany({
    where: { 
      userId, 
      isActive: true,
      ...(walletId && { walletId })
    }
  })

  let totalProjectedIncome = 0
  for (const source of incomeSources) {
    const incomeAmount = calculateIncomeProjection(source, now, targetDate)
    totalProjectedIncome += incomeAmount
  }

  // 3. Calculate projected expenses based on historical data
  const projectedExpenses = await calculateProjectedExpenses(userId, now, targetDate, walletId)

  // 4. Get other planned expenses that might compete for funds
  const otherPlannedExpenses = await prisma.plannedExpense.findMany({
    where: {
      userId,
      id: { not: plannedExpenseId },
      status: { in: ['PLANNED', 'SAVED'] },
      targetDate: { lte: targetDate },
      ...(walletId && { walletId })
    }
  })

  const competingExpenses = otherPlannedExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount), 0
  )

  // 5. Calculate projected balance at target date
  const projectedBalance = currentBalance + totalProjectedIncome - projectedExpenses - competingExpenses

  // 6. Determine if expense can be afforded
  const canAfford = projectedBalance >= targetAmount

  // 7. Calculate risk factors and confidence level
  const riskFactors: string[] = []
  let confidenceScore = 100

  // Risk factor: Insufficient funds
  if (!canAfford) {
    const shortfall = targetAmount - projectedBalance
    riskFactors.push(`Projected shortfall of ${formatCurrency(shortfall)}`)
    confidenceScore -= 40
  }

  // Risk factor: Low buffer (less than 10% cushion)
  const cushion = (projectedBalance - targetAmount) / targetAmount
  if (canAfford && cushion < 0.1) {
    riskFactors.push("Very tight budget with minimal cushion")
    confidenceScore -= 20
  }

  // Risk factor: Far future date (harder to predict)
  if (daysUntilTarget > 90) {
    riskFactors.push("Long time horizon increases uncertainty")
    confidenceScore -= 15
  }

  // Risk factor: High number of competing expenses
  if (otherPlannedExpenses.length > 5) {
    riskFactors.push("Many competing planned expenses")
    confidenceScore -= 10
  }

  // Risk factor: Irregular income sources
  const hasIrregularIncome = incomeSources.some(source => source.frequency === 'IRREGULAR')
  if (hasIrregularIncome) {
    riskFactors.push("Irregular income makes predictions less reliable")
    confidenceScore -= 15
  }

  // Risk factor: No recent transaction history for expense prediction
  const recentTransactions = await prisma.transaction.findMany({
    where: {
      userId,
      type: 'EXPENSE',
      date: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }, // Last 90 days
      ...(walletId && { walletId })
    },
    take: 1
  })

  if (recentTransactions.length === 0) {
    riskFactors.push("Limited transaction history for accurate prediction")
    confidenceScore -= 10
  }

  // Determine confidence level based on score
  let confidenceLevel: ConfidenceLevel
  if (confidenceScore >= 80) {
    confidenceLevel = ConfidenceLevel.HIGH
  } else if (confidenceScore >= 60) {
    confidenceLevel = ConfidenceLevel.MEDIUM
  } else {
    confidenceLevel = ConfidenceLevel.LOW
  }

  return {
    confidenceLevel,
    currentBalance,
    projectedBalance,
    totalProjectedIncome,
    projectedExpenses: projectedExpenses + competingExpenses,
    riskFactors,
    canAfford
  }
}

/**
 * Calculate projected income from a source between two dates
 */
function calculateIncomeProjection(
  source: {
    amount: number | string | Decimal;
    frequency: string;
  },
  startDate: Date,
  endDate: Date
): number {
  const amount = Number(source.amount)
  const daysBetween = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  
  switch (source.frequency) {
    case 'WEEKLY':
      return amount * Math.floor(daysBetween / 7)
    case 'BIWEEKLY':
      return amount * Math.floor(daysBetween / 14)
    case 'MONTHLY':
      return amount * Math.floor(daysBetween / 30)
    case 'BIMONTHLY':
      return amount * Math.floor(daysBetween / 60)
    case 'QUARTERLY':
      return amount * Math.floor(daysBetween / 90)
    case 'ANNUALLY':
      return amount * Math.floor(daysBetween / 365)
    case 'IRREGULAR':
      // For irregular income, assume half the normal amount over the period
      return amount * Math.floor(daysBetween / 60) * 0.5
    default:
      return 0
  }
}

/**
 * Calculate projected expenses based on historical spending patterns
 */
async function calculateProjectedExpenses(
  userId: string,
  startDate: Date,
  endDate: Date,
  walletId?: string
): Promise<number> {
  const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  
  // Get last 90 days of expenses to calculate daily average
  const historicalExpenses = await prisma.transaction.findMany({
    where: {
      userId,
      type: 'EXPENSE',
      date: { 
        gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
      },
      ...(walletId && { walletId })
    }
  })

  if (historicalExpenses.length === 0) {
    return 0 // No historical data, assume no expenses
  }

  const totalHistoricalExpenses = historicalExpenses.reduce(
    (sum, transaction) => sum + Number(transaction.amount), 0
  )
  
  const dailyAverageExpense = totalHistoricalExpenses / 90
  
  return dailyAverageExpense * daysInPeriod
}

/**
 * Update confidence level for a specific planned expense
 */
export async function updatePlannedExpenseConfidence(plannedExpenseId: string) {
  const plannedExpense = await prisma.plannedExpense.findUnique({
    where: { id: plannedExpenseId }
  })

  if (!plannedExpense) {
    throw new Error("Planned expense not found")
  }

  const result = await calculateConfidenceLevel({
    userId: plannedExpense.userId,
    plannedExpenseId: plannedExpense.id,
    targetAmount: Number(plannedExpense.amount),
    targetDate: plannedExpense.targetDate,
    walletId: plannedExpense.walletId || undefined
  })

  await prisma.plannedExpense.update({
    where: { id: plannedExpenseId },
    data: {
      confidenceLevel: result.confidenceLevel,
      lastConfidenceUpdate: new Date()
    }
  })

  return result
}

/**
 * Update confidence levels for all planned expenses of a user
 */
export async function updateAllUserConfidenceLevels(userId: string) {
  const plannedExpenses = await prisma.plannedExpense.findMany({
    where: {
      userId,
      status: { in: ['PLANNED', 'SAVED'] }
    }
  })

  const results = []
  for (const expense of plannedExpenses) {
    try {
      const result = await updatePlannedExpenseConfidence(expense.id)
      results.push({ expenseId: expense.id, ...result })
    } catch (error) {
      console.error(`Failed to update confidence for expense ${expense.id}:`, error)
    }
  }

  return results
}

// Helper function for currency formatting
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
  }).format(amount)
}