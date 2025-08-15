import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { OpenAI } from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { amount, category, description, walletId } = await request.json()

    if (!amount || !walletId) {
      return NextResponse.json({ error: "Amount and wallet are required" }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        canAfford: true,
        analysis: "AI analysis unavailable - OpenAI API key not configured",
        recommendations: ["Please configure your OpenAI API key for affordability insights"]
      })
    }

    // Get comprehensive financial data
    const wallet = await prisma.wallet.findUnique({
      where: { id: walletId, userId: session.user.id },
    })

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 })
    }

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Recent transactions for spending pattern analysis
    const recentTransactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        date: { gte: thirtyDaysAgo },
      },
      include: {
        wallet: { select: { name: true, type: true } },
      },
      orderBy: { date: "desc" },
    })

    // All active wallets
    const allWallets = await prisma.wallet.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
    })

    // Planned expenses
    const plannedExpenses = await prisma.plannedExpense.findMany({
      where: {
        userId: session.user.id,
        status: { in: ['PLANNED', 'SAVED'] },
      },
    })

    // Calculate financial metrics
    const totalBalance = allWallets.reduce((sum, w) => sum + parseFloat(w.balance.toString()), 0)
    const walletBalance = parseFloat(wallet.balance.toString())
    
    const recentIncome = recentTransactions
      .filter(t => t.type === "INCOME")
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0)

    const recentExpenses = recentTransactions
      .filter(t => t.type === "EXPENSE")
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0)

    const categorySpending = recentTransactions
      .filter(t => t.type === "EXPENSE" && t.category === category)
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0)

    const upcomingPlannedExpenses = plannedExpenses
      .filter(pe => new Date(pe.targetDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
      .reduce((sum, pe) => sum + parseFloat(pe.amount.toString()), 0)

    const requestedAmount = parseFloat(amount.toString())

    // AI Analysis Prompt
    const analysisPrompt = `
As a Filipino financial advisor, analyze this expense request and provide affordability assessment in JSON format only.

EXPENSE REQUEST:
- Amount: ₱${requestedAmount.toLocaleString()}
- Category: ${category || 'Uncategorized'}
- Description: ${description || 'No description'}
- Wallet: ${wallet.name} (${wallet.type})

CURRENT FINANCIAL STATUS:
- Wallet Balance: ₱${walletBalance.toLocaleString()}
- Total Balance (All Wallets): ₱${totalBalance.toLocaleString()}
- Recent 30-day Income: ₱${recentIncome.toLocaleString()}
- Recent 30-day Expenses: ₱${recentExpenses.toLocaleString()}
- Net Cash Flow: ₱${(recentIncome - recentExpenses).toLocaleString()}

CATEGORY ANALYSIS:
- Recent ${category || 'similar'} spending: ₱${categorySpending.toLocaleString()}
- Upcoming planned expenses (30 days): ₱${upcomingPlannedExpenses.toLocaleString()}

CONTEXT:
- Expense is ${((requestedAmount / walletBalance) * 100).toFixed(1)}% of wallet balance
- Expense is ${((requestedAmount / totalBalance) * 100).toFixed(1)}% of total balance
- Emergency fund recommendation: ₱${(recentExpenses * 3).toLocaleString()}

Provide response in this exact JSON structure:
{
  "canAfford": true/false,
  "affordabilityScore": 1-100,
  "analysis": "Detailed analysis of whether this expense is affordable and wise",
  "recommendations": ["3-4 specific recommendations"],
  "alternatives": ["2-3 alternative suggestions if not affordable"],
  "riskLevel": "LOW/MEDIUM/HIGH",
  "budgetImpact": "How this affects monthly budget and cash flow",
  "timeline": "Best timing for this expense if not immediately affordable"
}

Consider Philippine financial context, emergency fund importance, and practical spending advice.
`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a Filipino financial advisor. Respond with valid JSON only - no markdown, no code blocks. Be practical and consider Philippine economic conditions."
        },
        {
          role: "user",
          content: analysisPrompt
        }
      ],
      max_completion_tokens: 800,
      temperature: 0.3,
    })

    const aiResponse = completion.choices[0]?.message?.content
    
    if (!aiResponse) {
      throw new Error("No response from AI")
    }

    // Clean and parse AI response
    let affordabilityAnalysis
    try {
      let cleanResponse = aiResponse.trim()
      cleanResponse = cleanResponse.replace(/^```json\s*/i, '')
      cleanResponse = cleanResponse.replace(/^```\s*/i, '')
      cleanResponse = cleanResponse.replace(/\s*```$/i, '')
      
      const firstBrace = cleanResponse.indexOf('{')
      const lastBrace = cleanResponse.lastIndexOf('}')
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleanResponse = cleanResponse.substring(firstBrace, lastBrace + 1)
      }
      
      affordabilityAnalysis = JSON.parse(cleanResponse)
      
    } catch (error) {
      console.error("Error parsing AI response:", error)
      
      // Fallback analysis based on simple rules
      const simpleAffordability = requestedAmount <= walletBalance * 0.8 && 
                                  requestedAmount <= totalBalance * 0.3 &&
                                  totalBalance >= recentExpenses * 1.5

      affordabilityAnalysis = {
        canAfford: simpleAffordability,
        affordabilityScore: simpleAffordability ? 75 : 30,
        analysis: `Based on your wallet balance of ₱${walletBalance.toLocaleString()}, ${simpleAffordability ? 'you can likely afford this expense' : 'this expense may strain your finances'}. Consider your total balance of ₱${totalBalance.toLocaleString()} and recent spending patterns.`,
        recommendations: simpleAffordability ? 
          ["Ensure this expense aligns with your budget", "Keep tracking your spending", "Maintain emergency fund"] :
          ["Consider reducing the amount", "Look for alternatives", "Save up for this expense"],
        alternatives: simpleAffordability ? [] : 
          ["Split into smaller payments", "Look for discounts or sales", "Consider a similar but cheaper option"],
        riskLevel: requestedAmount > walletBalance * 0.5 ? "HIGH" : requestedAmount > walletBalance * 0.3 ? "MEDIUM" : "LOW",
        budgetImpact: `This expense represents ${((requestedAmount / recentExpenses) * 100).toFixed(1)}% of your monthly spending`,
        timeline: simpleAffordability ? "Can proceed now" : "Consider saving for 2-4 weeks"
      }
    }

    return NextResponse.json(affordabilityAnalysis)
    
  } catch (error) {
    console.error("Error analyzing affordability:", error)
    return NextResponse.json(
      { 
        error: "Failed to analyze affordability",
        canAfford: true,
        analysis: "Unable to analyze affordability at this time",
        recommendations: ["Please try again later"]
      },
      { status: 500 }
    )
  }
}