import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const affordabilityCheckSchema = z.object({
  amount: z.number().min(0.01, "Amount must be positive"),
  walletId: z.string().optional(), // If not provided, check across all wallets
  category: z.string().optional(), // For budget limit checking
  considerTimeFrame: z.boolean().default(true), // Whether to consider time-based budgeting
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { amount, walletId, considerTimeFrame } = affordabilityCheckSchema.parse(body)

    // Get user's wallets
    const wallets = await prisma.wallet.findMany({
      where: {
        userId: session.user.id,
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

    if (wallets.length === 0) {
      return NextResponse.json({
        canAfford: false,
        reason: "No active wallets found",
        suggestions: ["Add a wallet to track your expenses"],
      })
    }

    // Calculate total available balance
    const totalBalance = wallets.reduce((sum, wallet) => 
      sum + parseFloat(wallet.balance.toString()), 0
    )

    // Get active budget period or income sources for time-based calculation
    let timeBasedInfo = null
    if (considerTimeFrame) {
      // Check for active budget period first
      const activeBudgetPeriod = await prisma.budgetPeriod.findFirst({
        where: {
          userId: session.user.id,
          isActive: true,
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
      })

      if (activeBudgetPeriod) {
        const now = new Date()
        const daysRemaining = Math.ceil(
          (activeBudgetPeriod.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
        const dailyBudget = totalBalance / Math.max(daysRemaining, 1)
        
        timeBasedInfo = {
          type: "budget_period",
          endDate: activeBudgetPeriod.endDate,
          daysRemaining,
          dailyBudget,
          totalBudget: totalBalance,
          message: `You have ${daysRemaining} days until ${activeBudgetPeriod.endDate.toLocaleDateString()}`,
        }
      } else {
        // Fall back to income sources
        const nextIncome = await prisma.incomeSource.findFirst({
          where: {
            userId: session.user.id,
            isActive: true,
            nextPayDate: { gte: new Date() },
          },
          orderBy: { nextPayDate: "asc" },
        })

        if (nextIncome) {
          const now = new Date()
          const daysUntilPay = Math.ceil(
            (nextIncome.nextPayDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          )
          const dailyBudget = totalBalance / Math.max(daysUntilPay, 1)
          
          timeBasedInfo = {
            type: "next_paycheck",
            nextPayDate: nextIncome.nextPayDate,
            daysUntilPay,
            dailyBudget,
            nextPayAmount: parseFloat(nextIncome.amount.toString()),
            incomeName: nextIncome.name,
            message: `Next ${nextIncome.name} payment in ${daysUntilPay} days (${nextIncome.nextPayDate.toLocaleDateString()})`,
          }
        }
      }
    }

    // Check if specific wallet can afford it
    if (walletId) {
      const selectedWallet = wallets[0]
      const walletBalance = parseFloat(selectedWallet.balance.toString())
      
      if (walletBalance >= amount) {
        const response: Record<string, unknown> = {
          canAfford: true,
          walletId: selectedWallet.id,
          walletName: selectedWallet.name,
          remainingBalance: walletBalance - amount,
          message: `You can afford this expense from your ${selectedWallet.name}`,
        }

        // Add time-based insights
        if (timeBasedInfo) {
          response.timeBasedInfo = timeBasedInfo
          const dailyBudgetImpact = amount / (timeBasedInfo.daysRemaining || timeBasedInfo.daysUntilPay || 1)
          response.budgetImpact = {
            dailyBudgetUsed: dailyBudgetImpact,
            dailyBudgetRemaining: timeBasedInfo.dailyBudget - dailyBudgetImpact,
            percentageOfDailyBudget: (dailyBudgetImpact / timeBasedInfo.dailyBudget) * 100,
          }

          if (amount > timeBasedInfo.dailyBudget) {
            response.timeWarning = `This expense (₱${amount.toFixed(2)}) exceeds your daily budget of ₱${timeBasedInfo.dailyBudget.toFixed(2)}`
          }
        }

        return NextResponse.json(response)
      } else {
        // Check if other wallets can cover it
        const otherWallets = await prisma.wallet.findMany({
          where: {
            userId: session.user.id,
            isActive: true,
            id: { not: walletId },
          },
          select: {
            id: true,
            name: true,
            balance: true,
          },
        })

        const affordableWallets = otherWallets.filter(w => 
          parseFloat(w.balance.toString()) >= amount
        )

        return NextResponse.json({
          canAfford: false,
          walletId: selectedWallet.id,
          walletName: selectedWallet.name,
          currentBalance: walletBalance,
          shortfall: amount - walletBalance,
          reason: `Insufficient funds in ${selectedWallet.name}`,
          alternatives: affordableWallets.length > 0 ? {
            canAffordFromOthers: true,
            suggestedWallets: affordableWallets.map(w => ({
              id: w.id,
              name: w.name,
              balance: parseFloat(w.balance.toString()),
              remainingAfterExpense: parseFloat(w.balance.toString()) - amount,
            })),
          } : {
            canAffordFromOthers: totalBalance >= amount,
            totalBalance,
            message: totalBalance >= amount 
              ? "You can afford this by transferring funds between wallets"
              : "You cannot afford this expense with your current total balance",
          },
        })
      }
    }

    // Check across all wallets (no specific wallet selected)
    if (totalBalance >= amount) {
      // Find the best wallet(s) to use
      const sortedWallets = wallets
        .map(w => ({
          ...w,
          balance: parseFloat(w.balance.toString()),
        }))
        .sort((a, b) => b.balance - a.balance)

      const affordableWallets = sortedWallets.filter(w => w.balance >= amount)

      if (affordableWallets.length > 0) {
        const response: Record<string, unknown> = {
          canAfford: true,
          totalBalance,
          suggestedWallets: affordableWallets.slice(0, 3).map(w => ({
            id: w.id,
            name: w.name,
            balance: w.balance,
            remainingAfterExpense: w.balance - amount,
          })),
          message: "You can afford this expense",
        }

        // Add time-based insights
        if (timeBasedInfo) {
          response.timeBasedInfo = timeBasedInfo
          const dailyBudgetImpact = amount / (timeBasedInfo.daysRemaining || timeBasedInfo.daysUntilPay || 1)
          response.budgetImpact = {
            dailyBudgetUsed: dailyBudgetImpact,
            dailyBudgetRemaining: timeBasedInfo.dailyBudget - dailyBudgetImpact,
            percentageOfDailyBudget: (dailyBudgetImpact / timeBasedInfo.dailyBudget) * 100,
          }

          if (amount > timeBasedInfo.dailyBudget) {
            response.timeWarning = `This expense (₱${amount.toFixed(2)}) exceeds your daily budget of ₱${timeBasedInfo.dailyBudget.toFixed(2)}`
          }
        }

        return NextResponse.json(response)
      } else {
        // Need to combine wallets
        return NextResponse.json({
          canAfford: true,
          totalBalance,
          requiresMultipleWallets: true,
          message: "You can afford this expense, but you'll need to use multiple wallets or transfer funds",
          walletBreakdown: sortedWallets.map(w => ({
            id: w.id,
            name: w.name,
            balance: w.balance,
          })),
        })
      }
    }

    // Cannot afford at all
    return NextResponse.json({
      canAfford: false,
      totalBalance,
      shortfall: amount - totalBalance,
      reason: "Insufficient total funds",
      suggestions: [
        "Add more funds to your wallets",
        "Consider reducing the expense amount",
        "Review your budget and spending patterns",
      ],
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error checking affordability:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}