"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency } from "@/lib/currency"
import { AffordabilityChecker } from "@/components/ai/affordability-checker"
import { Brain, Calculator } from "lucide-react"

interface AffordabilityResult {
  canAfford: boolean
  walletId?: string
  walletName?: string
  remainingBalance?: number
  currentBalance?: number
  shortfall?: number
  totalBalance?: number
  reason?: string
  message?: string
  requiresMultipleWallets?: boolean
  timeBasedInfo?: {
    type: "budget_period" | "next_paycheck"
    endDate?: Date
    nextPayDate?: Date
    daysRemaining?: number
    daysUntilPay?: number
    dailyBudget: number
    totalBudget?: number
    nextPayAmount?: number
    incomeName?: string
    message: string
  }
  budgetImpact?: {
    dailyBudgetUsed: number
    dailyBudgetRemaining: number
    percentageOfDailyBudget: number
  }
  timeWarning?: string
  alternatives?: {
    canAffordFromOthers: boolean
    suggestedWallets?: Array<{
      id: string
      name: string
      balance: number
      remainingAfterExpense: number
    }>
    totalBalance?: number
    message?: string
  }
  suggestedWallets?: Array<{
    id: string
    name: string
    balance: number
    remainingAfterExpense: number
  }>
  walletBreakdown?: Array<{
    id: string
    name: string
    balance: number
  }>
  suggestions?: string[]
}

interface AffordabilityCheckProps {
  amount: number
  walletId?: string
  category?: string
  description?: string
  onWalletSuggestion?: (walletId: string) => void
}

export function AffordabilityCheck({ 
  amount, 
  walletId, 
  category,
  description,
  onWalletSuggestion 
}: AffordabilityCheckProps) {
  const [result, setResult] = useState<AffordabilityResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("traditional")

  useEffect(() => {
    const checkAffordability = async () => {
      setIsLoading(true)
      try {
        const response = await fetch("/api/affordability", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount,
            walletId,
            category,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          setResult(data)
        }
      } catch (error) {
        console.error("Error checking affordability:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (amount > 0) {
      checkAffordability()
    } else {
      setResult(null)
    }
  }, [amount, walletId, category])


  if (isLoading) {
    return (
      <Alert>
        <AlertDescription>
          Checking affordability...
        </AlertDescription>
      </Alert>
    )
  }

  if (!result) {
    return null
  }

  const getAlertVariant = () => {
    if (result.canAfford) {
      return "default" // Green/success styling
    }
    return "destructive" // Red/error styling
  }

  const getStatusBadge = () => {
    if (result.canAfford) {
      return <Badge className="bg-green-100 text-green-800">✓ Affordable</Badge>
    }
    return <Badge variant="destructive">✗ Cannot Afford</Badge>
  }

  // Show AI insights by default if walletId is available
  const shouldShowAI = walletId && amount > 0

  if (!amount || amount <= 0) {
    return null
  }

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-medium">Affordability Analysis</h3>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="traditional" className="text-xs">
            <Calculator className="h-3 w-3 mr-1" />
            Quick Check
          </TabsTrigger>
          <TabsTrigger value="ai" disabled={!shouldShowAI} className="text-xs">
            <Brain className="h-3 w-3 mr-1" />
            AI Analysis
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="traditional" className="mt-4">
          {isLoading ? (
            <Alert>
              <AlertDescription>Checking affordability...</AlertDescription>
            </Alert>
          ) : result ? (
            <div className="space-y-3">
              <Alert variant={getAlertVariant()}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusBadge()}
                      <span className="text-sm font-medium">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                    
                    <AlertDescription>
                      {result.message && (
                        <div className="mb-2">{result.message}</div>
                      )}
                      
                      {result.reason && (
                        <div className="text-sm opacity-90">{result.reason}</div>
                      )}

                      {result.shortfall && (
                        <div className="text-sm mt-1">
                          Short by: <span className="font-medium">{formatCurrency(result.shortfall)}</span>
                        </div>
                      )}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>

      {/* Wallet Suggestions */}
      {result.suggestedWallets && result.suggestedWallets.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Recommended wallets:</div>
          {result.suggestedWallets.map((wallet) => (
            <div 
              key={wallet.id}
              className="flex items-center justify-between p-2 bg-muted rounded-lg"
            >
              <div>
                <div className="font-medium text-sm">{wallet.name}</div>
                <div className="text-xs text-gray-600">
                  Balance: {formatCurrency(wallet.balance)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-600">After expense:</div>
                <div className="text-sm font-medium">
                  {formatCurrency(wallet.remainingAfterExpense)}
                </div>
                {onWalletSuggestion && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-1 h-6 text-xs"
                    onClick={() => onWalletSuggestion(wallet.id)}
                  >
                    Use This
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Alternative Wallet Options */}
      {result.alternatives && result.alternatives.suggestedWallets && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Alternative wallets:</div>
          {result.alternatives.suggestedWallets.map((wallet) => (
            <div 
              key={wallet.id}
              className="flex items-center justify-between p-2 bg-blue-50 rounded-lg"
            >
              <div>
                <div className="font-medium text-sm">{wallet.name}</div>
                <div className="text-xs text-gray-600">
                  Balance: {formatCurrency(wallet.balance)}
                </div>
              </div>
              <div className="text-right">
                {onWalletSuggestion && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs"
                    onClick={() => onWalletSuggestion(wallet.id)}
                  >
                    Switch to This
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Multiple Wallets Required */}
      {result.requiresMultipleWallets && result.walletBreakdown && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-amber-700">
            Multiple wallets needed:
          </div>
          <div className="space-y-1">
            {result.walletBreakdown.map((wallet) => (
              <div 
                key={wallet.id}
                className="flex justify-between text-sm p-2 bg-amber-50 rounded"
              >
                <span>{wallet.name}</span>
                <span>{formatCurrency(wallet.balance)}</span>
              </div>
            ))}
          </div>
          <div className="text-xs text-amber-700">
            Total: {formatCurrency(result.totalBalance || 0)}
          </div>
        </div>
      )}

      {/* Time-Based Budget Information */}
      {result.timeBasedInfo && (
        <div className="space-y-3 p-3 bg-muted rounded-lg">
          <div className="text-sm font-medium text-foreground">
            Budget Timeline
          </div>
          
          <div className="text-sm text-muted-foreground">
            {result.timeBasedInfo.message}
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-gray-500">Daily Budget</div>
              <div className="font-medium">
                {formatCurrency(result.timeBasedInfo.dailyBudget)}
              </div>
            </div>
            
            {result.budgetImpact && (
              <div>
                <div className="text-xs text-gray-500">After This Expense</div>
                <div className="font-medium">
                  {formatCurrency(result.budgetImpact.dailyBudgetRemaining)}
                </div>
              </div>
            )}
          </div>

          {result.budgetImpact && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Daily Budget Usage</span>
                <span>{result.budgetImpact.percentageOfDailyBudget.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-muted-foreground/20 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    result.budgetImpact.percentageOfDailyBudget > 100 
                      ? 'bg-red-500' 
                      : result.budgetImpact.percentageOfDailyBudget > 75 
                        ? 'bg-yellow-500' 
                        : 'bg-green-500'
                  }`}
                  style={{ 
                    width: `${Math.min(result.budgetImpact.percentageOfDailyBudget, 100)}%` 
                  }}
                ></div>
              </div>
            </div>
          )}

          {result.timeWarning && (
            <div className="text-sm text-amber-700 bg-amber-50 p-2 rounded">
              ⚠️ {result.timeWarning}
            </div>
          )}
        </div>
      )}

          {/* Suggestions */}
          {result.suggestions && result.suggestions.length > 0 && (
            <div className="space-y-1">
              <div className="text-sm font-medium">Suggestions:</div>
              <ul className="text-sm text-gray-600 space-y-1">
                {result.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-1">
                    <span className="text-xs mt-1">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          {shouldShowAI ? (
            <AffordabilityChecker
              amount={amount}
              category={category}
              description={description}
              walletId={walletId}
              onResult={() => {}} // Optional callback
            />
          ) : (
            <Alert>
              <AlertDescription>
                Please select a wallet and enter an amount to get AI-powered affordability analysis.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}