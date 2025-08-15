import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { updateAllUserConfidenceLevels, updatePlannedExpenseConfidence } from "@/lib/confidence-calculator"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { plannedExpenseId } = body

    if (plannedExpenseId) {
      // Update confidence for a specific planned expense
      const result = await updatePlannedExpenseConfidence(plannedExpenseId)
      return NextResponse.json(result)
    } else {
      // Update confidence for all user's planned expenses
      const results = await updateAllUserConfidenceLevels(session.user.id)
      return NextResponse.json({ 
        message: `Updated confidence levels for ${results.length} planned expenses`,
        results 
      })
    }
  } catch (error) {
    console.error("Error updating confidence levels:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}