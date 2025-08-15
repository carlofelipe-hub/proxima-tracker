import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const futureAffordabilitySchema = z.object({
  amount: z.number().min(0.01, "Amount must be positive"),
  targetDate: z.string().datetime("Invalid target date"),
  category: z.string().optional(),
  description: z.string().optional(),
  walletId: z.string().optional(), // Preferred wallet
})

interface FutureIncomeProjection {
  totalProjectedIncome: number
  incomeBreakdown: Array<{
    source: string
    amount: number
    date: string
    type: 'salary' | 'freelance' | 'business' | 'other'
  }>
  incomeSourcesFound: number
  incomeSourceDetails: Array<{
    name: string
    amount: number
    frequency: string
    nextPayDate: string
    isActive: boolean
  }>
  projectedBalance: number
  canAfford: boolean
  confidenceLevel: 'high' | 'medium' | 'low'
  riskFactors: string[]
  recommendations: string[]
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { amount, targetDate, category, walletId } = futureAffordabilitySchema.parse(body)
    
    const userId = session.user.id
    const target = new Date(targetDate)
    const now = new Date()
    
    // Allow today or future dates (set now to start of day for fair comparison)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate())
    
    if (targetDay < today) {
      return NextResponse.json({
        error: "Target date must be today or in the future"
      }, { status: 400 })
    }

    // Get current wallet balances
    const wallets = await prisma.wallet.findMany({
      where: {
        userId,
        isActive: true,
        ...(walletId ? { id: walletId } : {}),
      },
      select: {
        id: true,
        name: true,
        balance: true,
        type: true,
      },
    })

    const currentTotalBalance = wallets.reduce((sum, wallet) => 
      sum + Number(wallet.balance), 0
    )

    // Get all income sources with their schedules
    const incomeSources = await prisma.incomeSource.findMany({
      where: {
        userId,
        isActive: true,
      },
    })

    // Calculate projected income between now and target date
    const projectedIncomes: Array<{
      source: string
      amount: number
      date: string
      type: 'salary' | 'freelance' | 'business' | 'other'
    }> = []

    let totalProjectedIncome = 0

    for (const source of incomeSources) {
      const incomeAmount = Number(source.amount)
      const frequency = source.frequency
      let currentDate = new Date(source.nextPayDate)

      // Project income based on frequency until target date
      while (currentDate <= target) {
        if (currentDate > now) {
          projectedIncomes.push({
            source: source.name,
            amount: incomeAmount,
            date: currentDate.toISOString(),
            type: 'other',
          })
          totalProjectedIncome += incomeAmount
        }

        // Calculate next payment date based on frequency
        switch (frequency) {
          case 'WEEKLY':
            currentDate.setDate(currentDate.getDate() + 7)
            break
          case 'BIWEEKLY':
            currentDate.setDate(currentDate.getDate() + 14)
            break
          case 'MONTHLY':
            currentDate.setMonth(currentDate.getMonth() + 1)
            break
          case 'QUARTERLY':
            currentDate.setMonth(currentDate.getMonth() + 3)
            break
          case 'ANNUALLY':
            currentDate.setFullYear(currentDate.getFullYear() + 1)
            break
          default:
            // For one-time payments, only add once
            currentDate = new Date(target.getTime() + 1)
            break
        }
      }
    }

    // Calculate projected balance at target date (before considering expenses)
    const grossProjectedBalance = currentTotalBalance + totalProjectedIncome

    // Calculate confidence level based on various factors
    let confidenceLevel: 'high' | 'medium' | 'low' = 'high'
    const riskFactors: string[] = []
    const recommendations: string[] = []

    // Calculate days until target for later use
    const daysUntilTarget = Math.max(0, Math.ceil((targetDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))

    if (incomeSources.length === 0) {
      confidenceLevel = 'low'
      riskFactors.push("No income sources configured for projection")
      recommendations.push("Add your income sources for more accurate projections")
    }

    if (incomeSources.length === 1) {
      confidenceLevel = confidenceLevel === 'high' ? 'medium' : 'low'
      riskFactors.push("Single income source creates dependency risk")
      recommendations.push("Consider diversifying your income sources")
    }

    // Calculate expenses between now and target date to refine projection
    const recentExpenses = await prisma.transaction.findMany({
      where: {
        userId,
        type: 'EXPENSE',
        date: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      select: {
        amount: true,
        category: true,
      },
    })

    const monthlyExpenseAverage = recentExpenses.reduce((sum, expense) => 
      sum + Number(expense.amount), 0
    )

    const projectedRoutineExpenses = daysUntilTarget > 0 ? (monthlyExpenseAverage / 30) * daysUntilTarget : 0

    // Get ALL future planned expenses (not just between now and target)
    // This ensures we consider future financial commitments even for today's expenses
    const plannedExpenses = await prisma.plannedExpense.findMany({
      where: {
        userId,
        status: {
          in: ['PLANNED', 'SAVED'], // Only consider planned or saved expenses
        },
        targetDate: {
          gte: today, // All future expenses from today onwards
        },
      },
      select: {
        title: true,
        amount: true,
        targetDate: true,
        category: true,
        priority: true,
      },
    })

    // Separate planned expenses into different time periods for better analysis
    const upcomingPlannedExpenses = plannedExpenses.filter(pe => 
      new Date(pe.targetDate) <= target
    )
    const laterPlannedExpenses = plannedExpenses.filter(pe => 
      new Date(pe.targetDate) > target
    )

    const upcomingPlannedExpensesTotal = upcomingPlannedExpenses.reduce((sum, expense) => 
      sum + Number(expense.amount), 0
    )
    const laterPlannedExpensesTotal = laterPlannedExpenses.reduce((sum, expense) => 
      sum + Number(expense.amount), 0
    )
    const totalPlannedExpenses = upcomingPlannedExpensesTotal + laterPlannedExpensesTotal

    // For affordability calculation, consider immediate expenses plus a portion of future ones
    // This ensures we don't spend money that's already committed to future plans
    const projectedExpenses = projectedRoutineExpenses + upcomingPlannedExpensesTotal
    const futureCommitments = laterPlannedExpensesTotal
    
    // Net balance after immediate expenses and commitments
    const netProjectedBalance = grossProjectedBalance - projectedExpenses - (futureCommitments * 0.8) // 80% weight for future commitments

    // Determine if expense can be afforded (after accounting for all projected expenses)
    const canAfford = netProjectedBalance >= amount

    // Risk assessment based on timeline
    if (daysUntilTarget === 0) {
      // For today, we focus on current balance but consider future commitments
      riskFactors.push("Same-day expense relies on current available funds")
      if (futureCommitments > 0) {
        riskFactors.push(`You have ₱${futureCommitments.toLocaleString()} in future planned expenses to consider`)
      }
      recommendations.push("For today's expenses, ensure you have sufficient current balance")
      if (futureCommitments > amount * 2) {
        recommendations.push("Consider if this expense conflicts with your future financial plans")
      }
    } else if (daysUntilTarget > 90) {
      confidenceLevel = 'medium'
      riskFactors.push("Long-term projection (>3 months) has higher uncertainty")
    }
    
    if (daysUntilTarget > 180) {
      confidenceLevel = 'low'
      riskFactors.push("Very long-term projection (>6 months) is highly uncertain")
    }

    // Adjust confidence and recommendations based on spending patterns
    if (netProjectedBalance < amount) {
      confidenceLevel = 'low'
      riskFactors.push("Current spending patterns may prevent affordability")
      recommendations.push("Consider reducing daily expenses to meet your goal")
    }

    // Generate AI-powered recommendations
    if (!canAfford) {
      const shortfall = amount - netProjectedBalance
      recommendations.push(`You need an additional ₱${shortfall.toFixed(2)} to afford this expense`)
      
      if (daysUntilTarget === 0) {
        recommendations.push("For today's expense, consider using multiple wallets or postponing until you have sufficient funds")
      } else if (daysUntilTarget > 30) {
        const monthlyExtra = shortfall / (daysUntilTarget / 30)
        recommendations.push(`Save an extra ₱${monthlyExtra.toFixed(2)} per month to reach your goal`)
      } else if (daysUntilTarget > 0) {
        const dailyExtra = shortfall / daysUntilTarget
        recommendations.push(`Save an extra ₱${dailyExtra.toFixed(2)} per day to reach your goal`)
      }
    } else {
      const buffer = netProjectedBalance - amount
      const bufferPercentage = (buffer / amount) * 100
      
      if (daysUntilTarget === 0) {
        recommendations.push("You can afford this expense today with your current balance")
      } else if (bufferPercentage < 20) {
        recommendations.push("Consider saving a bit more for unexpected expenses")
      } else if (bufferPercentage > 100) {
        recommendations.push("You'll have plenty of buffer - this expense looks very affordable")
      }
    }

    // Add category-specific recommendations
    if (category) {
      switch (category.toLowerCase()) {
        case 'emergency':
          recommendations.push("Consider building an emergency fund separate from this expense")
          break
        case 'investment':
          recommendations.push("Ensure you have emergency funds before making investments")
          break
        case 'luxury':
          recommendations.push("Consider if this aligns with your financial priorities")
          break
      }
    }

    const response: FutureIncomeProjection = {
      totalProjectedIncome,
      incomeBreakdown: projectedIncomes,
      incomeSourcesFound: incomeSources.length,
      incomeSourceDetails: incomeSources.map(source => ({
        name: source.name,
        amount: Number(source.amount),
        frequency: source.frequency,
        nextPayDate: source.nextPayDate.toISOString(),
        isActive: source.isActive
      })),
      projectedBalance: netProjectedBalance,
      canAfford,
      confidenceLevel,
      riskFactors,
      recommendations,
    }

    return NextResponse.json({
      ...response,
      currentBalance: currentTotalBalance,
      targetAmount: amount,
      targetDate: target.toISOString(),
      daysUntilTarget,
      projectedExpenses,
      // Breakdown for debugging
      balanceBreakdown: {
        currentBalance: currentTotalBalance,
        projectedIncome: totalProjectedIncome,
        grossProjectedBalance: grossProjectedBalance,
        projectedExpenses: projectedExpenses,
        futureCommitments: futureCommitments,
        futureCommitmentsWeight: futureCommitments * 0.8,
        netProjectedBalance: netProjectedBalance,
        availableForExpense: netProjectedBalance
      },
      expenseBreakdown: {
        routineExpenses: projectedRoutineExpenses,
        upcomingPlannedExpenses: upcomingPlannedExpensesTotal,
        laterPlannedExpenses: laterPlannedExpensesTotal,
        totalPlannedExpenses: totalPlannedExpenses,
        upcomingPlannedExpenseDetails: upcomingPlannedExpenses.map(expense => ({
          title: expense.title,
          amount: Number(expense.amount),
          targetDate: expense.targetDate.toISOString(),
          category: expense.category,
          priority: expense.priority,
        })),
        laterPlannedExpenseDetails: laterPlannedExpenses.map(expense => ({
          title: expense.title,
          amount: Number(expense.amount),
          targetDate: expense.targetDate.toISOString(),
          category: expense.category,
          priority: expense.priority,
        })),
      },
      walletBreakdown: wallets.map(wallet => ({
        id: wallet.id,
        name: wallet.name,
        currentBalance: Number(wallet.balance),
        type: wallet.type,
      })),
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error checking future affordability:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}