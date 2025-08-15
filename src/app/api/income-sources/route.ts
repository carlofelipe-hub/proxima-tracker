import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { PayFrequency } from "@prisma/client"

const createIncomeSourceSchema = z.object({
  name: z.string().min(1, "Income source name is required"),
  amount: z.number().min(0.01, "Amount must be positive"),
  frequency: z.nativeEnum(PayFrequency),
  nextPayDate: z.string().transform(str => new Date(str)),
  walletId: z.string().optional(),
})

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const incomeSources = await prisma.incomeSource.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
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
      orderBy: {
        nextPayDate: "asc",
      },
    })

    return NextResponse.json(incomeSources)
  } catch (error) {
    console.error("Error fetching income sources:", error)
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
    const validatedData = createIncomeSourceSchema.parse(body)

    const incomeSource = await prisma.incomeSource.create({
      data: {
        ...validatedData,
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

    return NextResponse.json(incomeSource, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error creating income source:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}