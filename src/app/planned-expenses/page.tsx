"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { SidebarNav } from "@/components/navigation/sidebar-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Target, 
  Calendar,
  Trash2, 
  CheckCircle,
  Clock,
  XCircle,
  Pause
} from "lucide-react"
import { formatCurrency } from "@/lib/currency"
import { formatPhilippineDate, getNowInPhilippineTime, getDaysBetweenInPhilippineTime, toPhilippineTime } from "@/lib/timezone"
import { EditPlannedExpenseDialog } from "@/components/planned-expenses/edit-planned-expense-dialog"

interface PlannedExpense {
  id: string
  title: string
  amount: number
  category: string
  description?: string
  targetDate: string
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  status: "PLANNED" | "SAVED" | "COMPLETED" | "CANCELLED" | "POSTPONED"
  wallet?: {
    id: string
    name: string
    type: string
  }
  createdAt: string
  updatedAt: string
}

interface Wallet {
  id: string
  name: string
  type: string
}

export default function PlannedExpensesPage() {
  const { data: session, status } = useSession()
  const [plannedExpenses, setPlannedExpenses] = useState<PlannedExpense[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPlannedExpenses = async () => {
    try {
      const response = await fetch("/api/planned-expenses")
      if (response.ok) {
        const data = await response.json()
        setPlannedExpenses(data.plannedExpenses)
      }
    } catch (error) {
      console.error("Failed to fetch planned expenses:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchWallets = async () => {
    try {
      const response = await fetch("/api/wallets")
      if (response.ok) {
        const data = await response.json()
        setWallets(data)
      }
    } catch (error) {
      console.error("Failed to fetch wallets:", error)
    }
  }

  useEffect(() => {
    if (session) {
      fetchPlannedExpenses()
      fetchWallets()
    }
  }, [session])

  if (status === "loading") {
    return <div>Loading...</div>
  }

  if (!session) {
    redirect("/auth/signin")
  }

  const updateExpenseStatus = async (id: string, status: PlannedExpense['status']) => {
    try {
      const response = await fetch("/api/planned-expenses", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, status }),
      })

      if (response.ok) {
        fetchPlannedExpenses() // Refresh the list
      }
    } catch (error) {
      console.error("Failed to update expense status:", error)
    }
  }

  const deleteExpense = async (id: string) => {
    if (!confirm("Are you sure you want to delete this planned expense?")) {
      return
    }

    try {
      const response = await fetch(`/api/planned-expenses?id=${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchPlannedExpenses() // Refresh the list
      }
    } catch (error) {
      console.error("Failed to delete expense:", error)
    }
  }

  const getPriorityBadge = (priority: PlannedExpense['priority']) => {
    switch (priority) {
      case 'URGENT':
        return <Badge variant="destructive">Urgent</Badge>
      case 'HIGH':
        return <Badge className="bg-orange-100 text-orange-800">High</Badge>
      case 'MEDIUM':
        return <Badge className="bg-blue-100 text-blue-800">Medium</Badge>
      case 'LOW':
        return <Badge variant="secondary">Low</Badge>
      default:
        return null
    }
  }

  const getStatusBadge = (status: PlannedExpense['status']) => {
    switch (status) {
      case 'PLANNED':
        return <Badge className="bg-gray-100 text-gray-800">Planned</Badge>
      case 'SAVED':
        return <Badge className="bg-green-100 text-green-800">Saved</Badge>
      case 'COMPLETED':
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>
      case 'CANCELLED':
        return <Badge variant="secondary">Cancelled</Badge>
      case 'POSTPONED':
        return <Badge className="bg-yellow-100 text-yellow-800">Postponed</Badge>
      default:
        return null
    }
  }

  const getStatusActions = (expense: PlannedExpense) => {
    const actions = []
    
    if (expense.status === 'PLANNED') {
      actions.push(
        <Button
          key="saved"
          size="sm"
          variant="outline"
          onClick={() => updateExpenseStatus(expense.id, 'SAVED')}
        >
          <CheckCircle className="h-3 w-3 mr-1" />
          Mark as Saved
        </Button>
      )
    }
    
    if (expense.status === 'PLANNED' || expense.status === 'SAVED') {
      actions.push(
        <Button
          key="completed"
          size="sm"
          variant="outline"
          onClick={() => updateExpenseStatus(expense.id, 'COMPLETED')}
        >
          <CheckCircle className="h-3 w-3 mr-1" />
          Mark as Completed
        </Button>
      )
      actions.push(
        <Button
          key="postponed"
          size="sm"
          variant="outline"
          onClick={() => updateExpenseStatus(expense.id, 'POSTPONED')}
        >
          <Pause className="h-3 w-3 mr-1" />
          Postpone
        </Button>
      )
    }
    
    if (expense.status !== 'COMPLETED') {
      actions.push(
        <Button
          key="cancelled"
          size="sm"
          variant="outline"
          onClick={() => updateExpenseStatus(expense.id, 'CANCELLED')}
        >
          <XCircle className="h-3 w-3 mr-1" />
          Cancel
        </Button>
      )
    }

    return actions
  }

  const getDaysUntilTarget = (targetDate: string) => {
    const now = getNowInPhilippineTime()
    const target = toPhilippineTime(targetDate)
    return getDaysBetweenInPhilippineTime(now, target)
  }

  const groupedExpenses = plannedExpenses.reduce((groups, expense) => {
    if (!groups[expense.status]) {
      groups[expense.status] = []
    }
    groups[expense.status].push(expense)
    return groups
  }, {} as Record<string, PlannedExpense[]>)

  const totalPlannedAmount = plannedExpenses
    .filter(expense => expense.status === 'PLANNED' || expense.status === 'SAVED')
    .reduce((sum, expense) => sum + expense.amount, 0)

  return (
    <>
      <SidebarNav />
      
      <div className="min-h-screen bg-background lg:ml-80">
        <main className="container mx-auto px-4 py-6 lg:py-6 pt-20 lg:pt-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Planned Expenses</h1>
          <p className="text-muted-foreground">
            Manage your future expenses and track your financial goals
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Planned</CardTitle>
              <Target className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(totalPlannedAmount)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
              <Calendar className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {(groupedExpenses['PLANNED']?.length || 0) + (groupedExpenses['SAVED']?.length || 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {groupedExpenses['COMPLETED']?.length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {plannedExpenses.filter(expense => {
                                  const targetDate = toPhilippineTime(expense.targetDate)
                const now = getNowInPhilippineTime()
                  return targetDate.getMonth() === now.getMonth() && 
                         targetDate.getFullYear() === now.getFullYear()
                }).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button onClick={() => window.location.href = '/planning'}>
            <Target className="mr-2 h-4 w-4" />
            Plan New Expense
          </Button>
        </div>

        {/* Expenses List */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading planned expenses...</p>
          </div>
        ) : plannedExpenses.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 space-y-4">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <Target className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">No planned expenses yet</h3>
                <p className="text-muted-foreground">
                  Start planning your future expenses to better manage your finances
                </p>
              </div>
              <Button onClick={() => window.location.href = '/planning'}>
                <Target className="mr-2 h-4 w-4" />
                Create Your First Plan
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedExpenses).map(([status, expenses]) => (
              <div key={status}>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  {getStatusBadge(status as PlannedExpense['status'])}
                  <span>({expenses.length})</span>
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {expenses.map((expense) => {
                    const daysUntilTarget = getDaysUntilTarget(expense.targetDate)
                    const isOverdue = daysUntilTarget < 0
                    const isUpcoming = daysUntilTarget <= 7 && daysUntilTarget >= 0
                    
                    return (
                      <Card key={expense.id} className={`${isOverdue ? 'border-red-200' : isUpcoming ? 'border-yellow-200' : ''}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <CardTitle className="text-base">{expense.title}</CardTitle>
                              <div className="flex items-center gap-2">
                                {getPriorityBadge(expense.priority)}
                                <span className="text-sm text-muted-foreground">{expense.category}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-lg">{formatCurrency(expense.amount)}</div>
                              {expense.wallet && (
                                <div className="text-xs text-muted-foreground">{expense.wallet.name}</div>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-3">
                            <div className="text-sm">
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>{formatPhilippineDate(expense.targetDate)}</span>
                                <span className={`ml-2 ${isOverdue ? 'text-red-600' : isUpcoming ? 'text-yellow-600' : ''}`}>
                                  ({isOverdue ? `${Math.abs(daysUntilTarget)} days overdue` : 
                                     daysUntilTarget === 0 ? 'Today' : 
                                     `${daysUntilTarget} days`})
                                </span>
                              </div>
                              {expense.description && (
                                <p className="mt-1 text-muted-foreground">{expense.description}</p>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap gap-1">
                              {getStatusActions(expense)}
                              <EditPlannedExpenseDialog
                                expense={expense}
                                wallets={wallets}
                                onExpenseUpdated={fetchPlannedExpenses}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteExpense(expense.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        </main>
      </div>
    </>
  )
}