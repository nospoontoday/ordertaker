/**
 * Kopisina Magic - The soul of our viral ordering experience
 * 
 * This file contains all the magical content that makes orders feel special:
 * - Creative order identifiers (150+ unique lines)
 * - Item-specific status messages
 * - Delightful per-order messages
 */

// ============================================================================
// CREATIVE ORDER IDENTIFIERS (150+ lines)
// ============================================================================
// These replace boring order numbers like "#A7K" with warm, personal messages
// Format: "You're the {nth} {CreativeTitle} today!"

export type ItemCategory = 'hot-drinks' | 'cold-drinks' | 'mains' | 'sides' | 'dimsum';

// Map menu items to their categories
export const ITEM_CATEGORY_MAP: Record<string, ItemCategory> = {
  'brewed coffee': 'hot-drinks',
  'hot coffee': 'hot-drinks',
  'iced coffee': 'cold-drinks',
  'matcha': 'cold-drinks',
  'iced tea': 'cold-drinks',
  'burger': 'mains',
  'chicken nuggets': 'mains',
  'chicken nuggets with rice': 'mains',
  'fries': 'sides',
  'siomai': 'dimsum',
  'siopao': 'dimsum',
};

// Get category from item name (case-insensitive partial match)
export function getItemCategory(itemName: string): ItemCategory {
  const lowerName = itemName.toLowerCase();
  for (const [key, category] of Object.entries(ITEM_CATEGORY_MAP)) {
    if (lowerName.includes(key)) {
      return category;
    }
  }
  return 'hot-drinks'; // Default fallback
}

// Creative titles by category - each array has 30+ options for variety
export const CREATIVE_TITLES: Record<ItemCategory, string[]> = {
  'hot-drinks': [
    'River Soul',
    'Morning Star',
    'Warm Heart',
    'Cozy Spirit',
    'Sunrise Dreamer',
    'Cup of Sunshine',
    'Warmth Seeker',
    'Coffee Wanderer',
    'Brew Enthusiast',
    'Comfort Finder',
    'Morning Ritual',
    'Steam Chaser',
    'Caffeine Artist',
    'Dawn Riser',
    'Quiet Moment',
    'Peaceful Sip',
    'Golden Hour',
    'Slow Morning',
    'Mindful Cup',
    'Gentle Wake',
    'First Light',
    'Cozy Corner',
    'Warm Embrace',
    'Morning Bloom',
    'Cup of Calm',
    'Serene Sipper',
    'Tranquil Soul',
    'Comfort Seeker',
    'Warmth Hunter',
    'Steam Dreamer',
    'Aromatic Soul',
    'Roasted Heart',
  ],
  'cold-drinks': [
    'Sunshine Seeker',
    'Cool Breeze',
    'Chill Vibes',
    'Ice Explorer',
    'Refresh Master',
    'Cool Soul',
    'Frost Friend',
    'Summer Heart',
    'Breeze Chaser',
    'Cool Wanderer',
    'Ice Dreamer',
    'Fresh Spirit',
    'Chill Seeker',
    'Cool Wave',
    'Frost Lover',
    'Summer Dreamer',
    'Icy Soul',
    'Refresh Seeker',
    'Cool Heart',
    'Breeze Lover',
    'Chill Master',
    'Ice Spirit',
    'Cool Vibes',
    'Frost Seeker',
    'Summer Soul',
    'Fresh Wave',
    'Chill Heart',
    'Cool Explorer',
    'Ice Chaser',
    'Refresh Soul',
    'Tropical Heart',
    'Cool Rhythm',
  ],
  'mains': [
    'Hungry Hero',
    'Feast Finder',
    'Flavor Explorer',
    'Appetite King',
    'Foodie Soul',
    'Taste Hunter',
    'Meal Master',
    'Flavor Seeker',
    'Hungry Soul',
    'Feast Friend',
    'Food Lover',
    'Taste Wanderer',
    'Meal Seeker',
    'Flavor King',
    'Appetite Hero',
    'Foodie Heart',
    'Taste Explorer',
    'Hungry Heart',
    'Feast Seeker',
    'Food Hunter',
    'Flavor Friend',
    'Meal Lover',
    'Taste Master',
    'Appetite Soul',
    'Foodie Wanderer',
    'Hungry Friend',
    'Feast King',
    'Food Explorer',
    'Flavor Hero',
    'Meal Heart',
    'Belly Happy',
    'Feast Champion',
  ],
  'sides': [
    'Snack Champion',
    'Crispy Lover',
    'Side Quest Hero',
    'Munch Master',
    'Crunch Seeker',
    'Snack Soul',
    'Crispy Friend',
    'Side Star',
    'Munch Explorer',
    'Crunch Hero',
    'Snack Hunter',
    'Crispy Seeker',
    'Side Lover',
    'Munch Soul',
    'Crunch Friend',
    'Snack Master',
    'Crispy Hero',
    'Side Seeker',
    'Munch Heart',
    'Crunch Soul',
    'Snack Explorer',
    'Crispy King',
    'Side Hunter',
    'Munch Friend',
    'Crunch Master',
    'Snack Heart',
    'Crispy Soul',
    'Side Hero',
    'Munch King',
    'Crunch Seeker',
    'Golden Crisp',
    'Snack Royalty',
  ],
  'dimsum': [
    'Dumpling Dreamer',
    'Steam Lover',
    'Dim Sum Soul',
    'Steamy Delight',
    'Dumpling Friend',
    'Steam Seeker',
    'Dim Sum Heart',
    'Steamy Soul',
    'Dumpling Hero',
    'Steam Friend',
    'Dim Sum Seeker',
    'Steamy Heart',
    'Dumpling King',
    'Steam Master',
    'Dim Sum Lover',
    'Steamy Friend',
    'Dumpling Soul',
    'Steam Hero',
    'Dim Sum King',
    'Steamy Seeker',
    'Dumpling Master',
    'Steam Soul',
    'Dim Sum Friend',
    'Steamy King',
    'Dumpling Seeker',
    'Steam Heart',
    'Dim Sum Hero',
    'Steamy Master',
    'Dumpling Heart',
    'Steam King',
    'Bamboo Basket',
    'Sarap Seeker',
  ],
};

// Emojis by category
export const CATEGORY_EMOJIS: Record<ItemCategory, string[]> = {
  'hot-drinks': ['☕', '🌅', '✨', '🌸', '💫', '🔥', '🌞', '💛'],
  'cold-drinks': ['🧊', '🌊', '❄️', '🍃', '💙', '🌴', '🍹', '☀️'],
  'mains': ['🍔', '🍗', '🔥', '⭐', '💪', '🎉', '👑', '🌟'],
  'sides': ['🍟', '✨', '🎯', '💫', '🌟', '⚡', '🔥', '👌'],
  'dimsum': ['🥟', '💨', '🎋', '✨', '🌸', '💫', '🔥', '❤️'],
};

// Get ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
export function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Generate a creative order identifier
export function generateCreativeIdentifier(
  orderNumber: number,
  category: ItemCategory
): { title: string; emoji: string; fullMessage: string } {
  const titles = CREATIVE_TITLES[category];
  const emojis = CATEGORY_EMOJIS[category];
  
  // Use order number to pick title (cycling through array)
  const titleIndex = (orderNumber - 1) % titles.length;
  const emojiIndex = (orderNumber - 1) % emojis.length;
  
  const title = titles[titleIndex];
  const emoji = emojis[emojiIndex];
  const ordinal = getOrdinalSuffix(orderNumber);
  
  return {
    title,
    emoji,
    fullMessage: `You're the ${ordinal} ${title} today! ${emoji}`,
  };
}

// ============================================================================
// ITEM-SPECIFIC STATUS MESSAGES
// ============================================================================
// Smart status messages that match what's actually happening to the food

export interface StatusMessages {
  pending: string;
  preparing: string;
  ready: string;
  served: string;
}

export const ITEM_STATUS_MESSAGES: Record<string, StatusMessages> = {
  // Hot Drinks
  'brewed coffee': {
    pending: 'Your order is in the queue...',
    preparing: 'Your coffee is being brewed with care... ☕',
    ready: 'Your coffee awaits, warm and ready! ☕✨',
    served: 'Enjoy the warmth! ☕💛',
  },
  'hot coffee': {
    pending: 'Your order is in the queue...',
    preparing: 'Your coffee is being brewed fresh... ☕',
    ready: 'Your hot coffee is ready to warm your soul! ☕✨',
    served: 'Savor every sip! ☕💛',
  },
  
  // Cold Drinks
  'iced coffee': {
    pending: 'Your order is in the queue...',
    preparing: 'Chilling your perfect blend... 🧊',
    ready: 'Your iced coffee is ready to refresh! 🧊✨',
    served: 'Stay cool! 🧊💙',
  },
  'matcha': {
    pending: 'Your order is in the queue...',
    preparing: 'Whisking your matcha to perfection... 🍵',
    ready: 'Your matcha is ready, green and serene! 🍵✨',
    served: 'Zen vibes activated! 🍵💚',
  },
  'iced tea': {
    pending: 'Your order is in the queue...',
    preparing: 'Steeping your refreshing blend... 🍃',
    ready: 'Your iced tea awaits, cool and crisp! 🍃✨',
    served: 'Refreshed and recharged! 🍃💙',
  },
  
  // Mains
  'burger': {
    pending: 'Your order is in the queue...',
    preparing: 'Your burger just hit the grill... 🍔🔥',
    ready: 'Your burger is sizzling hot and ready! 🍔✨',
    served: 'Dig in! 🍔👑',
  },
  'chicken nuggets': {
    pending: 'Your order is in the queue...',
    preparing: 'Your nuggets are getting golden and crispy... 🍗',
    ready: 'Golden nuggets ready to enjoy! 🍗✨',
    served: 'Crispy happiness served! 🍗💛',
  },
  'chicken nuggets with rice': {
    pending: 'Your order is in the queue...',
    preparing: 'Your nuggets are crisping up, rice is steaming... 🍗🍚',
    ready: 'Nuggets and rice, ready and nice! 🍗✨',
    served: 'The perfect combo! 🍗🍚💛',
  },
  
  // Sides
  'fries': {
    pending: 'Your order is in the queue...',
    preparing: 'Your fries are taking a golden bath... 🍟',
    ready: 'Crispy fries ready for pickup! 🍟✨',
    served: 'Crunch time! 🍟👌',
  },
  
  // Dimsum
  'siomai': {
    pending: 'Your order is in the queue...',
    preparing: 'Steaming your siomai to perfection... 🥟💨',
    ready: 'Your siomai is ready, hot and savory! 🥟✨',
    served: 'Sarap! 🥟❤️',
  },
  'siopao': {
    pending: 'Your order is in the queue...',
    preparing: 'Your siopao is steaming soft and fluffy... 🥟💨',
    ready: 'Fluffy siopao ready for you! 🥟✨',
    served: 'Masarap! 🥟❤️',
  },
};

// Get status message for an item (with fallback for unknown items)
export function getStatusMessage(itemName: string, status: keyof StatusMessages): string {
  const lowerName = itemName.toLowerCase();
  
  // Try exact match first
  if (ITEM_STATUS_MESSAGES[lowerName]) {
    return ITEM_STATUS_MESSAGES[lowerName][status];
  }
  
  // Try partial match
  for (const [key, messages] of Object.entries(ITEM_STATUS_MESSAGES)) {
    if (lowerName.includes(key) || key.includes(lowerName)) {
      return messages[status];
    }
  }
  
  // Fallback generic messages
  const fallback: StatusMessages = {
    pending: 'Your order is in the queue...',
    preparing: 'Your order is being prepared with love... ✨',
    ready: 'Your order is ready! ✨',
    served: 'Enjoy! 💛',
  };
  
  return fallback[status];
}

// Get the primary status message for an order based on its items
export function getOrderStatusMessage(
  items: Array<{ name: string; status: string }>,
  orderStatus: string
): string {
  // Find the item that represents the current order status best
  const statusPriority: Record<string, number> = {
    preparing: 3,
    ready: 2,
    pending: 1,
    served: 0,
  };
  
  // Get items sorted by status priority (most active first)
  const sortedItems = [...items].sort((a, b) => {
    return (statusPriority[b.status] || 0) - (statusPriority[a.status] || 0);
  });
  
  if (sortedItems.length > 0) {
    const topItem = sortedItems[0];
    return getStatusMessage(topItem.name, topItem.status as keyof StatusMessages);
  }
  
  // Fallback based on order status
  return getStatusMessage('', orderStatus as keyof StatusMessages);
}

// ============================================================================
// DELIGHTFUL PER-ORDER MESSAGES (50+ unique lines)
// ============================================================================
// These are warm, shareable messages that appear on each order

export const DELIGHTFUL_MESSAGES: string[] = [
  // River/Nature themed (matching Kopisina's river vibe)
  "Best enjoyed while watching the river flow 🌊",
  "Let the river carry your worries away 🌊",
  "Life flows better with good food ✨",
  "Like the river, may your day flow smoothly 🌊",
  "Find your calm by the riverside 🌿",
  "Good vibes flow here 🌊✨",
  "Where the river meets comfort food 💛",
  "Flowing with flavor, served with soul 🌊",
  "The river called, your order answered 🌿",
  "Riverside moments, unforgettable tastes 🌅",
  
  // Coffee/Drink themed
  "Life's too short for bad coffee ☕",
  "Brewed with love, served with joy ☕💛",
  "Every cup tells a story ☕✨",
  "Coffee first, everything else later ☕",
  "Sip happens, make it a good one ☕",
  "Your daily dose of happiness ☕💛",
  "Good things come to those who wait (for coffee) ☕",
  "Caffeine and kindness in every cup ☕✨",
  "The best ideas start with coffee ☕💡",
  "Espresso yourself! ☕🎨",
  
  // Food/Comfort themed
  "Good food, good mood, good day 🌟",
  "Made with love, served with a smile 💛",
  "Comfort in every bite ✨",
  "Food tastes better when shared 👫",
  "Your happiness is our recipe 💛",
  "Seasoned with care, served with heart ❤️",
  "Where flavor meets feeling 🌟",
  "Cooked with passion, enjoyed with friends ✨",
  "Full belly, happy heart 💛",
  "Food is love made visible ❤️",
  
  // Warm/Cozy themed
  "A cozy corner in a busy world 🌸",
  "Warmth in every cup, love in every bite 💛",
  "Your comfort zone found 🏡",
  "Take a break, you deserve this 💫",
  "Slow down, savor the moment ✨",
  "Creating memories, one order at a time 💛",
  "Where every order feels like home 🏡",
  "Your happy place is serving 🌟",
  "Pause. Breathe. Enjoy. 🌸",
  "The best things are worth savoring ✨",
  
  // Uplifting/Positive
  "Today is going to be a great day! 🌟",
  "You're doing amazing, treat yourself 💛",
  "Happiness served hot (or cold!) ✨",
  "Making ordinary moments extraordinary 🌟",
  "Smile, your order is coming! 😊",
  "Good things are brewing for you ☕✨",
  "You chose well, enjoy! 💛",
  "Here's to the little joys in life 🌸",
  "Your pick-me-up is on its way! 💪",
  "Fuel for your awesome day ahead 🚀",
  
  // Filipino-inspired
  "Kain na! Your food is ready 🍚",
  "Sarap ng buhay with every bite 💛",
  "Merienda time is the best time 🌸",
  "Masarap at masaya! ✨",
  "Busog and blessed 💛",
  "Tambay mode: activated 🌟",
  "Chill lang, order's coming ✨",
  "Para sa masarap na araw 🌅",
  "Libre ang ngiti, kasama sa order 😊",
  "Init ng pagmamahal sa bawat luto ❤️",
  
  // Playful/Fun
  "Plot twist: this is the best part of your day 🎬",
  "Warning: May cause extreme happiness 😄",
  "Caution: Deliciousness ahead 🚧",
  "Loading happiness... 100% complete ✨",
  "Achievement unlocked: Great taste 🎮",
  "Spoiler alert: It's delicious 📺",
  "Breaking news: Your order is amazing 📰",
  "Fun fact: You have great taste! 🌟",
  "This is your sign to enjoy life 💫",
  "Main character energy in every order ✨",
];

// Get a random delightful message (or based on order number for consistency)
export function getDelightfulMessage(orderNumber?: number): string {
  if (orderNumber !== undefined) {
    // Use order number to get consistent message for same order
    const index = orderNumber % DELIGHTFUL_MESSAGES.length;
    return DELIGHTFUL_MESSAGES[index];
  }
  // Random selection
  const index = Math.floor(Math.random() * DELIGHTFUL_MESSAGES.length);
  return DELIGHTFUL_MESSAGES[index];
}

// ============================================================================
// DAILY COUNTER MANAGEMENT
// ============================================================================
// Track daily order counts per category for the "You're the Nth..." messages

const DAILY_COUNTER_KEY = 'kopisina_daily_counters';

interface DailyCounters {
  date: string; // YYYY-MM-DD format
  counters: Record<ItemCategory, number>;
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function getDefaultCounters(): Record<ItemCategory, number> {
  return {
    'hot-drinks': 0,
    'cold-drinks': 0,
    'mains': 0,
    'sides': 0,
    'dimsum': 0,
  };
}

export function loadDailyCounters(): DailyCounters {
  if (typeof window === 'undefined') {
    return { date: getTodayString(), counters: getDefaultCounters() };
  }
  
  try {
    const stored = localStorage.getItem(DAILY_COUNTER_KEY);
    if (stored) {
      const data: DailyCounters = JSON.parse(stored);
      // Reset if it's a new day
      if (data.date !== getTodayString()) {
        return { date: getTodayString(), counters: getDefaultCounters() };
      }
      return data;
    }
  } catch (error) {
    console.error('Error loading daily counters:', error);
  }
  
  return { date: getTodayString(), counters: getDefaultCounters() };
}

export function saveDailyCounters(counters: DailyCounters): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(DAILY_COUNTER_KEY, JSON.stringify(counters));
  } catch (error) {
    console.error('Error saving daily counters:', error);
  }
}

export function incrementAndGetCounter(category: ItemCategory): number {
  const data = loadDailyCounters();
  data.counters[category] = (data.counters[category] || 0) + 1;
  saveDailyCounters(data);
  return data.counters[category];
}

// Get creative identifier for a new order based on its primary item
export function getCreativeIdentifierForOrder(
  items: Array<{ name: string }>
): { title: string; emoji: string; fullMessage: string; category: ItemCategory } {
  // Determine primary category from items
  let primaryCategory: ItemCategory = 'hot-drinks';
  
  if (items.length > 0) {
    // Use the first item's category as primary
    primaryCategory = getItemCategory(items[0].name);
    
    // Or find the most "special" category (mains > dimsum > drinks > sides)
    const categoryPriority: Record<ItemCategory, number> = {
      'mains': 5,
      'dimsum': 4,
      'hot-drinks': 3,
      'cold-drinks': 3,
      'sides': 1,
    };
    
    for (const item of items) {
      const cat = getItemCategory(item.name);
      if (categoryPriority[cat] > categoryPriority[primaryCategory]) {
        primaryCategory = cat;
      }
    }
  }
  
  const orderNumber = incrementAndGetCounter(primaryCategory);
  const identifier = generateCreativeIdentifier(orderNumber, primaryCategory);
  
  return {
    ...identifier,
    category: primaryCategory,
  };
}

// ============================================================================
// BRAND CONSTANTS
// ============================================================================

export const KOPISINA_BRAND = {
  name: "Kopisina x Zion's Burgers",
  shortName: "Kopisina x Zion's",
  tagline: 'Where the river meets your cravings',
  emoji: '☕🍔',
  colors: {
    primary: '#8B5A2B', // Warm brown
    secondary: '#D4A574', // Latte cream
    accent: '#F5E6D3', // Soft cream
    text: '#3D2914', // Dark espresso
  },
};
