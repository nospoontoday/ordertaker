/**
 * Category Classifier Utility
 * Classifies menu item categories as food or drinks
 */

const DRINK_CATEGORIES = [
  'coffee',
  'tea',
  'drinks',
  'beverages',
  'juice',
  'smoothie',
  'frappe',
  'iced',
  'hot-drinks',
  'cold-drinks',
]

const FOOD_CATEGORIES = [
  'food',
  'pastry',
  'sandwich',
  'salad',
  'snacks',
  'appetizer',
  'main-course',
  'dessert',
  'breakfast',
  'lunch',
  'dinner',
]

/**
 * Classifies a category as 'food' or 'drinks'
 * @param category - The category string to classify
 * @returns 'food' or 'drinks'
 */
export function classifyCategory(category: string): 'food' | 'drinks' {
  const normalized = category.toLowerCase().trim()

  // Check if it's a drink category
  if (DRINK_CATEGORIES.some(drink => normalized.includes(drink))) {
    return 'drinks'
  }

  // Check if it's a food category
  if (FOOD_CATEGORIES.some(food => normalized.includes(food))) {
    return 'food'
  }

  // Default to 'food' if unclear
  return 'food'
}

/**
 * Checks if a category is a drink category
 */
export function isDrinkCategory(category: string): boolean {
  return classifyCategory(category) === 'drinks'
}

/**
 * Checks if a category is a food category
 */
export function isFoodCategory(category: string): boolean {
  return classifyCategory(category) === 'food'
}

