import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { TransactionType } from "@prisma/client"
import { Decimal } from "@prisma/client/runtime/library"
import { getNowInPhilippineTime } from "@/lib/timezone"

const createTransferSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  fromWalletId: z.string().min(1, "Source wallet is required"),
  toWalletId: z.string().min(1, "Destination wallet is required"),
  transferFee: z.number().min(0, "Transfer fee cannot be negative").optional(),
  description: z.string().optional(),
  date: z.string().datetime().optional(),
}).refine((data) => data.fromWalletId !== data.toWalletId, {
  message: "Source and destination wallets must be different",
  path: ["toWalletId"],
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const body = await request.json()
    const validatedData = createTransferSchema.parse(body)

    // Verify both wallets belong to user and are active
    const wallets = await prisma.wallet.findMany({
      where: {
        id: { in: [validatedData.fromWalletId, validatedData.toWalletId] },
        userId,
        isActive: true,
      },
    })

    if (wallets.length !== 2) {
      return NextResponse.json(
        { error: "One or both wallets not found or inactive" },
        { status: 404 }
      )
    }

    const fromWallet = wallets.find(w => w.id === validatedData.fromWalletId)!
    const toWallet = wallets.find(w => w.id === validatedData.toWalletId)!

    // Check if source wallet has sufficient balance (including transfer fee)
    const totalAmount = validatedData.amount + (validatedData.transferFee || 0)
    if (fromWallet.balance.toNumber() < totalAmount) {
      return NextResponse.json(
        { error: "Insufficient balance in source wallet" },
        { status: 400 }
      )
    }

    // Create transfer transaction with atomic database operations
    const result = await prisma.$transaction(async (tx) => {
      const transferId = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const transferDate = validatedData.date ? new Date(validatedData.date) : getNowInPhilippineTime()

      // Create outgoing transaction (debit from source wallet)
      const outgoingTransaction = await tx.transaction.create({
        data: {
          amount: new Decimal(validatedData.amount),
          type: TransactionType.TRANSFER,
          category: "Transfer Out",
          description: `Transfer to ${toWallet.name}${validatedData.description ? ` - ${validatedData.description}` : ''}`,
          date: transferDate,
          userId,
          walletId: validatedData.fromWalletId,
          toWalletId: validatedData.toWalletId,
          transferFee: validatedData.transferFee ? new Decimal(validatedData.transferFee) : null,
          transferId,
        },
        include: {
          wallet: { select: { name: true, type: true } },
          toWallet: { select: { name: true, type: true } },
        },
      })

      // Create incoming transaction (credit to destination wallet)
      const incomingTransaction = await tx.transaction.create({
        data: {
          amount: new Decimal(validatedData.amount),
          type: TransactionType.TRANSFER,
          category: "Transfer In",
          description: `Transfer from ${fromWallet.name}${validatedData.description ? ` - ${validatedData.description}` : ''}`,
          date: transferDate,
          userId,
          walletId: validatedData.toWalletId,
          toWalletId: validatedData.fromWalletId, // Reference back to source
          transferId,
        },
        include: {
          wallet: { select: { name: true, type: true } },
          toWallet: { select: { name: true, type: true } },
        },
      })

      // Create transfer fee transaction if applicable
      let feeTransaction = null
      if (validatedData.transferFee && validatedData.transferFee > 0) {
        feeTransaction = await tx.transaction.create({
          data: {
            amount: new Decimal(validatedData.transferFee),
            type: TransactionType.EXPENSE,
            category: "Transfer Fee",
            description: `Transfer fee for ${fromWallet.name} to ${toWallet.name}`,
            date: transferDate,
            userId,
            walletId: validatedData.fromWalletId,
            transferId,
          },
          include: {
            wallet: { select: { name: true, type: true } },
          },
        })
      }

      // Update wallet balances
      await tx.wallet.update({
        where: { id: validatedData.fromWalletId },
        data: {
          balance: {
            decrement: new Decimal(totalAmount),
          },
        },
      })

      await tx.wallet.update({
        where: { id: validatedData.toWalletId },
        data: {
          balance: {
            increment: new Decimal(validatedData.amount),
          },
        },
      })

      // Return formatted transactions
      return {
        transferId,
        outgoing: {
          ...outgoingTransaction,
          amount: Number(outgoingTransaction.amount),
          transferFee: outgoingTransaction.transferFee ? Number(outgoingTransaction.transferFee) : null,
        },
        incoming: {
          ...incomingTransaction,
          amount: Number(incomingTransaction.amount),
        },
        fee: feeTransaction ? {
          ...feeTransaction,
          amount: Number(feeTransaction.amount),
        } : null,
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

    console.error("Error creating transfer:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    // Get all transfer transactions for the user
    const transfers = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        type: TransactionType.TRANSFER,
        transferId: { not: null },
      },
      include: {
        wallet: {
          select: { name: true, type: true },
        },
        toWallet: {
          select: { name: true, type: true },
        },
      },
      orderBy: {
        date: "desc",
      },
      take: limit,
      skip: offset,
    })

    // Define type for grouped transfer data
    interface GroupedTransfer {
      transferId: string
      amount: number
      transferFee: number
      date: Date
      description: string
      fromWallet: { name: string; type: string } | null
      toWallet: { name: string; type: string } | null
      transactions: Array<{
        id: string
        amount: number
        type: string
        category: string
        description: string | null
        date: Date
        transferFee: number | null
        wallet: { name: string; type: string }
        toWallet: { name: string; type: string } | null
      }>
    }

    // Group transfers by transferId to get complete transfer information
    const groupedTransfers = transfers.reduce((acc, transaction) => {
      const transferId = transaction.transferId!
      if (!acc[transferId]) {
        acc[transferId] = {
          transferId,
          amount: 0,
          transferFee: 0,
          date: transaction.date,
          description: '',
          fromWallet: null,
          toWallet: null,
          transactions: [],
        }
      }

      acc[transferId].transactions.push({
        ...transaction,
        amount: Number(transaction.amount),
        transferFee: transaction.transferFee ? Number(transaction.transferFee) : null,
      })

      // Set transfer details from outgoing transaction
      if (transaction.category === "Transfer Out") {
        acc[transferId].amount = Number(transaction.amount)
        acc[transferId].transferFee = transaction.transferFee ? Number(transaction.transferFee) : 0
        acc[transferId].description = transaction.description || ''
        acc[transferId].fromWallet = transaction.wallet
        acc[transferId].toWallet = transaction.toWallet
      }

      return acc
    }, {} as Record<string, GroupedTransfer>)

    const transferList = Object.values(groupedTransfers)

    const total = await prisma.transaction.count({
      where: {
        userId: session.user.id,
        type: TransactionType.TRANSFER,
        category: "Transfer Out", // Count only outgoing to avoid duplicates
      },
    })

    return NextResponse.json({
      transfers: transferList,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    console.error("Error fetching transfers:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
