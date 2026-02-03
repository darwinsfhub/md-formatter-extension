/**
 * Clipboard Manager - Handles copy operations with multiple MIME types
 * Ensures proper formatting when pasting into different applications
 */

class ClipboardManager {
  constructor() {
    this.lastCopied = null;
    this.copyHistory = [];
    this.maxHistorySize = 10;
  }

  /**
   * Copy content to clipboard with both HTML and plain text
   */
  async copyFormatted(htmlContent, plainTextContent) {
    try {
      // Modern Clipboard API with multiple MIME types
      if (navigator.clipboard && navigator.clipboard.write) {
        const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
        const textBlob = new Blob([plainTextContent], { type: 'text/plain' });

        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': htmlBlob,
            'text/plain': textBlob
          })
        ]);

        this.recordCopy(htmlContent, plainTextContent, 'formatted');
        return { success: true, method: 'clipboard-api' };
      }
      
      // Fallback to execCommand (deprecated but widely supported)
      return this.fallbackCopy(htmlContent, plainTextContent);
      
    } catch (error) {
      console.error('Clipboard write failed:', error);
      
      // Try fallback
      try {
        return this.fallbackCopy(htmlContent, plainTextContent);
      } catch (fallbackError) {
        return { 
          success: false, 
          error: 'Unable to access clipboard. Please check permissions.',
          details: error.message
        };
      }
    }
  }

  /**
   * Copy plain text only
   */
  async copyPlainText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        this.recordCopy(null, text, 'plain');
        return { success: true, method: 'clipboard-api' };
      }
      
      return this.fallbackCopyText(text);
      
    } catch (error) {
      console.error('Plain text copy failed:', error);
      
      try {
        return this.fallbackCopyText(text);
      } catch (fallbackError) {
        return {
          success: false,
          error: 'Unable to copy text.',
          details: error.message
        };
      }
    }
  }

  /**
   * Copy HTML only (for debugging or specific use cases)
   */
  async copyHtmlOnly(html) {
    try {
      if (navigator.clipboard && navigator.clipboard.write) {
        const htmlBlob = new Blob([html], { type: 'text/html' });
        
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': htmlBlob
          })
        ]);

        this.recordCopy(html, null, 'html-only');
        return { success: true, method: 'clipboard-api' };
      }
      
      // Fallback: copy as text
      return this.copyPlainText(html);
      
    } catch (error) {
      return {
        success: false,
        error: 'Unable to copy HTML.',
        details: error.message
      };
    }
  }

  /**
   * Fallback copy using document.execCommand
   */
  fallbackCopy(htmlContent, plainTextContent) {
    // Create a temporary container
    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    container.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
    document.body.appendChild(container);

    // Select the content
    const range = document.createRange();
    range.selectNodeContents(container);
    
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    // Execute copy
    let success = false;
    try {
      success = document.execCommand('copy');
    } catch (e) {
      console.error('execCommand copy failed:', e);
    }

    // Cleanup
    selection.removeAllRanges();
    document.body.removeChild(container);

    if (success) {
      this.recordCopy(htmlContent, plainTextContent, 'formatted-fallback');
    }

    return {
      success,
      method: 'execCommand',
      warning: success ? null : 'Copy may not preserve formatting'
    };
  }

  /**
   * Fallback for plain text copy
   */
  fallbackCopyText(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
    document.body.appendChild(textarea);
    
    textarea.select();
    textarea.setSelectionRange(0, text.length);

    let success = false;
    try {
      success = document.execCommand('copy');
    } catch (e) {
      console.error('execCommand copy failed:', e);
    }

    document.body.removeChild(textarea);

    if (success) {
      this.recordCopy(null, text, 'plain-fallback');
    }

    return {
      success,
      method: 'execCommand'
    };
  }

  /**
   * Record copy to history
   */
  recordCopy(html, text, type) {
    const entry = {
      html,
      text,
      type,
      timestamp: Date.now(),
      id: this.generateId()
    };

    this.lastCopied = entry;
    this.copyHistory.unshift(entry);

    // Trim history
    if (this.copyHistory.length > this.maxHistorySize) {
      this.copyHistory = this.copyHistory.slice(0, this.maxHistorySize);
    }

    // Save to storage
    this.saveHistory();

    return entry;
  }

  /**
   * Get copy history
   */
  getHistory() {
    return this.copyHistory;
  }

  /**
   * Get last copied item
   */
  getLastCopied() {
    return this.lastCopied;
  }

  /**
   * Re-copy an item from history
   */
  async reCopy(historyId) {
    const item = this.copyHistory.find(h => h.id === historyId);
    if (!item) {
      return { success: false, error: 'Item not found in history' };
    }

    if (item.html && item.text) {
      return this.copyFormatted(item.html, item.text);
    } else if (item.text) {
      return this.copyPlainText(item.text);
    } else if (item.html) {
      return this.copyHtmlOnly(item.html);
    }

    return { success: false, error: 'Invalid history item' };
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.copyHistory = [];
    this.lastCopied = null;
    this.saveHistory();
  }

  /**
   * Save history to storage
   */
  async saveHistory() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({
          copyHistory: this.copyHistory.slice(0, 5) // Only save last 5 to storage
        });
      }
    } catch (e) {
      console.error('Failed to save history:', e);
    }
  }

  /**
   * Load history from storage
   */
  async loadHistory() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['copyHistory']);
        if (result.copyHistory) {
          this.copyHistory = result.copyHistory;
          this.lastCopied = this.copyHistory[0] || null;
        }
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `copy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if clipboard API is available
   */
  isClipboardApiAvailable() {
    return !!(navigator.clipboard && navigator.clipboard.write);
  }

  /**
   * Request clipboard permissions (if needed)
   */
  async requestPermission() {
    try {
      const result = await navigator.permissions.query({ name: 'clipboard-write' });
      return result.state === 'granted' || result.state === 'prompt';
    } catch (e) {
      // Permissions API not supported, assume granted
      return true;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ClipboardManager;
}
