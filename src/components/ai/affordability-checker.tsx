"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Brain, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  TrendingUp, 
  Clock,
  RefreshCw,
  Lightbulb,
  Target
} from "lucide-react"

interface AffordabilityResult {
  canAfford: boolean
  affordabilityScore: number
  analysis: string
  recommendations: string[]
  alternatives?: string[]
  riskLevel: "LOW" | "MEDIUM" | "HIGH"
  budgetImpact: string
  timeline: string
}

interface AffordabilityCheckerProps {
  amount: number
  category?: string
  description?: string
  walletId: string
  onResult?: (result: AffordabilityResult) => void
}

export function AffordabilityChecker({
  amount,
  category,
  description,
  walletId,
  onResult
}: AffordabilityCheckerProps) {
  const [result, setResult] = useState<AffordabilityResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkAffordability = async () => {
    if (!amount || !walletId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/ai-affordability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          category,
          description,
          walletId
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to check affordability")
      }

      const data = await response.json()
      setResult(data)
      onResult?.(data)
    } catch (err) {
      setError("Failed to analyze affordability")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "LOW": return "text-green-600 bg-green-50"
      case "MEDIUM": return "text-yellow-600 bg-yellow-50"
      case "HIGH": return "text-red-600 bg-red-50"
      default: return "text-muted-foreground bg-muted"
    }
  }

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case "LOW": return <CheckCircle className="h-4 w-4" />
      case "MEDIUM": return <AlertTriangle className="h-4 w-4" />
      case "HIGH": return <XCircle className="h-4 w-4" />
      default: return <AlertTriangle className="h-4 w-4" />
    }
  }

  const getAffordabilityIcon = (canAfford: boolean) => {
    return canAfford ? 
      <CheckCircle className="h-5 w-5 text-green-600" /> : 
      <XCircle className="h-5 w-5 text-red-600" />
  }

  return (
    <div className="space-y-4">
      {/* Trigger Button */}
      <div className="flex justify-center">
        <Button 
          onClick={checkAffordability}
          disabled={isLoading || !amount || !walletId}
          variant="outline"
          className="w-full sm:w-auto"
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Brain className="h-4 w-4 mr-2" />
          )}
          {isLoading ? "Analyzing..." : "Check Affordability with AI"}
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {result && (
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                AI Affordability Analysis
              </div>
              <div className="flex items-center gap-2">
                {getAffordabilityIcon(result.canAfford)}
                <span className={`text-sm font-medium ${
                  result.canAfford ? 'text-green-600' : 'text-red-600'
                }`}>
                  {result.canAfford ? 'Affordable' : 'Risky'}
                </span>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Affordability Score */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="font-medium">Affordability Score</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-muted rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      result.affordabilityScore >= 70 ? 'bg-green-500' :
                      result.affordabilityScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${result.affordabilityScore}%` }}
                  />
                </div>
                <span className="font-bold text-sm">{result.affordabilityScore}/100</span>
              </div>
            </div>

            {/* Risk Level */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Risk Level:</span>
              <Badge className={getRiskColor(result.riskLevel)}>
                {getRiskIcon(result.riskLevel)}
                {result.riskLevel}
              </Badge>
            </div>

            {/* Analysis */}
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Analysis
              </h4>
              <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                {result.analysis}
              </p>
            </div>

            {/* Budget Impact */}
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Budget Impact
              </h4>
              <p className="text-sm text-muted-foreground">{result.budgetImpact}</p>
            </div>

            {/* Timeline */}
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recommended Timeline
              </h4>
              <p className="text-sm text-muted-foreground">{result.timeline}</p>
            </div>

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Recommendations
                </h4>
                <div className="space-y-2">
                  {result.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <Badge variant="outline" className="mt-0.5 text-xs shrink-0">
                        {index + 1}
                      </Badge>
                      <p className="text-muted-foreground">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alternatives (if not affordable) */}
            {result.alternatives && result.alternatives.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Alternatives
                </h4>
                <div className="space-y-2">
                  {result.alternatives.map((alt, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <Badge variant="outline" className="mt-0.5 text-xs shrink-0 bg-blue-50 text-blue-600">
                        {index + 1}
                      </Badge>
                      <p className="text-muted-foreground">{alt}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}