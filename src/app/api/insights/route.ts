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

    // Get comprehensive user financial data
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    // Get recent transactions (30 days)
    const recentTransactions = await prisma.transaction.findMany({
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

    // Get historical transactions for trend analysis (90 days)
    const historicalTransactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: ninetyDaysAgo,
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

    // Get all active wallets
    const wallets = await prisma.wallet.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
    })

    // Get planned expenses for budget comparison (active/planned ones)
    const plannedExpenses = await prisma.plannedExpense.findMany({
      where: {
        userId: session.user.id,
        status: {
          in: ['PLANNED', 'SAVED']
        },
      },
    })

    // Prepare comprehensive data analysis for AI
    const recentIncome = recentTransactions
      .filter(t => t.type === "INCOME")
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0)

    const recentExpenses = recentTransactions
      .filter(t => t.type === "EXPENSE")
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0)

    // Historical comparison (previous 30-90 days)
    const historicalRecentTransactions = historicalTransactions.filter(t => 
      t.date >= ninetyDaysAgo && t.date < thirtyDaysAgo
    )
    
    const previousIncome = historicalRecentTransactions
      .filter(t => t.type === "INCOME")
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0)

    const previousExpenses = historicalRecentTransactions
      .filter(t => t.type === "EXPENSE")
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0)

    // Category analysis
    const categorySpending = recentTransactions
      .filter(t => t.type === "EXPENSE")
      .reduce((acc, t) => {
        const category = t.category
        acc[category] = (acc[category] || 0) + parseFloat(t.amount.toString())
        return acc
      }, {} as Record<string, number>)

    // Wallet analysis
    const totalBalance = wallets.reduce((sum, w) => sum + parseFloat(w.balance.toString()), 0)
    const walletBreakdown = wallets.map(w => ({
      name: w.name,
      type: w.type,
      balance: parseFloat(w.balance.toString()),
      percentage: (parseFloat(w.balance.toString()) / totalBalance * 100).toFixed(1)
    }))

    // Planned vs actual expenses
    const totalPlannedExpenses = plannedExpenses.reduce((sum, pe) => 
      sum + parseFloat(pe.amount.toString()), 0
    )

    // Income sources analysis
    const incomeByWallet = recentTransactions
      .filter(t => t.type === "INCOME")
      .reduce((acc, t) => {
        const walletName = t.wallet?.name || 'Unknown'
        acc[walletName] = (acc[walletName] || 0) + parseFloat(t.amount.toString())
        return acc
      }, {} as Record<string, number>)

    // Spending frequency analysis
    const spendingDays = recentTransactions
      .filter(t => t.type === "EXPENSE")
      .map(t => t.date.toISOString().split('T')[0])
    const uniqueSpendingDays = new Set(spendingDays).size

    // Transfer analysis
    const transfers = recentTransactions.filter(t => t.type === "TRANSFER")
    const totalTransferAmount = transfers.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0)
    const totalTransferFees = transfers.reduce((sum, t) => sum + parseFloat(t.transferFee?.toString() || '0'), 0)

    const analysisPrompt = `
As a financial advisor for Filipino users, analyze this comprehensive financial data and provide insights in JSON format only. Do not include any markdown formatting or code blocks in your response.

CURRENT FINANCIAL STATUS (Last 30 days):
- Recent Income: ₱${recentIncome.toLocaleString()}
- Recent Expenses: ₱${recentExpenses.toLocaleString()}
- Net Income: ₱${(recentIncome - recentExpenses).toLocaleString()}
- Current Total Balance: ₱${totalBalance.toLocaleString()}
- Number of Recent Transactions: ${recentTransactions.length}

TREND COMPARISON (Previous 30 days vs Current):
- Income Change: ₱${previousIncome.toLocaleString()} → ₱${recentIncome.toLocaleString()} (${recentIncome > previousIncome ? '+' : ''}${((recentIncome - previousIncome) / (previousIncome || 1) * 100).toFixed(1)}%)
- Expense Change: ₱${previousExpenses.toLocaleString()} → ₱${recentExpenses.toLocaleString()} (${recentExpenses > previousExpenses ? '+' : ''}${((recentExpenses - previousExpenses) / (previousExpenses || 1) * 100).toFixed(1)}%)

SPENDING BY CATEGORY:
${Object.entries(categorySpending)
  .sort(([,a], [,b]) => b - a)
  .map(([category, amount]) => `- ${category}: ₱${amount.toLocaleString()} (${(amount/recentExpenses*100).toFixed(1)}%)`)
  .join('\n')}

INCOME SOURCES:
${Object.entries(incomeByWallet)
  .map(([wallet, amount]) => `- ${wallet}: ₱${amount.toLocaleString()}`)
  .join('\n')}

WALLET BREAKDOWN:
${walletBreakdown
  .map(w => `- ${w.name} (${w.type}): ₱${w.balance.toLocaleString()} (${w.percentage}%)`)
  .join('\n')}

PLANNED VS ACTUAL EXPENSES:
- Planned Monthly Expenses: ₱${totalPlannedExpenses.toLocaleString()}
- Actual Monthly Expenses: ₱${recentExpenses.toLocaleString()}
- Variance: ₱${(recentExpenses - totalPlannedExpenses).toLocaleString()} (${totalPlannedExpenses > 0 ? ((recentExpenses - totalPlannedExpenses) / totalPlannedExpenses * 100).toFixed(1) : 'N/A'}%)

SPENDING PATTERNS:
- Active spending days: ${uniqueSpendingDays} out of 30 days
- Average spending per active day: ₱${uniqueSpendingDays > 0 ? (recentExpenses / uniqueSpendingDays).toLocaleString() : '0'}
- Transfer activity: ${transfers.length} transfers totaling ₱${totalTransferAmount.toLocaleString()}
- Transfer fees paid: ₱${totalTransferFees.toLocaleString()}

Provide insights in this exact JSON structure (no markdown, no code blocks):
{
  "summary": "Brief overall financial health summary focusing on trends and current status (2-3 sentences)",
  "recommendations": ["3-5 specific actionable recommendations based on the data"],
  "spending_analysis": "Detailed analysis of spending patterns, categories, and behaviors",
  "budget_suggestions": {
    "emergency_fund": "Specific amount to save for emergency fund based on expenses",
    "monthly_savings": "Suggested monthly savings amount based on income",
    "expense_optimization": "Specific areas where expenses can be optimized with amounts"
  },
  "alerts": ["Important financial alerts or warnings based on the data"],
  "trends": {
    "income_trend": "Analysis of income changes",
    "expense_trend": "Analysis of expense changes",
    "category_insights": "Insights about category spending patterns"
  }
}

Focus on Philippine financial context, GCash/banking habits, and practical advice. Be specific with peso amounts.
`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a financial advisor specializing in Philippine personal finance. You must respond with valid JSON only - no markdown, no code blocks, no additional text. Start your response with { and end with }. Provide practical, actionable advice specific to Filipino financial habits and the Philippine economy."
        },
        {
          role: "user",
          content: analysisPrompt
        }
      ],
      max_completion_tokens: 1200,
      temperature: 0.3,
    })

    const aiResponse = completion.choices[0]?.message?.content
    
    if (!aiResponse) {
      throw new Error("No response from AI")
    }

    // Clean and parse the AI response as JSON
    let insights
    try {
      // Remove any potential markdown formatting
      let cleanResponse = aiResponse.trim()
      
      // Remove code block markers if present
      cleanResponse = cleanResponse.replace(/^```json\s*/i, '')
      cleanResponse = cleanResponse.replace(/^```\s*/i, '')
      cleanResponse = cleanResponse.replace(/\s*```$/i, '')
      
      // Find JSON content between first { and last }
      const firstBrace = cleanResponse.indexOf('{')
      const lastBrace = cleanResponse.lastIndexOf('}')
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleanResponse = cleanResponse.substring(firstBrace, lastBrace + 1)
      }
      
      insights = JSON.parse(cleanResponse)
      
      // Validate required fields
      if (!insights.summary || !insights.recommendations || !Array.isArray(insights.recommendations)) {
        throw new Error("Invalid response structure")
      }
      
    } catch (error) {
      console.error("Error parsing AI response:", error)
      console.error("Raw AI response:", aiResponse)
      
      // Provide fallback insights based on actual data
      insights = {
        summary: `Your recent financial activity shows ₱${recentIncome.toLocaleString()} in income and ₱${recentExpenses.toLocaleString()} in expenses over the last 30 days. ${recentIncome > recentExpenses ? 'You maintained a positive cash flow.' : 'Your expenses exceeded income this month.'}`,
        recommendations: [
          recentExpenses > recentIncome ? "Focus on reducing expenses to match your income" : "Consider increasing your savings rate",
          Object.keys(categorySpending).length > 0 ? `Review your ${Object.entries(categorySpending).sort(([,a], [,b]) => b - a)[0][0]} spending` : "Track your expenses by category",
          totalPlannedExpenses > 0 && Math.abs(recentExpenses - totalPlannedExpenses) > totalPlannedExpenses * 0.1 ? "Adjust your planned expenses to better match actual spending" : "Create a monthly budget plan",
          totalBalance < recentExpenses * 3 ? "Build an emergency fund covering 3-6 months of expenses" : "Consider investment opportunities for your excess funds"
        ],
        spending_analysis: `Over the last 30 days, you had ${recentTransactions.length} transactions across ${wallets.length} wallet${wallets.length > 1 ? 's' : ''}. ${Object.keys(categorySpending).length > 0 ? `Your top spending category was ${Object.entries(categorySpending).sort(([,a], [,b]) => b - a)[0][0]} at ₱${Object.entries(categorySpending).sort(([,a], [,b]) => b - a)[0][1].toLocaleString()}.` : ''}`,
        budget_suggestions: {
          emergency_fund: `₱${(recentExpenses * 3).toLocaleString()}`,
          monthly_savings: recentIncome > recentExpenses ? `₱${((recentIncome - recentExpenses) * 0.2).toLocaleString()}` : "Focus on expense reduction first",
          expense_optimization: Object.keys(categorySpending).length > 0 ? `Consider reducing ${Object.entries(categorySpending).sort(([,a], [,b]) => b - a)[0][0]} expenses` : "Track expenses to identify optimization opportunities"
        },
        alerts: recentExpenses > recentIncome ? ["Monthly expenses exceed income"] : [],
        trends: {
          income_trend: previousIncome > 0 ? `${recentIncome > previousIncome ? 'Increasing' : 'Decreasing'} income trend` : "No historical data available",
          expense_trend: previousExpenses > 0 ? `${recentExpenses > previousExpenses ? 'Increasing' : 'Decreasing'} expense trend` : "No historical data available", 
          category_insights: Object.keys(categorySpending).length > 0 ? `${Object.entries(categorySpending).sort(([,a], [,b]) => b - a)[0][0]} is your largest expense category` : "Start categorizing expenses for better insights"
        }
      }
    }

    // Also create analytics data for the main insights page
    const analytics = {
      totalBalance,
      monthlyIncome: recentIncome,
      monthlyExpenses: recentExpenses,
      topCategories: Object.entries(categorySpending)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: recentExpenses > 0 ? (amount / recentExpenses * 100) : 0
        })),
      spendingTrend: previousExpenses > 0 ? 
        (recentExpenses > previousExpenses * 1.1 ? "INCREASING" : 
         recentExpenses < previousExpenses * 0.9 ? "DECREASING" : "STABLE") : "STABLE",
      savingsRate: recentIncome > 0 ? ((recentIncome - recentExpenses) / recentIncome * 100) : 0,
      recommendations: Array.isArray(insights?.recommendations) ? insights.recommendations : []
    }

    return NextResponse.json({ insights, analytics })
  } catch (error) {
    console.error("Error generating insights:", error)
    
    const fallbackInsights = {
      summary: "Unable to generate insights at this time",
      recommendations: ["Please try again later"],
      spending_analysis: "Analysis temporarily unavailable"
    }
    
    const fallbackAnalytics = {
      totalBalance: 0,
      monthlyIncome: 0,
      monthlyExpenses: 0,
      topCategories: [],
      spendingTrend: "STABLE" as const,
      savingsRate: 0,
      recommendations: ["Please try again later"]
    }
    
    return NextResponse.json(
      { 
        error: "Failed to generate insights",
        insights: fallbackInsights,
        analytics: fallbackAnalytics
      },
      { status: 500 }
    )
  }
}