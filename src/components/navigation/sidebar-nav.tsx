"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { motion } from "framer-motion"
import { useFirstDashboardVisit } from "@/lib/first-visit"
import { 
  Home, 
  Wallet, 
  Receipt, 
  TrendingUp, 
  Plus,
  LogOut,
  Calendar,
  Target,
  Menu,
  ListTodo
} from "lucide-react"
import { signOut } from "next-auth/react"

interface SidebarNavProps {
  onAddWallet?: () => void
  onAddTransaction?: () => void
}

const navItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Home
  },
  {
    name: "Wallets",
    href: "/wallets",
    icon: Wallet
  },
  {
    name: "Transactions",
    href: "/transactions", 
    icon: Receipt
  },
  {
    name: "Planning",
    href: "/planning",
    icon: Target
  },
  {
    name: "Planned Expenses",
    href: "/planned-expenses",
    icon: ListTodo
  },
  {
    name: "Budget",
    href: "/budget",
    icon: Calendar
  },
  {
    name: "Insights",
    href: "/insights",
    icon: TrendingUp
  }
]

function SidebarContent({ onAddWallet, onAddTransaction, onClose }: SidebarNavProps & { onClose?: () => void }) {
  const pathname = usePathname()
  const { isFirstVisit } = useFirstDashboardVisit()

  // Use full animations only on first visit, minimal afterwards
  const navVariants = isFirstVisit ? {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  } : {
    hidden: { opacity: 1 },
    visible: { opacity: 1 }
  }

  const itemVariants = isFirstVisit ? {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0
    }
  } : {
    hidden: { opacity: 1, x: 0 },
    visible: { opacity: 1, x: 0 }
  }

  return (
    <motion.div 
      className="flex flex-col h-full"
      initial={{ opacity: isFirstVisit ? 0 : 1 }}
      animate={{ opacity: 1 }}
      transition={isFirstVisit ? { duration: 0.3 } : { duration: 0 }}
    >
      {/* Header */}
      <motion.div 
        className="p-6 border-b"
        initial={{ opacity: isFirstVisit ? 0 : 1, y: isFirstVisit ? -20 : 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={isFirstVisit ? { duration: 0.4, delay: 0.1 } : { duration: 0 }}
      >
        <h1 className="text-xl font-bold text-primary">₱roxima Tracker</h1>
        <p className="text-sm text-muted-foreground">Philippine Budget Tracker</p>
      </motion.div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <motion.div 
          className="space-y-2"
          variants={navVariants}
          initial="hidden"
          animate="visible"
        >
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <motion.div 
                key={item.name} 
                variants={itemVariants}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-md" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <motion.div
                    whileHover={isFirstVisit ? { scale: 1.1 } : { scale: 1.05 }}
                    whileTap={isFirstVisit ? { scale: 0.95 } : { scale: 0.98 }}
                    transition={{ duration: 0.1 }}
                  >
                    <Icon className="h-5 w-5" />
                  </motion.div>
                  <span className="font-medium">{item.name}</span>
                  {isActive && (
                    <motion.div
                      className="ml-auto w-2 h-2 bg-primary-foreground rounded-full"
                      layoutId="activeIndicator"
                      transition={isFirstVisit ? { type: "spring", stiffness: 300, damping: 30 } : { duration: 0.1 }}
                    />
                  )}
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
      </nav>

      {/* Actions */}
      <motion.div 
        className="p-4 border-t space-y-2"
        initial={{ opacity: isFirstVisit ? 0 : 1, y: isFirstVisit ? 20 : 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={isFirstVisit ? { duration: 0.4, delay: 0.8 } : { duration: 0 }}
      >
        {onAddTransaction && (
          <motion.div
            whileHover={isFirstVisit ? { scale: 1.02 } : { scale: 1.01 }}
            whileTap={isFirstVisit ? { scale: 0.98 } : { scale: 0.99 }}
          >
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={() => {
                onAddTransaction()
                onClose?.()
              }}
            >
              <Receipt className="mr-2 h-4 w-4" />
              Add Transaction
            </Button>
          </motion.div>
        )}
        {onAddWallet && (
          <motion.div
            whileHover={isFirstVisit ? { scale: 1.02 } : { scale: 1.01 }}
            whileTap={isFirstVisit ? { scale: 0.98 } : { scale: 0.99 }}
          >
            <Button 
              className="w-full justify-start" 
              onClick={() => {
                onAddWallet()
                onClose?.()
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Wallet
            </Button>
          </motion.div>
        )}
        <motion.div
          whileHover={isFirstVisit ? { scale: 1.02 } : { scale: 1.01 }}
          whileTap={isFirstVisit ? { scale: 0.98 } : { scale: 0.99 }}
        >
          <Button 
            variant="ghost" 
            className="w-full justify-start" 
            onClick={() => signOut()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

export function SidebarNav({ onAddWallet, onAddTransaction }: SidebarNavProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-80">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
            </SheetHeader>
            <SidebarContent 
              onAddWallet={onAddWallet}
              onAddTransaction={onAddTransaction}
              onClose={() => setOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 h-full w-80 border-r bg-background">
        <SidebarContent 
          onAddWallet={onAddWallet}
          onAddTransaction={onAddTransaction}
        />
      </div>

      {/* Top Bar for App Title on Mobile */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-background border-b h-16 flex items-center justify-center">
        <h1 className="text-lg font-bold text-primary">₱roxima Tracker</h1>
      </div>
    </>
  )
}