import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { updateAllUserConfidenceLevels } from "@/lib/confidence-calculator"

/**
 * Cron job endpoint to periodically update confidence levels for all active planned expenses
 * This should be called daily to keep confidence levels current as financial situations change
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron call (you might want to add authentication)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("Starting daily confidence level update...")

    // Get all users who have active planned expenses
    const usersWithPlannedExpenses = await prisma.user.findMany({
      where: {
        plannedExpenses: {
          some: {
            status: { in: ['PLANNED', 'SAVED'] }
          }
        }
      },
      select: {
        id: true,
        email: true
      }
    })

    let successCount = 0
    let errorCount = 0
    const results = []

    for (const user of usersWithPlannedExpenses) {
      try {
        const updateResults = await updateAllUserConfidenceLevels(user.id)
        successCount++
        results.push({
          userId: user.id,
          email: user.email,
          updatedExpenses: updateResults.length,
          status: 'success'
        })
        console.log(`Updated confidence levels for user ${user.email}: ${updateResults.length} expenses`)
      } catch (error) {
        errorCount++
        results.push({
          userId: user.id,
          email: user.email,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        console.error(`Failed to update confidence levels for user ${user.email}:`, error)
      }
    }

    const summary = {
      totalUsers: usersWithPlannedExpenses.length,
      successCount,
      errorCount,
      timestamp: new Date().toISOString(),
      results
    }

    console.log("Daily confidence level update completed:", summary)

    return NextResponse.json({
      message: "Confidence level update completed",
      ...summary
    })
  } catch (error) {
    console.error("Error in confidence level cron job:", error)
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Also allow POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}