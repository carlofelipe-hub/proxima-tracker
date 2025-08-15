"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { MobileNav } from "@/components/navigation/mobile-nav"
import { AIInsights } from "@/components/insights/ai-insights"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  TrendingUp, 
  TrendingDown, 
  Brain, 
  Target, 
  PieChart,
  BarChart3,
  RefreshCw
} from "lucide-react"

interface InsightData {
  totalBalance: number
  monthlyIncome: number
  monthlyExpenses: number
  topCategories: Array<{
    category: string
    amount: number
    percentage: number
  }>
  spendingTrend: "INCREASING" | "DECREASING" | "STABLE"
  savingsRate: number
  recommendations: string[]
}

export default function InsightsPage() {
  const { data: session, status } = useSession()
  const [insightData, setInsightData] = useState<InsightData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchInsights = async () => {
    try {
      setRefreshing(true)
      const response = await fetch("/api/insights")
      if (response.ok) {
        const data = await response.json()
        setInsightData(data.analytics)
      }
    } catch (error) {
      console.error("Failed to fetch insights:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (session) {
      fetchInsights()
    }
  }, [session])

  if (status === "loading") {
    return <div>Loading...</div>
  }

  if (!session) {
    redirect("/auth/signin")
  }

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "INCREASING":
        return <TrendingUp className="h-4 w-4 text-red-500" />
      case "DECREASING":
        return <TrendingDown className="h-4 w-4 text-green-500" />
      default:
        return <BarChart3 className="h-4 w-4 text-blue-500" />
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "INCREASING":
        return "text-red-500"
      case "DECREASING":
        return "text-green-500"
      default:
        return "text-blue-500"
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <MobileNav />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              Financial Insights
            </h1>
            <p className="text-muted-foreground">
              AI-powered analysis of your spending patterns
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchInsights}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
            <p className="text-muted-foreground">Analyzing your financial data...</p>
          </div>
        ) : !insightData ? (
          <div className="text-center py-8 space-y-4">
            <PieChart className="h-16 w-16 text-muted-foreground mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">No data available</h3>
              <p className="text-muted-foreground">
                Add some transactions to get personalized insights
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(insightData.totalBalance)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(insightData.monthlyIncome)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(insightData.monthlyExpenses)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Savings Rate</CardTitle>
                  <Target className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatPercentage(insightData.savingsRate)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Spending Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getTrendIcon(insightData.spendingTrend)}
                  Spending Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Your spending is</span>
                  <Badge variant="outline" className={getTrendColor(insightData.spendingTrend)}>
                    {insightData.spendingTrend.toLowerCase()}
                  </Badge>
                  <span className="text-sm text-muted-foreground">compared to last month</span>
                </div>
              </CardContent>
            </Card>

            {/* Top Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Top Spending Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insightData.topCategories.map((category, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{category.category}</span>
                          <span className="text-sm text-muted-foreground">
                            {formatPercentage(category.percentage)}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${category.percentage}%` }}
                          />
                        </div>
                      </div>
                      <div className="ml-4 text-sm font-medium">
                        {formatCurrency(category.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI Insights */}
            <AIInsights />

            {/* Recommendations */}
            {insightData.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {insightData.recommendations.map((recommendation, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </div>
                        <p className="text-sm">{recommendation}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  )
}