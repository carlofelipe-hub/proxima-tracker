"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { RefreshCw, Lightbulb, TrendingUp, PiggyBank, MessageCircle, Sparkles, Trash2 } from "lucide-react"

interface Insights {
  summary: string
  recommendations: string[]
  spending_analysis: string
  budget_suggestions?: {
    emergency_fund: string
    monthly_savings: string
    expense_optimization: string
  }
}

interface AIInsightsProps {
  className?: string
}

export function AIInsights({ className }: AIInsightsProps) {
  const [insights, setInsights] = useState<Insights | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isCached, setIsCached] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  const fetchInsights = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/insights")
      if (response.ok) {
        const data = await response.json()
        setInsights(data.insights)
        setLastUpdated(new Date())
        setIsCached(data.cached || false)
      }
    } catch (error) {
      console.error("Error fetching insights:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const clearCache = async () => {
    setIsClearing(true)
    try {
      const response = await fetch("/api/insights", { method: "DELETE" })
      if (response.ok) {
        // Fetch fresh insights after clearing cache
        await fetchInsights()
      }
    } catch (error) {
      console.error("Error clearing cache:", error)
    } finally {
      setIsClearing(false)
    }
  }

  useEffect(() => {
    fetchInsights()
  }, [])

  return (
    <div className={className}>
      {/* Filipino AI Assistant Card */}
      <div className="bg-gradient-to-br from-[#FFE5E5] to-[#FFF8E5] rounded-3xl p-6 relative overflow-hidden border-2 border-[#FCD116]/20">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent" />
        
        {/* Mascot Header */}
        <div className="relative mb-6">
          <div className="flex items-start gap-4">
            {/* Filipino Mascot Avatar */}
            <motion.div
              className="w-16 h-16 bg-gradient-to-br from-[#007DFE] to-[#0066CC] rounded-full flex items-center justify-center text-white relative"
              animate={{ 
                y: [0, -2, 0],
                rotate: [0, 1, -1, 0]
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              {/* Cute Character Face */}
              <div className="text-2xl">🐃</div>
              {/* Sparkle Effect */}
              <motion.div
                className="absolute -top-1 -right-1 text-yellow-400"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="h-4 w-4" />
              </motion.div>
            </motion.div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-filipino">Your Financial Buddy</h3>
                {isCached && (
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                    Cached
                  </Badge>
                )}
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchInsights}
                    disabled={isLoading || isClearing}
                    className="h-8 w-8 p-0 hover:bg-white/50"
                  >
                    {isLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                  {isCached && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearCache}
                      disabled={isLoading || isClearing}
                      className="h-8 w-8 p-0 hover:bg-red-100"
                      title="Clear cache and generate fresh insights"
                    >
                      {isClearing ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-red-600" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Your friendly AI assistant for smart money tips! 💰
                {lastUpdated && (
                  <span className="block text-xs mt-1 opacity-60">
                    Last chat: {lastUpdated.toLocaleString()}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="relative">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="bg-white/60 rounded-xl p-4 animate-pulse"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </motion.div>
              ))}
            </div>
          ) : insights ? (
            <div className="space-y-4">
              {/* Chat Bubble - Summary */}
              <motion.div
                className="bg-white rounded-2xl rounded-tl-md p-4 shadow-sm border border-white/50"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-start gap-2 mb-2">
                  <MessageCircle className="h-4 w-4 text-[#007DFE] mt-0.5" />
                  <h4 className="font-semibold text-sm text-filipino">Financial Health Check</h4>
                </div>
                <p className="text-sm text-gray-800 leading-relaxed">{insights.summary}</p>
              </motion.div>

              {/* Chat Bubble - Recommendations */}
              <motion.div
                className="bg-white rounded-2xl rounded-tl-md p-4 shadow-sm border border-white/50"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <div className="flex items-start gap-2 mb-3">
                  <Lightbulb className="h-4 w-4 text-[#FAB005] mt-0.5" />
                  <h4 className="font-semibold text-sm text-filipino">My Recommendations</h4>
                </div>
                <div className="space-y-3">
                  {insights.recommendations.map((recommendation, index) => (
                    <motion.div
                      key={index}
                      className="flex items-start gap-3"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + index * 0.1 }}
                    >
                      <div className="w-6 h-6 bg-gradient-to-br from-[#007DFE] to-[#0066CC] rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {index + 1}
                      </div>
                      <p className="text-sm text-gray-800 leading-relaxed flex-1">{recommendation}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Chat Bubble - Spending Analysis */}
              <motion.div
                className="bg-white rounded-2xl rounded-tl-md p-4 shadow-sm border border-white/50"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <div className="flex items-start gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-[#00B894] mt-0.5" />
                  <h4 className="font-semibold text-sm text-filipino">Spending Pattern Analysis</h4>
                </div>
                <p className="text-sm text-gray-800 leading-relaxed">{insights.spending_analysis}</p>
              </motion.div>

              {/* Budget Suggestions Cards */}
              {insights.budget_suggestions && (
                <motion.div
                  className="space-y-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <PiggyBank className="h-4 w-4 text-[#007DFE]" />
                    <h4 className="font-semibold text-sm text-filipino">Smart Budget Tips</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <motion.div 
                      className="bg-gradient-to-r from-[#E5F9FF] to-[#CCF3FF] p-4 rounded-xl border border-[#00D2FF]/20"
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p className="text-xs font-semibold text-[#0066CC] mb-1">💰 Emergency Fund Goal</p>
                      <p className="text-sm text-[#004080] font-medium">{insights.budget_suggestions.emergency_fund}</p>
                    </motion.div>
                    
                    <motion.div 
                      className="bg-gradient-to-r from-[#E8F9F0] to-[#CCF3DD] p-4 rounded-xl border border-[#00B894]/20"
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p className="text-xs font-semibold text-[#007A5E] mb-1">🎯 Monthly Savings Target</p>
                      <p className="text-sm text-[#005A43] font-medium">{insights.budget_suggestions.monthly_savings}</p>
                    </motion.div>
                    
                    <motion.div 
                      className="bg-gradient-to-r from-[#FFF8E5] to-[#FFF0CC] p-4 rounded-xl border border-[#FAB005]/20"
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p className="text-xs font-semibold text-[#B8860B] mb-1">✨ Expense Optimization</p>
                      <p className="text-sm text-[#8B6914] font-medium">{insights.budget_suggestions.expense_optimization}</p>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </div>
          ) : (
            <motion.div
              className="text-center py-8"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white rounded-2xl p-6 border border-white/50">
                <div className="text-4xl mb-4">🤗</div>
                <h3 className="font-bold text-filipino mb-2">Let&apos;s chat about your money!</h3>
                <p className="text-gray-600 mb-4 text-sm">
                  I&apos;m here to help you understand your spending and give you personalized financial advice.
                </p>
                <Button 
                  onClick={fetchInsights} 
                  variant="peso"
                  className="gap-2"
                >
                  <MessageCircle className="h-4 w-4" />
                  Start Conversation
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}