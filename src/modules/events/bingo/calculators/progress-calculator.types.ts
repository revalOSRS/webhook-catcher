/**
 * Progress Calculator Types
 */

export interface ProgressUpdate {
  progressValue: number // New progress value
  metadata: {
    count?: number
    current_value?: number
    target_value?: number
    completed_tiers?: number[] // Which tiers are completed
    current_tier?: number // Highest tier completed
    last_update_at?: string
    [key: string]: any
  }
  isCompleted: boolean
  completedTier?: number // If a tier was completed, which one
}

export interface ExistingProgress {
  progressValue: number
  metadata: Record<string, any>
}

