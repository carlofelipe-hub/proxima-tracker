import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { PayFrequency } from "@prisma/client"

const updateIncomeSourceSchema = z.object({
  name: z.string().min(1, "Income source name is required"),
  amount: z.number().min(0.01, "Amount must be positive"),
  frequency: z.nativeEnum(PayFrequency),
  nextPayDate: z.string().transform(str => new Date(str)),
  walletId: z.string().optional(),
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
    const validatedData = updateIncomeSourceSchema.parse(body)

    // Check if the income source exists and belongs to the user
    const existingSource = await prisma.incomeSource.findFirst({
      where: {
        id: resolvedParams.id,
        userId: session.user.id,
      },
    })

    if (!existingSource) {
      return NextResponse.json(
        { error: "Income source not found" },
        { status: 404 }
      )
    }

    const updatedSource = await prisma.incomeSource.update({
      where: {
        id: resolvedParams.id,
      },
      data: validatedData,
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

    return NextResponse.json(updatedSource)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error updating income source:", error)
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
    
    // Check if the income source exists and belongs to the user
    const existingSource = await prisma.incomeSource.findFirst({
      where: {
        id: resolvedParams.id,
        userId: session.user.id,
      },
    })

    if (!existingSource) {
      return NextResponse.json(
        { error: "Income source not found" },
        { status: 404 }
      )
    }

    await prisma.incomeSource.delete({
      where: {
        id: resolvedParams.id,
      },
    })

    return NextResponse.json({ message: "Income source deleted successfully" })
  } catch (error) {
    console.error("Error deleting income source:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}