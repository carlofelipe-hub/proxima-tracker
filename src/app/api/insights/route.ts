import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { OpenAI } from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        insights: {
          summary: "AI insights unavailable - OpenAI API key not configured",
          recommendations: ["Please configure your OpenAI API key to get personalized insights"],
          spending_analysis: "No analysis available"
        }
      })
    }

    // Get user's transaction data from the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: thirtyDaysAgo,
        },
      },
      include: {
        wallet: {
          select: {
            name: true,
            type: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    })

    const wallets = await prisma.wallet.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
    })

    // Prepare data summary for AI analysis
    const totalIncome = transactions
      .filter(t => t.type === "INCOME")
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0)

    const totalExpenses = transactions
      .filter(t => t.type === "EXPENSE")
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0)

    const categorySpending = transactions
      .filter(t => t.type === "EXPENSE")
      .reduce((acc, t) => {
        const category = t.category
        acc[category] = (acc[category] || 0) + parseFloat(t.amount.toString())
        return acc
      }, {} as Record<string, number>)

    const totalBalance = wallets.reduce((sum, w) => sum + parseFloat(w.balance.toString()), 0)

    const analysisPrompt = `
As a financial advisor for Filipino users, analyze this user's spending data and provide insights in JSON format.

User's Financial Data (Last 30 days):
- Total Income: ₱${totalIncome.toLocaleString()}
- Total Expenses: ₱${totalExpenses.toLocaleString()}
- Net Income: ₱${(totalIncome - totalExpenses).toLocaleString()}
- Current Total Balance: ₱${totalBalance.toLocaleString()}
- Number of Transactions: ${transactions.length}

Spending by Category:
${Object.entries(categorySpending)
  .map(([category, amount]) => `- ${category}: ₱${amount.toLocaleString()}`)
  .join('\n')}

Wallets:
${wallets.map(w => `- ${w.name} (${w.type}): ₱${parseFloat(w.balance.toString()).toLocaleString()}`).join('\n')}

Please provide insights in the following JSON structure:
{
  "summary": "Brief overall financial health summary (2-3 sentences)",
  "recommendations": ["3-5 specific actionable recommendations"],
  "spending_analysis": "Analysis of spending patterns and trends",
  "budget_suggestions": {
    "emergency_fund": "Amount to save for emergency fund",
    "monthly_savings": "Suggested monthly savings amount",
    "expense_optimization": "Areas where expenses can be optimized"
  }
}

Focus on Philippine context (PHP currency, local financial practices, etc.). Keep recommendations practical and actionable.
`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful financial advisor specializing in Philippine personal finance. Provide practical, actionable advice in JSON format only."
        },
        {
          role: "user",
          content: analysisPrompt
        }
      ],
      max_completion_tokens: 1000,
      temperature: 0.7,
    })

    const aiResponse = completion.choices[0]?.message?.content
    
    if (!aiResponse) {
      throw new Error("No response from AI")
    }

    // Parse the AI response as JSON
    let insights
    try {
      insights = JSON.parse(aiResponse)
    } catch (error) {
      console.error("Error parsing AI response:", error)
      insights = {
        summary: "AI analysis completed successfully",
        recommendations: ["Review your spending patterns", "Set up a monthly budget", "Track your expenses regularly"],
        spending_analysis: "Unable to parse detailed analysis at this time"
      }
    }

    return NextResponse.json({ insights })
  } catch (error) {
    console.error("Error generating insights:", error)
    return NextResponse.json(
      { 
        error: "Failed to generate insights",
        insights: {
          summary: "Unable to generate insights at this time",
          recommendations: ["Please try again later"],
          spending_analysis: "Analysis temporarily unavailable"
        }
      },
      { status: 500 }
    )
  }
}