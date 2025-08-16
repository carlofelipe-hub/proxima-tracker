"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/currency"
import { 
  Target, 
  Calendar, 
  CheckCircle, 
  Trash2
} from "lucide-react"
import { formatPhilippineDate, getNowInPhilippineTime, getDaysBetweenInPhilippineTime, toPhilippineTime } from "@/lib/timezone"
import { EditPlannedExpenseDialog } from "./edit-planned-expense-dialog"

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
}

interface PlannedExpenseTableProps {
  expenses: PlannedExpense[]
  wallets: Wallet[]
  totalWalletBalance: number
  isLoading?: boolean
  onExpenseUpdated: () => void
  onUpdateStatus: (id: string, status: PlannedExpense['status']) => void
  onDeleteExpense: (id: string) => void
}

export function PlannedExpenseTable({ 
  expenses, 
  wallets, 
  totalWalletBalance,
  isLoading,
  onExpenseUpdated,
  onUpdateStatus,
  onDeleteExpense
}: PlannedExpenseTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse border rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (expenses.length === 0) {
    return (
      <div className="text-center py-8">
        <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold">No planned expenses yet</h3>
        <p className="text-muted-foreground">
          Start planning your future expenses to better manage your finances
        </p>
      </div>
    )
  }

  const getPriorityBadge = (priority: PlannedExpense['priority']) => {
    switch (priority) {
      case 'URGENT':
        return <Badge variant="destructive" className="text-xs">Urgent</Badge>
      case 'HIGH':
        return <Badge className="bg-orange-100 text-orange-800 text-xs">High</Badge>
      case 'MEDIUM':
        return <Badge className="bg-blue-100 text-blue-800 text-xs">Medium</Badge>
      case 'LOW':
        return <Badge variant="secondary" className="text-xs">Low</Badge>
      default:
        return null
    }
  }

  const getStatusBadge = (status: PlannedExpense['status']) => {
    switch (status) {
      case 'PLANNED':
        return <Badge className="bg-gray-100 text-gray-800 text-xs">Planned</Badge>
      case 'SAVED':
        return <Badge className="bg-green-100 text-green-800 text-xs">Saved</Badge>
      case 'COMPLETED':
        return <Badge className="bg-blue-100 text-blue-800 text-xs">Completed</Badge>
      case 'CANCELLED':
        return <Badge variant="secondary" className="text-xs">Cancelled</Badge>
      case 'POSTPONED':
        return <Badge className="bg-yellow-100 text-yellow-800 text-xs">Postponed</Badge>
      default:
        return null
    }
  }

  const getDaysUntilTarget = (targetDate: string) => {
    const now = getNowInPhilippineTime()
    const target = toPhilippineTime(targetDate)
    return getDaysBetweenInPhilippineTime(now, target)
  }

  const getQuickActions = (expense: PlannedExpense) => {
    const actions = []
    
    if (expense.status === 'PLANNED') {
      actions.push(
        <Button
          key="saved"
          size="sm"
          variant="outline"
          onClick={() => onUpdateStatus(expense.id, 'SAVED')}
          className="h-8 px-3 text-xs flex-1 min-w-0"
        >
          <CheckCircle className="h-3 w-3 mr-1" />
          Saved
        </Button>
      )
    }
    
    if (expense.status === 'PLANNED' || expense.status === 'SAVED') {
      actions.push(
        <Button
          key="completed"
          size="sm"
          variant="outline"
          onClick={() => onUpdateStatus(expense.id, 'COMPLETED')}
          className="h-8 px-3 text-xs flex-1 min-w-0"
        >
          <CheckCircle className="h-3 w-3 mr-1" />
          Done
        </Button>
      )
    }
    
    return actions
  }

  // Calculate total planned expenses amount
  const totalPlannedAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  // Calculate remaining balance (total wallet balance - planned expenses)
  const remainingBalance = totalWalletBalance - totalPlannedAmount

  return (
    <div className="rounded-md border overflow-hidden">
      {/* Mobile Card View */}
      <div className="block md:hidden space-y-3 p-4">
        {expenses.map((expense) => {
          const daysUntilTarget = getDaysUntilTarget(expense.targetDate)
          const isOverdue = daysUntilTarget < 0
          const isUpcoming = daysUntilTarget <= 7 && daysUntilTarget >= 0
          
          return (
            <div key={expense.id} className={`border rounded-lg p-4 space-y-3 ${
              isOverdue ? 'border-l-4 border-l-red-500 bg-red-50' : 
              isUpcoming ? 'border-l-4 border-l-yellow-500 bg-yellow-50' : 
              'bg-white'
            }`}>
              {/* Header */}
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base leading-tight truncate">{expense.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{expense.category}</p>
                </div>
                <div className="text-right ml-3">
                  <div className="font-bold text-lg text-blue-600">{formatCurrency(expense.amount)}</div>
                  {expense.wallet && (
                    <div className="text-xs text-muted-foreground">{expense.wallet.name}</div>
                  )}
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {getPriorityBadge(expense.priority)}
                {getStatusBadge(expense.status)}
              </div>

              {/* Date and Description */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{formatPhilippineDate(expense.targetDate)}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
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
                  <p className="text-sm text-muted-foreground leading-relaxed">{expense.description}</p>
                )}
              </div>

              {/* Progress */}
              {expense.spentAmount > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">
                      {Math.round((expense.spentAmount / expense.amount) * 100)}%
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
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-2">
                {getQuickActions(expense)}
                <EditPlannedExpenseDialog
                  expense={expense}
                  wallets={wallets}
                  onExpenseUpdated={onExpenseUpdated}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDeleteExpense(expense.id)}
                  className="h-8 px-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )
        })}
        
        {/* Mobile Remaining Balance */}
        {expenses.length > 0 && (
          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-1">Remaining Balance After Planned Expenses</div>
              <div className={`font-bold text-xl ${
                remainingBalance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(remainingBalance)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {formatCurrency(totalWalletBalance)} - {formatCurrency(totalPlannedAmount)}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Title</TableHead>
              <TableHead className="w-[100px]">Priority</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="hidden lg:table-cell">Category</TableHead>
              <TableHead className="hidden lg:table-cell">Description</TableHead>
              <TableHead className="hidden lg:table-cell">Wallet</TableHead>
              <TableHead className="hidden xl:table-cell">Target Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="hidden lg:table-cell w-[120px]">Progress</TableHead>
              <TableHead className="text-center w-[140px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((expense) => {
              const daysUntilTarget = getDaysUntilTarget(expense.targetDate)
              const isOverdue = daysUntilTarget < 0
              const isUpcoming = daysUntilTarget <= 7 && daysUntilTarget >= 0
              
              return (
                <TableRow 
                  key={expense.id} 
                  className={`hover:bg-muted/50 ${isOverdue ? 'border-l-4 border-l-red-500' : isUpcoming ? 'border-l-4 border-l-yellow-500' : ''}`}
                >
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{expense.title}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getPriorityBadge(expense.priority)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(expense.status)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="text-sm">{expense.category}</div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell max-w-[200px]">
                    <div className="truncate text-sm text-muted-foreground">
                      {expense.description || "-"}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="text-sm">
                      {expense.wallet?.name || "-"}
                    </div>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">
                        {formatPhilippineDate(expense.targetDate)}
                      </div>
                      <div className={`text-xs ${isOverdue ? 'text-red-600' : isUpcoming ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                        {isOverdue ? `${Math.abs(daysUntilTarget)} days overdue` : 
                         daysUntilTarget === 0 ? 'Today' : 
                         `${daysUntilTarget} days`}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-bold text-sm">
                      {formatCurrency(expense.amount)}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {expense.spentAmount > 0 ? (
                      <div className="space-y-1">
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              expense.spentAmount >= expense.amount 
                                ? 'bg-green-600' 
                                : 'bg-blue-600'
                            }`}
                            style={{ 
                              width: `${Math.min(100, (expense.spentAmount / expense.amount) * 100)}%` 
                            }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground text-center">
                          {Math.round((expense.spentAmount / expense.amount) * 100)}%
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground text-center">-</div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {getQuickActions(expense)}
                      <EditPlannedExpenseDialog
                        expense={expense}
                        wallets={wallets}
                        onExpenseUpdated={onExpenseUpdated}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDeleteExpense(expense.id)}
                        className="h-8 px-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
            {/* Remaining Balance Row */}
            {expenses.length > 0 && (
              <TableRow className="border-t-2 border-muted bg-muted/30 font-semibold">
                <TableCell colSpan={9} className="text-right font-bold">
                  Remaining Balance After Planned Expenses:
                </TableCell>
                <TableCell className="text-right">
                  <div className={`font-bold text-lg ${remainingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(remainingBalance)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatCurrency(totalWalletBalance)} - {formatCurrency(totalPlannedAmount)}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}