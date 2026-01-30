/**
 * Generates a unique order code for online/customer orders.
 * Format: 6-character alphanumeric code (uppercase letters and numbers)
 * Example: "A3B7K9"
 */
export function generateUniqueOrderCode(): string {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Excludes confusing chars: I, O, 0, 1
  const codeLength = 6
  let code = ''
  
  for (let i = 0; i < codeLength; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length)
    code += characters[randomIndex]
  }
  
  // Add timestamp component to ensure uniqueness
  const timestamp = Date.now().toString(36).toUpperCase().slice(-2)
  
  return code.slice(0, 4) + timestamp
}

/**
 * Formats an order code for display with dashes for readability.
 * Example: "A3B7K9" -> "A3B-7K9"
 */
export function formatOrderCode(code: string): string {
  if (!code) return ''
  
  // Remove any existing formatting
  const cleanCode = code.replace(/[-\s]/g, '').toUpperCase()
  
  // Format as XXX-XXX for 6-character codes
  if (cleanCode.length === 6) {
    return `${cleanCode.slice(0, 3)}-${cleanCode.slice(3)}`
  }
  
  // For other lengths, add dash every 3 characters
  return cleanCode.match(/.{1,3}/g)?.join('-') || cleanCode
}
