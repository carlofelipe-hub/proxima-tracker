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
import { Badge } from "@/components/ui/badge"
import { ArrowRight, AlertCircle, CheckCircle2, Target } from "lucide-react"
import { AffordabilityCheck } from "./affordability-check"
import { invalidateInsightsCache } from "@/lib/cached-insights"
import { toast } from "sonner"

const transactionSchema = z.object({
  amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be a positive number"
  }),
  type: z.nativeEnum(TransactionType),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  walletId: z.string().min(1, "Wallet is required"),
  date: z.string().optional(),
  // Transfer-specific fields
  toWalletId: z.string().optional(),
  transferFee: z.string().optional().refine(val => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), {
    message: "Transfer fee must be a non-negative number"
  }),
  // Planned expense tracking
  plannedExpenseId: z.string().optional(),
}).refine((data) => {
  // If type is TRANSFER, toWalletId is required and must be different from walletId
  if (data.type === TransactionType.TRANSFER) {
    if (!data.toWalletId) {
      return false
    }
    return data.walletId !== data.toWalletId
  }
  return true
}, {
  message: "For transfers, destination wallet is required and must be different from source wallet",
  path: ["toWalletId"],
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
    balance: number
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

// Common transfer fees based on wallet types
const getTransferFeePresets = (fromType: string, toType: string) => {
  const feeMap: Record<string, Record<string, number>> = {
    'GCASH': {
      'BPI_BANK': 15,
      'UNION_BANK': 15,
      'CASH': 0,
      'SAVINGS': 25,
      'CREDIT_CARD': 30,
      'OTHER': 15,
    },
    'BPI_BANK': {
      'GCASH': 10,
      'UNION_BANK': 25,
      'CASH': 0,
      'SAVINGS': 0,
      'CREDIT_CARD': 30,
      'OTHER': 15,
    },
    'UNION_BANK': {
      'GCASH': 10,
      'BPI_BANK': 25,
      'CASH': 0,
      'SAVINGS': 0,
      'CREDIT_CARD': 30,
      'OTHER': 15,
    },
    'CASH': {
      'GCASH': 0,
      'BPI_BANK': 0,
      'UNION_BANK': 0,
      'SAVINGS': 0,
      'CREDIT_CARD': 0,
      'OTHER': 0,
    },
    'SAVINGS': {
      'GCASH': 15,
      'BPI_BANK': 0,
      'UNION_BANK': 0,
      'CASH': 0,
      'CREDIT_CARD': 25,
      'OTHER': 10,
    },
  }

  return feeMap[fromType]?.[toType] || 0
}

interface PlannedExpense {
  id: string
  title: string
  amount: number
  spentAmount: number
  remainingAmount: number
  category: string
  targetDate: string
  priority: string
  wallet?: {
    id: string
    name: string
    type: string
  }
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
  const [selectedFromWallet, setSelectedFromWallet] = useState<typeof wallets[0] | null>(null)
  const [selectedToWallet, setSelectedToWallet] = useState<typeof wallets[0] | null>(null)
  const [suggestedFee, setSuggestedFee] = useState<number>(0)
  const [availablePlannedExpenses, setAvailablePlannedExpenses] = useState<PlannedExpense[]>([])
  const [selectedPlannedExpense, setSelectedPlannedExpense] = useState<PlannedExpense | null>(null)

  // Fetch available planned expenses when form opens and type is EXPENSE
  const fetchAvailablePlannedExpenses = async (category?: string) => {
    try {
      const params = new URLSearchParams()
      if (category) params.append("category", category)
      
      const response = await fetch(`/api/planned-expenses/available?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAvailablePlannedExpenses(data.plannedExpenses || [])
      }
    } catch (error) {
      console.error("Error fetching planned expenses:", error)
    }
  }

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      amount: "",
      type: TransactionType.EXPENSE,
      category: "",
      description: "",
      walletId: "",
      date: getPhilippineTimeForInput(), // YYYY-MM-DDTHH:MM format in Philippine time
      toWalletId: "",
      transferFee: "",
      plannedExpenseId: "",
    },
  })

  const onSubmit = async (data: TransactionFormData) => {
    setIsLoading(true)
    
    try {
      let response
      
      if (data.type === TransactionType.TRANSFER) {
        // Use transfers API for transfer transactions
        response = await fetch("/api/transfers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: parseFloat(data.amount),
            fromWalletId: data.walletId,
            toWalletId: data.toWalletId,
            transferFee: data.transferFee ? parseFloat(data.transferFee) : 0,
            description: data.description,
            date: data.date ? fromDateTimeLocalToPhilippineTime(data.date).toISOString() : undefined,
          }),
        })
      } else {
        // Use regular transactions API for income/expense
        response = await fetch("/api/transactions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
                      body: JSON.stringify({
              ...data,
              amount: parseFloat(data.amount),
              date: data.date ? fromDateTimeLocalToPhilippineTime(data.date).toISOString() : undefined,
              plannedExpenseId: data.plannedExpenseId || undefined,
            }),
        })
      }

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create transaction")
      }

      // Show success message based on transaction type
      const transactionTypeNames = {
        [TransactionType.INCOME]: 'Income',
        [TransactionType.EXPENSE]: 'Expense',
        [TransactionType.TRANSFER]: 'Transfer'
      }
      
      const typeName = transactionTypeNames[data.type]
      toast.success(`${typeName} transaction has been added successfully!`)

      form.reset()
      setSelectedFromWallet(null)
      setSelectedToWallet(null)
      setSuggestedFee(0)
      setSelectedPlannedExpense(null)
      setAvailablePlannedExpenses([])
      onOpenChange(false)
      onSuccess()
      invalidateInsightsCache() // Trigger insights cache invalidation
    } catch (error) {
      console.error("Error creating transaction:", error)
      toast.error("Failed to create transaction. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Watch form values for transfer logic
  const watchedAmount = form.watch("amount")
  const watchedTransferFee = form.watch("transferFee")
  const watchedType = form.watch("type")
  const watchedWalletId = form.watch("walletId")
  const watchedToWalletId = form.watch("toWalletId")


  // Calculate total deduction for transfers
  const totalDeduction = (parseFloat(watchedAmount || "0") + parseFloat(watchedTransferFee || "0"))
  const hasInsufficientFunds = Boolean(selectedFromWallet && totalDeduction > selectedFromWallet.balance)

  // Check planned expense budget validation
  const plannedExpenseAmount = parseFloat(watchedAmount || "0")
  const hasPlannedExpenseOverspend = Boolean(
    selectedPlannedExpense && 
    watchedType === TransactionType.EXPENSE &&
    plannedExpenseAmount > selectedPlannedExpense.remainingAmount
  )

  // Update suggested fee when wallets change
  useEffect(() => {
    if (selectedFromWallet && selectedToWallet && watchedType === TransactionType.TRANSFER) {
      const suggested = getTransferFeePresets(selectedFromWallet.type, selectedToWallet.type)
      setSuggestedFee(suggested)
      if (suggested > 0 && !form.watch("transferFee")) {
        form.setValue("transferFee", suggested.toString())
      }
    }
  }, [selectedFromWallet, selectedToWallet, watchedType, form])

  // Update wallet objects when form values change
  useEffect(() => {
    if (watchedWalletId) {
      const wallet = wallets.find(w => w.id === watchedWalletId)
      setSelectedFromWallet(wallet || null)
    }
    if (watchedToWalletId) {
      const wallet = wallets.find(w => w.id === watchedToWalletId)
      setSelectedToWallet(wallet || null)
    }
  }, [watchedWalletId, watchedToWalletId, wallets])

  // Fetch planned expenses when form opens and type is EXPENSE
  useEffect(() => {
    if (open && selectedType === TransactionType.EXPENSE) {
      fetchAvailablePlannedExpenses()
    }
  }, [open, selectedType])

  // Update categories when transaction type changes and handle affordability check visibility
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "type" && value.type) {
        setSelectedType(value.type as TransactionType)
        form.setValue("category", "") // Reset category when type changes
        form.setValue("toWalletId", "") // Reset transfer fields when type changes
        form.setValue("transferFee", "")
        form.setValue("plannedExpenseId", "") // Reset planned expense when type changes
        setSelectedPlannedExpense(null)
        setShowAffordabilityCheck(value.type === TransactionType.EXPENSE)
        
        // Fetch planned expenses for expense transactions
        if (value.type === TransactionType.EXPENSE) {
          fetchAvailablePlannedExpenses()
        } else {
          setAvailablePlannedExpenses([])
        }
      }
      
      // Show affordability check for expenses when amount or wallet changes
      if ((name === "amount" || name === "walletId") && value.type === TransactionType.EXPENSE) {
        const amount = parseFloat(value.amount || "0")
        setShowAffordabilityCheck(amount > 0)
      }
      
      // Update planned expense selection when plannedExpenseId changes
      if (name === "plannedExpenseId" && value.plannedExpenseId) {
        const plannedExpense = availablePlannedExpenses.find(pe => pe.id === value.plannedExpenseId)
        setSelectedPlannedExpense(plannedExpense || null)
      }
    })
    return () => subscription.unsubscribe()
  }, [form, availablePlannedExpenses])

  const handleWalletSuggestion = (suggestedWalletId: string) => {
    form.setValue("walletId", suggestedWalletId)
  }

  const applySuggestedFee = () => {
    form.setValue("transferFee", suggestedFee.toString())
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
                  <FormLabel>
                    {selectedType === TransactionType.TRANSFER ? "From Wallet" : "Wallet"}
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={
                          selectedType === TransactionType.TRANSFER ? "Select source wallet" : "Select wallet"
                        } />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {wallets.map((wallet) => (
                        <SelectItem key={wallet.id} value={wallet.id}>
                          <div className="flex justify-between items-center w-full">
                            <span>{wallet.name}</span>
                            {selectedType === TransactionType.TRANSFER && (
                              <Badge variant="outline" className="ml-2">
                                ₱{wallet.balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Transfer-specific fields */}
            {selectedType === TransactionType.TRANSFER && (
              <>
                <FormField
                  control={form.control}
                  name="toWalletId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To Wallet</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select destination wallet" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {wallets
                            .filter(wallet => wallet.id !== form.watch("walletId"))
                            .map((wallet) => (
                              <SelectItem key={wallet.id} value={wallet.id}>
                                <div className="flex justify-between items-center w-full">
                                  <span>{wallet.name}</span>
                                  <Badge variant="outline" className="ml-2">
                                    ₱{wallet.balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Transfer Preview */}
                {selectedFromWallet && selectedToWallet && (
                  <div className="bg-muted/50 rounded-lg p-4 border">
                    <div className="flex items-center justify-between">
                      <div className="text-center">
                        <div className="font-medium">{selectedFromWallet.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Balance: ₱{selectedFromWallet.balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <ArrowRight className="h-6 w-6 text-muted-foreground" />
                      <div className="text-center">
                        <div className="font-medium">{selectedToWallet.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Balance: ₱{selectedToWallet.balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="transferFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Transfer Fee (PHP)
                        {suggestedFee > 0 && (
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="ml-2 h-auto p-0 text-xs"
                            onClick={applySuggestedFee}
                          >
                            Suggested: ₱{suggestedFee.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </Button>
                        )}
                      </FormLabel>
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

                {/* Balance Check for Transfers */}
                {selectedFromWallet && totalDeduction > 0 && (
                  <div className={`flex items-center gap-2 p-3 rounded-lg ${
                    hasInsufficientFunds 
                      ? 'bg-red-50 text-red-700 border border-red-200' 
                      : 'bg-green-50 text-green-700 border border-green-200'
                  }`}>
                    {hasInsufficientFunds ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    <div className="text-sm">
                      <div>
                        Total deduction: ₱{totalDeduction.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </div>
                      <div>
                        Remaining balance: ₱{(selectedFromWallet.balance - totalDeduction).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            
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
            
            {/* Planned Expense Selection for Expenses */}
            {selectedType === TransactionType.EXPENSE && availablePlannedExpenses.length > 0 && (
              <FormField
                control={form.control}
                name="plannedExpenseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Link to Planned Expense (Optional)
                      </div>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a planned expense to deduct from" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="No planned expense">
                          <span className="text-muted-foreground">No planned expense</span>
                        </SelectItem>
                        {availablePlannedExpenses.map((expense) => (
                          <SelectItem key={expense.id} value={expense.id}>
                            <div className="flex justify-between items-center w-full">
                              <div className="flex flex-col items-start">
                                <span className="font-medium">{expense.title}</span>
                                <span className="text-xs text-muted-foreground">
                                  {expense.category} • {new Date(expense.targetDate).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="ml-4 flex flex-col items-end">
                                <Badge variant="outline" className="mb-1">
                                  ₱{expense.remainingAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} left
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  of ₱{expense.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Planned Expense Info */}
            {selectedPlannedExpense && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Target className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900">{selectedPlannedExpense.title}</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Remaining budget: ₱{selectedPlannedExpense.remainingAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </p>
                    <div className="mt-2 bg-blue-100 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.min(100, (selectedPlannedExpense.spentAmount / selectedPlannedExpense.amount) * 100)}%` 
                        }}
                      />
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      ₱{selectedPlannedExpense.spentAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} of ₱{selectedPlannedExpense.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} spent
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Planned Expense Budget Warning */}
            {hasPlannedExpenseOverspend && selectedPlannedExpense && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
                <AlertCircle className="h-4 w-4" />
                <div className="text-sm">
                  <div className="font-medium">Amount exceeds remaining budget</div>
                  <div>
                    You&apos;re trying to spend ₱{plannedExpenseAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} 
                    but only ₱{selectedPlannedExpense.remainingAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} is available.
                  </div>
                </div>
              </div>
            )}
            
            {/* Affordability Check for Expenses */}
            {showAffordabilityCheck && selectedType === TransactionType.EXPENSE && (
              <div className="pt-2">
                <AffordabilityCheck
                  amount={parseFloat(form.watch("amount") || "0")}
                  walletId={form.watch("walletId")}
                  category={form.watch("category")}
                  description={form.watch("description")}
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
              <Button 
                type="submit" 
                disabled={
                  isLoading || 
                  (selectedType === TransactionType.TRANSFER && hasInsufficientFunds) ||
                  hasPlannedExpenseOverspend
                }
              >
                {isLoading ? "Adding..." : 
                 selectedType === TransactionType.TRANSFER ? "Transfer Money" : "Add Transaction"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}