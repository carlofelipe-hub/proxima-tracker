import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { PlannedExpenseStatus } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category") // Optional filter by category

    const whereClause = {
      userId: session.user.id,
      status: {
        in: [PlannedExpenseStatus.PLANNED, PlannedExpenseStatus.SAVED]
      },
      ...(category && { category }),
    }

    const availablePlannedExpenses = await prisma.plannedExpense.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        amount: true,
        spentAmount: true,
        category: true,
        targetDate: true,
        priority: true,
        wallet: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: [
        { priority: "desc" },
        { targetDate: "asc" },
        { createdAt: "desc" },
      ],
    })

    // Convert Decimal amounts to numbers and calculate remaining amounts
    const formattedExpenses = availablePlannedExpenses.map(expense => {
      const amount = Number(expense.amount)
      const spentAmount = Number(expense.spentAmount)
      const remainingAmount = amount - spentAmount
      
      return {
        ...expense,
        amount,
        spentAmount,
        remainingAmount,
      }
    }).filter(expense => expense.remainingAmount > 0) // Additional filter for any floating point precision issues

    return NextResponse.json({
      plannedExpenses: formattedExpenses,
    })
  } catch (error) {
    console.error("Error fetching available planned expenses:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
