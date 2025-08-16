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
import { Plus, Receipt, TrendingUp, TrendingDown, Calendar, Filter, Grid3X3, List } from "lucide-react"

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
  const [sortBy, setSortBy] = useState<string>('date-desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Reset current page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filterType, sortBy])

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
        calculateStats(data.transactions)
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error)
    } finally {
      setLoading(false)
    }
  }, [calculateStats])

  useEffect(() => {
    if (session) {
      fetchWallets()
      fetchTransactions()
    }
  }, [session, fetchWallets, fetchTransactions])

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
      if (filterType === 'all') return true
      return transaction.type === filterType.toUpperCase()
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

                {/* Filter Dropdown */}
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-32">
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