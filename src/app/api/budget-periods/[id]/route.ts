import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { fromDateInputToPhilippineTime } from "@/lib/timezone"

const updateBudgetPeriodSchema = z.object({
  startDate: z.string().transform(str => fromDateInputToPhilippineTime(str)),
  endDate: z.string().transform(str => fromDateInputToPhilippineTime(str)),
  totalIncome: z.number().min(0, "Total income must be positive"),
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

    const resolvedParams = await params
    const body = await request.json()
    const validatedData = updateBudgetPeriodSchema.parse(body)

    // Check if the budget period exists and belongs to the user
    const existingPeriod = await prisma.budgetPeriod.findFirst({
      where: {
        id: resolvedParams.id,
        userId: session.user.id,
      },
    })

    if (!existingPeriod) {
      return NextResponse.json(
        { error: "Budget period not found" },
        { status: 404 }
      )
    }

    // Deactivate any existing active budget periods that overlap (excluding current one)
    await prisma.budgetPeriod.updateMany({
      where: {
        userId: session.user.id,
        id: { not: resolvedParams.id },
        isActive: true,
        OR: [
          {
            startDate: { lte: validatedData.endDate },
            endDate: { gte: validatedData.startDate },
          }
        ],
      },
      data: {
        isActive: false,
      },
    })

    const updatedPeriod = await prisma.budgetPeriod.update({
      where: {
        id: resolvedParams.id,
      },
      data: {
        ...validatedData,
        isActive: true, // Keep it active when updating
      },
    })

    return NextResponse.json(updatedPeriod)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error updating budget period:", error)
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

    const resolvedParams = await params
    
    // Check if the budget period exists and belongs to the user
    const existingPeriod = await prisma.budgetPeriod.findFirst({
      where: {
        id: resolvedParams.id,
        userId: session.user.id,
      },
    })

    if (!existingPeriod) {
      return NextResponse.json(
        { error: "Budget period not found" },
        { status: 404 }
      )
    }

    await prisma.budgetPeriod.delete({
      where: {
        id: resolvedParams.id,
      },
    })

    return NextResponse.json({ message: "Budget period deleted successfully" })
  } catch (error) {
    console.error("Error deleting budget period:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}