import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { WalletType } from "@prisma/client"

const createWalletSchema = z.object({
  name: z.string().min(1, "Wallet name is required"),
  type: z.nativeEnum(WalletType),
  balance: z.number().min(0, "Balance must be positive").default(0),
})

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const wallets = await prisma.wallet.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Convert Decimal balance to number for proper JSON serialization
    const walletsWithFormattedBalance = wallets.map(wallet => ({
      ...wallet,
      balance: Number(wallet.balance),
    }))

    return NextResponse.json(walletsWithFormattedBalance)
  } catch (error) {
    console.error("Error fetching wallets:", error)
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
    const validatedData = createWalletSchema.parse(body)

    const wallet = await prisma.wallet.create({
      data: {
        ...validatedData,
        userId: session.user.id,
      },
    })

    // Convert Decimal balance to number for proper JSON serialization
    const walletWithFormattedBalance = {
      ...wallet,
      balance: Number(wallet.balance),
    }

    return NextResponse.json(walletWithFormattedBalance, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error creating wallet:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}