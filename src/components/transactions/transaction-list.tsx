"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/currency"
import { TransactionType } from "@prisma/client"
import { motion } from "framer-motion"
import { ArrowUpCircle, ArrowDownCircle, Calendar, Wallet } from "lucide-react"
import { format } from "date-fns"

interface Transaction {
  id: string
  amount: number
  type: TransactionType
  category: string
  description?: string
  date: string
  wallet: {
    name: string
    type: string
  }
}

interface TransactionListProps {
  transactions: Transaction[]
  isLoading?: boolean
}

export function TransactionList({ transactions, isLoading }: TransactionListProps) {
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
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: index * 0.1 + 0.3, duration: 0.4 }}
                    >
                      {transaction.type === TransactionType.INCOME ? (
                        <ArrowUpCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <ArrowDownCircle className="h-5 w-5 text-red-600" />
                      )}
                    </motion.div>
                    <h3 className="font-semibold">{transaction.category}</h3>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.1 + 0.4, duration: 0.3 }}
                    >
                      <Badge 
                        variant={transaction.type === TransactionType.INCOME ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {transaction.type === TransactionType.INCOME ? "Income" : "Expense"}
                      </Badge>
                    </motion.div>
                  </div>
                  
                  {transaction.description && (
                    <motion.p 
                      className="text-sm text-muted-foreground mb-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.1 + 0.5, duration: 0.3 }}
                    >
                      {transaction.description}
                    </motion.p>
                  )}
                  
                  <motion.div 
                    className="flex items-center gap-4 text-xs text-muted-foreground"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 + 0.6, duration: 0.3 }}
                  >
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(transaction.date), "MMM dd, yyyy 'at' h:mm a")}
                    </div>
                    <div className="flex items-center gap-1">
                      <Wallet className="h-3 w-3" />
                      {transaction.wallet.name}
                    </div>
                  </motion.div>
                </div>
                
                <motion.div 
                  className="text-right"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 + 0.7, duration: 0.4 }}
                >
                  <div className={`text-lg font-bold ${
                    transaction.type === TransactionType.INCOME 
                      ? "text-green-600" 
                      : "text-red-600"
                  }`}>
                    {transaction.type === TransactionType.INCOME ? "+" : "-"}
                    {formatCurrency(transaction.amount)}
                  </div>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  )
}