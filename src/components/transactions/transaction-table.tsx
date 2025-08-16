"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/currency"
import { TransactionType } from "@prisma/client"
import { ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, Edit, Trash2, MoreHorizontal } from "lucide-react"
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
  walletId?: string
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

interface TransactionTableProps {
  transactions: Transaction[]
  wallets?: Wallet[]
  isLoading?: boolean
  onTransactionUpdate?: () => void
}

export function TransactionTable({ transactions, wallets, isLoading, onTransactionUpdate }: TransactionTableProps) {
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null)
  const [deleteTransaction, setDeleteTransaction] = useState<Transaction | null>(null)
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse border rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <ArrowUpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold">No transactions yet</h3>
        <p className="text-muted-foreground">
          Add your first income or expense to get started
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">Type</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="hidden sm:table-cell">Description</TableHead>
            <TableHead className="hidden md:table-cell">Wallet</TableHead>
            <TableHead className="hidden lg:table-cell">Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            {wallets && <TableHead className="w-[60px]">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id} className="hover:bg-muted/50">
              <TableCell>
                <div className="flex items-center">
                  {transaction.type === TransactionType.INCOME ? (
                    <ArrowUpCircle className="h-4 w-4 text-green-600" />
                  ) : transaction.type === TransactionType.TRANSFER ? (
                    <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                  ) : (
                    <ArrowDownCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="font-medium text-sm">{transaction.category}</div>
                  <div className="sm:hidden">
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
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell max-w-[200px]">
                <div className="truncate text-sm text-muted-foreground">
                  {transaction.description || "-"}
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="text-sm">
                  {transaction.type === TransactionType.TRANSFER && transaction.toWallet ? (
                    <span className="text-xs">
                      {transaction.category === "Transfer Out" ? `${transaction.wallet.name} → ${transaction.toWallet.name}` : 
                       transaction.category === "Transfer In" ? `${transaction.toWallet.name} → ${transaction.wallet.name}` :
                       transaction.wallet.name}
                    </span>
                  ) : (
                    transaction.wallet.name
                  )}
                </div>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <div className="text-xs text-muted-foreground">
                  {formatPhilippineDateTime(transaction.date)}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="space-y-1">
                  <div className={`font-bold text-sm sm:text-base ${
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
              </TableCell>
              {wallets && (
                <TableCell>
                  {transaction.type !== TransactionType.TRANSFER && (
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
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {wallets && (
        <>
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
        </>
      )}
    </div>
  )
}