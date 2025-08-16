"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
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

interface Wallet {
  id: string
  name: string
  type: string
}

interface EditTransactionDialogProps {
  transaction: Transaction | null
  wallets: Wallet[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const expenseCategories = [
  "Food & Dining",
  "Transportation",
  "Shopping",
  "Entertainment",
  "Bills & Utilities",
  "Healthcare",
  "Education",
  "Travel",
  "Groceries",
  "Other"
]

const incomeCategories = [
  "Salary",
  "Freelance",
  "Business",
  "Investment",
  "Gift",
  "Bonus",
  "Other"
]

export function EditTransactionDialog({ 
  transaction, 
  wallets, 
  open, 
  onOpenChange, 
  onSuccess 
}: EditTransactionDialogProps) {
  const [step, setStep] = useState<"confirm" | "edit">("confirm")
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    amount: transaction?.amount.toString() || "",
    type: transaction?.type || TransactionType.EXPENSE,
    category: transaction?.category || "",
    description: transaction?.description || "",
    walletId: transaction?.walletId || "",
    date: transaction?.date ? new Date(transaction.date).toISOString().slice(0, 16) : "",
  })

  const handleConfirmEdit = () => {
    setStep("edit")
  }

  const handleSaveEdit = async () => {
    if (!transaction) return

    try {
      setIsLoading(true)

      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: parseFloat(formData.amount),
          type: formData.type,
          category: formData.category,
          description: formData.description || undefined,
          walletId: formData.walletId,
          date: formData.date ? new Date(formData.date).toISOString() : undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update transaction")
      }

      toast.success("Transaction updated successfully")
      onSuccess()
      onOpenChange(false)
      setStep("confirm")
    } catch (error) {
      console.error("Error updating transaction:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update transaction")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    if (step === "edit") {
      setStep("confirm")
      // Reset form data to original values
      setFormData({
        amount: transaction?.amount.toString() || "",
        type: transaction?.type || TransactionType.EXPENSE,
        category: transaction?.category || "",
        description: transaction?.description || "",
        walletId: transaction?.walletId || "",
        date: transaction?.date ? new Date(transaction.date).toISOString().slice(0, 16) : "",
      })
    } else {
      onOpenChange(false)
    }
  }

  if (!transaction) return null

  const categories = formData.type === TransactionType.INCOME ? incomeCategories : expenseCategories

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        {step === "confirm" ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Confirm Edit Transaction
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-2">
                  <p>
                    You&apos;re about to edit this transaction. This will affect your wallet balance 
                    and may impact the accuracy of your budget tracking.
                  </p>
                  <div className="bg-muted p-3 rounded-lg text-sm">
                    <p><strong>Current Transaction:</strong></p>
                    <p>{transaction.category} - {formatCurrency(transaction.amount)}</p>
                    <p>{transaction.wallet.name}</p>
                    {transaction.description && <p>&ldquo;{transaction.description}&rdquo;</p>}
                  </div>
                  <p className="text-amber-600 text-sm">
                    ⚠️ Only proceed if this is necessary (e.g., correcting a typo or mistake).
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmEdit} variant="default">
                Continue to Edit
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Edit Transaction</DialogTitle>
              <DialogDescription>
                Make your changes below. All fields will update your wallet balance accordingly.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as TransactionType })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TransactionType.INCOME}>Income</SelectItem>
                    <SelectItem value={TransactionType.EXPENSE}>Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wallet">Wallet</Label>
                <Select value={formData.walletId} onValueChange={(value) => setFormData({ ...formData, walletId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets.map((wallet) => (
                      <SelectItem key={wallet.id} value={wallet.id}>
                        {wallet.name} ({wallet.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Add a description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date & Time</Label>
                <Input
                  id="date"
                  type="datetime-local"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={isLoading || !formData.amount || !formData.category || !formData.walletId}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}