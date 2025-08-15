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
  Pause,
  Filter,
  Grid3X3,
  List,
  RefreshCw
} from "lucide-react"
import { formatCurrency } from "@/lib/currency"
import { formatPhilippineDate, getNowInPhilippineTime, getDaysBetweenInPhilippineTime, toPhilippineTime, toPhilippineDate } from "@/lib/timezone"
import { EditPlannedExpenseDialog } from "@/components/planned-expenses/edit-planned-expense-dialog"
import { PlannedExpenseTable } from "@/components/planned-expenses/planned-expense-table"
import { AIPlanningInsights } from "@/components/planning/ai-planning-insights"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { invalidateInsightsCache } from "@/lib/cached-insights"

interface PlannedExpense {
  id: string
  title: string
  amount: number
  spentAmount: number
  category: string
  description?: string
  targetDate: string
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  confidenceLevel: "HIGH" | "MEDIUM" | "LOW"
  status: "PLANNED" | "SAVED" | "COMPLETED" | "CANCELLED" | "POSTPONED"
  wallet?: {
    id: string
    name: string
    type: string
  }
  createdAt: string
  updatedAt: string
  lastConfidenceUpdate?: string
}

interface Wallet {
  id: string
  name: string
  type: string
  balance: number
}

export default function PlannedExpensesPage() {
  const { data: session, status } = useSession()
  const [plannedExpenses, setPlannedExpenses] = useState<PlannedExpense[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterConfidence, setFilterConfidence] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('target-date-asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [updatingConfidence, setUpdatingConfidence] = useState(false)

  // Reset current page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filterStatus, filterPriority, filterConfidence, sortBy])

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
        invalidateInsightsCache() // Trigger insights cache invalidation
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
        invalidateInsightsCache() // Trigger insights cache invalidation
      }
    } catch (error) {
      console.error("Failed to delete expense:", error)
    }
  }

  const updateConfidenceLevels = async () => {
    setUpdatingConfidence(true)
    try {
      const response = await fetch("/api/planned-expenses/update-confidence", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      })

      if (response.ok) {
        fetchPlannedExpenses() // Refresh the list
        invalidateInsightsCache() // Trigger insights cache invalidation
      }
    } catch (error) {
      console.error("Failed to update confidence levels:", error)
    } finally {
      setUpdatingConfidence(false)
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

  const getConfidenceBadge = (confidence: PlannedExpense['confidenceLevel']) => {
    switch (confidence) {
      case 'HIGH':
        return <Badge className="bg-green-100 text-green-800">High Confidence</Badge>
      case 'MEDIUM':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium Confidence</Badge>
      case 'LOW':
        return <Badge variant="destructive">Low Confidence</Badge>
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

  // Filter and sort expenses
  const filteredAndSortedExpenses = plannedExpenses
    .filter(expense => {
      if (filterStatus !== 'all' && expense.status !== filterStatus.toUpperCase()) return false
      if (filterPriority !== 'all' && expense.priority !== filterPriority.toUpperCase()) return false
      if (filterConfidence !== 'all' && expense.confidenceLevel !== filterConfidence.toUpperCase()) return false
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'target-date-asc':
          return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
        case 'target-date-desc':
          return new Date(b.targetDate).getTime() - new Date(a.targetDate).getTime()
        case 'amount-desc':
          return b.amount - a.amount
        case 'amount-asc':
          return a.amount - b.amount
        case 'priority':
          const priorityOrder = { 'URGENT': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 }
          return priorityOrder[b.priority] - priorityOrder[a.priority]
        case 'title':
          return a.title.localeCompare(b.title)
        default:
          return 0
      }
    })

  // Paginate expenses
  const totalPages = Math.ceil(filteredAndSortedExpenses.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedExpenses = filteredAndSortedExpenses.slice(startIndex, endIndex)

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

  // Calculate total wallet balance
  const totalWalletBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0)

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
                  const targetDate = toPhilippineDate(expense.targetDate)
                  const now = getNowInPhilippineTime()
                  return targetDate.getMonth() === now.getMonth() && 
                         targetDate.getFullYear() === now.getFullYear()
                }).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Planning Insights */}
        <AIPlanningInsights />

        {/* Quick Actions */}
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => window.location.href = '/planning'}>
            <Target className="mr-2 h-4 w-4" />
            Plan New Expense
          </Button>
          <Button 
            variant="outline" 
            onClick={updateConfidenceLevels}
            disabled={updatingConfidence}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${updatingConfidence ? 'animate-spin' : ''}`} />
            {updatingConfidence ? 'Updating...' : 'Update Confidence Levels'}
          </Button>
        </div>

        {/* Expenses List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Planned Expenses ({filteredAndSortedExpenses.length})
              </CardTitle>
              
              {/* Controls */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 border rounded-md p-1">
                  <Button
                    variant={viewMode === 'card' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('card')}
                    className="h-7 px-2"
                  >
                    <List className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className="h-7 px-2"
                  >
                    <Grid3X3 className="h-3 w-3" />
                  </Button>
                </div>

                {/* Status Filter */}
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-32">
                    <Filter className="h-3 w-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="saved">Saved</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="postponed">Postponed</SelectItem>
                  </SelectContent>
                </Select>

                {/* Priority Filter */}
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>

                {/* Confidence Filter */}
                <Select value={filterConfidence} onValueChange={setFilterConfidence}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Confidence</SelectItem>
                    <SelectItem value="high">High Confidence</SelectItem>
                    <SelectItem value="medium">Medium Confidence</SelectItem>
                    <SelectItem value="low">Low Confidence</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort Dropdown */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="target-date-asc">Date (Upcoming)</SelectItem>
                    <SelectItem value="target-date-desc">Date (Latest)</SelectItem>
                    <SelectItem value="amount-desc">Amount (High)</SelectItem>
                    <SelectItem value="amount-asc">Amount (Low)</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading planned expenses...</p>
              </div>
            ) : filteredAndSortedExpenses.length === 0 ? (
              <div className="text-center py-8 space-y-4">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <Target className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {plannedExpenses.length === 0 ? "No planned expenses yet" : "No matching expenses"}
                  </h3>
                  <p className="text-muted-foreground">
                    {plannedExpenses.length === 0 
                      ? "Start planning your future expenses to better manage your finances"
                      : "Try adjusting your filters to see more results"
                    }
                  </p>
                </div>
                {plannedExpenses.length === 0 && (
                  <Button onClick={() => window.location.href = '/planning'}>
                    <Target className="mr-2 h-4 w-4" />
                    Create Your First Plan
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Expense Display */}
                {viewMode === 'card' ? (
                  <div className="space-y-6">
                    {Object.entries(groupedExpenses).map(([status, expenses]) => {
                      const filteredStatusExpenses = expenses.filter(expense => {
                        if (filterStatus !== 'all' && expense.status !== filterStatus.toUpperCase()) return false
                        if (filterPriority !== 'all' && expense.priority !== filterPriority.toUpperCase()) return false
                        if (filterConfidence !== 'all' && expense.confidenceLevel !== filterConfidence.toUpperCase()) return false
                        return true
                      })
                      
                      if (filteredStatusExpenses.length === 0) return null
                      
                      return (
                        <div key={status}>
                          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            {getStatusBadge(status as PlannedExpense['status'])}
                            <span>({filteredStatusExpenses.length})</span>
                          </h3>
                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filteredStatusExpenses.map((expense) => {
                              const daysUntilTarget = getDaysUntilTarget(expense.targetDate)
                              const isOverdue = daysUntilTarget < 0
                              const isUpcoming = daysUntilTarget <= 7 && daysUntilTarget >= 0
                              
                              return (
                                <Card key={expense.id} className={`${isOverdue ? 'border-red-200' : isUpcoming ? 'border-yellow-200' : ''}`}>
                                  <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                      <div className="space-y-1">
                                        <CardTitle className="text-base">{expense.title}</CardTitle>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          {getPriorityBadge(expense.priority)}
                                          {getConfidenceBadge(expense.confidenceLevel)}
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

                                      {/* Spending Progress */}
                                      {expense.spentAmount > 0 && (
                                        <div className="space-y-2">
                                          <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Progress</span>
                                            <span className="font-medium">
                                              {formatCurrency(expense.spentAmount)} / {formatCurrency(expense.amount)}
                                            </span>
                                          </div>
                                          <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div 
                                              className={`h-2 rounded-full transition-all duration-300 ${
                                                expense.spentAmount >= expense.amount 
                                                  ? 'bg-green-600' 
                                                  : 'bg-blue-600'
                                              }`}
                                              style={{ 
                                                width: `${Math.min(100, (expense.spentAmount / expense.amount) * 100)}%` 
                                              }}
                                            />
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            {expense.spentAmount >= expense.amount 
                                              ? 'Fully spent' 
                                              : `${formatCurrency(expense.amount - expense.spentAmount)} remaining`
                                            }
                                          </div>
                                        </div>
                                      )}
                                      
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
                      )
                    })}
                  </div>
                ) : (
                  <PlannedExpenseTable 
                    expenses={paginatedExpenses}
                    wallets={wallets}
                    totalWalletBalance={totalWalletBalance}
                    onExpenseUpdated={fetchPlannedExpenses}
                    onUpdateStatus={updateExpenseStatus}
                    onDeleteExpense={deleteExpense}
                  />
                )}
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col items-center gap-3 pt-4">
                    <div className="text-xs sm:text-sm text-muted-foreground text-center">
                      Showing {startIndex + 1} to {Math.min(endIndex, filteredAndSortedExpenses.length)} of {filteredAndSortedExpenses.length} expenses
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-2 sm:px-3"
                      >
                        <span className="hidden sm:inline">Previous</span>
                        <span className="sm:hidden">Prev</span>
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(page => {
                            const showPage = page === 1 || page === totalPages || 
                                           Math.abs(page - currentPage) <= 1
                            return showPage
                          })
                          .map((page, index, array) => {
                            const showEllipsis = index > 0 && array[index - 1] !== page - 1
                            return (
                              <div key={page} className="flex items-center gap-1">
                                {showEllipsis && <span className="text-xs sm:text-sm">...</span>}
                                <Button
                                  variant={currentPage === page ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setCurrentPage(page)}
                                  className="w-7 h-7 sm:w-8 sm:h-8 p-0 text-xs sm:text-sm"
                                >
                                  {page}
                                </Button>
                              </div>
                            )
                          })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-2 sm:px-3"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <span className="sm:hidden">Next</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        </main>
      </div>
    </>
  )
}