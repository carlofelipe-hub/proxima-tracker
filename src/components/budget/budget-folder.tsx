"use client"

import { motion } from "framer-motion"
import { formatCurrency } from "@/lib/currency"
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Calendar,
  FolderOpen,
  DollarSign
} from "lucide-react"

interface BudgetFolderProps {
  title: string
  amount: string | number
  target?: string | number
  category: 'income' | 'expense' | 'savings' | 'goal'
  period?: string
  progress?: number
  onClick?: () => void
  className?: string
}

const folderStyles = {
  income: {
    gradient: "from-[#E5F9FF] to-[#CCF3FF]",
    border: "border-[#00D2FF]",
    accent: "bg-[#00D2FF]",
    text: "text-[#0066CC]",
    icon: TrendingUp,
    label: "Income"
  },
  expense: {
    gradient: "from-[#FFE8E8] to-[#FFCCCC]", 
    border: "border-[#FF6B6B]",
    accent: "bg-[#FF6B6B]",
    text: "text-[#CC3333]",
    icon: TrendingDown,
    label: "Expenses"
  },
  savings: {
    gradient: "from-[#E8F9F0] to-[#CCF3DD]",
    border: "border-[#00B894]", 
    accent: "bg-[#00B894]",
    text: "text-[#007A5E]",
    icon: Target,
    label: "Savings"
  },
  goal: {
    gradient: "from-[#FFF8E5] to-[#FFF0CC]",
    border: "border-[#FAB005]",
    accent: "bg-[#FAB005]", 
    text: "text-[#B8860B]",
    icon: Target,
    label: "Goal"
  }
}

export function BudgetFolder({ 
  title, 
  amount, 
  target, 
  category, 
  period, 
  progress = 0,
  onClick,
  className = ""
}: BudgetFolderProps) {
  const style = folderStyles[category]
  const Icon = style.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative cursor-pointer ${className}`}
    >
      {/* Manila Folder Design */}
      <div className={`
        relative bg-gradient-to-br ${style.gradient}
        border-2 ${style.border} rounded-lg
        shadow-sm hover:shadow-md transition-all duration-300
        overflow-hidden
      `}>
        {/* Folder Tab */}
        <div className={`
          absolute -top-4 left-6 px-4 py-1 rounded-t-lg 
          ${style.accent} text-white text-xs font-semibold
          border-2 ${style.border} border-b-0
        `}>
          <div className="flex items-center gap-1">
            <FolderOpen className="h-3 w-3" />
            {style.label}
          </div>
        </div>

        {/* Folder Content */}
        <div className="p-6 pt-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className={`font-bold text-lg ${style.text} text-filipino`}>
                {title}
              </h3>
              {period && (
                <div className="flex items-center gap-1 mt-1">
                  <Calendar className={`h-3 w-3 ${style.text} opacity-60`} />
                  <span className={`text-xs ${style.text} opacity-60`}>
                    {period}
                  </span>
                </div>
              )}
            </div>
            <motion.div 
              className={`p-2 rounded-lg ${style.accent} bg-opacity-20`}
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ duration: 0.2 }}
            >
              <Icon className={`h-5 w-5 ${style.text}`} />
            </motion.div>
          </div>

          {/* Amount Display */}
          <div className="space-y-2">
            <div className={`money-large ${style.text} font-mono`}>
              {formatCurrency(amount)}
            </div>

            {/* Target Amount (if provided) */}
            {target && (
              <div className="flex items-center gap-2">
                <span className={`text-sm ${style.text} opacity-60`}>
                  Target:
                </span>
                <span className={`money-small ${style.text} opacity-80`}>
                  {formatCurrency(target)}
                </span>
              </div>
            )}

            {/* Progress Bar (if progress provided) */}
            {progress > 0 && (
              <div className="mt-3">
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-xs ${style.text} opacity-60`}>
                    Progress
                  </span>
                  <span className={`text-xs ${style.text} font-semibold`}>
                    {Math.round(progress)}%
                  </span>
                </div>
                <div className="w-full bg-muted/50 rounded-full h-2">
                  <motion.div
                    className={`h-2 rounded-full ${style.accent}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(progress, 100)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Decorative Elements */}
        {/* Paper Texture Lines */}
        <div className="absolute right-4 top-8 space-y-1 opacity-20">
          <div className={`w-12 h-0.5 ${style.accent}`} />
          <div className={`w-8 h-0.5 ${style.accent}`} />
          <div className={`w-10 h-0.5 ${style.accent}`} />
        </div>

        {/* Corner Fold Effect */}
        <div className="absolute top-0 right-0 w-6 h-6">
          <div className={`
            absolute top-0 right-0 w-0 h-0
            border-l-[24px] border-b-[24px]
            border-l-transparent ${style.border}
            opacity-30
          `} />
        </div>

        {/* Paper Clips (Decorative) */}
        <div className="absolute top-2 left-2">
          <div className={`
            w-3 h-6 border-2 ${style.border} rounded-t-full
            bg-transparent opacity-40
          `} />
        </div>

        {/* Amount Label on Folder */}
        <div className={`
          absolute bottom-2 right-2 px-2 py-1 
          bg-card/80 rounded text-xs font-semibold
          ${style.text} border ${style.border}
        `}>
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            {formatCurrency(amount)}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Folder Grid Component for organizing multiple folders
export function BudgetFolderGrid({ 
  children, 
  className = "" 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  return (
    <div className={`
      grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
      ${className}
    `}>
      {children}
    </div>
  )
}