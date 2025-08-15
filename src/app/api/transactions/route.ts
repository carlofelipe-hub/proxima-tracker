import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { TransactionType } from "@prisma/client"
import { Decimal } from "@prisma/client/runtime/library"
import { getNowInPhilippineTime } from "@/lib/timezone"

const createTransactionSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  type: z.nativeEnum(TransactionType),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  walletId: z.string().min(1, "Wallet is required"),
  date: z.string().datetime().optional(),
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

      // Convert Decimal amount to number for proper JSON serialization
      return {
        ...transaction,
        amount: Number(transaction.amount),
        transferFee: transaction.transferFee ? Number(transaction.transferFee) : null,
      }
    })

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