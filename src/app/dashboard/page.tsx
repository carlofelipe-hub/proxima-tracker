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
import { TransactionList } from "@/components/transactions/transaction-list"
import { AIInsights } from "@/components/insights/ai-insights"
import { SidebarNav } from "@/components/navigation/sidebar-nav"
import { formatCurrency } from "@/lib/currency"
import { useFirstDashboardVisit } from "@/lib/first-visit"
import { motion } from "framer-motion"
import { Plus, Wallet, TrendingUp, TrendingDown, PiggyBank, Calendar } from "lucide-react"
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
      const response = await fetch("/api/transactions?limit=10")
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
          <div className="container mx-auto px-4 py-6 lg:py-6 pt-20 lg:pt-6">
          {/* Welcome Section */}
          <motion.div 
            className="mb-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Welcome back, {session.user?.name || session.user?.email}
            </p>
          </motion.div>

          {/* Summary Cards */}
          <motion.div 
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
          <motion.div 
            variants={cardVariants}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <PiggyBank className="h-4 w-4 text-muted-foreground" />
                </motion.div>
              </CardHeader>
              <CardContent>
                <motion.div 
                  className="text-2xl font-bold"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                >
                  {formatCurrency(totalBalance)}
                </motion.div>
                <p className="text-xs text-muted-foreground">
                  Across {wallets.length} wallet{wallets.length !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            variants={cardVariants}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Wallets</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <motion.div 
                  className="text-2xl font-bold"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                >
                  {wallets.length}
                </motion.div>
                <p className="text-xs text-muted-foreground">
                  Active wallets
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            variants={cardVariants}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <motion.div 
                  className="text-2xl font-bold"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.7, duration: 0.5 }}
                >
                  {totalTransactions}
                </motion.div>
                <p className="text-xs text-muted-foreground">
                  All time
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            variants={cardVariants}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <motion.div 
                  className="text-2xl font-bold"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                >
                  ₱0.00
                </motion.div>
                <p className="text-xs text-muted-foreground">
                  Net change
                </p>
              </CardContent>
            </Card>
          </motion.div>
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

          {/* Wallets Section */}
          <div className="space-y-4 md:space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl md:text-2xl font-bold">Your Wallets</h2>
            </div>

            {isLoadingWallets ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
              </div>
            ) : wallets.length === 0 ? (
              <Card className="p-6 md:p-8 text-center">
              <div className="flex flex-col items-center space-y-4">
                <Wallet className="h-12 w-12 text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">No wallets yet</h3>
                  <p className="text-muted-foreground">
                    Get started by adding your first wallet
                  </p>
                </div>
                <Button onClick={() => setIsAddWalletOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Wallet
                </Button>
              </div>
              </Card>
            ) : (
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
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

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 mt-8 md:mt-12">
          {/* Left Column - Transactions */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl md:text-2xl font-bold">Recent Transactions</h2>
            </div>

            <TransactionList 
              transactions={transactions} 
              isLoading={isLoadingTransactions} 
            />
          </div>

          {/* Right Column - AI Insights */}
          <div className="lg:col-span-1">
            <AIInsights />
          </div>
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
          wallets={wallets}
        />
        </div>
      </PageTransition>
    </>
  )
}