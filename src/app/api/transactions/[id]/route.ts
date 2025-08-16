import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { TransactionType, PlannedExpenseStatus } from "@prisma/client"
import { Decimal } from "@prisma/client/runtime/library"
import { triggerConfidenceUpdate } from "@/lib/confidence-updater"

const updateTransactionSchema = z.object({
  amount: z.number().positive("Amount must be positive").optional(),
  type: z.nativeEnum(TransactionType).optional(),
  category: z.string().min(1, "Category is required").optional(),
  description: z.string().optional(),
  walletId: z.string().min(1, "Wallet is required").optional(),
  date: z.string().datetime().optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const { id: transactionId } = await params

    const body = await request.json()
    const validatedData = updateTransactionSchema.parse(body)

    // Get the existing transaction to verify ownership and current state
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
      include: {
        wallet: true,
        plannedExpense: true,
      },
    })

    if (!existingTransaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      )
    }

    // If wallet is being changed, verify the new wallet belongs to user
    if (validatedData.walletId && validatedData.walletId !== existingTransaction.walletId) {
      const newWallet = await prisma.wallet.findFirst({
        where: {
          id: validatedData.walletId,
          userId,
          isActive: true,
        },
      })

      if (!newWallet) {
        return NextResponse.json(
          { error: "New wallet not found" },
          { status: 404 }
        )
      }
    }

    // Start transaction to update everything atomically
    const result = await prisma.$transaction(async (tx) => {
      const oldAmount = Number(existingTransaction.amount)
      const oldType = existingTransaction.type
      const oldWalletId = existingTransaction.walletId

      // Calculate what changes need to be made to wallet balances
      const newAmount = validatedData.amount ?? oldAmount
      const newType = validatedData.type ?? oldType
      const newWalletId = validatedData.walletId ?? oldWalletId

      // Revert the old transaction's effect on the old wallet
      const oldBalanceChange = oldType === TransactionType.INCOME ? -oldAmount : oldAmount
      await tx.wallet.update({
        where: { id: oldWalletId },
        data: {
          balance: {
            increment: new Decimal(oldBalanceChange),
          },
        },
      })

      // Apply the new transaction's effect on the new wallet
      const newBalanceChange = newType === TransactionType.INCOME ? newAmount : -newAmount
      await tx.wallet.update({
        where: { id: newWalletId },
        data: {
          balance: {
            increment: new Decimal(newBalanceChange),
          },
        },
      })

      // Handle planned expense updates if this was linked to a planned expense
      if (existingTransaction.plannedExpense && existingTransaction.type === TransactionType.EXPENSE) {
        // Revert the old spending from the planned expense
        const newSpentAmount = Number(existingTransaction.plannedExpense.spentAmount) - oldAmount
        await tx.plannedExpense.update({
          where: { id: existingTransaction.plannedExpenseId! },
          data: {
            spentAmount: new Decimal(Math.max(0, newSpentAmount)),
            status: PlannedExpenseStatus.PLANNED, // Reset status since we're updating
          },
        })

        // Apply the new spending if it's still an expense
        if (newType === TransactionType.EXPENSE) {
          const updatedSpentAmount = Math.max(0, newSpentAmount) + newAmount
          const totalAmount = Number(existingTransaction.plannedExpense.amount)
          
          await tx.plannedExpense.update({
            where: { id: existingTransaction.plannedExpenseId! },
            data: {
              spentAmount: new Decimal(updatedSpentAmount),
              status: updatedSpentAmount >= totalAmount ? PlannedExpenseStatus.COMPLETED : PlannedExpenseStatus.PLANNED,
            },
          })
        }
      }

      // Update the transaction
      const updatedTransaction = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          ...validatedData,
          date: validatedData.date ? new Date(validatedData.date) : undefined,
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

      return {
        ...updatedTransaction,
        amount: Number(updatedTransaction.amount),
        transferFee: updatedTransaction.transferFee ? Number(updatedTransaction.transferFee) : null,
        plannedExpense: updatedTransaction.plannedExpense ? {
          ...updatedTransaction.plannedExpense,
          amount: Number(updatedTransaction.plannedExpense.amount),
          spentAmount: Number(updatedTransaction.plannedExpense.spentAmount),
        } : null,
      }
    })

    // Trigger confidence level update after transaction is updated
    triggerConfidenceUpdate(userId)

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error updating transaction:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const { id: transactionId } = await params

    // Get the existing transaction to verify ownership and revert its effects
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
      include: {
        plannedExpense: true,
      },
    })

    if (!existingTransaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      )
    }

    // Start transaction to delete and revert effects atomically
    await prisma.$transaction(async (tx) => {
      const amount = Number(existingTransaction.amount)
      const type = existingTransaction.type

      // Revert the transaction's effect on the wallet balance
      const balanceChange = type === TransactionType.INCOME ? -amount : amount
      await tx.wallet.update({
        where: { id: existingTransaction.walletId },
        data: {
          balance: {
            increment: new Decimal(balanceChange),
          },
        },
      })

      // Revert planned expense spending if linked
      if (existingTransaction.plannedExpense && type === TransactionType.EXPENSE) {
        const newSpentAmount = Number(existingTransaction.plannedExpense.spentAmount) - amount
        await tx.plannedExpense.update({
          where: { id: existingTransaction.plannedExpenseId! },
          data: {
            spentAmount: new Decimal(Math.max(0, newSpentAmount)),
            status: PlannedExpenseStatus.PLANNED, // Reset status since we're removing spending
          },
        })
      }

      // Delete the transaction
      await tx.transaction.delete({
        where: { id: transactionId },
      })
    })

    // Trigger confidence level update after transaction is deleted
    triggerConfidenceUpdate(userId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting transaction:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}