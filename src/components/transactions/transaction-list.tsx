"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/currency"
import { TransactionType } from "@prisma/client"
import { motion } from "framer-motion"
import { ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, Calendar, Wallet, Edit, Trash2, MoreHorizontal } from "lucide-react"
import { formatPhilippineDateTime } from "@/lib/timezone"
import { EditTransactionDialog } from "./edit-transaction-dialog"
import { DeleteTransactionDialog } from "./delete-transaction-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Transaction {
  id: string
  amount: number
  type: TransactionType
  category: string
  description?: string
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

interface Wallet {
  id: string
  name: string
  type: string
}

interface TransactionListProps {
  transactions: Transaction[]
  wallets: Wallet[]
  isLoading?: boolean
  onTransactionUpdate?: () => void
}

export function TransactionList({ transactions, wallets, isLoading, onTransactionUpdate }: TransactionListProps) {
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null)
  const [deleteTransaction, setDeleteTransaction] = useState<Transaction | null>(null)
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-20"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="flex flex-col items-center space-y-4">
          <ArrowUpCircle className="h-12 w-12 text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold">No transactions yet</h3>
            <p className="text-muted-foreground">
              Add your first income or expense to get started
            </p>
          </div>
        </div>
      </Card>
    )
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0
    }
  }

  return (
    <motion.div 
      className="space-y-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {transactions.map((transaction, index) => (
        <motion.div
          key={transaction.id}
          variants={itemVariants}
          whileHover={{ y: -2, transition: { duration: 0.2 } }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="transaction-card border-l-4"
          style={{
            borderLeftColor: transaction.type === TransactionType.INCOME 
              ? '#00D2FF' 
              : transaction.type === TransactionType.TRANSFER
              ? '#007DFE'
              : '#FF6B6B'
          }}
        >
          {/* Mobile-Optimized Layout */}
          <div className="p-3 sm:p-4">
            {/* Header: Avatar + User Info */}
            <div className="flex items-start gap-2 sm:gap-3 mb-3">
              {/* Transaction Type Avatar */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: index * 0.1 + 0.3, duration: 0.4 }}
                className={`
                  w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0
                  ${transaction.type === TransactionType.INCOME 
                    ? 'bg-gradient-to-br from-[#00D2FF] to-[#00B8E6] text-white' 
                    : transaction.type === TransactionType.TRANSFER
                    ? 'bg-gradient-to-br from-[#007DFE] to-[#0066CC] text-white'
                    : 'bg-gradient-to-br from-[#FF6B6B] to-[#FF5252] text-white'}
                  shadow-lg
                `}
              >
                {transaction.type === TransactionType.INCOME ? (
                  <ArrowUpCircle className="h-4 w-4 sm:h-6 sm:w-6" />
                ) : transaction.type === TransactionType.TRANSFER ? (
                  <ArrowRightLeft className="h-4 w-4 sm:h-6 sm:w-6" />
                ) : (
                  <ArrowDownCircle className="h-4 w-4 sm:h-6 sm:w-6" />
                )}
              </motion.div>

              {/* Transaction Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-base sm:text-lg text-gray-800 truncate">
                      {transaction.category}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">
                      {transaction.type === TransactionType.INCOME 
                        ? "Earning money! 💰" 
                        : transaction.type === TransactionType.TRANSFER 
                        ? "Money transferred!" 
                        : "Another expense 😅"}
                    </p>
                  </div>
                  
                  {/* Action Menu */}
                  {transaction.type !== TransactionType.TRANSFER && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 + 0.8, duration: 0.4 }}
                      className="flex-shrink-0"
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 sm:h-8 sm:w-8 p-0 hover:bg-gray-100">
                            <MoreHorizontal className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditTransaction(transaction)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setDeleteTransaction(transaction)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="space-y-2 sm:space-y-3">
              {/* Description */}
              {transaction.description && (
                <motion.p 
                  className="text-gray-800 bg-gray-50 rounded-lg p-2 sm:p-3 text-xs sm:text-sm break-words"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.1 + 0.5, duration: 0.3 }}
                >
                  &quot;{transaction.description}&quot;
                </motion.p>
              )}

              {/* Amount Display - Mobile optimized */}
              <motion.div 
                className="bg-gradient-to-r from-gray-50 to-white rounded-lg p-3 sm:p-4 border border-gray-100"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 + 0.7, duration: 0.4 }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-text-muted mb-1">Amount</p>
                    <div className={`text-lg sm:text-xl font-bold ${
                      transaction.type === TransactionType.INCOME 
                        ? "text-[#00D2FF]" 
                        : transaction.type === TransactionType.TRANSFER
                        ? "text-[#007DFE]"
                        : "text-[#FF6B6B]"
                    } truncate`}>
                      {transaction.type === TransactionType.INCOME ? "+" : 
                       transaction.type === TransactionType.TRANSFER ? "" : "-"}
                      {formatCurrency(transaction.amount)}
                    </div>
                    {transaction.type === TransactionType.TRANSFER && transaction.transferFee && transaction.transferFee > 0 && (
                      <div className="text-xs text-red-600 mt-1">
                        Fee: {formatCurrency(transaction.transferFee)}
                      </div>
                    )}
                  </div>
                  
                  {/* Badge */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.1 + 0.4, duration: 0.3 }}
                    className="flex-shrink-0"
                  >
                    <Badge 
                      className={`
                        ${transaction.type === TransactionType.INCOME 
                          ? "bg-[#00D2FF] text-white" 
                          : transaction.type === TransactionType.TRANSFER 
                          ? "bg-[#007DFE] text-white" 
                          : "bg-[#FF6B6B] text-white"}
                        font-semibold px-2 py-1 text-xs sm:px-3 sm:text-sm
                      `}
                    >
                      {transaction.type === TransactionType.INCOME 
                        ? "Income" 
                        : transaction.type === TransactionType.TRANSFER 
                        ? "Transfer" 
                        : "Expense"}
                    </Badge>
                  </motion.div>
                </div>
              </motion.div>

              {/* Footer: Time & Wallet Info */}
              <motion.div 
                className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-xs text-text-muted pt-2 border-t border-gray-100"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.6, duration: 0.3 }}
              >
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{formatPhilippineDateTime(transaction.date)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Wallet className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">
                    {transaction.type === TransactionType.TRANSFER && transaction.toWallet ? (
                      <>
                        {transaction.category === "Transfer Out" ? `${transaction.wallet.name} → ${transaction.toWallet.name}` : 
                         transaction.category === "Transfer In" ? `${transaction.toWallet.name} → ${transaction.wallet.name}` :
                         transaction.wallet.name}
                      </>
                    ) : (
                      transaction.wallet.name
                    )}
                  </span>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      ))}
      
      <EditTransactionDialog
        transaction={editTransaction}
        wallets={wallets}
        open={!!editTransaction}
        onOpenChange={(open) => !open && setEditTransaction(null)}
        onSuccess={() => {
          setEditTransaction(null)
          onTransactionUpdate?.()
        }}
      />
      
      <DeleteTransactionDialog
        transaction={deleteTransaction}
        open={!!deleteTransaction}
        onOpenChange={(open) => !open && setDeleteTransaction(null)}
        onSuccess={() => {
          setDeleteTransaction(null)
          onTransactionUpdate?.()
        }}
      />
    </motion.div>
  )
}