/**
 * API Client for Order Taker Backend
 * Handles all HTTP requests to the backend API
 */

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const SERVER_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

// TypeScript Types
export interface MenuItem {
  _id?: string;
  id?: string;
  name: string;
  price: number;
  category: string;
  image: string;
  isBestSeller?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  _id?: string;
  id: string;
  name: string;
  image: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  status: "pending" | "preparing" | "ready" | "served";
  itemType?: "dine-in" | "take-out";
}

export interface AppendedOrder {
  id: string;
  items: OrderItem[];
  createdAt: number;
  isPaid?: boolean;
  paymentMethod?: "cash" | "gcash" | null;
}

export interface Order {
  _id?: string;
  id: string;
  orderNumber?: number;
  customerName: string;
  items: OrderItem[];
  createdAt: number;
  isPaid: boolean;
  paymentMethod?: "cash" | "gcash" | null;
  orderType: "dine-in" | "take-out";
  appendedOrders?: AppendedOrder[];
  totalAmount?: number;
  totalItems?: number;
  orderStatus?: "pending" | "in_progress" | "completed";
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  count?: number;
  error?: string;
  message?: string;
}

export interface UploadResponse {
  filename: string;
  path: string;
  size: number;
  mimetype: string;
}

// Helper function for API calls
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

// Menu Items API
export const menuItemsApi = {
  /**
   * Get all menu items
   * @param category - Optional category filter
   * @param bestSellers - Optional filter for best sellers only
   */
  getAll: async (category?: string, bestSellers?: boolean): Promise<MenuItem[]> => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (bestSellers) params.append('bestSellers', 'true');

    const queryString = params.toString();
    const endpoint = `/menu-items${queryString ? `?${queryString}` : ''}`;

    const response = await apiCall<MenuItem[]>(endpoint);
    return response.data || [];
  },

  /**
   * Get a single menu item by ID
   */
  getById: async (id: string): Promise<MenuItem | null> => {
    const response = await apiCall<MenuItem>(`/menu-items/${id}`);
    return response.data || null;
  },

  /**
   * Create a new menu item
   */
  create: async (menuItem: Omit<MenuItem, '_id' | 'createdAt' | 'updatedAt'>): Promise<MenuItem> => {
    const response = await apiCall<MenuItem>('/menu-items', {
      method: 'POST',
      body: JSON.stringify(menuItem),
    });

    if (!response.data) {
      throw new Error('Failed to create menu item');
    }

    return response.data;
  },

  /**
   * Update an existing menu item
   */
  update: async (id: string, menuItem: Partial<MenuItem>): Promise<MenuItem> => {
    const response = await apiCall<MenuItem>(`/menu-items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(menuItem),
    });

    if (!response.data) {
      throw new Error('Failed to update menu item');
    }

    return response.data;
  },

  /**
   * Delete a menu item
   */
  delete: async (id: string): Promise<void> => {
    await apiCall(`/menu-items/${id}`, {
      method: 'DELETE',
    });
  },
};

// Categories API
export const categoriesApi = {
  /**
   * Get all categories
   */
  getAll: async (): Promise<Category[]> => {
    const response = await apiCall<Category[]>('/categories');
    return response.data || [];
  },

  /**
   * Get a single category by ID
   */
  getById: async (id: string): Promise<Category | null> => {
    const response = await apiCall<Category>(`/categories/${id}`);
    return response.data || null;
  },

  /**
   * Create a new category
   */
  create: async (category: Omit<Category, '_id' | 'createdAt' | 'updatedAt'>): Promise<Category> => {
    const response = await apiCall<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    });

    if (!response.data) {
      throw new Error('Failed to create category');
    }

    return response.data;
  },

  /**
   * Update an existing category
   */
  update: async (id: string, category: Partial<Category>): Promise<Category> => {
    const response = await apiCall<Category>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(category),
    });

    if (!response.data) {
      throw new Error('Failed to update category');
    }

    return response.data;
  },

  /**
   * Delete a category
   */
  delete: async (id: string): Promise<void> => {
    await apiCall(`/categories/${id}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Check if API is available
 */
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/api/health`);
    return response.ok;
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
};

/**
 * Upload an image file
 * @param file - The image file to upload
 * @returns The uploaded file information including the path
 */
export const uploadImage = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary for FormData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    // Return the full URL to the uploaded image
    return `${SERVER_BASE_URL}${data.data.path}`;
  } catch (error) {
    console.error('Image upload error:', error);
    throw error;
  }
};

/**
 * Delete an uploaded image
 * @param filename - The filename to delete (extracted from URL)
 */
export const deleteUploadedImage = async (imageUrl: string): Promise<void> => {
  try {
    // Extract filename from URL
    const filename = imageUrl.split('/').pop();
    if (!filename) {
      throw new Error('Invalid image URL');
    }

    const response = await fetch(`${API_BASE_URL}/upload/${filename}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to delete image');
    }
  } catch (error) {
    console.error('Image delete error:', error);
    throw error;
  }
};

/**
 * Get the full image URL from a path
 * Handles both old-style relative paths and new upload paths
 */
export const getImageUrl = (imagePath: string): string => {
  if (!imagePath) {
    return '/placeholder.svg';
  }

  // If it's already a full URL, return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // If it starts with /uploads, prepend server base URL
  if (imagePath.startsWith('/uploads/')) {
    return `${SERVER_BASE_URL}${imagePath}`;
  }

  // Otherwise, assume it's a public asset
  return imagePath;
};

// Orders API
export const ordersApi = {
  /**
   * Get all orders
   * @param filters - Optional filters (isPaid, status, customerName, limit)
   */
  getAll: async (filters?: {
    isPaid?: boolean;
    status?: string;
    customerName?: string;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<Order[]> => {
    const params = new URLSearchParams();
    if (filters?.isPaid !== undefined) params.append('isPaid', String(filters.isPaid));
    if (filters?.status) params.append('status', filters.status);
    if (filters?.customerName) params.append('customerName', filters.customerName);
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

    const queryString = params.toString();
    const endpoint = `/orders${queryString ? `?${queryString}` : ''}`;

    const response = await apiCall<Order[]>(endpoint);
    return response.data || [];
  },

  /**
   * Get a single order by ID
   */
  getById: async (id: string): Promise<Order | null> => {
    const response = await apiCall<Order>(`/orders/${id}`);
    return response.data || null;
  },

  /**
   * Create a new order
   */
  create: async (order: {
    id: string;
    customerName: string;
    items: OrderItem[];
    createdAt?: number;
    isPaid?: boolean;
    orderType: "dine-in" | "take-out";
    appendedOrders?: AppendedOrder[];
  }): Promise<Order> => {
    const response = await apiCall<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    });

    if (!response.data) {
      throw new Error('Failed to create order');
    }

    return response.data;
  },

  /**
   * Update an existing order
   */
  update: async (id: string, order: Partial<Order>): Promise<Order> => {
    const response = await apiCall<Order>(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(order),
    });

    if (!response.data) {
      throw new Error('Failed to update order');
    }

    return response.data;
  },

  /**
   * Delete an order
   */
  delete: async (id: string): Promise<void> => {
    await apiCall(`/orders/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Append items to an existing order
   */
  appendItems: async (
    id: string,
    items: OrderItem[],
    createdAt?: number,
    isPaid?: boolean
  ): Promise<Order> => {
    const response = await apiCall<Order>(`/orders/${id}/append`, {
      method: 'POST',
      body: JSON.stringify({ items, createdAt, isPaid }),
    });

    if (!response.data) {
      throw new Error('Failed to append items');
    }

    return response.data;
  },

  /**
   * Update the status of a specific item in an order
   */
  updateItemStatus: async (
    orderId: string,
    itemId: string,
    status: "pending" | "preparing" | "ready" | "served"
  ): Promise<Order> => {
    const response = await apiCall<Order>(`/orders/${orderId}/items/${itemId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });

    if (!response.data) {
      throw new Error('Failed to update item status');
    }

    return response.data;
  },

  /**
   * Update the status of a specific item in an appended order
   */
  updateAppendedItemStatus: async (
    orderId: string,
    appendedId: string,
    itemId: string,
    status: "pending" | "preparing" | "ready" | "served"
  ): Promise<Order> => {
    const response = await apiCall<Order>(`/orders/${orderId}/appended/${appendedId}/items/${itemId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });

    if (!response.data) {
      throw new Error('Failed to update appended item status');
    }

    return response.data;
  },

  /**
   * Toggle payment status of main order
   */
  togglePayment: async (id: string, isPaid?: boolean, paymentMethod?: "cash" | "gcash"): Promise<Order> => {
    const body: any = {};
    if (isPaid !== undefined) body.isPaid = isPaid;
    if (paymentMethod) body.paymentMethod = paymentMethod;

    const response = await apiCall<Order>(`/orders/${id}/payment`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });

    if (!response.data) {
      throw new Error('Failed to update payment status');
    }

    return response.data;
  },

  /**
   * Toggle payment status of an appended order
   */
  toggleAppendedPayment: async (
    orderId: string,
    appendedId: string,
    isPaid?: boolean,
    paymentMethod?: "cash" | "gcash"
  ): Promise<Order> => {
    const body: any = {};
    if (isPaid !== undefined) body.isPaid = isPaid;
    if (paymentMethod) body.paymentMethod = paymentMethod;

    const response = await apiCall<Order>(`/orders/${orderId}/appended/${appendedId}/payment`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });

    if (!response.data) {
      throw new Error('Failed to update appended order payment status');
    }

    return response.data;
  },

  /**
   * Delete an appended order
   */
  deleteAppended: async (orderId: string, appendedId: string): Promise<Order> => {
    const response = await apiCall<Order>(`/orders/${orderId}/appended/${appendedId}`, {
      method: 'DELETE',
    });

    if (!response.data) {
      throw new Error('Failed to delete appended order');
    }

    return response.data;
  },

  /**
   * Get order statistics summary
   */
  getStats: async (): Promise<{
    totalOrders: number;
    paidOrders: number;
    unpaidOrders: number;
    todayOrders: number;
    totalRevenue: number;
  }> => {
    const response = await apiCall<any>('/orders/stats/summary');
    return response.data || {
      totalOrders: 0,
      paidOrders: 0,
      unpaidOrders: 0,
      todayOrders: 0,
      totalRevenue: 0
    };
  },
};
