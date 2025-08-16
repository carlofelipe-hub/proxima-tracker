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
          whileHover={{ x: 4 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-4">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3">
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: index * 0.1 + 0.3, duration: 0.4 }}
                    >
                      {transaction.type === TransactionType.INCOME ? (
                        <ArrowUpCircle className="h-5 w-5 text-green-600" />
                      ) : transaction.type === TransactionType.TRANSFER ? (
                        <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                      ) : (
                        <ArrowDownCircle className="h-5 w-5 text-red-600" />
                      )}
                    </motion.div>
                    <h3 className="font-semibold text-sm sm:text-base truncate">{transaction.category}</h3>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.1 + 0.4, duration: 0.3 }}
                    >
                      <Badge 
                        variant={
                          transaction.type === TransactionType.INCOME 
                            ? "default" 
                            : transaction.type === TransactionType.TRANSFER 
                            ? "secondary" 
                            : "destructive"
                        }
                        className="text-xs"
                      >
                        {transaction.type === TransactionType.INCOME 
                          ? "Income" 
                          : transaction.type === TransactionType.TRANSFER 
                          ? "Transfer" 
                          : "Expense"}
                      </Badge>
                    </motion.div>
                  </div>
                  
                  {transaction.description && (
                    <motion.p 
                      className="text-xs sm:text-sm text-muted-foreground mb-2 truncate"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.1 + 0.5, duration: 0.3 }}
                    >
                      {transaction.description}
                    </motion.p>
                  )}
                  
                  <motion.div 
                    className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-muted-foreground"
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
                
                <div className="flex items-start gap-2">
                  <motion.div 
                    className="text-right flex-shrink-0"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 + 0.7, duration: 0.4 }}
                  >
                    <div className="space-y-1">
                      <div className={`text-sm sm:text-lg font-bold ${
                        transaction.type === TransactionType.INCOME 
                          ? "text-green-600" 
                          : transaction.type === TransactionType.TRANSFER
                          ? "text-blue-600"
                          : "text-red-600"
                      }`}>
                        {transaction.type === TransactionType.INCOME ? "+" : 
                         transaction.type === TransactionType.TRANSFER ? "" : "-"}
                        {formatCurrency(transaction.amount)}
                      </div>
                      {transaction.type === TransactionType.TRANSFER && transaction.transferFee && transaction.transferFee > 0 && (
                        <div className="text-xs text-red-600">
                          Fee: {formatCurrency(transaction.transferFee)}
                        </div>
                      )}
                    </div>
                  </motion.div>
                  
                  {transaction.type !== TransactionType.TRANSFER && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 + 0.8, duration: 0.4 }}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
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
            </CardContent>
          </Card>
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