import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { fromDateInputToPhilippineTime } from "@/lib/timezone"

const createBudgetPeriodSchema = z.object({
  startDate: z.string().transform(str => fromDateInputToPhilippineTime(str)),
  endDate: z.string().transform(str => fromDateInputToPhilippineTime(str)),
  totalIncome: z.number().min(0, "Total income must be positive"),
})

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const budgetPeriods = await prisma.budgetPeriod.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        startDate: "desc",
      },
    })

    return NextResponse.json(budgetPeriods)
  } catch (error) {
    console.error("Error fetching budget periods:", error)
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
    const validatedData = createBudgetPeriodSchema.parse(body)

    // Deactivate any existing active budget periods that overlap
    await prisma.budgetPeriod.updateMany({
      where: {
        userId: session.user.id,
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

    const budgetPeriod = await prisma.budgetPeriod.create({
      data: {
        ...validatedData,
        userId: session.user.id,
        isActive: true,
      },
    })

    return NextResponse.json(budgetPeriod, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error creating budget period:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}