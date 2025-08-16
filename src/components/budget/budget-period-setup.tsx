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
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/currency"
import { getPhilippineDateForInput, addDaysInPhilippineTime, getDaysBetweenInPhilippineTime, fromDateInputToPhilippineTime } from "@/lib/timezone"
import { toast } from "sonner"

const budgetPeriodSchema = z.object({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  totalIncome: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Total income must be a positive number"
  }),
})

type BudgetPeriodFormData = z.infer<typeof budgetPeriodSchema>

interface BudgetPeriod {
  id: string
  startDate: string
  endDate: string
  totalIncome: number
  plannedExpenses: number
  actualExpenses: number
  isActive: boolean
  createdAt: string
}

interface BudgetPeriodSetupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  editingBudget?: BudgetPeriod | null
}

export function BudgetPeriodSetup({ 
  open, 
  onOpenChange, 
  onSuccess,
  editingBudget = null
}: BudgetPeriodSetupProps) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<BudgetPeriodFormData>({
    resolver: zodResolver(budgetPeriodSchema),
    defaultValues: {
      startDate: editingBudget?.startDate.slice(0, 10) || getPhilippineDateForInput(),
      endDate: editingBudget?.endDate.slice(0, 10) || "",
      totalIncome: editingBudget?.totalIncome.toString() || "",
    },
  })

  useEffect(() => {
    if (editingBudget) {
      form.reset({
        startDate: editingBudget.startDate.slice(0, 10),
        endDate: editingBudget.endDate.slice(0, 10),
        totalIncome: editingBudget.totalIncome.toString(),
      })
    } else {
      form.reset({
        startDate: getPhilippineDateForInput(),
        endDate: "",
        totalIncome: "",
      })
    }
  }, [editingBudget, form])

  const onSubmit = async (data: BudgetPeriodFormData) => {
    setIsLoading(true)
    
    try {
      const isEditing = !!editingBudget
      const url = isEditing ? `/api/budget-periods/${editingBudget.id}` : "/api/budget-periods"
      const method = isEditing ? "PUT" : "POST"
      
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          totalIncome: parseFloat(data.totalIncome),
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to ${isEditing ? 'update' : 'create'} budget period`)
      }

      toast.success(`Budget period has been ${isEditing ? 'updated' : 'created'} successfully!`)
      form.reset()
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error(`Error ${editingBudget ? 'updating' : 'creating'} budget period:`, error)
      toast.error(`Failed to ${editingBudget ? 'update' : 'create'} budget period. Please try again.`)
    } finally {
      setIsLoading(false)
    }
  }

  // Helper to set quick date ranges
  const setQuickDate = (days: number) => {
    const startDate = fromDateInputToPhilippineTime(form.watch("startDate") || getPhilippineDateForInput())
    const endDate = addDaysInPhilippineTime(startDate, days)
    form.setValue("endDate", endDate.toISOString().slice(0, 10))
  }

  const watchedStartDate = form.watch("startDate")
  const watchedEndDate = form.watch("endDate")
  const watchedIncome = form.watch("totalIncome")

    // Calculate daily budget
  const calculateDailyBudget = () => {
    if (watchedStartDate && watchedEndDate && watchedIncome) {
      const income = parseFloat(watchedIncome)
      
      if (!isNaN(income) && income > 0) {
        const days = getDaysBetweenInPhilippineTime(watchedStartDate, watchedEndDate)
        if (days > 0) {
          return income / days
        }
      }
    }
    return 0
  }

  const dailyBudget = calculateDailyBudget()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editingBudget ? 'Edit Budget Period' : 'Set Up Budget Period'}</DialogTitle>
          <DialogDescription>
            Configure your budget period to enable time-based affordability checking.
            This helps you know if you can afford expenses until your next paycheck.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
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
              
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date (Next Pay)</FormLabel>
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
            </div>

            {/* Quick date buttons */}
            <div className="flex gap-2 flex-wrap">
              <span className="text-sm text-gray-600 mr-2">Quick set:</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickDate(7)}
              >
                1 Week
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickDate(14)}
              >
                2 Weeks
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickDate(30)}
              >
                1 Month
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickDate(49)} // Aug 15 to Oct 3
              >
                Oct 3 (49 days)
              </Button>
            </div>
            
            <FormField
              control={form.control}
              name="totalIncome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Income Available (PHP)</FormLabel>
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

            {/* Daily Budget Preview */}
            {dailyBudget > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-sm font-medium text-blue-800">
                  Daily Budget: {formatCurrency(dailyBudget)}
                </div>
                <div className="text-xs text-blue-600">
                  This is how much you can spend per day to make your money last until the end date.
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
                  ? (editingBudget ? "Updating..." : "Setting up...") 
                  : (editingBudget ? "Update Budget Period" : "Set Budget Period")
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}