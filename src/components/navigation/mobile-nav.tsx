"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Wallet, 
  List, 
  BarChart3, 
  Bot,
  User,
  Plus,
  Minus,
  ArrowRightLeft,
  LogOut,
  X
} from "lucide-react"
import { signOut } from "next-auth/react"

interface MobileNavProps {
  onAddWallet?: () => void
  onAddTransaction?: () => void
  onAddIncome?: () => void
  onAddExpense?: () => void
  onTransfer?: () => void
}

const navItems = [
  {
    name: "Home",
    href: "/dashboard",
    icon: Wallet,
    label: "Home"
  },
  {
    name: "Transactions", 
    href: "/transactions",
    icon: List,
    label: "History"
  },
  {
    name: "Analytics",
    href: "/insights", 
    icon: BarChart3,
    label: "Analytics"
  },
  {
    name: "AI",
    href: "/planning",
    icon: Bot,
    label: "AI"
  },
  {
    name: "Profile",
    href: "/wallets",
    icon: User,
    label: "Profile"
  }
]

export function MobileNav({ 
  onAddWallet, 
  onAddTransaction, 
  onAddIncome, 
  onAddExpense, 
  onTransfer 
}: MobileNavProps) {
  const pathname = usePathname()
  const [quickActionsOpen, setQuickActionsOpen] = useState(false)

  const quickActions = [
    {
      label: "Add Income",
      icon: Plus,
      action: onAddIncome,
      gradient: "from-[#00D2FF] to-[#00B8E6]",
      delay: 0.1
    },
    {
      label: "Add Expense", 
      icon: Minus,
      action: onAddExpense,
      gradient: "from-[#FF6B6B] to-[#FF5252]",
      delay: 0.2
    },
    {
      label: "Transfer",
      icon: ArrowRightLeft, 
      action: onTransfer,
      gradient: "from-[#007DFE] to-[#0066CC]",
      delay: 0.3
    }
  ]

  return (
    <>
      {/* Desktop Header */}
      <div className="hidden md:block sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#007DFE] to-[#0066CC] rounded-lg flex items-center justify-center">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-filipino">₱roxima Tracker</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            {onAddIncome && (
              <Button className="btn-income" size="sm" onClick={onAddIncome}>
                <Plus className="mr-2 h-4 w-4" />
                Income
              </Button>
            )}
            {onAddExpense && (
              <Button className="btn-expense" size="sm" onClick={onAddExpense}>
                <Minus className="mr-2 h-4 w-4" />
                Expense
              </Button>
            )}
            {onTransfer && (
              <Button className="btn-transfer" size="sm" onClick={onTransfer}>
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Transfer
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Floating Bottom Navigation - Mobile */}
      <div className="md:hidden">
        {/* Navigation Pill */}
        <motion.nav 
          className="floating-nav"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div className="flex items-center gap-1">
            {navItems.map((item, index) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <Link key={item.name} href={item.href}>
                  <motion.div
                    className={`
                      relative flex flex-col items-center gap-1 px-3 py-2 rounded-full transition-all duration-300
                      ${isActive 
                        ? "bg-gradient-to-br from-[#007DFE] to-[#0066CC] text-white shadow-lg" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }
                    `}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{item.label}</span>
                    
                    {/* Active indicator */}
                    {isActive && (
                      <motion.div
                        className="absolute -bottom-1 left-1/2 w-1 h-1 bg-primary-foreground rounded-full"
                        layoutId="activeIndicator"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.2 }}
                      />
                    )}
                  </motion.div>
                </Link>
              )
            })}
          </div>
        </motion.nav>

        {/* Quick Action Buttons */}
        <div className="fixed bottom-24 right-4 z-50">
          {/* Quick Action Menu */}
          <AnimatePresence>
            {quickActionsOpen && (
              <motion.div
                className="absolute bottom-16 right-0 space-y-3"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                {quickActions.map((action, index) => {
                  const Icon = action.icon
                  return (
                    <motion.button
                      key={action.label}
                      onClick={() => {
                        action.action?.()
                        setQuickActionsOpen(false)
                      }}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-full
                        bg-gradient-to-r ${action.gradient} text-white
                        shadow-lg hover:shadow-xl transition-all duration-200
                        font-medium text-sm
                      `}
                      initial={{ x: 100, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 100, opacity: 0 }}
                      transition={{ delay: action.delay, duration: 0.3 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{action.label}</span>
                    </motion.button>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Action Button */}
          <motion.button
            onClick={() => setQuickActionsOpen(!quickActionsOpen)}
            className={`
              w-14 h-14 rounded-full shadow-lg hover:shadow-xl
              flex items-center justify-center text-white font-bold text-lg
              transition-all duration-300
              ${quickActionsOpen 
                ? "bg-gradient-to-br from-red-500 to-red-600 rotate-45" 
                : "bg-gradient-to-br from-[#007DFE] to-[#0066CC]"
              }
            `}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
          >
            {quickActionsOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
          </motion.button>
        </div>
      </div>
    </>
  )
}