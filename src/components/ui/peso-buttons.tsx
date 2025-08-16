"use client"

import { Button } from "./button"
import { Plus, Minus, ArrowRightLeft, DollarSign } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface PesoButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
  size?: "default" | "sm" | "lg"
}

// Income Button - Green gradient with peso and plus
export function IncomeButton({ children, onClick, disabled, className, size = "default" }: PesoButtonProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Button
        variant="income"
        size={size}
        onClick={onClick}
        disabled={disabled}
        className={cn("gap-2", className)}
      >
        <div className="flex items-center gap-1">
          <DollarSign className="h-4 w-4" />
          <Plus className="h-4 w-4" />
        </div>
        {children}
      </Button>
    </motion.div>
  )
}

// Expense Button - Red gradient with peso and minus
export function ExpenseButton({ children, onClick, disabled, className, size = "default" }: PesoButtonProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Button
        variant="expense"
        size={size}
        onClick={onClick}
        disabled={disabled}
        className={cn("gap-2", className)}
      >
        <div className="flex items-center gap-1">
          <DollarSign className="h-4 w-4" />
          <Minus className="h-4 w-4" />
        </div>
        {children}
      </Button>
    </motion.div>
  )
}

// Transfer Button - Blue gradient with peso and arrows
export function TransferButton({ children, onClick, disabled, className, size = "default" }: PesoButtonProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Button
        variant="transfer"
        size={size}
        onClick={onClick}
        disabled={disabled}
        className={cn("gap-2", className)}
      >
        <div className="flex items-center gap-1">
          <DollarSign className="h-4 w-4" />
          <ArrowRightLeft className="h-4 w-4" />
        </div>
        {children}
      </Button>
    </motion.div>
  )
}

// Generic Peso Button - Primary blue gradient with peso
export function PesoButton({ children, onClick, disabled, className, size = "default" }: PesoButtonProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Button
        variant="peso"
        size={size}
        onClick={onClick}
        disabled={disabled}
        className={cn("gap-2", className)}
      >
        <DollarSign className="h-4 w-4" />
        {children}
      </Button>
    </motion.div>
  )
}

// Floating Action Button for quick actions
interface FloatingActionButtonProps {
  onClick?: () => void
  icon?: React.ReactNode
  variant?: "default" | "income" | "expense" | "transfer"
  className?: string
}

export function FloatingActionButton({ 
  onClick, 
  icon = <Plus className="h-6 w-6" />, 
  variant = "default",
  className 
}: FloatingActionButtonProps) {
  const variantStyles = {
    default: "from-[#007DFE] to-[#0066CC]",
    income: "from-[#00D2FF] to-[#00B8E6]", 
    expense: "from-[#FF6B6B] to-[#FF5252]",
    transfer: "from-[#007DFE] to-[#0066CC]"
  }

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        `w-14 h-14 rounded-full shadow-lg hover:shadow-xl
        flex items-center justify-center text-white font-bold
        transition-all duration-300 bg-gradient-to-br`,
        variantStyles[variant],
        className
      )}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {icon}
    </motion.button>
  )
}

// Quick Action Pill - For expandable action menu
interface QuickActionPillProps {
  label: string
  icon: React.ReactNode
  onClick?: () => void
  variant?: "income" | "expense" | "transfer"
  delay?: number
}

export function QuickActionPill({ 
  label, 
  icon, 
  onClick, 
  variant = "income",
  delay = 0 
}: QuickActionPillProps) {
  const variantStyles = {
    income: "from-[#00D2FF] to-[#00B8E6]",
    expense: "from-[#FF6B6B] to-[#FF5252]", 
    transfer: "from-[#007DFE] to-[#0066CC]"
  }

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        `flex items-center gap-3 px-4 py-3 rounded-full
        bg-gradient-to-r text-white shadow-lg hover:shadow-xl 
        transition-all duration-200 font-medium text-sm`,
        variantStyles[variant]
      )}
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      transition={{ delay, duration: 0.3 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {icon}
      <span>{label}</span>
    </motion.button>
  )
}