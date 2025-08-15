import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { WalletType } from "@prisma/client"

const updateWalletSchema = z.object({
  name: z.string().min(1, "Wallet name is required").optional(),
  type: z.nativeEnum(WalletType).optional(),
  balance: z.number().min(0, "Balance must be positive").optional(),
  isActive: z.boolean().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const wallet = await prisma.wallet.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        transactions: {
          orderBy: {
            date: "desc",
          },
          take: 10,
        },
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    })

    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(wallet)
  } catch (error) {
    console.error("Error fetching wallet:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateWalletSchema.parse(body)

    const { id } = await params

    const wallet = await prisma.wallet.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet not found" },
        { status: 404 }
      )
    }

    const updatedWallet = await prisma.wallet.update({
      where: {
        id,
      },
      data: validatedData,
    })

    return NextResponse.json(updatedWallet)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error updating wallet:", error)
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

    const { id } = await params

    const wallet = await prisma.wallet.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet not found" },
        { status: 404 }
      )
    }

    // Soft delete by setting isActive to false
    await prisma.wallet.update({
      where: {
        id,
      },
      data: {
        isActive: false,
      },
    })

    return NextResponse.json({ message: "Wallet deleted successfully" })
  } catch (error) {
    console.error("Error deleting wallet:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}