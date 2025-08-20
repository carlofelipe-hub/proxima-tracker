"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { SidebarNav } from "@/components/navigation/sidebar-nav"
import { TransactionList } from "@/components/transactions/transaction-list"
import { TransactionTable } from "@/components/transactions/transaction-table"
import { AddTransactionForm } from "@/components/transactions/add-transaction-form"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Plus, Receipt, TrendingUp, TrendingDown, Calendar, Filter, Grid3X3, List, CalendarDays } from "lucide-react"
import { format } from "date-fns"

interface Transaction {
  id: string
  amount: number
  type: "INCOME" | "EXPENSE" | "TRANSFER"
  category: string
  description: string
  date: string
  walletId: string
  wallet: {
    name: string
    type: string
  }
  toWallet?: {
    name: string
    type: string
  }
  transferFee?: number
}

interface TransactionStats {
  totalIncome: number
  totalExpenses: number
  netBalance: number
  transactionCount: number
}

interface Wallet {
  id: string
  name: string
  type: string
  balance: number
}

export default function TransactionsPage() {
  const { data: session, status } = useSession()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [stats, setStats] = useState<TransactionStats>({
    totalIncome: 0,
    totalExpenses: 0,
    netBalance: 0,
    transactionCount: 0
  })
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card')
  const [filterType, setFilterType] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('all')
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined)
  const [sortBy, setSortBy] = useState<string>('date-desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Reset current page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filterType, dateRange, customDate, sortBy])

  // Date filtering helper functions
  const getDateRangeFilter = useCallback((range: string) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    switch (range) {
      case 'today':
        const todayStart = new Date(today)
        const todayEnd = new Date(today)
        todayEnd.setDate(todayEnd.getDate() + 1)
        return { start: todayStart, end: todayEnd }
      
      case 'yesterday':
        const yesterdayStart = new Date(today)
        yesterdayStart.setDate(yesterdayStart.getDate() - 1)
        const yesterdayEnd = new Date(today)
        return { start: yesterdayStart, end: yesterdayEnd }
      
      case 'this-week':
        const weekStart = new Date(today)
        weekStart.setDate(weekStart.getDate() - weekStart.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 7)
        return { start: weekStart, end: weekEnd }
      
      case 'last-week':
        const lastWeekStart = new Date(today)
        lastWeekStart.setDate(lastWeekStart.getDate() - lastWeekStart.getDay() - 7)
        const lastWeekEnd = new Date(lastWeekStart)
        lastWeekEnd.setDate(lastWeekEnd.getDate() + 7)
        return { start: lastWeekStart, end: lastWeekEnd }
      
      case 'this-month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
        return { start: monthStart, end: monthEnd }
      
      case 'last-month':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1)
        return { start: lastMonthStart, end: lastMonthEnd }
      
      case 'last-7-days':
        const last7Start = new Date(today)
        last7Start.setDate(last7Start.getDate() - 7)
        const last7End = new Date(today)
        last7End.setDate(last7End.getDate() + 1)
        return { start: last7Start, end: last7End }
      
      case 'last-30-days':
        const last30Start = new Date(today)
        last30Start.setDate(last30Start.getDate() - 30)
        const last30End = new Date(today)
        last30End.setDate(last30End.getDate() + 1)
        return { start: last30Start, end: last30End }
      
      case 'custom':
        if (!customDate) return null
        const customStart = new Date(customDate.getFullYear(), customDate.getMonth(), customDate.getDate())
        const customEnd = new Date(customStart)
        customEnd.setDate(customEnd.getDate() + 1)
        return { start: customStart, end: customEnd }
      
      default:
        return null
    }
  }, [customDate])

  const calculateStats = useCallback((transactions: Transaction[]) => {
    const totalIncome = transactions
      .filter(t => t.type === "INCOME")
      .reduce((sum, t) => sum + t.amount, 0)
    
    const totalExpenses = transactions
      .filter(t => t.type === "EXPENSE")
      .reduce((sum, t) => sum + t.amount, 0)

    setStats({
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      transactionCount: transactions.length
    })
  }, [])

  const fetchWallets = useCallback(async () => {
    try {
      const response = await fetch("/api/wallets")
      if (response.ok) {
        const data = await response.json()
        setWallets(data)
      }
    } catch (error) {
      console.error("Failed to fetch wallets:", error)
    }
  }, [])

  const fetchTransactions = useCallback(async () => {
    try {
      const response = await fetch("/api/transactions")
      if (response.ok) {
        const data = await response.json()
        setTransactions(data.transactions)
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session) {
      fetchWallets()
      fetchTransactions()
    }
  }, [session, fetchWallets, fetchTransactions])

  // Calculate stats based on filtered transactions
  useEffect(() => {
    const filteredTransactions = transactions
      .filter(transaction => {
        // Apply type filter
        if (filterType !== 'all' && transaction.type !== filterType.toUpperCase()) {
          return false
        }
        return true
      })
      .filter(transaction => {
        // Apply date range filter
        if (dateRange === 'all') return true
        if (dateRange === 'custom' && !customDate) return true
        
        const dateFilter = getDateRangeFilter(dateRange)
        if (!dateFilter) return true
        
        const transactionDate = new Date(transaction.date)
        return transactionDate >= dateFilter.start && transactionDate < dateFilter.end
      })
    
    calculateStats(filteredTransactions)
  }, [transactions, filterType, dateRange, customDate, calculateStats, getDateRangeFilter])

  if (status === "loading") {
    return <div>Loading...</div>
  }

  if (!session) {
    redirect("/auth/signin")
  }

  const handleTransactionAdded = () => {
    fetchTransactions()
    fetchWallets() // Refresh wallets to get updated balances
  }

  const handleTransactionUpdate = () => {
    fetchTransactions()
    fetchWallets() // Refresh wallets to get updated balances
  }



  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
  }

  // Filter and sort transactions
  const filteredAndSortedTransactions = transactions
    .filter(transaction => {
      // Apply type filter
      if (filterType !== 'all' && transaction.type !== filterType.toUpperCase()) {
        return false
      }
      return true
    })
    .filter(transaction => {
      // Apply date range filter
      if (dateRange === 'all') return true
      if (dateRange === 'custom' && !customDate) return true
      
      const dateFilter = getDateRangeFilter(dateRange)
      if (!dateFilter) return true
      
      const transactionDate = new Date(transaction.date)
      return transactionDate >= dateFilter.start && transactionDate < dateFilter.end
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.date).getTime() - new Date(a.date).getTime()
        case 'date-asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime()
        case 'amount-desc':
          return b.amount - a.amount
        case 'amount-asc':
          return a.amount - b.amount
        case 'category':
          return a.category.localeCompare(b.category)
        default:
          return 0
      }
    })

  // Paginate transactions
  const totalPages = Math.ceil(filteredAndSortedTransactions.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTransactions = filteredAndSortedTransactions.slice(startIndex, endIndex)

  return (
    <>
      <SidebarNav 
        onAddTransaction={() => setIsAddTransactionOpen(true)}
      />
      
      <div className="min-h-screen bg-background lg:ml-80">
        <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-6 pt-20 lg:pt-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">
            Track your income and expenses
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Income</CardTitle>
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalIncome)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-red-600">
                {formatCurrency(stats.totalExpenses)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Net Balance</CardTitle>
              <TrendingUp className={`h-3 w-3 sm:h-4 sm:w-4 ${stats.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-lg sm:text-2xl font-bold ${stats.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(stats.netBalance)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Transactions</CardTitle>
              <Receipt className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold">
                {stats.transactionCount}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add Transaction Button - Desktop */}
        <div className="hidden md:block">
          <Button onClick={() => setIsAddTransactionOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        </div>

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Transactions ({filteredAndSortedTransactions.length})
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

                {/* Date Range Filter */}
                <Select 
                  value={dateRange} 
                  onValueChange={(value) => {
                    setDateRange(value)
                    if (value !== 'custom') {
                      setCustomDate(undefined)
                    }
                  }}
                >
                  <SelectTrigger className="w-32 sm:w-36">
                    <Calendar className="h-3 w-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="this-week">This Week</SelectItem>
                    <SelectItem value="last-week">Last Week</SelectItem>
                    <SelectItem value="last-7-days">Last 7 Days</SelectItem>
                    <SelectItem value="this-month">This Month</SelectItem>
                    <SelectItem value="last-month">Last Month</SelectItem>
                    <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                    <SelectItem value="custom">Custom Date</SelectItem>
                  </SelectContent>
                </Select>

                {/* Custom Date Picker */}
                {dateRange === 'custom' && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-32 sm:w-40 justify-start text-left font-normal"
                      >
                        <CalendarDays className="mr-2 h-3 w-3" />
                        {customDate ? (
                          format(customDate, "MMM dd, yyyy")
                        ) : (
                          <span className="text-muted-foreground">Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={customDate}
                        onSelect={setCustomDate}
                        disabled={(date) => 
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}

                {/* Type Filter */}
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-24 sm:w-28">
                    <Filter className="h-3 w-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort Dropdown */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Date (Newest)</SelectItem>
                    <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                    <SelectItem value="amount-desc">Amount (High)</SelectItem>
                    <SelectItem value="amount-asc">Amount (Low)</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading transactions...</p>
              </div>
            ) : filteredAndSortedTransactions.length === 0 ? (
              <div className="text-center py-8 space-y-4">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <Receipt className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {transactions.length === 0 ? "No transactions yet" : "No matching transactions"}
                  </h3>
                  <p className="text-muted-foreground">
                    {transactions.length === 0 
                      ? "Add your first transaction to start tracking"
                      : "Try adjusting your filters to see more results"
                    }
                  </p>
                </div>
                {transactions.length === 0 && (
                  <Button onClick={() => setIsAddTransactionOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Transaction
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Transaction Display */}
                {viewMode === 'card' ? (
                  <TransactionList 
                    transactions={paginatedTransactions}
                    wallets={wallets}
                    onTransactionUpdate={handleTransactionUpdate}
                  />
                ) : (
                  <TransactionTable 
                    transactions={paginatedTransactions}
                    wallets={wallets}
                    onTransactionUpdate={handleTransactionUpdate}
                  />
                )}
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col items-center gap-3 pt-4">
                    <div className="text-xs sm:text-sm text-muted-foreground text-center">
                      Showing {startIndex + 1} to {Math.min(endIndex, filteredAndSortedTransactions.length)} of {filteredAndSortedTransactions.length} transactions
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
                            // Show first, last, current, and adjacent pages
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

        {/* Add Transaction Form */}
        <AddTransactionForm 
          open={isAddTransactionOpen}
          onOpenChange={setIsAddTransactionOpen}
          onSuccess={handleTransactionAdded}
          wallets={wallets}
        />
        </main>
      </div>
    </>
  )
}