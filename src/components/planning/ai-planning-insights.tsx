"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { getInsights, clearInsightsCache } from "@/lib/cached-insights"
import { 
  Brain, 
  RefreshCw, 
  Target, 
  TrendingUp, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Lightbulb,
  Zap,
  Shield,
  Database
} from "lucide-react"

interface PlanningInsights {
  planningScore: number
  summary: string
  recommendations: string[]
  priorityInsights: string
  timelineOptimization: string
  budgetAlignment: string
  riskAssessment: {
    overallRisk: "LOW" | "MEDIUM" | "HIGH"
    cashFlowRisk: string
    timelineRisk: string
  }
  actionPlan: {
    immediate: string[]
    shortTerm: string[]
    longTerm: string[]
  }
  categoryInsights: string
  confidenceOptimization: string
}

interface AIPlanningInsightsProps {
  className?: string
}

export function AIPlanningInsights({ className }: AIPlanningInsightsProps) {
  const [insights, setInsights] = useState<PlanningInsights | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [fromCache, setFromCache] = useState(false)

  const fetchInsights = async (forceRefresh = false) => {
    setIsLoading(true)
    try {
      const result = await getInsights(forceRefresh)
      setInsights(result.insights)
      setFromCache(result.fromCache)
      setLastUpdated(new Date())
    } catch (error) {
      console.error("Error fetching planning insights:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualRefresh = async () => {
    await fetchInsights(true) // Force refresh
  }

  const handleClearCache = () => {
    clearInsightsCache()
    setFromCache(false)
    fetchInsights(true)
  }

  useEffect(() => {
    fetchInsights()
    
    // Listen for cache invalidation events
    const handleCacheInvalidated = () => {
      fetchInsights(true) // Force refresh when cache is invalidated
    }
    
    window.addEventListener('insightsCacheInvalidated', handleCacheInvalidated)
    
    return () => {
      window.removeEventListener('insightsCacheInvalidated', handleCacheInvalidated)
    }
  }, [])

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreDescription = (score: number) => {
    if (score >= 80) return "Excellent Planning"
    if (score >= 60) return "Good Planning"
    if (score >= 40) return "Needs Improvement"
    return "Poor Planning"
  }

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case "LOW": return <CheckCircle className="h-4 w-4 text-green-600" />
      case "MEDIUM": return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case "HIGH": return <AlertTriangle className="h-4 w-4 text-red-600" />
      default: return <AlertTriangle className="h-4 w-4" />
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "LOW": return "bg-green-50 text-green-700 border-green-200"
      case "MEDIUM": return "bg-yellow-50 text-yellow-700 border-yellow-200"
      case "HIGH": return "bg-red-50 text-red-700 border-red-200"
      default: return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              <CardTitle>AI Planning Insights</CardTitle>
              {fromCache && (
                <Badge variant="secondary" className="text-xs">
                  <Database className="h-3 w-3 mr-1" />
                  Cached
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={isLoading}
                title="Force refresh insights"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
              {fromCache && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearCache}
                  disabled={isLoading}
                  title="Clear cache and refresh"
                  className="text-xs px-2"
                >
                  Clear Cache
                </Button>
              )}
            </div>
          </div>
          {lastUpdated && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Last updated: {lastUpdated.toLocaleString()}</span>
              {fromCache && (
                <span className="text-blue-600">Data loaded from cache</span>
              )}
            </div>
          )}
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
              {/* Planning Score */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    <h3 className="font-semibold">Planning Score</h3>
                  </div>
                  <div className={`text-2xl font-bold ${getScoreColor(insights.planningScore)}`}>
                    {insights.planningScore}/100
                  </div>
                </div>
                <Progress value={insights.planningScore} className="h-2" />
                <p className={`text-sm font-medium ${getScoreColor(insights.planningScore)}`}>
                  {getScoreDescription(insights.planningScore)}
                </p>
              </div>

              {/* Summary */}
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Planning Summary
                </h3>
                <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                  {insights.summary}
                </p>
              </div>

              {/* Risk Assessment */}
              <div className={`p-4 rounded-lg border ${getRiskColor(insights.riskAssessment.overallRisk)}`}>
                <div className="flex items-center gap-2 mb-2">
                  {getRiskIcon(insights.riskAssessment.overallRisk)}
                  <h3 className="font-semibold">Risk Assessment: {insights.riskAssessment.overallRisk}</h3>
                </div>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Cash Flow:</span> {insights.riskAssessment.cashFlowRisk}</p>
                  <p><span className="font-medium">Timeline:</span> {insights.riskAssessment.timelineRisk}</p>
                </div>
              </div>

              {/* Action Plan */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Action Plan
                </h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="bg-red-50 p-3 rounded-lg">
                    <h4 className="font-medium text-red-700 mb-2 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Immediate (1 week)
                    </h4>
                    <ul className="text-xs text-red-600 space-y-1">
                      {insights.actionPlan.immediate.map((action, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <span className="mt-1">•</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <h4 className="font-medium text-yellow-700 mb-2 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Short-term (1-2 months)
                    </h4>
                    <ul className="text-xs text-yellow-600 space-y-1">
                      {insights.actionPlan.shortTerm.map((action, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <span className="mt-1">•</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <h4 className="font-medium text-green-700 mb-2 flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      Long-term (3+ months)
                    </h4>
                    <ul className="text-xs text-green-600 space-y-1">
                      {insights.actionPlan.longTerm.map((action, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <span className="mt-1">•</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Key Insights */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-semibold mb-2">Priority Insights</h4>
                  <p className="text-sm text-muted-foreground">{insights.priorityInsights}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Timeline Optimization</h4>
                  <p className="text-sm text-muted-foreground">{insights.timelineOptimization}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Budget Alignment</h4>
                  <p className="text-sm text-muted-foreground">{insights.budgetAlignment}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Category Insights</h4>
                  <p className="text-sm text-muted-foreground">{insights.categoryInsights}</p>
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  AI Recommendations
                </h3>
                <div className="space-y-2">
                  {insights.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                      <Badge variant="outline" className="mt-0.5 text-xs shrink-0 bg-blue-100 text-blue-700">
                        {index + 1}
                      </Badge>
                      <p className="text-sm text-blue-700">{recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Confidence Optimization */}
              <div>
                <h4 className="font-semibold mb-2">Confidence Optimization</h4>
                <p className="text-sm text-muted-foreground bg-purple-50 p-3 rounded-lg border border-purple-200">
                  {insights.confidenceOptimization}
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No planning insights available yet</p>
              <Button onClick={() => fetchInsights()} variant="outline">
                Generate Planning Insights
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}