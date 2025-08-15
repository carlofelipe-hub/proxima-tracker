"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { SidebarNav } from "@/components/navigation/sidebar-nav"
import { FutureExpensePlanner } from "@/components/planning/future-expense-planner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Target, TrendingUp, Calendar, DollarSign } from "lucide-react"

interface Wallet {
  id: string
  name: string
  type: string
}

export default function PlanningPage() {
  const { data: session, status } = useSession()
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(true)

  const fetchWallets = async () => {
    try {
      const response = await fetch("/api/wallets")
      if (response.ok) {
        const data = await response.json()
        setWallets(data)
      }
    } catch (error) {
      console.error("Failed to fetch wallets:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session) {
      fetchWallets()
    }
  }, [session])

  if (status === "loading") {
    return <div>Loading...</div>
  }

  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <>
      <SidebarNav />
      
      <div className="min-h-screen bg-background lg:ml-80">
        <main className="container mx-auto px-4 py-6 lg:py-6 pt-20 lg:pt-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Financial Planning</h1>
          <p className="text-muted-foreground">
            Plan your future expenses and check affordability with AI-powered insights
          </p>
        </div>

        {/* Planning Features Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Future Planning</CardTitle>
              <Target className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">Smart</div>
              <p className="text-xs text-muted-foreground">
                AI-powered affordability predictions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Income Projection</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Auto</div>
              <p className="text-xs text-muted-foreground">
                Based on your income sources
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Timeline Analysis</CardTitle>
              <Calendar className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">Detailed</div>
              <p className="text-xs text-muted-foreground">
                Day-by-day income tracking
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Risk Assessment</CardTitle>
              <DollarSign className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">Pro</div>
              <p className="text-xs text-muted-foreground">
                Confidence levels & risk factors
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Planning Tool */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading planning tools...</p>
          </div>
        ) : (
          <FutureExpensePlanner wallets={wallets} />
        )}

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle>How Future Planning Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                  <h4 className="font-medium">Income Projection</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  We analyze your configured income sources and their schedules to project future earnings until your target date.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                  <h4 className="font-medium">Expense Analysis</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your recent spending patterns are analyzed to estimate ongoing expenses that will impact your available budget.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                  <h4 className="font-medium">AI Recommendations</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Get personalized recommendations on saving strategies, risk factors, and optimal timing for your planned expenses.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card>
          <CardHeader>
            <CardTitle>Pro Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">💡</span>
                <span><strong>Set up income sources</strong> in your budget settings for more accurate projections</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">📈</span>
                <span><strong>Regular transactions</strong> help improve spending pattern analysis</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-1">🎯</span>
                <span><strong>Plan 2-4 weeks ahead</strong> for highest accuracy in predictions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600 mt-1">⚠️</span>
                <span><strong>Consider unexpected expenses</strong> - add a 10-20% buffer to your plans</span>
              </li>
            </ul>
          </CardContent>
        </Card>
        </main>
      </div>
    </>
  )
}