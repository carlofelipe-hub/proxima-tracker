import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { TransactionType, PlannedExpenseStatus } from "@prisma/client"
import { Decimal } from "@prisma/client/runtime/library"
import { getNowInPhilippineTime } from "@/lib/timezone"
import { triggerConfidenceUpdate } from "@/lib/confidence-updater"

const createTransactionSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  type: z.nativeEnum(TransactionType),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  walletId: z.string().min(1, "Wallet is required"),
  date: z.string().datetime().optional(),
  plannedExpenseId: z.string().optional(), // Link to planned expense for EXPENSE transactions
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const walletId = searchParams.get("walletId")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    const whereClause = {
      userId: session.user.id,
      ...(walletId && { walletId }),
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        wallet: {
          select: {
            name: true,
            type: true,
          },
        },
        toWallet: {
          select: {
            name: true,
            type: true,
          },
        },
        plannedExpense: {
          select: {
            id: true,
            title: true,
            amount: true,
            spentAmount: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
      take: limit,
      skip: offset,
    })

    const total = await prisma.transaction.count({
      where: whereClause,
    })

    // Convert Decimal amounts to numbers for proper JSON serialization
    const transactionsWithFormattedAmounts = transactions.map(transaction => ({
      ...transaction,
      amount: Number(transaction.amount),
      transferFee: transaction.transferFee ? Number(transaction.transferFee) : null,
      plannedExpense: transaction.plannedExpense ? {
        ...transaction.plannedExpense,
        amount: Number(transaction.plannedExpense.amount),
        spentAmount: Number(transaction.plannedExpense.spentAmount),
      } : null,
    }))

    return NextResponse.json({
      transactions: transactionsWithFormattedAmounts,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    const body = await request.json()
    const validatedData = createTransactionSchema.parse(body)

    // Verify wallet belongs to user
    const wallet = await prisma.wallet.findFirst({
      where: {
        id: validatedData.walletId,
        userId,
        isActive: true,
      },
    })

    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet not found" },
        { status: 404 }
      )
    }

    // Verify planned expense if provided (only for EXPENSE transactions)
    let plannedExpense = null
    if (validatedData.plannedExpenseId) {
      if (validatedData.type !== TransactionType.EXPENSE) {
        return NextResponse.json(
          { error: "Planned expenses can only be linked to expense transactions" },
          { status: 400 }
        )
      }

      plannedExpense = await prisma.plannedExpense.findFirst({
        where: {
          id: validatedData.plannedExpenseId,
          userId,
          status: {
            in: [PlannedExpenseStatus.PLANNED, PlannedExpenseStatus.SAVED]
          }
        },
      })

      if (!plannedExpense) {
        return NextResponse.json(
          { error: "Planned expense not found or not available for spending" },
          { status: 404 }
        )
      }

      // Check if the transaction amount would exceed the remaining planned amount
      const remainingAmount = Number(plannedExpense.amount) - Number(plannedExpense.spentAmount)
      if (validatedData.amount > remainingAmount) {
        return NextResponse.json(
          { error: `Amount exceeds remaining planned budget. Available: ₱${remainingAmount.toFixed(2)}` },
          { status: 400 }
        )
      }
    }

    // Start transaction to update wallet balance and create transaction record
    const result = await prisma.$transaction(async (tx) => {
      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          ...validatedData,
          userId,
          date: validatedData.date ? new Date(validatedData.date) : getNowInPhilippineTime(),
        },
        include: {
          wallet: {
            select: {
              name: true,
              type: true,
            },
          },
          toWallet: {
            select: {
              name: true,
              type: true,
            },
          },
          plannedExpense: {
            select: {
              id: true,
              title: true,
              amount: true,
              spentAmount: true,
            },
          },
        },
      })

      // Update wallet balance
      const balanceChange = validatedData.type === TransactionType.INCOME 
        ? validatedData.amount 
        : -validatedData.amount

      await tx.wallet.update({
        where: { id: validatedData.walletId },
        data: {
          balance: {
            increment: new Decimal(balanceChange),
          },
        },
      })

      // Update planned expense if linked
      if (validatedData.plannedExpenseId && validatedData.type === TransactionType.EXPENSE && plannedExpense) {
        const newSpentAmount = Number(plannedExpense.spentAmount) + validatedData.amount
        const totalAmount = Number(plannedExpense.amount)
        
        await tx.plannedExpense.update({
          where: { id: validatedData.plannedExpenseId },
          data: {
            spentAmount: new Decimal(newSpentAmount),
            // Mark as COMPLETED if fully spent
            status: newSpentAmount >= totalAmount ? PlannedExpenseStatus.COMPLETED : undefined,
          },
        })
      }

      // Convert Decimal amount to number for proper JSON serialization
      return {
        ...transaction,
        amount: Number(transaction.amount),
        transferFee: transaction.transferFee ? Number(transaction.transferFee) : null,
        plannedExpense: transaction.plannedExpense ? {
          ...transaction.plannedExpense,
          amount: Number(transaction.plannedExpense.amount),
          spentAmount: Number(transaction.plannedExpense.spentAmount),
        } : null,
      }
    })

    // Trigger confidence level update after transaction is created
    triggerConfidenceUpdate(userId)

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error creating transaction:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}