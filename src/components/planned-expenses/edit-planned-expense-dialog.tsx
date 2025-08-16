"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Edit2, Target } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getPhilippineDateForInput, fromDateInputToPhilippineTime, toPhilippineDate } from "@/lib/timezone"
import { invalidateInsightsCache } from "@/lib/cached-insights"
import { toast } from "sonner"

const editExpenseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be a positive number"
  }),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  targetDate: z.string().min(1, "Target date is required"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  walletId: z.string().optional(),
})

type EditExpenseFormData = z.infer<typeof editExpenseSchema>

interface PlannedExpense {
  id: string
  title: string
  amount: number
  category: string
  description?: string
  targetDate: string
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  confidenceLevel: "HIGH" | "MEDIUM" | "LOW"
  status: "PLANNED" | "SAVED" | "COMPLETED" | "CANCELLED" | "POSTPONED"
  wallet?: {
    id: string
    name: string
    type: string
  }
  createdAt: string
  updatedAt: string
  lastConfidenceUpdate?: string
}

interface EditPlannedExpenseDialogProps {
  expense: PlannedExpense
  wallets: Array<{
    id: string
    name: string
    type: string
  }>
  onExpenseUpdated: () => void
}

const expenseCategories = [
  "Emergency Fund",
  "Investment",
  "Travel",
  "Electronics",
  "Home Improvement",
  "Education",
  "Healthcare",
  "Vehicle",
  "Wedding",
  "Business",
  "Luxury",
  "Other",
]

const priorityOptions = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
]

export function EditPlannedExpenseDialog({ expense, wallets, onExpenseUpdated }: EditPlannedExpenseDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const getConfidenceBadge = (confidence: PlannedExpense['confidenceLevel']) => {
    switch (confidence) {
      case 'HIGH':
        return <Badge className="bg-green-100 text-green-800">High Confidence</Badge>
      case 'MEDIUM':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium Confidence</Badge>
      case 'LOW':
        return <Badge variant="destructive">Low Confidence</Badge>
      default:
        return null
    }
  }

  const form = useForm<EditExpenseFormData>({
    resolver: zodResolver(editExpenseSchema),
    defaultValues: {
      title: "",
      amount: "",
      category: "",
      description: "",
      targetDate: "",
      priority: "MEDIUM",
      walletId: "none",
    },
  })

  // Reset form when expense changes or dialog opens
  useEffect(() => {
    if (open) {
      const targetDate = toPhilippineDate(expense.targetDate)
      const dateString = targetDate.toISOString().split('T')[0] // Format as YYYY-MM-DD for input
      
      form.reset({
        title: expense.title,
        amount: expense.amount.toString(),
        category: expense.category,
        description: expense.description || "",
        targetDate: dateString,
        priority: expense.priority,
        walletId: expense.wallet?.id || "none",
      })
    }
  }, [open, expense, form])

  const onSubmit = async (data: EditExpenseFormData) => {
    setIsLoading(true)
    try {
      const targetDate = fromDateInputToPhilippineTime(data.targetDate)
      
      const response = await fetch("/api/planned-expenses", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: expense.id,
          title: data.title,
          amount: parseFloat(data.amount),
          category: data.category,
          description: data.description,
          targetDate: targetDate.toISOString(),
          priority: data.priority,
          walletId: data.walletId === "none" ? null : data.walletId,
        }),
      })

      if (response.ok) {
        toast.success(`"${data.title}" has been updated successfully!`)
        setOpen(false)
        onExpenseUpdated()
        invalidateInsightsCache() // Trigger insights cache invalidation
      } else {
        const error = await response.json()
        console.error("Error updating expense:", error)
        toast.error("Failed to update planned expense. Please try again.")
      }
    } catch (error) {
      console.error("Error updating planned expense:", error)
      toast.error("Failed to update planned expense. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Edit2 className="h-3 w-3 mr-1" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Edit Planned Expense
          </DialogTitle>
          <DialogDescription>
            Update the details of your planned expense.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter expense title"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        placeholder="Enter amount"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="targetDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date"
                        min={getPhilippineDateForInput()}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        {expenseCategories.map((category) => (
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

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {priorityOptions.map((priority) => (
                          <SelectItem key={priority.value} value={priority.value}>
                            {priority.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Read-only Confidence Level Display */}
            <div>
              <FormLabel>Confidence Level (Auto-calculated)</FormLabel>
              <div className="mt-2">
                {getConfidenceBadge(expense.confidenceLevel)}
                <p className="text-xs text-muted-foreground mt-1">
                  This is automatically calculated based on your current budget and expenses.
                  {expense.lastConfidenceUpdate && (
                    <> Last updated: {new Date(expense.lastConfidenceUpdate).toLocaleDateString()}</>
                  )}
                </p>
              </div>
            </div>

            <FormField
              control={form.control}
              name="walletId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Wallet (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select wallet or leave empty" />
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

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter expense description"
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Updating..." : "Update Expense"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
