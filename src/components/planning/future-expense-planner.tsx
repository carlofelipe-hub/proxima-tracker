"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CalendarDays, TrendingUp, AlertTriangle, CheckCircle, Target, Clock } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/currency"
import { getPhilippineDateForInput, formatPhilippineDate, fromDateInputToPhilippineTime } from "@/lib/timezone"
import { toast } from "sonner"

const futureExpenseSchema = z.object({
  amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be a positive number"
  }),
  targetDate: z.string().min(1, "Target date is required"),
  category: z.string().optional(),
  description: z.string().optional(),
  walletId: z.string().optional(),
})

type FutureExpenseFormData = z.infer<typeof futureExpenseSchema>

interface FutureAffordabilityResult {
  totalProjectedIncome: number
  incomeBreakdown: Array<{
    source: string
    amount: number
    date: string
    type: 'salary' | 'freelance' | 'business' | 'other'
  }>
  projectedBalance: number
  canAfford: boolean
  confidenceLevel: 'high' | 'medium' | 'low'
  riskFactors: string[]
  recommendations: string[]
  currentBalance: number
  targetAmount: number
  targetDate: string
  daysUntilTarget: number
  projectedExpenses: number
  balanceBreakdown?: {
    currentBalance: number
    projectedIncome: number
    grossProjectedBalance: number
    projectedExpenses: number
    futureCommitments: number
    futureCommitmentsWeight: number
    netProjectedBalance: number
    availableForExpense: number
  }
  incomeSourcesFound?: number
  incomeSourceDetails?: Array<{
    name: string
    amount: number
    frequency: string
    nextPayDate: string
    isActive: boolean
  }>
  expenseBreakdown?: {
    routineExpenses: number
    upcomingPlannedExpenses: number
    laterPlannedExpenses: number
    totalPlannedExpenses: number
    upcomingPlannedExpenseDetails: Array<{
      title: string
      amount: number
      targetDate: string
      category: string
      priority: string
    }>
    laterPlannedExpenseDetails: Array<{
      title: string
      amount: number
      targetDate: string
      category: string
      priority: string
    }>
  }
  walletBreakdown: Array<{
    id: string
    name: string
    currentBalance: number
    type: string
  }>
}

interface FutureExpensePlannerProps {
  wallets: Array<{
    id: string
    name: string
    type: string
  }>
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

export function FutureExpensePlanner({ wallets }: FutureExpensePlannerProps) {
  const [result, setResult] = useState<FutureAffordabilityResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<FutureExpenseFormData>({
    resolver: zodResolver(futureExpenseSchema),
    defaultValues: {
      amount: "",
      targetDate: "",
      category: "",
      description: "",
      walletId: "",
    },
  })

  const onSubmit = async (data: FutureExpenseFormData) => {
    setIsLoading(true)
    setResult(null) // Clear previous results
    
    try {
      const targetDate = fromDateInputToPhilippineTime(data.targetDate)
      
      const requestBody = {
        amount: parseFloat(data.amount),
        targetDate: targetDate.toISOString(),
        category: data.category,
        description: data.description,
        walletId: data.walletId,
      }
      
      const response = await fetch("/api/affordability/future", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        const resultData = await response.json()
        setResult(resultData)
      } else {
        const responseText = await response.text()
        
        try {
          const error = JSON.parse(responseText)
          console.error("API Error:", error)
          // You could show this error to the user here if needed
        } catch {
          console.error("Server Error:", responseText)
        }
      }
    } catch (error) {
      console.error("Network or other error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return <Badge className="bg-green-100 text-green-800">High Confidence</Badge>
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium Confidence</Badge>
      case 'low':
        return <Badge variant="destructive">Low Confidence</Badge>
      default:
        return null
    }
  }

  const getAffordabilityIcon = () => {
    if (!result) return null
    
    return result.canAfford ? (
      <CheckCircle className="h-5 w-5 text-green-600" />
    ) : (
      <AlertTriangle className="h-5 w-5 text-red-600" />
    )
  }

  const saveAsPlannedExpense = async () => {
    if (!result) return

    setIsSaving(true)
    try {
      const formData = form.getValues()
      const response = await fetch("/api/planned-expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.description || `${formData.category || 'Expense'} - ${formatCurrency(result.targetAmount)}`,
          amount: result.targetAmount,
          category: formData.category || "Other",
          description: formData.description,
          targetDate: result.targetDate,
          walletId: formData.walletId,
          priority: result.canAfford ? "MEDIUM" : "HIGH",
        }),
      })

      if (response.ok) {
        const expenseTitle = formData.description || `${formData.category || 'Expense'} - ${formatCurrency(result.targetAmount)}`
        toast.success(`"${expenseTitle}" has been saved to your planned expenses!`)
      } else {
        toast.error("Failed to save planned expense. Please try again.")
      }
    } catch (error) {
      console.error("Error saving planned expense:", error)
      toast.error("Failed to save planned expense. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Future Expense Planner
          </CardTitle>
          <CardDescription>
            Plan ahead and check if you&apos;ll be able to afford future expenses based on your expected income.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Amount (PHP)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0"
                          placeholder="Enter amount you want to spend"
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
                      <FormLabel>Category (Optional)</FormLabel>
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
                  name="walletId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Wallet (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Any wallet" />
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
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="What are you planning to buy or spend on?"
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? "Analyzing..." : "Check Future Affordability"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Main Result */}
          <Alert variant={result.canAfford ? "default" : "destructive"}>
            <div className="flex items-start gap-3">
              {getAffordabilityIcon()}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">
                    {result.canAfford ? "You can afford this!" : "This may be challenging to afford"}
                  </span>
                  {getConfidenceBadge(result.confidenceLevel)}
                </div>
                <AlertDescription>
                  By {formatPhilippineDate(result.targetDate)}, you&apos;ll have an estimated{" "}
                  <strong>{formatCurrency(result.projectedBalance)}</strong> available for this{" "}
                  <strong>{formatCurrency(result.targetAmount)}</strong> expense.
                </AlertDescription>
              </div>
              <div className="flex-shrink-0">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={saveAsPlannedExpense}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save as Planned"}
                </Button>
              </div>
            </div>
          </Alert>

          {/* Timeline Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-4 w-4" />
                Timeline Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{result.daysUntilTarget}</div>
                  <div className="text-sm text-gray-600">Days Until Target</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatCurrency(result.currentBalance)}</div>
                  <div className="text-sm text-gray-600">Current Balance</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(result.totalProjectedIncome)}</div>
                  <div className="text-sm text-gray-600">Expected Income</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(result.projectedExpenses)}</div>
                  <div className="text-sm text-gray-600">Estimated Expenses</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expense Breakdown */}
          {result.expenseBreakdown && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="h-4 w-4" />
                  Expense Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-lg font-bold text-orange-600">
                        {formatCurrency(result.expenseBreakdown.routineExpenses)}
                      </div>
                      <div className="text-sm text-gray-600">Routine Expenses</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-lg font-bold text-purple-600">
                        {formatCurrency(result.expenseBreakdown.totalPlannedExpenses)}
                      </div>
                      <div className="text-sm text-gray-600">Planned Expenses</div>
                    </div>
                  </div>
                  
                  {(result.expenseBreakdown.upcomingPlannedExpenseDetails.length > 0 || result.expenseBreakdown.laterPlannedExpenseDetails.length > 0) && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Your Planned Expenses:</h4>
                      <div className="space-y-2">
                        {/* Upcoming planned expenses */}
                        {result.expenseBreakdown.upcomingPlannedExpenseDetails.map((expense, index) => (
                          <div key={`upcoming-${index}`} className="flex justify-between items-center p-2 bg-purple-50 rounded">
                            <div>
                              <div className="font-medium text-sm">{expense.title}</div>
                              <div className="text-xs text-gray-600">
                                {formatPhilippineDate(expense.targetDate)} • {expense.category} • Upcoming
                              </div>
                            </div>
                            <div className="text-purple-600 font-medium">
                              {formatCurrency(expense.amount)}
                            </div>
                          </div>
                        ))}
                        {/* Later planned expenses */}
                        {result.expenseBreakdown.laterPlannedExpenseDetails.map((expense, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-purple-50 rounded">
                            <div>
                              <div className="font-medium text-sm">{expense.title}</div>
                              <div className="text-xs text-gray-600">
                                {formatPhilippineDate(expense.targetDate)} • {expense.category}
                              </div>
                            </div>
                            <div className="text-purple-600 font-medium">
                              {formatCurrency(expense.amount)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Income Breakdown */}
          {result.incomeBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-4 w-4" />
                  Expected Income
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.incomeBreakdown.map((income, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <div>
                        <div className="font-medium">{income.source}</div>
                        <div className="text-sm text-gray-600">
                          {formatPhilippineDate(income.date)}
                        </div>
                      </div>
                      <div className="text-green-600 font-medium">
                        {formatCurrency(income.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Risk Factors */}
          {result.riskFactors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  Risk Factors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.riskFactors.map((risk, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-yellow-600 mt-1">⚠️</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarDays className="h-4 w-4" />
                AI Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-blue-600 mt-1">💡</span>
                    <span>{recommendation}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}