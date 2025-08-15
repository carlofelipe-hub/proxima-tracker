"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Brain, RefreshCw, Lightbulb, TrendingUp, PiggyBank } from "lucide-react"

interface Insights {
  summary: string
  recommendations: string[]
  spending_analysis: string
  budget_suggestions?: {
    emergency_fund: string
    monthly_savings: string
    expense_optimization: string
  }
}

interface AIInsightsProps {
  className?: string
}

export function AIInsights({ className }: AIInsightsProps) {
  const [insights, setInsights] = useState<Insights | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchInsights = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/insights")
      if (response.ok) {
        const data = await response.json()
        setInsights(data.insights)
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error("Error fetching insights:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInsights()
  }, [])

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              <CardTitle>AI Financial Insights</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchInsights}
              disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
          <CardDescription>
            AI-powered analysis of your spending patterns and financial health
            {lastUpdated && (
              <span className="block text-xs mt-1">
                Last updated: {lastUpdated.toLocaleString()}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ) : insights ? (
            <>
              {/* Summary */}
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Financial Health Summary
                </h3>
                <p className="text-sm text-muted-foreground">{insights.summary}</p>
              </div>

              {/* Recommendations */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Recommendations
                </h3>
                <div className="space-y-2">
                  {insights.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5 text-xs">
                        {index + 1}
                      </Badge>
                      <p className="text-sm text-muted-foreground">{recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Spending Analysis */}
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Spending Analysis
                </h3>
                <p className="text-sm text-muted-foreground">{insights.spending_analysis}</p>
              </div>

              {/* Budget Suggestions */}
              {insights.budget_suggestions && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <PiggyBank className="h-4 w-4" />
                    Budget Suggestions
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-xs font-medium text-blue-700 mb-1">Emergency Fund</p>
                      <p className="text-sm text-blue-600">{insights.budget_suggestions.emergency_fund}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-xs font-medium text-green-700 mb-1">Monthly Savings</p>
                      <p className="text-sm text-green-600">{insights.budget_suggestions.monthly_savings}</p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <p className="text-xs font-medium text-orange-700 mb-1">Expense Optimization</p>
                      <p className="text-sm text-orange-600">{insights.budget_suggestions.expense_optimization}</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No insights available yet</p>
              <Button onClick={fetchInsights} variant="outline">
                Generate Insights
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}