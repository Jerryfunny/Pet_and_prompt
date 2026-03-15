/**
 * Workspace related type definitions
 * Contains interfaces and types used by workspace components
 */

/**
 * Payload for iterate optimization
 */
export interface IteratePayload {
  /** Original prompt text */
  originalPrompt: string
  /** Optimized prompt text */
  optimizedPrompt: string
  /** User input for iteration */
  iterateInput: string
}

/**
 * Payload for saving favorites
 */
export interface SaveFavoritePayload {
  /** Content to save */
  content: string
  /** Original content (optional) */
  originalContent?: string
}
