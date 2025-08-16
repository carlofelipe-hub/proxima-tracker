"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatCurrency } from "@/lib/currency"
import { WalletType } from "@prisma/client"
import { motion } from "framer-motion"
import { 
  Wallet, 
  CreditCard, 
  Smartphone, 
  Building2, 
  Banknote,
  MoreVertical,
  Edit,
  Trash2
} from "lucide-react"

interface WalletCardProps {
  wallet: {
    id: string
    name: string
    type: WalletType
    balance: string | number
    currency: string
    _count?: {
      transactions: number
    }
  }
  onEdit?: (wallet: WalletCardProps['wallet']) => void
  onDelete?: (id: string) => void
}

const walletIcons = {
  GCASH: Smartphone,
  BPI_BANK: Building2,
  UNION_BANK: Building2,
  CASH: Banknote,
  SAVINGS: Wallet,
  CREDIT_CARD: CreditCard,
  OTHER: Wallet,
}

// Updated to use style guide colors
const walletStyles = {
  GCASH: {
    gradient: "from-[#dbabbb] to-[#baa1a7]",
    bg: "bg-gradient-to-br from-[#dbabbb] to-[#baa1a7]",
    text: "text-white",
    brand: "GCash",
    pattern: "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMiIgZmlsbD0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjEpIi8+Cjwvc3ZnPgo=')]"
  },
  BPI_BANK: {
    gradient: "from-[#edbbb4] to-[#dbabbb]",
    bg: "bg-gradient-to-br from-[#edbbb4] to-[#dbabbb]",
    text: "text-white",
    brand: "BPI",
    pattern: "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iMTgiIHk9IjE4IiB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMSkiLz4KPC9zdmc+Cg==')]"
  },
  UNION_BANK: {
    gradient: "from-[#edd2e0] to-[#edbbb4]",
    bg: "bg-gradient-to-br from-[#edd2e0] to-[#edbbb4]",
    text: "text-white",
    brand: "UnionBank",
    pattern: "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBvbHlnb24gcG9pbnRzPSIyMCwxNSAyMiwxOSAxOCwxOSIgZmlsbD0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjIpIi8+Cjwvc3ZnPgo=')]"
  },
  CASH: {
    gradient: "from-[#baa1a7] to-[#797b84]",
    bg: "bg-gradient-to-br from-[#baa1a7] to-[#797b84]",
    text: "text-white",
    brand: "Cash",
    pattern: "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjIpIi8+Cjwvc3ZnPgo=')]"
  },
  SAVINGS: {
    gradient: "from-[#dbabbb] to-[#baa1a7]",
    bg: "bg-gradient-to-br from-[#dbabbb] to-[#baa1a7]",
    text: "text-white",
    brand: "Savings",
    pattern: "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBvbHlnb24gcG9pbnRzPSIyMCwxNiAyMiwxOSAxOCwxOSIgZmlsbD0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjE1KSIvPgo8L3N2Zz4K')]"
  },
  CREDIT_CARD: {
    gradient: "from-[#edbbb4] to-[#dbabbb]",
    bg: "bg-gradient-to-br from-[#edbbb4] to-[#dbabbb]",
    text: "text-white",
    brand: "Credit Card",
    pattern: "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iMTgiIHk9IjE4IiB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMSkiLz4KPC9zdmc+Cg==')]"
  },
  OTHER: {
    gradient: "from-[#797b84] to-[#baa1a7]",
    bg: "bg-gradient-to-br from-[#797b84] to-[#baa1a7]",
    text: "text-white",
    brand: "Other",
    pattern: "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMiIgZmlsbD0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjEpIi8+Cjwvc3ZnPgo=')]"
  },
}

export function WalletCard({ wallet, onEdit, onDelete }: WalletCardProps) {
  const Icon = walletIcons[wallet.type]
  const style = walletStyles[wallet.type]

  const formatWalletType = (type: WalletType): string => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      className="relative group"
    >
      {/* Minimalist Retro Design */}
      <div className={`
        relative w-full h-40 rounded-xl cursor-pointer
        ${style.bg} border border-black/10
        shadow-sm hover:shadow-md transition-all duration-200
        hover:-translate-y-1
      `}>        
        {/* Simple Header */}
        <div className="flex justify-between items-center p-5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/20">
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-semibold text-base text-white" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.4)'}}>
                {style.brand}
              </div>
              <div className="text-sm text-white/70" style={{textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.4)'}}>
                {formatWalletType(wallet.type)}
              </div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-white/20 text-white"
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[140px]">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(wallet)}>
                  <Edit className="mr-2 h-3 w-3" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(wallet.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-3 w-3" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Balance Section */}
        <div className="px-5 pb-5">
          <div className="flex justify-between items-end">
            <div>
              <div className="text-xs text-white/70 mb-1" style={{textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.4)'}}>
                Current Balance
              </div>
              <motion.div 
                className="text-xl font-bold font-mono text-white"
                style={{textShadow: '1px 1px 2px rgba(0,0,0,0.4)'}}
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                {formatCurrency(wallet.balance)}
              </motion.div>
            </div>
            
            <div className="text-right">
              <div className="text-xs text-white/60 mb-1" style={{textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.3)'}}>
                Account
              </div>
              <div className="text-sm text-white/70 truncate max-w-24" style={{textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.3)'}}>
                {wallet.name}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}