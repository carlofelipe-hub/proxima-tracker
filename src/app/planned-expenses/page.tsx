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
  // Grid3X3, List - removed (no longer using view toggle)
  RefreshCw
} from "lucide-react"
import { formatCurrency } from "@/lib/currency"
import { formatPhilippineDate, getNowInPhilippineTime, getDaysBetweenInPhilippineTime, toPhilippineTime, toPhilippineDate } from "@/lib/timezone"
import { EditPlannedExpenseDialog } from "@/components/planned-expenses/edit-planned-expense-dialog"
import { DeletePlannedExpenseDialog } from "@/components/planned-expenses/delete-planned-expense-dialog"
// Removed PlannedExpenseTable import - using card view only
import { AIPlanningInsights } from "@/components/planning/ai-planning-insights"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { invalidateInsightsCache } from "@/lib/cached-insights"
import { toast } from "sonner"

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
  // Removed viewMode - using card view only
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterConfidence, setFilterConfidence] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('target-date-asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(5) // Mobile-friendly: 5 items per page
  const [updatingConfidence, setUpdatingConfidence] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedExpenseForDeletion, setSelectedExpenseForDeletion] = useState<PlannedExpense | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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
    const expense = plannedExpenses.find(e => e.id === id)
    const statusMessages: Record<PlannedExpense['status'], string> = {
      'PLANNED': 'updated',
      'SAVED': 'marked as saved',
      'COMPLETED': 'marked as completed',
      'CANCELLED': 'cancelled',
      'POSTPONED': 'postponed'
    }

    try {
      const response = await fetch("/api/planned-expenses", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, status }),
      })

      if (response.ok) {
        toast.success(`"${expense?.title}" has been ${statusMessages[status]}!`)
        fetchPlannedExpenses() // Refresh the list
        invalidateInsightsCache() // Trigger insights cache invalidation
      } else {
        throw new Error("Failed to update expense status")
      }
    } catch (error) {
      console.error("Failed to update expense status:", error)
      toast.error("Failed to update expense status. Please try again.")
    }
  }

  const deleteExpense = (id: string) => {
    const expense = plannedExpenses.find(e => e.id === id)
    if (expense) {
      setSelectedExpenseForDeletion(expense)
      setIsDeleteDialogOpen(true)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedExpenseForDeletion) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/planned-expenses?id=${selectedExpenseForDeletion.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success(`"${selectedExpenseForDeletion.title}" has been deleted successfully!`)
        setIsDeleteDialogOpen(false)
        setSelectedExpenseForDeletion(null)
        fetchPlannedExpenses() // Refresh the list
        invalidateInsightsCache() // Trigger insights cache invalidation
      } else {
        throw new Error("Failed to delete expense")
      }
    } catch (error) {
      console.error("Failed to delete expense:", error)
      toast.error("Failed to delete expense. Please try again.")
    } finally {
      setIsDeleting(false)
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
        toast.success("Confidence levels updated successfully!")
        fetchPlannedExpenses() // Refresh the list
        invalidateInsightsCache() // Trigger insights cache invalidation
      } else {
        throw new Error("Failed to update confidence levels")
      }
    } catch (error) {
      console.error("Failed to update confidence levels:", error)
      toast.error("Failed to update confidence levels. Please try again.")
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
          className="h-10 px-4 text-sm min-w-[120px] hover:bg-green-50 border-green-200"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
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
          className="h-10 px-4 text-sm min-w-[140px] hover:bg-blue-50 border-blue-200"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Mark as Complete
        </Button>
      )
      actions.push(
        <Button
          key="postponed"
          size="sm"
          variant="outline"
          onClick={() => updateExpenseStatus(expense.id, 'POSTPONED')}
          className="h-10 px-4 text-sm min-w-[100px] hover:bg-yellow-50 border-yellow-200"
        >
          <Pause className="h-4 w-4 mr-2" />
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
          className="h-10 px-4 text-sm min-w-[90px] text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
        >
          <XCircle className="h-4 w-4 mr-2" />
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

  // Calculate total wallet balance (removed from display since we're card-view only)
  // const totalWalletBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0)

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

        {/* Mobile-Optimized Quick Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={() => window.location.href = '/planning'}
            className="flex-1 sm:flex-none h-12 sm:h-10 text-base sm:text-sm"
          >
            <Target className="mr-2 h-5 w-5 sm:h-4 sm:w-4" />
            Plan New Expense
          </Button>
          <Button 
            variant="outline" 
            onClick={updateConfidenceLevels}
            disabled={updatingConfidence}
            className="flex-1 sm:flex-none h-12 sm:h-10 text-base sm:text-sm"
          >
            <RefreshCw className={`mr-2 h-5 w-5 sm:h-4 sm:w-4 ${updatingConfidence ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{updatingConfidence ? 'Updating...' : 'Update Confidence Levels'}</span>
            <span className="sm:hidden">{updatingConfidence ? 'Updating...' : 'Update Confidence'}</span>
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
              
              {/* Mobile-Optimized Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                {/* First Row of Filters - Mobile Priority */}
                <div className="flex gap-2 w-full sm:w-auto">
                  {/* Status Filter */}
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="flex-1 sm:w-36 h-10">
                      <Filter className="h-4 w-4 mr-1" />
                      <SelectValue placeholder="Status" />
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
                    <SelectTrigger className="flex-1 sm:w-32 h-10">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Second Row of Filters - Less Important */}
                <div className="flex gap-2 w-full sm:w-auto">
                  {/* Sort Dropdown */}
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="flex-1 sm:w-40 h-10">
                      <SelectValue placeholder="Sort by" />
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

                  {/* Confidence Filter - Desktop only */}
                  <Select value={filterConfidence} onValueChange={setFilterConfidence}>
                    <SelectTrigger className="hidden sm:flex w-40 h-10">
                      <SelectValue placeholder="Confidence" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Confidence</SelectItem>
                      <SelectItem value="high">High Confidence</SelectItem>
                      <SelectItem value="medium">Medium Confidence</SelectItem>
                      <SelectItem value="low">Low Confidence</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                {/* Expense Display - Card View Only */}
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {paginatedExpenses.map((expense) => {
                      const daysUntilTarget = getDaysUntilTarget(expense.targetDate)
                      const isOverdue = daysUntilTarget < 0
                      const isUpcoming = daysUntilTarget <= 7 && daysUntilTarget >= 0
                      
                      return (
                        <Card key={expense.id} className={`${isOverdue ? 'border-red-200 border-l-4 border-l-red-500' : isUpcoming ? 'border-yellow-200 border-l-4 border-l-yellow-500' : ''}`}>
                          <CardHeader className="pb-4">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                              <div className="space-y-2 flex-1">
                                <CardTitle className="text-lg font-semibold leading-tight">{expense.title}</CardTitle>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {getPriorityBadge(expense.priority)}
                                  {getConfidenceBadge(expense.confidenceLevel)}
                                  <span className="text-sm text-muted-foreground bg-gray-100 px-2 py-1 rounded">{expense.category}</span>
                                </div>
                              </div>
                              <div className="text-right sm:text-right shrink-0">
                                <div className="font-bold text-xl text-blue-600">{formatCurrency(expense.amount)}</div>
                                {expense.wallet && (
                                  <div className="text-sm text-muted-foreground mt-1">{expense.wallet.name}</div>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0 space-y-4">
                            {/* Status Badge */}
                            <div className="flex items-center justify-start">
                              {getStatusBadge(expense.status)}
                            </div>
                            
                            {/* Date and Description */}
                            <div>
                              <div className="flex items-center gap-2 text-base font-medium mb-2">
                                <Calendar className="h-4 w-4 text-blue-600" />
                                <span>{formatPhilippineDate(expense.targetDate)}</span>
                                <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                                  isOverdue ? 'bg-red-100 text-red-700' : 
                                  isUpcoming ? 'bg-yellow-100 text-yellow-700' : 
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {isOverdue ? `${Math.abs(daysUntilTarget)}d overdue` : 
                                     daysUntilTarget === 0 ? 'Today' : 
                                     `${daysUntilTarget}d left`}
                                </span>
                              </div>
                              {expense.description && (
                                <p className="text-muted-foreground text-sm leading-relaxed">{expense.description}</p>
                              )}
                            </div>

                            {/* Spending Progress */}
                            {expense.spentAmount > 0 && (
                              <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-muted-foreground font-medium">Savings Progress</span>
                                  <span className="font-semibold">
                                    {formatCurrency(expense.spentAmount)} / {formatCurrency(expense.amount)}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                  <div 
                                    className={`h-3 rounded-full transition-all duration-300 ${
                                      expense.spentAmount >= expense.amount 
                                        ? 'bg-green-600' 
                                        : 'bg-blue-600'
                                    }`}
                                    style={{ 
                                      width: `${Math.min(100, (expense.spentAmount / expense.amount) * 100)}%` 
                                    }}
                                  />
                                </div>
                                <div className="text-sm text-center font-medium">
                                  {expense.spentAmount >= expense.amount 
                                    ? '✅ Goal achieved!' 
                                    : `${formatCurrency(expense.amount - expense.spentAmount)} to go`
                                  }
                                </div>
                              </div>
                            )}
                            
                            {/* Mobile-Optimized Action Buttons */}
                            <div className="flex flex-wrap gap-4 pt-4">
                              {getStatusActions(expense)}
                              <EditPlannedExpenseDialog
                                expense={expense}
                                wallets={wallets}
                                onExpenseUpdated={fetchPlannedExpenses}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteExpense(expense.id)}
                                className="h-10 px-4 text-sm min-w-[90px] text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col items-center gap-4 pt-6">
                    <div className="text-sm text-muted-foreground text-center px-4 py-2 bg-gray-50 rounded-lg">
                      Showing {startIndex + 1}-{Math.min(endIndex, filteredAndSortedExpenses.length)} of {filteredAndSortedExpenses.length} expenses
                    </div>
                    {/* Numbered pagination */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          const showPage = page === 1 || page === totalPages || 
                                         Math.abs(page - currentPage) <= 2
                          return showPage
                        })
                        .map((page, index, array) => {
                          const showEllipsis = index > 0 && array[index - 1] !== page - 1
                          return (
                            <div key={page} className="flex items-center gap-1">
                              {showEllipsis && <span className="text-sm text-muted-foreground">...</span>}
                              <Button
                                variant={currentPage === page ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                                className="w-10 h-10 p-0 text-sm"
                              >
                                {page}
                              </Button>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <DeletePlannedExpenseDialog 
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={handleConfirmDelete}
          expenseTitle={selectedExpenseForDeletion?.title || ""}
          isLoading={isDeleting}
        />
        </main>
      </div>
    </>
  )
}