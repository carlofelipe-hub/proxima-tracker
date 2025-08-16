"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageTransition } from "@/components/ui/page-transition"
import { LoadingAnimation } from "@/components/ui/loading-animation"
import { WalletCard } from "@/components/wallets/wallet-card"
import { AddWalletForm } from "@/components/wallets/add-wallet-form"
import { AddTransactionForm } from "@/components/transactions/add-transaction-form"
import { TransactionTable } from "@/components/transactions/transaction-table"
import { AIInsights } from "@/components/insights/ai-insights"
import { SidebarNav } from "@/components/navigation/sidebar-nav"
import { formatCurrency } from "@/lib/currency"
import { useFirstDashboardVisit } from "@/lib/first-visit"
import { motion } from "framer-motion"
import { Plus, Wallet, TrendingUp, TrendingDown, PiggyBank, Calendar, ArrowRight, ChevronUp, ChevronDown } from "lucide-react"
import Link from "next/link"

interface Wallet {
  id: string
  name: string
  type: import("@prisma/client").WalletType
  balance: string
  currency: string
  _count: {
    transactions: number
  }
}

interface Transaction {
  id: string
  amount: number
  type: import("@prisma/client").TransactionType
  category: string
  description?: string
  date: string
  wallet: {
    name: string
    type: string
  }
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const { markDashboardVisited } = useFirstDashboardVisit()
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isAddWalletOpen, setIsAddWalletOpen] = useState(false)
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false)
  const [isLoadingWallets, setIsLoadingWallets] = useState(true)
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true)
  const [hasActiveBudget, setHasActiveBudget] = useState(false)
  const [isCheckingBudget, setIsCheckingBudget] = useState(true)
  const [showAllTransactions, setShowAllTransactions] = useState(false)
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([])
  const [isLoadingMoreTransactions, setIsLoadingMoreTransactions] = useState(false)

  const fetchWallets = async () => {
    try {
      const response = await fetch("/api/wallets")
      if (response.ok) {
        const data = await response.json()
        setWallets(data)
      }
    } catch (error) {
      console.error("Error fetching wallets:", error)
    } finally {
      setIsLoadingWallets(false)
    }
  }

  const fetchTransactions = async () => {
    try {
      const response = await fetch("/api/transactions?limit=5")
      if (response.ok) {
        const data = await response.json()
        setTransactions(data.transactions)
      }
    } catch (error) {
      console.error("Error fetching transactions:", error)
    } finally {
      setIsLoadingTransactions(false)
    }
  }

  const fetchAllTransactions = async () => {
    setIsLoadingMoreTransactions(true)
    try {
      const response = await fetch("/api/transactions")
      if (response.ok) {
        const data = await response.json()
        setAllTransactions(data.transactions)
        setShowAllTransactions(true)
      }
    } catch (error) {
      console.error("Error fetching all transactions:", error)
    } finally {
      setIsLoadingMoreTransactions(false)
    }
  }

  const checkActiveBudget = async () => {
    try {
      const response = await fetch("/api/budget-periods")
      if (response.ok) {
        const budgetPeriods = await response.json()
        const activeBudget = budgetPeriods.find((bp: {isActive: boolean}) => bp.isActive)
        setHasActiveBudget(!!activeBudget)
      }
    } catch (error) {
      console.error("Error checking active budget:", error)
    } finally {
      setIsCheckingBudget(false)
    }
  }

  const handleTransactionSuccess = () => {
    fetchWallets() // Refresh wallets to update balances
    fetchTransactions() // Refresh transactions list
    if (showAllTransactions) {
      fetchAllTransactions() // Refresh all transactions if expanded
    }
  }

  useEffect(() => {
    if (session?.user?.id) {
      fetchWallets()
      fetchTransactions()
      checkActiveBudget()
      // Mark dashboard as visited on first load
      markDashboardVisited()
    }
  }, [session?.user?.id, markDashboardVisited])

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingAnimation text="Loading your dashboard..." size="lg" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingAnimation text="Please sign in to continue..." size="md" />
      </div>
    )
  }

  const totalBalance = wallets.reduce((sum, wallet) => {
    return sum + parseFloat(wallet.balance)
  }, 0)

  const totalTransactions = wallets.reduce((sum, wallet) => {
    return sum + wallet._count.transactions
  }, 0)

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0
    }
  }

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  }

  const walletGridVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.4
      }
    }
  }

  return (
    <>
      <SidebarNav 
        onAddWallet={() => setIsAddWalletOpen(true)}
        onAddTransaction={() => setIsAddTransactionOpen(true)}
      />
      
      <PageTransition>
        <div className="min-h-screen bg-background lg:ml-80">
          <div className="container mx-auto px-4 py-6 lg:py-6 pt-20 lg:pt-6 max-w-7xl">
          {/* Hero Section */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {/* Welcome Header */}
            <div className="mb-6">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-filipino mb-2">
                Welcome back, {session.user?.name?.split(' ')[0] || 'Friend'}! 👋
              </h1>
              <p className="text-gray-600 text-sm md:text-base">
                Here&apos;s your financial overview today
              </p>
            </div>

            {/* Hero Total Balance */}
            <div className="bg-gradient-to-br from-[#dbabbb] to-[#baa1a7] rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 text-white relative overflow-hidden mb-6">
              {/* Background Pattern */}
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent" />
              {/* Subtle overlay for better text contrast */}
              <div className="absolute inset-0 bg-black/10" />
              <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
                <svg viewBox="0 0 100 100" className="w-full h-full text-white">
                  <path d="M0,20 Q25,0 50,20 T100,20 L100,0 L0,0 Z" fill="currentColor" />
                </svg>
              </div>
              
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-white/90 text-sm mb-1 font-medium" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.4)'}}>Total Balance</p>
                    <motion.div 
                      className="text-3xl font-bold text-white font-mono"
                      style={{textShadow: '1px 1px 3px rgba(0,0,0,0.5)'}}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                    >
                      {formatCurrency(totalBalance)}
                    </motion.div>
                    <p className="text-white/80 text-sm mt-1" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.3)'}}>
                      Across {wallets.length} wallet{wallets.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  
                  <motion.div
                    className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm"
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                  >
                    <PiggyBank className="h-8 w-8 text-white" />
                  </motion.div>
                </div>

                {/* Quick Stats Row */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-6">
                  <div className="text-center">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#edd2e0] rounded-full flex items-center justify-center mx-auto mb-2">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-[#797b84]" />
                    </div>
                    <p className="text-xs text-white/80 font-medium" style={{textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.4)'}}>This Month</p>
                    <p className="text-sm sm:text-base font-bold text-white" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.4)'}}>₱0.00</p>
                    <p className="text-xs text-white/80 font-medium" style={{textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.4)'}}>Income</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#edbbb4] rounded-full flex items-center justify-center mx-auto mb-2">
                      <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-[#797b84]" />
                    </div>
                    <p className="text-xs text-white/80 font-medium" style={{textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.4)'}}>This Month</p>
                    <p className="text-sm sm:text-base font-bold text-white" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.4)'}}>₱0.00</p>
                    <p className="text-xs text-white/80 font-medium" style={{textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.4)'}}>Expenses</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#edd2e0] rounded-full flex items-center justify-center mx-auto mb-2">
                      <PiggyBank className="h-4 w-4 sm:h-5 sm:w-5 text-[#797b84]" />
                    </div>
                    <p className="text-xs text-white/80 font-medium" style={{textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.4)'}}>This Month</p>
                    <p className="text-sm sm:text-base font-bold text-white" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.4)'}}>₱0.00</p>
                    <p className="text-xs text-white/80 font-medium" style={{textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.4)'}}>Savings</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Budget Setup Prompt */}
          {!isCheckingBudget && !hasActiveBudget && wallets.length > 0 && (
            <Card className="border-orange-200 bg-orange-50 mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-800">
                  <Calendar className="h-5 w-5" />
                  Setup Budget Period for Better Affordability Checking
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-6">
                <p className="text-orange-700 mb-4">
                  Want to know if you can afford expenses until your next paycheck? Set up a budget period to enable smart affordability checking with daily budget insights.
                </p>
                <div className="flex gap-3">
                  <Link href="/budget">
                    <Button variant="outline" className="border-orange-300 text-orange-800 hover:bg-orange-100">
                      <Calendar className="mr-2 h-4 w-4" />
                      Set Up Budget Period
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setHasActiveBudget(true)}
                    className="text-orange-600 hover:text-orange-800"
                  >
                    Maybe later
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Wallets Grid Section */}
          <div className="space-y-6 mb-8">
            <div className="flex justify-between items-center">
              <h2 className="text-xl md:text-2xl font-bold text-foreground">Your Wallets</h2>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setIsAddWalletOpen(true)}
                className="text-sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Wallet
              </Button>
            </div>

            {isLoadingWallets ? (
              <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="relative h-40 bg-gradient-to-br from-gray-200 to-gray-100 rounded-xl animate-pulse overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer"></div>
                    <div className="p-5 space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-300 rounded-full animate-pulse"></div>
                        <div className="space-y-2">
                          <div className="h-4 w-20 bg-gray-300 rounded animate-pulse"></div>
                          <div className="h-3 w-16 bg-gray-300 rounded animate-pulse"></div>
                        </div>
                      </div>
                      <div className="flex justify-between items-end">
                        <div className="space-y-1">
                          <div className="h-3 w-16 bg-gray-300 rounded animate-pulse"></div>
                          <div className="h-6 w-24 bg-gray-300 rounded animate-pulse"></div>
                        </div>
                        <div className="space-y-1 text-right">
                          <div className="h-3 w-12 bg-gray-300 rounded animate-pulse"></div>
                          <div className="h-4 w-16 bg-gray-300 rounded animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : wallets.length === 0 ? (
              <motion.div 
                className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 text-center border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex flex-col items-center space-y-6">
                  <motion.div 
                    className="w-20 h-20 bg-gradient-to-br from-[#dbabbb] to-[#baa1a7] rounded-full flex items-center justify-center shadow-lg"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
                  >
                    <Wallet className="h-10 w-10 text-white" />
                  </motion.div>
                  <div>
                    <h3 className="text-xl font-bold text-filipino mb-2">No wallets yet!</h3>
                    <p className="text-gray-600 max-w-sm mx-auto">
                      Get started by adding your first wallet to track your finances across GCash, BPI, UnionBank and more
                    </p>
                  </div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Button 
                      onClick={() => setIsAddWalletOpen(true)}
                      className="btn-peso bg-gradient-to-r from-[#dbabbb] to-[#baa1a7] text-white hover:shadow-lg transition-shadow"
                      size="lg"
                    >
                      <Plus className="mr-2 h-5 w-5" />
                      Add Your First Wallet
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6"
                variants={walletGridVariants}
                initial="hidden"
                animate="visible"
              >
                {wallets.map((wallet) => (
                  <WalletCard
                    key={wallet.id}
                    wallet={wallet}
                  />
                ))}
              </motion.div>
            )}
          </div>

          {/* Recent Transactions Section */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl md:text-2xl font-bold text-foreground">Recent Transactions</h2>
              <Link href="/transactions">
                <Button variant="outline" size="sm" className="text-sm hover:bg-[#dbabbb] hover:text-white transition-colors">
                  See All
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>

            {isLoadingTransactions ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="transaction-card animate-pulse">
                    <div className="p-4">
                      <div className="flex gap-3">
                        <div className="w-12 h-12 bg-gray-200 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-32" />
                          <div className="h-3 bg-gray-200 rounded w-24" />
                        </div>
                        <div className="h-6 bg-gray-200 rounded w-20" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 text-center border-2 border-dashed border-gray-200">
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#00D2FF] to-[#00B8E6] rounded-full flex items-center justify-center">
                    <TrendingUp className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-filipino mb-2">No transactions yet!</h3>
                    <p className="text-gray-600">
                      Add your first transaction to start tracking your finances
                    </p>
                  </div>
                  <Button 
                    onClick={() => setIsAddTransactionOpen(true)}
                    className="btn-peso bg-gradient-to-r from-[#00D2FF] to-[#00B8E6] text-white"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Transaction
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <TransactionTable 
                  transactions={showAllTransactions ? allTransactions : transactions} 
                  isLoading={false} 
                />
                
                {/* View More Button */}
                {!showAllTransactions && transactions.length >= 5 && totalTransactions > 5 && (
                  <div className="flex justify-center pt-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-text-muted hover:text-[#007DFE] hover:bg-[#007DFE]/10 transition-colors"
                      onClick={fetchAllTransactions}
                      disabled={isLoadingMoreTransactions}
                    >
                      {isLoadingMoreTransactions ? (
                        "Loading..."
                      ) : (
                        <>
                          View {totalTransactions - 5} more transactions
                          <ChevronDown className="ml-1 h-3 w-3" />
                        </>
                      )}
                    </Button>
                  </div>
                )}
                
                {showAllTransactions && (
                  <div className="flex justify-center pt-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-text-muted hover:text-[#007DFE] hover:bg-[#007DFE]/10 transition-colors"
                      onClick={() => setShowAllTransactions(false)}
                    >
                      Show less
                      <ChevronUp className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Insights Section */}
          <div className="mt-8">
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-6">AI Insights</h2>
            <AIInsights />
          </div>
        </div>

        <AddWalletForm
          open={isAddWalletOpen}
          onOpenChange={setIsAddWalletOpen}
          onSuccess={fetchWallets}
        />
        
        <AddTransactionForm
          open={isAddTransactionOpen}
          onOpenChange={setIsAddTransactionOpen}
          onSuccess={handleTransactionSuccess}
          wallets={wallets.map(wallet => ({
            ...wallet,
            balance: parseFloat(wallet.balance)
          }))}
        />
        </div>
      </PageTransition>
    </>
  )
}