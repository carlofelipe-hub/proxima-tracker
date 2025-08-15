"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

const walletColors = {
  GCASH: "text-blue-600 bg-blue-50",
  BPI_BANK: "text-red-600 bg-red-50",
  UNION_BANK: "text-green-600 bg-green-50",
  CASH: "text-green-600 bg-green-50",
  SAVINGS: "text-purple-600 bg-purple-50",
  CREDIT_CARD: "text-orange-600 bg-orange-50",
  OTHER: "text-gray-600 bg-gray-50",
}

export function WalletCard({ wallet, onEdit, onDelete }: WalletCardProps) {
  const Icon = walletIcons[wallet.type]
  const colorClass = walletColors[wallet.type]

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
    >
      <Card className="relative group cursor-pointer shadow-sm hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <motion.div 
              className={`p-2 rounded-lg ${colorClass}`}
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ duration: 0.2 }}
            >
              <Icon className="h-4 w-4" />
            </motion.div>
            <div>
              <div className="font-semibold">{wallet.name}</div>
              <div className="text-xs text-muted-foreground">
                {formatWalletType(wallet.type)}
              </div>
            </div>
          </CardTitle>
          
          <motion.div
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[160px]">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(wallet)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Wallet
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem 
                    onClick={() => onDelete(wallet.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Wallet
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>
        </CardHeader>
        
        <CardContent>
          <motion.div 
            className="text-2xl font-bold"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            {formatCurrency(wallet.balance)}
          </motion.div>
          
          {wallet._count && (
            <motion.p 
              className="text-xs text-muted-foreground mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              {wallet._count.transactions} transactions
            </motion.p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}