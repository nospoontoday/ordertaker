// Character set for order codes (excludes confusing chars: I, O, 0, 1)
const ORDER_CODE_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const ORDER_CODE_LENGTH = 3

/**
 * Generates a short 3-character order code.
 * Uses characters: A-Z (excluding I, O) and 2-9 (excluding 0, 1)
 * Total combinations: 32^3 = 32,768
 */
export function generateShortOrderCode(): string {
  let code = ''
  
  for (let i = 0; i < ORDER_CODE_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * ORDER_CODE_CHARACTERS.length)
    code += ORDER_CODE_CHARACTERS[randomIndex]
  }
  
  return code
}

/**
 * Generates a unique short order code that doesn't exist in the pending codes list.
 * Codes only need to be unique among pending (for approval) online orders.
 * Once an order is confirmed, its code can be recycled.
 * 
 * @param pendingCodes - Array of codes currently in use by pending online orders
 * @returns A unique 3-character code
 */
export function generateUniqueShortCode(pendingCodes: string[]): string {
  const pendingSet = new Set(pendingCodes.map(code => code.toUpperCase()))
  let attempts = 0
  const maxAttempts = 1000 // Safety limit
  
  while (attempts < maxAttempts) {
    const code = generateShortOrderCode()
    if (!pendingSet.has(code)) {
      return code
    }
    attempts++
  }
  
  // Fallback: if somehow all codes are taken (unlikely with 32k combinations),
  // generate a longer code with timestamp
  console.warn('Could not generate unique short code, falling back to longer code')
  return generateShortOrderCode() + Date.now().toString(36).toUpperCase().slice(-2)
}

/**
 * @deprecated Use generateShortOrderCode or generateUniqueShortCode instead
 * Kept for backward compatibility with existing 6-character codes
 */
export function generateUniqueOrderCode(): string {
  const codeLength = 6
  let code = ''
  
  for (let i = 0; i < codeLength; i++) {
    const randomIndex = Math.floor(Math.random() * ORDER_CODE_CHARACTERS.length)
    code += ORDER_CODE_CHARACTERS[randomIndex]
  }
  
  // Add timestamp component to ensure uniqueness
  const timestamp = Date.now().toString(36).toUpperCase().slice(-2)
  
  return code.slice(0, 4) + timestamp
}

/**
 * Formats an order code for display with # prefix.
 * Examples:
 *   - 3-char codes: "A7K" -> "#A7K"
 *   - Legacy 6-char codes: "A3B7K9" -> "#A3B-7K9"
 */
export function formatOrderCode(code: string): string {
  if (!code) return ''
  
  // Remove any existing formatting (# prefix, dashes, spaces)
  const cleanCode = code.replace(/[#\-\s]/g, '').toUpperCase()
  
  // Format based on length
  if (cleanCode.length === 3) {
    // New short format: #A7K
    return `#${cleanCode}`
  } else if (cleanCode.length === 6) {
    // Legacy format: #A3B-7K9
    return `#${cleanCode.slice(0, 3)}-${cleanCode.slice(3)}`
  }
  
  // For other lengths, just add # prefix
  return `#${cleanCode}`
}
