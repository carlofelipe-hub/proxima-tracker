"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { TransactionType } from "@prisma/client"
import { getPhilippineTimeForInput, fromDateTimeLocalToPhilippineTime } from "@/lib/timezone"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { AffordabilityCheck } from "./affordability-check"

const transactionSchema = z.object({
  amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be a positive number"
  }),
  type: z.nativeEnum(TransactionType),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  walletId: z.string().min(1, "Wallet is required"),
  date: z.string().optional(),
})

type TransactionFormData = z.infer<typeof transactionSchema>

interface AddTransactionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  wallets: Array<{
    id: string
    name: string
    type: string
  }>
}

const transactionCategories = {
  [TransactionType.INCOME]: [
    "Salary",
    "Freelance",
    "Business",
    "Investment",
    "Gift",
    "Refund",
    "Other Income",
  ],
  [TransactionType.EXPENSE]: [
    "Food & Dining",
    "Transportation",
    "Shopping",
    "Entertainment",
    "Bills & Utilities",
    "Healthcare",
    "Education",
    "Travel",
    "Other Expense",
  ],
  [TransactionType.TRANSFER]: [
    "Wallet Transfer",
    "Bank Transfer",
    "Other Transfer",
  ],
}

export function AddTransactionForm({ 
  open, 
  onOpenChange, 
  onSuccess, 
  wallets 
}: AddTransactionFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedType, setSelectedType] = useState<TransactionType>(TransactionType.EXPENSE)
  const [showAffordabilityCheck, setShowAffordabilityCheck] = useState(false)

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      amount: "",
      type: TransactionType.EXPENSE,
      category: "",
      description: "",
      walletId: "",
      date: getPhilippineTimeForInput(), // YYYY-MM-DDTHH:MM format in Philippine time
    },
  })

  const onSubmit = async (data: TransactionFormData) => {
    setIsLoading(true)
    
    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          amount: parseFloat(data.amount),
          date: data.date ? fromDateTimeLocalToPhilippineTime(data.date).toISOString() : undefined,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create transaction")
      }

      form.reset()
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error("Error creating transaction:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Update categories when transaction type changes and handle affordability check visibility
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "type" && value.type) {
        setSelectedType(value.type as TransactionType)
        form.setValue("category", "") // Reset category when type changes
        setShowAffordabilityCheck(value.type === TransactionType.EXPENSE)
      }
      
      // Show affordability check for expenses when amount or wallet changes
      if ((name === "amount" || name === "walletId") && value.type === TransactionType.EXPENSE) {
        const amount = parseFloat(value.amount || "0")
        setShowAffordabilityCheck(amount > 0)
      }
    })
    return () => subscription.unsubscribe()
  }, [form])

  const handleWalletSuggestion = (suggestedWalletId: string) => {
    form.setValue("walletId", suggestedWalletId)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Transaction</DialogTitle>
          <DialogDescription>
            Record an income or expense transaction for your wallet.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={TransactionType.INCOME}>Income</SelectItem>
                        <SelectItem value={TransactionType.EXPENSE}>Expense</SelectItem>
                        <SelectItem value={TransactionType.TRANSFER}>Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (PHP)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        min="0"
                        placeholder="0.00" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="walletId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wallet</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select wallet" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {wallets.map((wallet) => (
                        <SelectItem key={wallet.id} value={wallet.id}>
                          {wallet.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {transactionCategories[selectedType].map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Affordability Check for Expenses */}
            {showAffordabilityCheck && selectedType === TransactionType.EXPENSE && (
              <div className="pt-2">
                <AffordabilityCheck
                  amount={parseFloat(form.watch("amount") || "0")}
                  walletId={form.watch("walletId")}
                  category={form.watch("category")}
                  onWalletSuggestion={handleWalletSuggestion}
                />
              </div>
            )}
            
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date & Time</FormLabel>
                  <FormControl>
                    <Input 
                      type="datetime-local"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add any notes about this transaction..."
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Adding..." : "Add Transaction"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}