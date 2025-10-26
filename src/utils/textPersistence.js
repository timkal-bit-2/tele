/**
 * Text Persistence Manager
 * Auto-saves and loads text content reliably
 */

const CURRENT_TEXT_KEY = 'teleprompter-current-text'
const TEXT_HISTORY_KEY = 'teleprompter-text-history'
const LAST_SAVE_TIME_KEY = 'teleprompter-last-save'
const MAX_HISTORY = 5

export const TextPersistence = {
  /**
   * Save current text to localStorage
   */
  saveCurrentText(text) {
    try {
      localStorage.setItem(CURRENT_TEXT_KEY, text)
      localStorage.setItem(LAST_SAVE_TIME_KEY, Date.now().toString())
      return true
    } catch (error) {
      console.error('Failed to save current text:', error)
      return false
    }
  },

  /**
   * Load current text from localStorage
   */
  loadCurrentText() {
    try {
      const text = localStorage.getItem(CURRENT_TEXT_KEY)
      return text || null
    } catch (error) {
      console.error('Failed to load current text:', error)
      return null
    }
  },

  /**
   * Get last save timestamp
   */
  getLastSaveTime() {
    try {
      const timestamp = localStorage.getItem(LAST_SAVE_TIME_KEY)
      return timestamp ? parseInt(timestamp) : null
    } catch (error) {
      console.error('Failed to get last save time:', error)
      return null
    }
  },

  /**
   * Save text to history (for undo functionality)
   */
  saveToHistory(text) {
    try {
      const history = this.loadHistory()
      
      // Don't save if it's the same as the last entry
      if (history.length > 0 && history[0].text === text) {
        return true
      }
      
      const entry = {
        text,
        timestamp: Date.now(),
        preview: text.substring(0, 100) + (text.length > 100 ? '...' : '')
      }
      
      history.unshift(entry)
      
      // Keep only MAX_HISTORY entries
      if (history.length > MAX_HISTORY) {
        history.length = MAX_HISTORY
      }
      
      localStorage.setItem(TEXT_HISTORY_KEY, JSON.stringify(history))
      return true
    } catch (error) {
      console.error('Failed to save to history:', error)
      return false
    }
  },

  /**
   * Load text history
   */
  loadHistory() {
    try {
      const saved = localStorage.getItem(TEXT_HISTORY_KEY)
      return saved ? JSON.parse(saved) : []
    } catch (error) {
      console.error('Failed to load history:', error)
      return []
    }
  },

  /**
   * Clear all saved text data
   */
  clearAll() {
    try {
      localStorage.removeItem(CURRENT_TEXT_KEY)
      localStorage.removeItem(TEXT_HISTORY_KEY)
      localStorage.removeItem(LAST_SAVE_TIME_KEY)
      return true
    } catch (error) {
      console.error('Failed to clear text data:', error)
      return false
    }
  },

  /**
   * Create a debounced save function
   */
  createDebouncedSave(delay = 1000) {
    let timeoutId = null
    
    return (text, immediate = false) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      
      if (immediate) {
        this.saveCurrentText(text)
        this.saveToHistory(text)
      } else {
        timeoutId = setTimeout(() => {
          this.saveCurrentText(text)
          this.saveToHistory(text)
        }, delay)
      }
    }
  }
}

export default TextPersistence


