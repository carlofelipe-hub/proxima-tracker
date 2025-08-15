"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { 
  Home, 
  Wallet, 
  Receipt, 
  TrendingUp, 
  Plus,
  LogOut,
  Calendar,
  Target
} from "lucide-react"
import { signOut } from "next-auth/react"

interface MobileNavProps {
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

export function MobileNav({ onAddWallet, onAddTransaction }: MobileNavProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop Actions Header - Hidden on Mobile */}
      <div className="hidden md:block sticky top-0 z-50 w-full border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-bold text-primary">₱roxima Tracker</h1>
          
          <div className="flex items-center space-x-2">
            {onAddTransaction && (
              <Button variant="outline" size="sm" onClick={onAddTransaction}>
                <Receipt className="mr-2 h-4 w-4" />
                Add Transaction
              </Button>
            )}
            {onAddWallet && (
              <Button size="sm" onClick={onAddWallet}>
                <Plus className="mr-2 h-4 w-4" />
                Add Wallet
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden">
        <div className="flex items-center py-1">
          {/* Main Navigation Items */}
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center space-y-1 px-2 py-2 min-w-0 flex-1 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium truncate">{item.name}</span>
              </Link>
            )
          })}
          
          {/* Logout */}
          <div className="flex flex-col items-center px-2 py-2">
            <Button variant="ghost" size="sm" onClick={() => signOut()} className="h-8 w-8 p-0">
              <LogOut className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium text-muted-foreground">Logout</span>
          </div>
        </div>
      </nav>
    </>
  )
}