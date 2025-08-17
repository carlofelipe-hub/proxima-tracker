"use client"

import { SessionProvider } from "next-auth/react"
import { ReactNode } from "react"
import { ToastProvider } from "./toast-provider"
import { ThemeProvider } from "./theme-provider"

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      defaultTheme="system"
      storageKey="proxima-theme"
    >
      <SessionProvider>
        {children}
        <ToastProvider />
      </SessionProvider>
    </ThemeProvider>
  )
}