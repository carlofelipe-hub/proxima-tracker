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
          planningScore: 50,
          summary: "AI planning insights unavailable - OpenAI API key not configured",
          recommendations: ["Please configure your OpenAI API key to get personalized planning insights"],
          priorityInsights: "Priority analysis unavailable",
          timelineOptimization: "Timeline optimization unavailable"
        }
      })
    }

    // Get comprehensive planning data
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const nextThirtyDays = new Date()
    nextThirtyDays.setDate(nextThirtyDays.getDate() + 30)

    const nextSixtyDays = new Date()
    nextSixtyDays.setDate(nextSixtyDays.getDate() + 60)

    // Get planned expenses
    const plannedExpenses = await prisma.plannedExpense.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        wallet: {
          select: {
            name: true,
            type: true,
            balance: true
          }
        }
      },
      orderBy: {
        targetDate: "asc"
      }
    })

    // Get recent transactions for spending pattern analysis
    const recentTransactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        date: { gte: ninetyDaysAgo }
      },
      include: {
        wallet: {
          select: {
            name: true,
            type: true
          }
        }
      },
      orderBy: {
        date: "desc"
      }
    })

    // Get wallets
    const wallets = await prisma.wallet.findMany({
      where: {
        userId: session.user.id,
        isActive: true
      }
    })

    // Analyze planning data
    const activePlans = plannedExpenses.filter(pe => ['PLANNED', 'SAVED'].includes(pe.status))
    const completedPlans = plannedExpenses.filter(pe => pe.status === 'COMPLETED')
    const upcomingPlans = activePlans.filter(pe => new Date(pe.targetDate) <= nextThirtyDays)

    const totalActivePlanning = activePlans.reduce((sum, pe) => sum + parseFloat(pe.amount.toString()), 0)
    const totalCompletedPlanning = completedPlans.reduce((sum, pe) => sum + parseFloat(pe.amount.toString()), 0)
    const totalUpcoming = upcomingPlans.reduce((sum, pe) => sum + parseFloat(pe.amount.toString()), 0)

    // Calculate financial metrics
    const totalBalance = wallets.reduce((sum, w) => sum + parseFloat(w.balance.toString()), 0)
    
    const recentIncome = recentTransactions
      .filter(t => t.type === "INCOME" && t.date >= thirtyDaysAgo)
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0)

    const recentExpenses = recentTransactions
      .filter(t => t.type === "EXPENSE" && t.date >= thirtyDaysAgo)
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0)

    // Priority distribution analysis
    const priorityDistribution = activePlans.reduce((acc, pe) => {
      acc[pe.priority] = (acc[pe.priority] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Category analysis
    const categoryPlanning = activePlans.reduce((acc, pe) => {
      acc[pe.category] = (acc[pe.category] || 0) + parseFloat(pe.amount.toString())
      return acc
    }, {} as Record<string, number>)

    // Confidence level analysis
    const confidenceAnalysis = activePlans.reduce((acc, pe) => {
      acc[pe.confidenceLevel] = (acc[pe.confidenceLevel] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Timeline analysis
    const overdueCount = activePlans.filter(pe => new Date(pe.targetDate) < new Date()).length

    const analysisPrompt = `
As a Filipino financial planning advisor, analyze this user's financial planning data and provide insights in JSON format only.

CURRENT PLANNING STATUS:
- Total Active Plans: ${activePlans.length}
- Total Active Planning Amount: ₱${totalActivePlanning.toLocaleString()}
- Completed Plans: ${completedPlans.length} (₱${totalCompletedPlanning.toLocaleString()})
- Plans Due in 30 Days: ${upcomingPlans.length} (₱${totalUpcoming.toLocaleString()})
- Overdue Plans: ${overdueCount}

FINANCIAL CONTEXT:
- Current Total Balance: ₱${totalBalance.toLocaleString()}
- Monthly Income: ₱${recentIncome.toLocaleString()}
- Monthly Expenses: ₱${recentExpenses.toLocaleString()}
- Balance vs Upcoming Plans: ${totalBalance >= totalUpcoming ? 'Sufficient' : 'Insufficient'} funds

PLANNING PATTERNS:
- Priority Distribution: ${Object.entries(priorityDistribution).map(([p, c]) => `${p}: ${c}`).join(', ')}
- Confidence Levels: ${Object.entries(confidenceAnalysis).map(([c, n]) => `${c}: ${n}`).join(', ')}
- Top Categories: ${Object.entries(categoryPlanning).sort(([,a], [,b]) => b - a).slice(0, 3).map(([cat, amt]) => `${cat}: ₱${amt.toLocaleString()}`).join(', ')}

UPCOMING EXPENSES (Next 30 days):
${upcomingPlans.map(pe => `- ${pe.title}: ₱${parseFloat(pe.amount.toString()).toLocaleString()} (${pe.priority} priority, ${pe.confidenceLevel} confidence)`).join('\n')}

Provide response in this exact JSON structure:
{
  "planningScore": 1-100,
  "summary": "Overall assessment of planning effectiveness and financial readiness (2-3 sentences)",
  "recommendations": ["4-5 specific actionable planning recommendations"],
  "priorityInsights": "Analysis of priority distribution and suggestions for better prioritization",
  "timelineOptimization": "Recommendations for better timing and sequencing of planned expenses",
  "budgetAlignment": "How well planned expenses align with income and current financial capacity",
  "riskAssessment": {
    "overallRisk": "LOW/MEDIUM/HIGH",
    "cashFlowRisk": "Assessment of cash flow impact",
    "timelineRisk": "Analysis of timing conflicts and deadline pressures"
  },
  "actionPlan": {
    "immediate": ["2-3 actions to take within 1 week"],
    "shortTerm": ["2-3 actions for next 1-2 months"],
    "longTerm": ["2-3 strategic planning improvements"]
  },
  "categoryInsights": "Analysis of spending category patterns and balance suggestions",
  "confidenceOptimization": "Suggestions for improving planning confidence and accuracy"
}

Focus on Philippine financial context, practical planning advice, and cash flow management.
`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a Filipino financial planning advisor. Respond with valid JSON only - no markdown, no code blocks. Be practical and specific with peso amounts and Philippine financial context."
        },
        {
          role: "user",
          content: analysisPrompt
        }
      ],
      max_completion_tokens: 1500,
      temperature: 0.3,
    })

    const aiResponse = completion.choices[0]?.message?.content
    
    if (!aiResponse) {
      throw new Error("No response from AI")
    }

    // Clean and parse AI response
    let insights
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
      
      insights = JSON.parse(cleanResponse)
      
    } catch (error) {
      console.error("Error parsing AI response:", error)
      
      // Fallback insights based on data analysis
      const planningEffectiveness = completedPlans.length > 0 ? 
        Math.min(95, 50 + (completedPlans.length / Math.max(plannedExpenses.length, 1)) * 50) : 
        Math.max(20, 60 - (overdueCount * 10))

      insights = {
        planningScore: Math.round(planningEffectiveness),
        summary: `You have ${activePlans.length} active planned expenses totaling ₱${totalActivePlanning.toLocaleString()}. ${overdueCount > 0 ? `${overdueCount} plans are overdue and need attention.` : 'Your planning timeline looks manageable.'} ${totalBalance >= totalUpcoming ? 'You have sufficient funds for upcoming expenses.' : 'You may need additional funds for upcoming expenses.'}`,
        recommendations: [
          overdueCount > 0 ? "Address overdue planned expenses immediately" : "Maintain your current planning schedule",
          totalBalance < totalUpcoming ? "Build emergency fund or adjust expense timeline" : "Consider increasing your savings rate",
          activePlans.length === 0 ? "Start planning future expenses to improve financial control" : "Review and update confidence levels regularly",
          "Prioritize high-priority expenses and ensure adequate funding",
          confidenceAnalysis.LOW > 0 ? "Reassess low-confidence plans for better accuracy" : "Continue with detailed expense planning"
        ],
        priorityInsights: `Priority distribution: ${Object.entries(priorityDistribution).map(([p, c]) => `${c} ${p.toLowerCase()}`).join(', ')} plans. ${priorityDistribution.URGENT > 2 ? 'Consider spreading urgent items across more time.' : 'Good priority balance.'}`,
        timelineOptimization: upcomingPlans.length > 3 ? 
          "Consider spreading expenses across more months to reduce cash flow pressure" : 
          "Timeline distribution looks manageable for your current financial capacity",
        budgetAlignment: totalActivePlanning > recentIncome * 3 ? 
          "Total planned expenses exceed 3 months of income - consider prioritizing" :
          "Planned expenses align well with your income capacity",
        riskAssessment: {
          overallRisk: totalBalance < totalUpcoming ? "HIGH" : overdueCount > 0 ? "MEDIUM" : "LOW",
          cashFlowRisk: totalUpcoming > totalBalance * 0.8 ? "High cash flow impact expected" : "Manageable cash flow impact",
          timelineRisk: overdueCount > 0 ? "Timeline pressure due to overdue items" : "Timeline appears manageable"
        },
        actionPlan: {
          immediate: [
            overdueCount > 0 ? "Review and address overdue planned expenses" : "Update confidence levels for upcoming expenses",
            totalBalance < totalUpcoming ? "Secure additional funding for upcoming expenses" : "Confirm funding sources for planned expenses"
          ],
          shortTerm: [
            "Set up automated savings for future planned expenses",
            "Review and adjust expense priorities based on changing needs",
            activePlans.length < 3 ? "Plan additional future expenses for better financial control" : "Monitor progress on current plans"
          ],
          longTerm: [
            "Develop systematic approach to expense planning",
            "Build emergency fund to cover unexpected planning changes",
            "Create category budgets based on planning patterns"
          ]
        },
        categoryInsights: Object.keys(categoryPlanning).length > 0 ?
          `Top categories: ${Object.entries(categoryPlanning).sort(([,a], [,b]) => b - a).slice(0, 2).map(([cat, amt]) => `${cat} (₱${amt.toLocaleString()})`).join(', ')}. Consider balancing across different expense types.` :
          "Start categorizing expenses to identify spending patterns and optimize budgets.",
        confidenceOptimization: confidenceAnalysis.LOW > 0 ?
          `${confidenceAnalysis.LOW} low-confidence plans need better research and cost estimation. Break down complex expenses into smaller components.` :
          "Confidence levels look good. Continue with detailed planning and regular updates."
      }
    }

    return NextResponse.json({ insights })
    
  } catch (error) {
    console.error("Error generating planning insights:", error)
    return NextResponse.json(
      { 
        error: "Failed to generate planning insights",
        insights: {
          planningScore: 50,
          summary: "Unable to generate planning insights at this time",
          recommendations: ["Please try again later"],
          priorityInsights: "Priority analysis temporarily unavailable",
          timelineOptimization: "Timeline optimization temporarily unavailable"
        }
      },
      { status: 500 }
    )
  }
}