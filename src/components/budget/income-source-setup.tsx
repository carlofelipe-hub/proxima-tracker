"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { PayFrequency } from "@prisma/client"
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
import { addDaysInPhilippineTime, getNowInPhilippineTime } from "@/lib/timezone"
import { formatCurrency } from "@/lib/currency"
import { toast } from "sonner"

const incomeSourceSchema = z.object({
  name: z.string().min(1, "Income source name is required"),
  amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be a positive number"
  }),
  frequency: z.nativeEnum(PayFrequency),
  nextPayDate: z.string().min(1, "Next pay date is required"),
  walletId: z.string().optional(),
})

type IncomeSourceFormData = z.infer<typeof incomeSourceSchema>

interface IncomeSource {
  id: string
  name: string
  amount: number
  frequency: string
  nextPayDate: string
  lastPayDate?: string
  isActive: boolean
  wallet?: {
    id: string
    name: string
    type: string
  }
}

interface IncomeSourceSetupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  wallets?: Array<{
    id: string
    name: string
    type: string
  }>
  editingIncome?: IncomeSource | null
}

const frequencyLabels = {
  [PayFrequency.WEEKLY]: "Weekly",
  [PayFrequency.BIWEEKLY]: "Bi-weekly (Every 2 weeks)",
  [PayFrequency.MONTHLY]: "Monthly",
  [PayFrequency.BIMONTHLY]: "Bi-monthly (Every 2 months)",
  [PayFrequency.QUARTERLY]: "Quarterly",
  [PayFrequency.ANNUALLY]: "Annually",
  [PayFrequency.IRREGULAR]: "Irregular",
}

export function IncomeSourceSetup({ 
  open, 
  onOpenChange, 
  onSuccess,
  wallets = [],
  editingIncome = null
}: IncomeSourceSetupProps) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<IncomeSourceFormData>({
    resolver: zodResolver(incomeSourceSchema),
    defaultValues: {
      name: editingIncome?.name || "",
      amount: editingIncome?.amount?.toString() || "",
      frequency: (editingIncome?.frequency as PayFrequency) || PayFrequency.MONTHLY,
      nextPayDate: editingIncome?.nextPayDate ? editingIncome.nextPayDate.slice(0, 10) : "",
      walletId: editingIncome?.wallet?.id || "none",
    },
  })

  useEffect(() => {
    if (editingIncome) {
      form.reset({
        name: editingIncome.name,
        amount: editingIncome.amount.toString(),
        frequency: editingIncome.frequency as PayFrequency,
        nextPayDate: editingIncome.nextPayDate.slice(0, 10),
        walletId: editingIncome.wallet?.id || "none",
      })
    } else {
      form.reset({
        name: "",
        amount: "",
        frequency: PayFrequency.MONTHLY,
        nextPayDate: "",
        walletId: "none",
      })
    }
  }, [editingIncome, form])

  const onSubmit = async (data: IncomeSourceFormData) => {
    setIsLoading(true)
    
    try {
      const isEditing = !!editingIncome
      const url = isEditing ? `/api/income-sources/${editingIncome.id}` : "/api/income-sources"
      const method = isEditing ? "PUT" : "POST"
      
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          amount: parseFloat(data.amount),
          walletId: data.walletId === "none" ? undefined : data.walletId || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to ${isEditing ? 'update' : 'create'} income source`)
      }

      toast.success(`"${data.name}" income source has been ${isEditing ? 'updated' : 'created'} successfully!`)
      form.reset()
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error(`Error ${editingIncome ? 'updating' : 'creating'} income source:`, error)
      toast.error(`Failed to ${editingIncome ? 'update' : 'create'} income source. Please try again.`)
    } finally {
      setIsLoading(false)
    }
  }

  // Helper to set quick next pay dates
  const setQuickPayDate = (days: number) => {
    const now = getNowInPhilippineTime()
    const nextPay = addDaysInPhilippineTime(now, days)
    form.setValue("nextPayDate", nextPay.toISOString().slice(0, 10))
  }

  const watchedAmount = form.watch("amount")
  const watchedFrequency = form.watch("frequency")

  // Calculate estimated monthly income
  const calculateMonthlyEstimate = () => {
    const amount = parseFloat(watchedAmount || "0")
    if (isNaN(amount) || amount <= 0) return 0

    switch (watchedFrequency) {
      case PayFrequency.WEEKLY:
        return amount * 4.33 // Average weeks per month
      case PayFrequency.BIWEEKLY:
        return amount * 2.16 // Average bi-weekly periods per month
      case PayFrequency.MONTHLY:
        return amount
      case PayFrequency.BIMONTHLY:
        return amount / 2
      case PayFrequency.QUARTERLY:
        return amount / 3
      case PayFrequency.ANNUALLY:
        return amount / 12
      default:
        return 0
    }
  }

  const monthlyEstimate = calculateMonthlyEstimate()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editingIncome ? 'Edit Income Source' : 'Add Income Source'}</DialogTitle>
          <DialogDescription>
            Track your income and payroll cycles for better budget planning and affordability checking.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Income Source Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Main Job, Freelance, Side Hustle" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
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
              
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(frequencyLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="nextPayDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Next Pay Date</FormLabel>
                  <FormControl>
                    <Input 
                      type="date"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quick pay date buttons */}
            <div className="flex gap-2 flex-wrap">
              <span className="text-sm text-gray-600 mr-2">Quick set:</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickPayDate(7)}
              >
                1 Week
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickPayDate(14)}
              >
                2 Weeks
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickPayDate(30)}
              >
                1 Month
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickPayDate(49)} // Oct 3 scenario
              >
                Oct 3 (49 days)
              </Button>
            </div>

            {wallets.length > 0 && (
              <FormField
                control={form.control}
                name="walletId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deposit to Wallet (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select wallet (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No specific wallet</SelectItem>
                        {wallets.map((wallet) => (
                          <SelectItem key={wallet.id} value={wallet.id}>
                            {wallet.name} ({wallet.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Monthly Estimate */}
            {monthlyEstimate > 0 && (
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-sm font-medium text-green-800">
                  Estimated Monthly Income: {formatCurrency(monthlyEstimate)}
                </div>
                <div className="text-xs text-green-600">
                  Based on your {frequencyLabels[watchedFrequency].toLowerCase()} income
                </div>
              </div>
            )}
            
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
                {isLoading 
                  ? (editingIncome ? "Updating..." : "Adding...") 
                  : (editingIncome ? "Update Income Source" : "Add Income Source")
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}