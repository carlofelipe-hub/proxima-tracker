import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { ExpensePriority, PlannedExpenseStatus } from "@prisma/client"

const createPlannedExpenseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  amount: z.number().min(0.01, "Amount must be positive"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  targetDate: z.string().datetime("Invalid target date"),
  priority: z.nativeEnum(ExpensePriority).default(ExpensePriority.MEDIUM),
  walletId: z.string().optional(),
})

const updatePlannedExpenseSchema = createPlannedExpenseSchema.partial().extend({
  id: z.string(),
  status: z.nativeEnum(PlannedExpenseStatus).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    const whereClause: {
      userId: string
      status?: PlannedExpenseStatus
      targetDate?: {
        gte?: Date
        lte?: Date
      }
    } = {
      userId: session.user.id,
    }

    if (status) {
      whereClause.status = status as PlannedExpenseStatus
    }

    if (from || to) {
      whereClause.targetDate = {}
      if (from) whereClause.targetDate.gte = new Date(from)
      if (to) whereClause.targetDate.lte = new Date(to)
    }

    const plannedExpenses = await prisma.plannedExpense.findMany({
      where: whereClause,
      include: {
        wallet: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: [
        { targetDate: "asc" },
        { priority: "desc" },
        { createdAt: "desc" },
      ],
      take: limit,
      skip: offset,
    })

    const total = await prisma.plannedExpense.count({
      where: whereClause,
    })

    // Convert Decimal amounts to numbers for JSON serialization
    const formattedExpenses = plannedExpenses.map(expense => ({
      ...expense,
      amount: Number(expense.amount),
    }))

    return NextResponse.json({
      plannedExpenses: formattedExpenses,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    console.error("Error fetching planned expenses:", error)
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

    const body = await request.json()
    const validatedData = createPlannedExpenseSchema.parse(body)

    // Verify wallet belongs to user if specified
    if (validatedData.walletId) {
      const wallet = await prisma.wallet.findFirst({
        where: {
          id: validatedData.walletId,
          userId: session.user.id,
          isActive: true,
        },
      })

      if (!wallet) {
        return NextResponse.json(
          { error: "Wallet not found" },
          { status: 404 }
        )
      }
    }

    const plannedExpense = await prisma.plannedExpense.create({
      data: {
        ...validatedData,
        targetDate: new Date(validatedData.targetDate),
        userId: session.user.id,
      },
      include: {
        wallet: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    })

    // Convert Decimal amount to number for JSON serialization
    const formattedExpense = {
      ...plannedExpense,
      amount: Number(plannedExpense.amount),
    }

    return NextResponse.json(formattedExpense, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error creating planned expense:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updatePlannedExpenseSchema.parse(body)
    const { id, ...updateData } = validatedData

    // Verify the planned expense belongs to the user
    const existingExpense = await prisma.plannedExpense.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existingExpense) {
      return NextResponse.json(
        { error: "Planned expense not found" },
        { status: 404 }
      )
    }

    // Verify wallet belongs to user if being updated
    if (updateData.walletId) {
      const wallet = await prisma.wallet.findFirst({
        where: {
          id: updateData.walletId,
          userId: session.user.id,
          isActive: true,
        },
      })

      if (!wallet) {
        return NextResponse.json(
          { error: "Wallet not found" },
          { status: 404 }
        )
      }
    }

    const updatedExpense = await prisma.plannedExpense.update({
      where: { id },
      data: {
        ...updateData,
        ...(updateData.targetDate && { targetDate: new Date(updateData.targetDate) }),
      },
      include: {
        wallet: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    })

    // Convert Decimal amount to number for JSON serialization
    const formattedExpense = {
      ...updatedExpense,
      amount: Number(updatedExpense.amount),
    }

    return NextResponse.json(formattedExpense)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error updating planned expense:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "Planned expense ID is required" },
        { status: 400 }
      )
    }

    // Verify the planned expense belongs to the user
    const existingExpense = await prisma.plannedExpense.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existingExpense) {
      return NextResponse.json(
        { error: "Planned expense not found" },
        { status: 404 }
      )
    }

    await prisma.plannedExpense.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting planned expense:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}