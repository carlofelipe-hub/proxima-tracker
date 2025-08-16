"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/currency"
import { TransactionType } from "@prisma/client"
import { AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "sonner"

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
}

interface DeleteTransactionDialogProps {
  transaction: Transaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function DeleteTransactionDialog({ 
  transaction, 
  open, 
  onOpenChange, 
  onSuccess 
}: DeleteTransactionDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleDelete = async () => {
    if (!transaction) return

    try {
      setIsLoading(true)

      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete transaction")
      }

      toast.success("Transaction deleted successfully")
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Error deleting transaction:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete transaction")
    } finally {
      setIsLoading(false)
    }
  }

  if (!transaction) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Delete Transaction
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2">
              <p>
                Are you sure you want to delete this transaction? This action cannot be undone 
                and will affect your wallet balance and budget tracking.
              </p>
              <div className="bg-muted p-3 rounded-lg text-sm">
                <p><strong>Transaction to Delete:</strong></p>
                <p className="flex items-center gap-2">
                  <span className={`font-medium ${
                    transaction.type === TransactionType.INCOME ? "text-green-600" : "text-red-600"
                  }`}>
                    {transaction.type === TransactionType.INCOME ? "+" : "-"}{formatCurrency(transaction.amount)}
                  </span>
                  <span>•</span>
                  <span>{transaction.category}</span>
                </p>
                <p className="text-muted-foreground">{transaction.wallet.name}</p>
                {transaction.description && (
                  <p className="text-muted-foreground italic">&ldquo;{transaction.description}&rdquo;</p>
                )}
              </div>
              <p className="text-red-600 text-sm">
                ⚠️ This will restore your wallet balance to what it was before this transaction.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Transaction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}