"use client"

import { useEffect, useState } from 'react'

const DASHBOARD_VISITED_KEY = 'dashboard-visited'

export function useFirstDashboardVisit() {
  const [isFirstVisit, setIsFirstVisit] = useState(true)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Check if user has visited dashboard before
    const hasVisited = localStorage.getItem(DASHBOARD_VISITED_KEY)
    setIsFirstVisit(!hasVisited)
    setIsLoaded(true)
  }, [])

  const markDashboardVisited = () => {
    localStorage.setItem(DASHBOARD_VISITED_KEY, 'true')
    setIsFirstVisit(false)
  }

  return {
    isFirstVisit: isFirstVisit && isLoaded,
    isLoaded,
    markDashboardVisited
  }
}



