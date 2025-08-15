"use client"

import { useState, useEffect } from "react"
import { SidebarNav } from "@/components/navigation/sidebar-nav"
import { BudgetPeriodSetup } from "@/components/budget/budget-period-setup"
import { IncomeSourceSetup } from "@/components/budget/income-source-setup"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/currency"
import { formatPhilippineDate, getNowInPhilippineTime, getDaysBetweenInPhilippineTime, toPhilippineTime } from "@/lib/timezone"
import { Calendar, Clock, DollarSign, Plus, TrendingDown, TrendingUp } from "lucide-react"

interface BudgetPeriod {
  id: string
  startDate: string
  endDate: string
  totalIncome: number
  plannedExpenses: number
  actualExpenses: number
  isActive: boolean
  createdAt: string
}

interface IncomeSource {
  id: string
  name: string
  amount: number
  frequency: string
  nextPayDate: string
  lastPayDate?: string
  isActive: boolean
  wallet?: {
    id: string
    name: string
    type: string
  }
}

export default function BudgetPage() {
  const [budgetPeriods, setBudgetPeriods] = useState<BudgetPeriod[]>([])
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([])
  const [wallets, setWallets] = useState<Array<{id: string, name: string, type: string}>>([])
  const [showBudgetSetup, setShowBudgetSetup] = useState(false)
  const [showIncomeSetup, setShowIncomeSetup] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [budgetResponse, incomeResponse, walletsResponse] = await Promise.all([
        fetch("/api/budget-periods"),
        fetch("/api/income-sources"),
        fetch("/api/wallets")
      ])

      if (budgetResponse.ok) {
        const budgetData = await budgetResponse.json()
        setBudgetPeriods(budgetData)
      }

      if (incomeResponse.ok) {
        const incomeData = await incomeResponse.json()
        setIncomeSources(incomeData)
      }

      if (walletsResponse.ok) {
        const walletsData = await walletsResponse.json()
        setWallets(walletsData.map((w: {id: string, name: string, type: string}) => ({
          id: w.id,
          name: w.name,
          type: w.type
        })))
      }
    } catch (error) {
      console.error("Error fetching budget data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const activeBudgetPeriod = budgetPeriods.find(bp => bp.isActive)

  const getCurrentBudgetInfo = () => {
    if (!activeBudgetPeriod) return null

    const now = getNowInPhilippineTime()
    const endDate = toPhilippineTime(activeBudgetPeriod.endDate)
    const startDate = toPhilippineTime(activeBudgetPeriod.startDate)
    
    const totalDays = getDaysBetweenInPhilippineTime(startDate, endDate)
    const daysRemaining = getDaysBetweenInPhilippineTime(now, endDate)
    const daysElapsed = totalDays - daysRemaining
    
    const dailyBudget = activeBudgetPeriod.totalIncome / totalDays
    const budgetUsed = activeBudgetPeriod.actualExpenses
    const budgetRemaining = activeBudgetPeriod.totalIncome - budgetUsed
    const avgDailySpending = daysElapsed > 0 ? budgetUsed / daysElapsed : 0
    
    return {
      ...activeBudgetPeriod,
      totalDays,
      daysRemaining,
      daysElapsed,
      dailyBudget,
      budgetUsed,
      budgetRemaining,
      avgDailySpending,
      projectedSpending: avgDailySpending * totalDays,
      onTrack: avgDailySpending <= dailyBudget
    }
  }

  const currentBudget = getCurrentBudgetInfo()

  return (
    <>
      <SidebarNav />
      
      <div className="min-h-screen bg-background lg:ml-80">
        <div className="container mx-auto px-4 py-6 lg:py-6 pt-20 lg:pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Budget Management</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Manage your budget periods and income sources
            </p>
          </div>
          <Button onClick={() => setShowBudgetSetup(true)} className="sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            New Budget Period
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8">Loading budget information...</div>
        ) : (
          <div className="space-y-6">
            {/* Current Budget Period */}
            {currentBudget ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Current Budget Period
                      </CardTitle>
                      <CardDescription>
                        {formatPhilippineDate(currentBudget.startDate)} - {formatPhilippineDate(currentBudget.endDate)}
                      </CardDescription>
                    </div>
                    <Badge variant={currentBudget.onTrack ? "default" : "destructive"}>
                      {currentBudget.onTrack ? "On Track" : "Over Budget"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {currentBudget.daysRemaining}
                      </div>
                      <div className="text-sm text-blue-800">Days Left</div>
                    </div>
                    
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency(currentBudget.dailyBudget)}
                      </div>
                      <div className="text-sm text-green-800">Daily Budget</div>
                    </div>
                    
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-lg font-bold text-purple-600">
                        {formatCurrency(currentBudget.budgetRemaining)}
                      </div>
                      <div className="text-sm text-purple-800">Remaining</div>
                    </div>
                    
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-lg font-bold text-orange-600">
                        {formatCurrency(currentBudget.avgDailySpending)}
                      </div>
                      <div className="text-sm text-orange-800">Avg Daily Spent</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Budget Used</span>
                      <span>{((currentBudget.budgetUsed / currentBudget.totalIncome) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full ${
                          currentBudget.onTrack ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        style={{ 
                          width: `${Math.min((currentBudget.budgetUsed / currentBudget.totalIncome) * 100, 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Total Income: {formatCurrency(currentBudget.totalIncome)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {currentBudget.onTrack ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">
                        {currentBudget.onTrack ? "Under budget" : "Over budget"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>No Active Budget Period</CardTitle>
                  <CardDescription>
                    Set up a budget period to enable affordability checking and budget tracking.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setShowBudgetSetup(true)} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Budget Period
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Income Sources */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Income Sources
                    </CardTitle>
                    <CardDescription>
                      Track your income sources
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowIncomeSetup(true)} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Income
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {incomeSources.length > 0 ? (
                  <div className="space-y-3">
                    {incomeSources.map((income) => (
                      <div key={income.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{income.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {income.frequency} • Next pay: {formatPhilippineDate(income.nextPayDate)}
                          </div>
                          {income.wallet && (
                            <div className="text-xs text-muted-foreground">
                              → {income.wallet.name}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(income.amount)}</div>
                          <Badge variant={income.isActive ? "default" : "secondary"}>
                            {income.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="mb-2">No income sources configured</p>
                    <p className="text-sm mb-4 px-4">Add income sources for better budget tracking</p>
                    <Button onClick={() => setShowIncomeSetup(true)} variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Your First Income Source
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Budget History */}
            {budgetPeriods.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Budget History</CardTitle>
                  <CardDescription>Previous budget periods</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {budgetPeriods.map((period) => (
                      <div key={period.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">
                            {formatPhilippineDate(period.startDate)} - {formatPhilippineDate(period.endDate)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Total Income: {formatCurrency(period.totalIncome)}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={period.isActive ? "default" : "secondary"}>
                            {period.isActive ? "Active" : "Completed"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        </div>

        <BudgetPeriodSetup
          open={showBudgetSetup}
          onOpenChange={setShowBudgetSetup}
          onSuccess={fetchData}
        />

        <IncomeSourceSetup
          open={showIncomeSetup}
          onOpenChange={setShowIncomeSetup}
          onSuccess={fetchData}
          wallets={wallets}
        />
      </div>
    </>
  )
}