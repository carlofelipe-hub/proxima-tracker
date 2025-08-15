"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
import { ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react"
import { formatCurrency } from "@/lib/currency"
import { getPhilippineTimeForInput, fromDateTimeLocalToPhilippineTime } from "@/lib/timezone"

const transferSchema = z.object({
  amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be a positive number"
  }),
  fromWalletId: z.string().min(1, "Source wallet is required"),
  toWalletId: z.string().min(1, "Destination wallet is required"),
  transferFee: z.string().optional().refine(val => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), {
    message: "Transfer fee must be a non-negative number"
  }),
  description: z.string().optional(),
  date: z.string().optional(),
}).refine((data) => data.fromWalletId !== data.toWalletId, {
  message: "Source and destination wallets must be different",
  path: ["toWalletId"],
})

type TransferFormData = z.infer<typeof transferSchema>

interface TransferFormProps {
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

export function TransferForm({ 
  open, 
  onOpenChange, 
  onSuccess, 
  wallets 
}: TransferFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFromWallet, setSelectedFromWallet] = useState<typeof wallets[0] | null>(null)
  const [selectedToWallet, setSelectedToWallet] = useState<typeof wallets[0] | null>(null)
  const [suggestedFee, setSuggestedFee] = useState<number>(0)

  const form = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      amount: "",
      fromWalletId: "",
      toWalletId: "",
      transferFee: "",
      description: "",
      date: getPhilippineTimeForInput(), // YYYY-MM-DDTHH:MM format in Philippine time
    },
  })

  const watchedAmount = form.watch("amount")
  const watchedTransferFee = form.watch("transferFee")

  // Calculate total deduction from source wallet
  const totalDeduction = (parseFloat(watchedAmount || "0") + parseFloat(watchedTransferFee || "0"))
  const hasInsufficientFunds = Boolean(selectedFromWallet && totalDeduction > selectedFromWallet.balance)

  // Update suggested fee when wallets change
  useEffect(() => {
    if (selectedFromWallet && selectedToWallet) {
      const suggested = getTransferFeePresets(selectedFromWallet.type, selectedToWallet.type)
      setSuggestedFee(suggested)
      if (suggested > 0 && !form.watch("transferFee")) {
        form.setValue("transferFee", suggested.toString())
      }
    }
  }, [selectedFromWallet, selectedToWallet, form])

  // Update wallet objects when form values change
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "fromWalletId" && value.fromWalletId) {
        const wallet = wallets.find(w => w.id === value.fromWalletId)
        setSelectedFromWallet(wallet || null)
      }
      if (name === "toWalletId" && value.toWalletId) {
        const wallet = wallets.find(w => w.id === value.toWalletId)
        setSelectedToWallet(wallet || null)
      }
    })
    return () => subscription.unsubscribe()
  }, [form, wallets])

  const onSubmit = async (data: TransferFormData) => {
    setIsLoading(true)
    
    try {
      const response = await fetch("/api/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          amount: parseFloat(data.amount),
          transferFee: data.transferFee ? parseFloat(data.transferFee) : 0,
          date: data.date ? fromDateTimeLocalToPhilippineTime(data.date).toISOString() : undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create transfer")
      }

      form.reset()
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error("Error creating transfer:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const applySuggestedFee = () => {
    form.setValue("transferFee", suggestedFee.toString())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Transfer Between Wallets</DialogTitle>
          <DialogDescription>
            Move money from one wallet to another with optional transfer fees.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Wallet Selection Row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fromWalletId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From Wallet</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source wallet" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {wallets.map((wallet) => (
                          <SelectItem key={wallet.id} value={wallet.id}>
                            <div className="flex justify-between items-center w-full">
                              <span>{wallet.name}</span>
                              <Badge variant="outline" className="ml-2">
                                {formatCurrency(wallet.balance)}
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
                          .filter(wallet => wallet.id !== form.watch("fromWalletId"))
                          .map((wallet) => (
                            <SelectItem key={wallet.id} value={wallet.id}>
                              <div className="flex justify-between items-center w-full">
                                <span>{wallet.name}</span>
                                <Badge variant="outline" className="ml-2">
                                  {formatCurrency(wallet.balance)}
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
            </div>

            {/* Transfer Preview */}
            {selectedFromWallet && selectedToWallet && (
              <div className="bg-muted/50 rounded-lg p-4 border">
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <div className="font-medium">{selectedFromWallet.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Balance: {formatCurrency(selectedFromWallet.balance)}
                    </div>
                  </div>
                  <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  <div className="text-center">
                    <div className="font-medium">{selectedToWallet.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Balance: {formatCurrency(selectedToWallet.balance)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Amount and Fee */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transfer Amount (PHP)</FormLabel>
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
                          Suggested: {formatCurrency(suggestedFee)}
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
            </div>

            {/* Balance Check */}
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
                    Total deduction: {formatCurrency(totalDeduction)}
                  </div>
                  <div>
                    Remaining balance: {formatCurrency(selectedFromWallet.balance - totalDeduction)}
                  </div>
                </div>
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
                      placeholder="Add any notes about this transfer..."
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
                disabled={isLoading || hasInsufficientFunds}
              >
                {isLoading ? "Transferring..." : "Transfer Money"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
