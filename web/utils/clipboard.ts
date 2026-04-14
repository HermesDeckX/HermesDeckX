/**
 * Copy text to clipboard with fallback for non-secure contexts (HTTP)
 * 
 * Modern browsers require HTTPS for navigator.clipboard API.
 * This function provides a fallback using the legacy execCommand method.
 * 
 * @param text - Text to copy to clipboard
 * @returns Promise that resolves when copy succeeds, rejects on failure
 */
export function copyToClipboard(text: string): Promise<void> {
  // Try modern clipboard API first (requires HTTPS or localhost)
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }

  // Fallback for HTTP: use textarea + execCommand
  return new Promise((resolve, reject) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    
    try {
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      
      if (success) {
        resolve();
      } else {
        reject(new Error('execCommand copy failed'));
      }
    } catch (err) {
      document.body.removeChild(textarea);
      reject(err);
    }
  });
}

/**
 * Check if clipboard API is available
 * @returns true if clipboard write is supported
 */
export function isClipboardAvailable(): boolean {
  return !!(navigator.clipboard && window.isSecureContext) || 
         document.queryCommandSupported?.('copy');
}
