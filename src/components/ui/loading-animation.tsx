"use client"

import { motion } from "framer-motion"

interface LoadingAnimationProps {
  text?: string
  size?: "sm" | "md" | "lg"
}

export function LoadingAnimation({ text = "Loading...", size = "md" }: LoadingAnimationProps) {
  const sizeClasses = {
    sm: { container: "h-20", dots: "w-2 h-2", text: "text-sm" },
    md: { container: "h-32", dots: "w-3 h-3", text: "text-base" },
    lg: { container: "h-40", dots: "w-4 h-4", text: "text-lg" }
  }

  const { container, dots, text: textSize } = sizeClasses[size]

  const dotVariants = {
    initial: { y: 0 },
    animate: {
      y: [-8, 0, -8]
    }
  }

  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  }

  return (
    <motion.div 
      className={`flex flex-col items-center justify-center ${container}`}
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      <div className="flex space-x-2 mb-4">
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className={`${dots} bg-primary rounded-full`}
            variants={dotVariants}
            transition={{ 
              delay: index * 0.1,
              duration: 0.6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
      <motion.p 
        className={`${textSize} text-muted-foreground`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {text}
      </motion.p>
    </motion.div>
  )
}

// Skeleton component with animations
export function AnimatedSkeleton({ 
  className = "", 
  count = 1 
}: { 
  className?: string
  count?: number 
}) {
  const skeletonVariants = {
    initial: { opacity: 0.3 },
    animate: {
      opacity: [0.3, 0.7, 0.3]
    }
  }

  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      className="space-y-3"
    >
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          variants={skeletonVariants}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className={`bg-muted rounded-md ${className}`}
        />
      ))}
    </motion.div>
  )
}
