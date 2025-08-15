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
    
    if (target <= now) {
      return NextResponse.json({
        error: "Target date must be in the future"
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

    // Calculate projected balance at target date
    const projectedBalance = currentTotalBalance + totalProjectedIncome

    // Determine if expense can be afforded
    const canAfford = projectedBalance >= amount

    // Calculate confidence level based on various factors
    let confidenceLevel: 'high' | 'medium' | 'low' = 'high'
    const riskFactors: string[] = []
    const recommendations: string[] = []

    // Risk assessment
    const daysUntilTarget = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysUntilTarget > 90) {
      confidenceLevel = 'medium'
      riskFactors.push("Long-term projection (>3 months) has higher uncertainty")
    }
    
    if (daysUntilTarget > 180) {
      confidenceLevel = 'low'
      riskFactors.push("Very long-term projection (>6 months) is highly uncertain")
    }

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

    const projectedRoutineExpenses = (monthlyExpenseAverage / 30) * daysUntilTarget

    // Get planned expenses between now and target date
    const plannedExpenses = await prisma.plannedExpense.findMany({
      where: {
        userId,
        status: {
          in: ['PLANNED', 'SAVED'], // Only consider planned or saved expenses
        },
        targetDate: {
          gte: now,
          lte: target,
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

    const totalPlannedExpenses = plannedExpenses.reduce((sum, expense) => 
      sum + Number(expense.amount), 0
    )

    const projectedExpenses = projectedRoutineExpenses + totalPlannedExpenses
    const adjustedProjectedBalance = projectedBalance - projectedExpenses

    // Adjust confidence and recommendations based on spending patterns
    if (adjustedProjectedBalance < amount) {
      confidenceLevel = 'low'
      riskFactors.push("Current spending patterns may prevent affordability")
      recommendations.push("Consider reducing daily expenses to meet your goal")
    }

    // Generate AI-powered recommendations
    if (!canAfford) {
      const shortfall = amount - projectedBalance
      recommendations.push(`You need an additional ₱${shortfall.toFixed(2)} to afford this expense`)
      
      if (daysUntilTarget > 30) {
        const monthlyExtra = shortfall / (daysUntilTarget / 30)
        recommendations.push(`Save an extra ₱${monthlyExtra.toFixed(2)} per month to reach your goal`)
      }
    } else {
      const buffer = projectedBalance - amount
      const bufferPercentage = (buffer / amount) * 100
      
      if (bufferPercentage < 20) {
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
      projectedBalance: adjustedProjectedBalance,
      canAfford: adjustedProjectedBalance >= amount,
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
      expenseBreakdown: {
        routineExpenses: projectedRoutineExpenses,
        plannedExpenses: totalPlannedExpenses,
        plannedExpenseDetails: plannedExpenses.map(expense => ({
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