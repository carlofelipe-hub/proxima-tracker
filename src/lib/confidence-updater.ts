import { updateAllUserConfidenceLevels } from "./confidence-calculator"

/**
 * Service to automatically update confidence levels when financial data changes
 */
export class ConfidenceUpdaterService {
  private static instance: ConfidenceUpdaterService
  private updateQueue = new Set<string>()
  private isProcessing = false

  private constructor() {}

  static getInstance(): ConfidenceUpdaterService {
    if (!ConfidenceUpdaterService.instance) {
      ConfidenceUpdaterService.instance = new ConfidenceUpdaterService()
    }
    return ConfidenceUpdaterService.instance
  }

  /**
   * Queue a user for confidence level updates
   */
  queueUserForUpdate(userId: string) {
    this.updateQueue.add(userId)
    
    // Process the queue after a short delay to batch updates
    setTimeout(() => {
      this.processQueue()
    }, 5000) // 5 second delay
  }

  /**
   * Process all queued users for confidence level updates
   */
  private async processQueue() {
    if (this.isProcessing || this.updateQueue.size === 0) {
      return
    }

    this.isProcessing = true
    const usersToUpdate = Array.from(this.updateQueue)
    this.updateQueue.clear()

    console.log(`Processing confidence level updates for ${usersToUpdate.length} users`)

    for (const userId of usersToUpdate) {
      try {
        await updateAllUserConfidenceLevels(userId)
        console.log(`Updated confidence levels for user ${userId}`)
      } catch (error) {
        console.error(`Failed to update confidence levels for user ${userId}:`, error)
      }
    }

    this.isProcessing = false

    // If new users were queued while processing, process them
    if (this.updateQueue.size > 0) {
      setTimeout(() => {
        this.processQueue()
      }, 1000)
    }
  }

  /**
   * Force immediate update for a specific user
   */
  async forceUpdateUser(userId: string) {
    try {
      await updateAllUserConfidenceLevels(userId)
      console.log(`Force updated confidence levels for user ${userId}`)
    } catch (error) {
      console.error(`Failed to force update confidence levels for user ${userId}:`, error)
      throw error
    }
  }
}

/**
 * Trigger confidence level updates when financial data changes
 */
export function triggerConfidenceUpdate(userId: string) {
  const updater = ConfidenceUpdaterService.getInstance()
  updater.queueUserForUpdate(userId)
}

/**
 * Force immediate confidence level update
 */
export async function forceConfidenceUpdate(userId: string) {
  const updater = ConfidenceUpdaterService.getInstance()
  await updater.forceUpdateUser(userId)
}

// Export singleton instance
export const confidenceUpdater = ConfidenceUpdaterService.getInstance()