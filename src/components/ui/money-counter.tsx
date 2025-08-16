"use client"

import { motion, animate } from "framer-motion"
import { useEffect, useState } from "react"

interface MoneyCounterProps {
  amount: string | number
  label?: string
  size?: 'small' | 'medium' | 'large'
  variant?: 'retro' | 'digital' | 'neon'
  animated?: boolean
  prefix?: string
  suffix?: string
  className?: string
}

const sizeStyles = {
  small: {
    container: "p-3 text-lg",
    display: "text-lg",
    label: "text-xs"
  },
  medium: {
    container: "p-4 text-2xl", 
    display: "text-2xl",
    label: "text-sm"
  },
  large: {
    container: "p-6 text-4xl",
    display: "text-4xl", 
    label: "text-base"
  }
}

const variantStyles = {
  retro: {
    bg: "bg-gradient-to-br from-gray-900 via-gray-800 to-black",
    border: "border-gray-600 border-2",
    text: "text-green-400",
    shadow: "shadow-lg shadow-green-400/20",
    glow: "drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]",
    screen: "bg-black/80 backdrop-blur-sm border border-gray-700"
  },
  digital: {
    bg: "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900",
    border: "border-slate-600 border",
    text: "text-cyan-400",
    shadow: "shadow-lg shadow-cyan-400/20", 
    glow: "drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]",
    screen: "bg-slate-950/90 backdrop-blur-sm border border-slate-700"
  },
  neon: {
    bg: "bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900",
    border: "border-purple-500 border-2",
    text: "text-pink-400",
    shadow: "shadow-lg shadow-pink-400/30",
    glow: "drop-shadow-[0_0_12px_rgba(244,114,182,0.6)]",
    screen: "bg-purple-950/80 backdrop-blur-sm border border-purple-600"
  }
}

function useAnimatedNumber(target: number, duration: number = 1000) {
  const [current, setCurrent] = useState(0)
  
  useEffect(() => {
    const controls = animate(0, target, {
      duration: duration / 1000,
      ease: "easeOut",
      onUpdate: (value) => setCurrent(value)
    })
    
    return controls.stop
  }, [target, duration])
  
  return current
}

export function MoneyCounter({
  amount,
  label,
  size = 'medium',
  variant = 'retro', 
  animated = true,
  prefix = '₱',
  suffix = '',
  className = ''
}: MoneyCounterProps) {
  const sizeStyle = sizeStyles[size]
  const variantStyle = variantStyles[variant]
  
  // Convert amount to number for animation
  const numericAmount = typeof amount === 'string' 
    ? parseFloat(amount.replace(/[^\d.-]/g, '')) || 0
    : amount
  
  const animatedAmount = useAnimatedNumber(numericAmount, animated ? 1200 : 0)
  const displayAmount = animated ? animatedAmount : numericAmount

  // Format the animated number 
  const formatDisplayAmount = (value: number) => {
    const formatted = new Intl.NumberFormat('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Math.abs(value))
    
    const sign = value < 0 ? '-' : ''
    return `${sign}${prefix} ${formatted}${suffix}`
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`
        relative rounded-lg overflow-hidden
        ${variantStyle.bg} ${variantStyle.border} ${variantStyle.shadow}
        ${className}
      `}
    >
      {/* Screen Frame */}
      <div className={`
        ${sizeStyle.container} ${variantStyle.screen} 
        rounded-md m-2 relative overflow-hidden
      `}>
        {/* Scanlines Effect */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent bg-repeat-y animate-pulse" 
               style={{ 
                 backgroundSize: '100% 4px',
                 backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 4px)'
               }} 
          />
        </div>

        {/* Label */}
        {label && (
          <motion.div 
            className={`
              ${sizeStyle.label} ${variantStyle.text} opacity-60 
              font-mono mb-1 tracking-wider
            `}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            {label.toUpperCase()}
          </motion.div>
        )}

        {/* Money Display */}
        <motion.div 
          className={`
            ${sizeStyle.display} ${variantStyle.text} ${variantStyle.glow}
            font-mono font-bold tracking-wider leading-none
            relative z-10
          `}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          {formatDisplayAmount(displayAmount)}
        </motion.div>

        {/* Decimal Point Blink Effect for retro variant */}
        {variant === 'retro' && (
          <div className="absolute top-1/2 right-8 w-1 h-1 bg-green-400 rounded-full animate-pulse" />
        )}
      </div>

      {/* Hardware Details */}
      <div className="absolute top-2 left-2 flex gap-1">
        <div className="w-2 h-2 rounded-full bg-red-500 opacity-60" />
        <div className="w-2 h-2 rounded-full bg-yellow-500 opacity-60" />
        <div className="w-2 h-2 rounded-full bg-green-500 opacity-60" />
      </div>

      {/* Brand Label */}
      <div className="absolute bottom-1 right-2 text-xs font-mono text-white/30">
        PROXIMA
      </div>

      {/* Reflection Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
    </motion.div>
  )
}

// Specialized components for different use cases
export function TotalBalanceCounter({ amount, className = '' }: { amount: string | number, className?: string }) {
  return (
    <MoneyCounter
      amount={amount}
      label="Total Balance"
      size="large"
      variant="retro"
      animated={true}
      className={className}
    />
  )
}

export function MonthlySpendingCounter({ amount, className = '' }: { amount: string | number, className?: string }) {
  return (
    <MoneyCounter
      amount={amount}
      label="This Month"
      size="medium"
      variant="digital"
      animated={true}
      className={className}
    />
  )
}

export function SavingsProgressCounter({ amount, className = '' }: { amount: string | number, className?: string }) {
  return (
    <MoneyCounter
      amount={amount}
      label="Savings Goal"
      size="medium" 
      variant="neon"
      animated={true}
      className={className}
    />
  )
}

// Grid layout for multiple counters
export function MoneyCounterGrid({ 
  children, 
  className = "" 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  return (
    <div className={`
      grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4
      ${className}
    `}>
      {children}
    </div>
  )
}