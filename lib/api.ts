/**
 * API Client for Order Taker Backend
 * Handles all HTTP requests to the backend API
 */

import { BranchId } from './branches';

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
  onlineImage?: string;  // Image shown to online customers (placeholder if empty)
  isBestSeller?: boolean;
  isPublic?: boolean;    // If true, visible to online customers (default: false)
  owner?: "john" | "elwin";
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  _id?: string;
  id: string;
  name: string;
  image: string;
  isPublic?: boolean;    // If true, visible to online customers (default: false)
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  owner?: "john" | "elwin";
  price: number;
  quantity: number;
  status: "pending" | "preparing" | "ready" | "served";
  itemType?: "dine-in" | "take-out";
  note?: string;
  preparingAt?: number;
  readyAt?: number;
  servedAt?: number;
  preparedBy?: string;
  preparedByEmail?: string;
  servedBy?: string;
  servedByEmail?: string;
}

export interface Cart {
  customerName: string;
  orderType: "dine-in" | "take-out";
  orderNote: string;
  items: OrderItem[];
}

export interface AppendedOrder {
  id: string;
  items: OrderItem[];
  createdAt: number;
  isPaid?: boolean;
  paymentMethod?: "cash" | "gcash" | "split" | null;
  cashAmount?: number;
  gcashAmount?: number;
  paidAmount?: number;
  amountReceived?: number;
  paidAsWholeOrder?: boolean;
}

export interface Withdrawal {
  _id?: string;
  type: "withdrawal" | "purchase";
  amount: number;
  description: string;
  createdAt: number;
  createdBy?: {
    userId?: string;
    name?: string;
    email?: string;
  };
  paymentMethod?: "cash" | "gcash" | null;
  chargedTo?: "john" | "elwin" | "all";
}

export interface OrderNote {
  id: string;
  content: string;
  createdAt: number;
  createdBy?: string;
  createdByEmail?: string;
}

export interface Order {
  _id?: string;
  id: string;
  orderNumber?: number;
  customerName: string;
  items: OrderItem[];
  createdAt: number;
  isPaid: boolean;
  paymentMethod?: "cash" | "gcash" | "split" | null;
  cashAmount?: number;
  gcashAmount?: number;
  paidAmount?: number;
  amountReceived?: number;
  paidAsWholeOrder?: boolean;
  orderType: "dine-in" | "take-out";
  appendedOrders?: AppendedOrder[];
  totalAmount?: number;
  totalItems?: number;
  totalPaidAmount?: number;
  pendingAmount?: number;
  orderStatus?: "pending" | "in_progress" | "completed";
  allItemsServedAt?: number;
  orderTakerName?: string;
  orderTakerEmail?: string;
  notes?: OrderNote[];
  // Online order fields
  orderSource?: "counter" | "online";
  onlineOrderCode?: string;
  onlinePaymentStatus?: "pending" | "confirmed" | null;
  selectedPaymentMethod?: "cash" | "gcash" | null;
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
   * @param filters - Optional filters (branchId, isPaid, status, customerName, limit)
   */
  getAll: async (filters?: {
    branchId?: BranchId;
    isPaid?: boolean;
    status?: string;
    customerName?: string;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<Order[]> => {
    const params = new URLSearchParams();
    if (filters?.branchId) params.append('branchId', filters.branchId);
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
    branchId?: BranchId;
    customerName: string;
    items: OrderItem[];
    createdAt?: number;
    isPaid?: boolean;
    paymentMethod?: "cash" | "gcash" | "split" | null;
    orderType: "dine-in" | "take-out";
    appendedOrders?: AppendedOrder[];
    orderTakerName?: string;
    orderTakerEmail?: string;
    notes?: OrderNote[];
    cashAmount?: number;
    gcashAmount?: number;
    amountReceived?: number;
    // Online order fields
    orderSource?: "counter" | "online";
    onlineOrderCode?: string;
    onlinePaymentStatus?: "pending" | "confirmed" | null;
    selectedPaymentMethod?: "cash" | "gcash" | null;
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
   * Delete an order (super admin only)
   * @param id - Order ID to delete
   * @param userId - User ID for authorization (must be super_admin)
   */
  delete: async (id: string, userId: string): Promise<void> => {
    await apiCall(`/orders/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    });
  },

  /**
   * Append items to an existing order
   */
  appendItems: async (
    id: string,
    items: OrderItem[],
    createdAt?: number,
    isPaid?: boolean,
    paymentMethod?: "cash" | "gcash" | "split",
    cashAmount?: number,
    gcashAmount?: number,
    amountReceived?: number
  ): Promise<Order> => {
    const body: any = { items, createdAt, isPaid };
    if (paymentMethod) body.paymentMethod = paymentMethod;
    if (cashAmount !== undefined) body.cashAmount = cashAmount;
    if (gcashAmount !== undefined) body.gcashAmount = gcashAmount;
    if (amountReceived !== undefined) body.amountReceived = amountReceived;

    const response = await apiCall<Order>(`/orders/${id}/append`, {
      method: 'POST',
      body: JSON.stringify(body),
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
    status: "pending" | "preparing" | "ready" | "served",
    additionalFields?: Partial<OrderItem>
  ): Promise<Order> => {
    const response = await apiCall<Order>(`/orders/${orderId}/items/${itemId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, ...additionalFields }),
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
    status: "pending" | "preparing" | "ready" | "served",
    additionalFields?: Partial<OrderItem>
  ): Promise<Order> => {
    const response = await apiCall<Order>(`/orders/${orderId}/appended/${appendedId}/items/${itemId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, ...additionalFields }),
    });

    if (!response.data) {
      throw new Error('Failed to update appended item status');
    }

    return response.data;
  },

  /**
   * Toggle payment status of main order
   */
  togglePayment: async (
    id: string,
    isPaid?: boolean,
    paymentMethod?: "cash" | "gcash" | "split",
    cashAmount?: number,
    gcashAmount?: number,
    amountReceived?: number,
    paidAsWholeOrder?: boolean
  ): Promise<Order> => {
    const body: any = {};
    if (isPaid !== undefined) body.isPaid = isPaid;
    if (paymentMethod) body.paymentMethod = paymentMethod;
    if (cashAmount !== undefined) body.cashAmount = cashAmount;
    if (gcashAmount !== undefined) body.gcashAmount = gcashAmount;
    if (amountReceived !== undefined) body.amountReceived = amountReceived;
    if (paidAsWholeOrder !== undefined) body.paidAsWholeOrder = paidAsWholeOrder;

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
    paymentMethod?: "cash" | "gcash" | "split",
    cashAmount?: number,
    gcashAmount?: number,
    amountReceived?: number,
    paidAsWholeOrder?: boolean
  ): Promise<Order> => {
    const body: any = {};
    if (isPaid !== undefined) body.isPaid = isPaid;
    if (paymentMethod) body.paymentMethod = paymentMethod;
    if (cashAmount !== undefined) body.cashAmount = cashAmount;
    if (gcashAmount !== undefined) body.gcashAmount = gcashAmount;
    if (amountReceived !== undefined) body.amountReceived = amountReceived;
    if (paidAsWholeOrder !== undefined) body.paidAsWholeOrder = paidAsWholeOrder;

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

  /**
   * Get pending online orders
   */
  getOnlineOrders: async (): Promise<Order[]> => {
    const response = await fetch(`${API_BASE_URL}/orders/online`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  },

  /**
   * Get count of pending online orders
   */
  getOnlineOrdersCount: async (): Promise<{ count: number }> => {
    const response = await fetch(`${API_BASE_URL}/orders/online/count`);
    const data = await response.json();
    return data || { count: 0 };
  },

  /**
   * Confirm payment for an online order
   */
  confirmOnlinePayment: async (orderId: string): Promise<Order> => {
    const response = await apiCall<Order>(`/orders/${orderId}/confirm-payment`, {
      method: 'PUT',
    });

    if (!response.data) {
      throw new Error('Failed to confirm online payment');
    }

    return response.data;
  },

  /**
   * Get order codes currently in use by pending (for approval) online orders
   * Used to ensure unique code generation - codes can be recycled once confirmed
   */
  getPendingOnlineOrderCodes: async (): Promise<string[]> => {
    const response = await apiCall<string[]>('/orders/online/pending-codes');
    return response.data || [];
  },

  /**
   * Delete a pending online order (before payment confirmation)
   * Crew members can delete pending online orders
   */
  deleteOnlineOrder: async (orderId: string): Promise<void> => {
    await apiCall(`/orders/online/${orderId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get orders that are currently being prepared
   * Returns orders where at least one item has status "preparing"
   * Excludes pending online orders (not yet confirmed by crew)
   */
  getPreparingOrders: async (branchId?: string): Promise<Order[]> => {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);
    const queryString = params.toString();
    const endpoint = `/orders/preparing${queryString ? `?${queryString}` : ''}`;

    const response = await apiCall<Order[]>(endpoint);
    return response.data || [];
  },
};

// Cart API
export const cartApi = {
  /**
   * Get cart for a user
   * @param userEmail - User's email
   */
  get: async (userEmail: string): Promise<Cart> => {
    const response = await apiCall<{ data: Cart }>(
      `/cart/${encodeURIComponent(userEmail)}`,
      {
        method: "GET",
      }
    );
    return response.data;
  },

  /**
   * Save cart for a user
   * @param userEmail - User's email
   * @param cart - Cart data to save
   */
  save: async (userEmail: string, cart: Cart): Promise<Cart> => {
    const response = await apiCall<{ data: Cart }>(
      `/cart`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userEmail,
          ...cart,
        }),
      }
    );
    return response.data;
  },

  /**
   * Clear cart for a user
   * @param userEmail - User's email
   */
  clear: async (userEmail: string): Promise<void> => {
    await apiCall(
      `/cart/${encodeURIComponent(userEmail)}`,
      {
        method: "DELETE",
      }
    );
  },
};

// Withdrawals API
export const withdrawalsApi = {
  /**
   * Get all withdrawals/purchases
   * @param filters - Optional filters (type, startDate, endDate, limit)
   */
  getAll: async (filters?: {
    branchId?: BranchId;
    type?: "withdrawal" | "purchase";
    startDate?: number;
    endDate?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }): Promise<Withdrawal[]> => {
    const params = new URLSearchParams();
    if (filters?.branchId) params.append("branchId", filters.branchId);
    if (filters?.type) params.append("type", filters.type);
    if (filters?.startDate !== undefined) params.append("startDate", String(filters.startDate));
    if (filters?.endDate !== undefined) params.append("endDate", String(filters.endDate));
    if (filters?.limit) params.append("limit", String(filters.limit));
    if (filters?.sortBy) params.append("sortBy", filters.sortBy);
    if (filters?.sortOrder) params.append("sortOrder", filters.sortOrder);

    const queryString = params.toString();
    const endpoint = `/withdrawals${queryString ? `?${queryString}` : ""}`;

    const response = await apiCall<Withdrawal[]>(endpoint);
    return response.data || [];
  },

  /**
   * Get a single withdrawal by ID
   */
  getById: async (id: string): Promise<Withdrawal | null> => {
    const response = await apiCall<Withdrawal>(`/withdrawals/${id}`);
    return response.data || null;
  },

  /**
   * Create a new withdrawal or purchase
   */
  create: async (withdrawal: {
    branchId?: BranchId;
    type: "withdrawal" | "purchase";
    amount: number;
    description: string;
    createdAt?: number; // Optional timestamp - if not provided, backend uses current time
    createdBy?: {
      userId?: string;
      name?: string;
      email?: string;
    };
    paymentMethod?: "cash" | "gcash" | null;
    chargedTo?: "john" | "elwin" | "all"; // Who this withdrawal/purchase is charged to
  }): Promise<Withdrawal> => {
    const response = await apiCall<Withdrawal>("/withdrawals", {
      method: "POST",
      body: JSON.stringify(withdrawal),
    });

    if (!response.data) {
      throw new Error("Failed to create withdrawal");
    }

    return response.data;
  },

  /**
   * Delete a withdrawal
   */
  delete: async (id: string): Promise<void> => {
    await apiCall(`/withdrawals/${id}`, {
      method: "DELETE",
    });
  },
};

// Daily Sales API
export interface DailySalesSummary {
  date: string;
  dateTimestamp: number;
  itemsByCategory: {
    [category: string]: Array<{
      name: string;
      price: number;
      quantity: number;
      total: number;
    }>;
  };
  withdrawals: Withdrawal[];
  purchases: Withdrawal[];
  totalSales: number;
  // Gross amounts (before deductions)
  grossCash: number;
  grossGcash: number;
  // Net amounts (after deductions)
  totalCash: number;
  totalGcash: number;
  // Breakdown by payment method
  totalCashWithdrawals: number;
  totalGcashWithdrawals: number;
  totalCashPurchases: number;
  totalGcashPurchases: number;
  totalWithdrawals: number;
  totalPurchases: number;
  netSales: number;
  // Owner breakdown
  salesByOwner: {
    john: number;
    elwin: number;
  };
  withdrawalsByOwner: {
    john: number;
    elwin: number;
    all: number;  // Split withdrawals
  };
  purchasesByOwner: {
    john: number;
    elwin: number;
    all: number;  // Split purchases
  };
  netTotalsByOwner: {
    john: number;
    elwin: number;
  };
  // Validation status
  isValidated?: boolean;
  validatedAt?: number | null;
  validatedBy?: {
    userId: string;
    name: string;
    email: string;
  } | null;
}

export const dailySalesApi = {
  /**
   * Get daily sales summaries with pagination
   */
  getDailySales: async (page: number = 1, limit: number = 10, branchId?: BranchId): Promise<{
    data: DailySalesSummary[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> => {
    const params = new URLSearchParams();
    params.append("page", String(page));
    params.append("limit", String(limit));
    if (branchId) params.append("branchId", branchId);

    const response = await apiCall<{
      data: DailySalesSummary[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/orders/daily-sales?${params.toString()}`);

    return {
      data: response.data || [],
      pagination: response.pagination || {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    };
  },
  /**
   * Get detailed orders and withdrawals for a specific date
   */
  getDailySalesDetails: async (date: string): Promise<{
    orders: Order[];
    withdrawals: Withdrawal[];
  }> => {
    const response = await apiCall<{
      orders: Order[];
      withdrawals: Withdrawal[];
    }>(`/orders/daily-sales/${date}/details`);

    return response.data || { orders: [], withdrawals: [] };
  },
  /**
   * Mark a daily report as validated (super admin only)
   */
  validateDailyReport: async (date: string, user: { id: string; email: string; name: string; role: string }): Promise<void> => {
    await apiCall(`/orders/daily-sales/${date}/validate`, {
      method: "POST",
      body: JSON.stringify({ user }),
    });
  },
  /**
   * Delete a daily sales report (admin/super_admin only)
   */
  deleteDailyReport: async (date: string, userId: string): Promise<void> => {
    await apiCall(`/orders/daily-sales/${date}`, {
      method: "DELETE",
      body: JSON.stringify({ userId }),
    });
  },
};

// Business Intelligence Insights Types
export interface BusinessInsights {
  executiveSummary: string[];
  productPerformance: {
    topSellersByRevenue: Array<{
      name: string;
      quantity: number;
      revenue: number;
      orderCount: number;
      avgPrepTime: number | null;
      avgRevenuePerOrder: number;
    }>;
    topSellersByQuantity: Array<{
      name: string;
      quantity: number;
      revenue: number;
      orderCount: number;
      avgPrepTime: number | null;
      avgRevenuePerOrder: number;
    }>;
    slowMovingItems: Array<{
      name: string;
      quantity: number;
      revenue: number;
      orderCount: number;
      avgPrepTime: number | null;
      avgRevenuePerOrder: number;
    }>;
    trendingUp: Array<{
      name: string;
      quantity: number;
      revenue: number;
      orderCount: number;
      avgPrepTime: number | null;
      avgRevenuePerOrder: number;
      growth: number;
    }>;
    trendingDown: Array<{
      name: string;
      quantity: number;
      revenue: number;
      orderCount: number;
      avgPrepTime: number | null;
      avgRevenuePerOrder: number;
      growth: number;
    }>;
  };
  peakTimes: {
    busiestHours: Array<{
      hour: number;
      orders: number;
      revenue: number;
      avgOrderValue: number;
    }>;
    slowestHours: Array<{
      hour: number;
      orders: number;
      revenue: number;
      avgOrderValue: number;
    }>;
    dayOfWeekPerformance: Array<{
      day: number;
      dayName: string;
      orders: number;
      revenue: number;
      avgOrderValue: number;
    }>;
    hourlyBreakdown: Array<{
      hour: number;
      orders: number;
      revenue: number;
      avgOrderValue: number;
    }>;
  };
  customerInsights: {
    highValueCustomers: Array<{
      name: string;
      orders: number;
      revenue: number;
      avgOrderValue: number;
      uniqueItems: number;
    }>;
    avgRevenuePerCustomer: number;
    totalCustomers: number;
    popularCombinations: Array<{
      item1: string;
      item2: string;
      count: number;
    }>;
  };
  preparationTime: {
    overallAverage: number | null;
    slowestItems: Array<{
      itemName: string;
      avgPrepTime: number;
      minPrepTime: number;
      maxPrepTime: number;
      count: number;
    }>;
    unit: string;
  };
  categoryPerformance: Array<{
    category: string;
    revenue: number;
    quantity: number;
  }>;
  recommendations: Array<{
    type: string;
    priority: string;
    title: string;
    description: string;
    [key: string]: any;
  }>;
  alerts: Array<{
    type: string;
    severity: string;
    message: string;
    [key: string]: any;
  }>;
  summary: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    uniqueCustomers: number;
    totalItemsSold: number;
    revenueTrend: number;
    dateRange: {
      start: string;
      end: string;
      days: number;
    };
  };
  dailyRevenue: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
}

export const insightsApi = {
  /**
   * Get comprehensive business intelligence insights for a branch
   */
  getInsights: async (branchId?: BranchId): Promise<BusinessInsights> => {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);
    const queryString = params.toString();
    const endpoint = `/orders/insights${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiCall<BusinessInsights>(endpoint);
    return response.data || {
      executiveSummary: [],
      productPerformance: {
        topSellersByRevenue: [],
        topSellersByQuantity: [],
        slowMovingItems: [],
        trendingUp: [],
        trendingDown: []
      },
      peakTimes: {
        busiestHours: [],
        slowestHours: [],
        dayOfWeekPerformance: [],
        hourlyBreakdown: []
      },
      customerInsights: {
        highValueCustomers: [],
        avgRevenuePerCustomer: 0,
        totalCustomers: 0,
        popularCombinations: []
      },
      preparationTime: {
        overallAverage: null,
        slowestItems: [],
        unit: 'minutes'
      },
      categoryPerformance: [],
      recommendations: [],
      alerts: [],
      summary: {
        totalRevenue: 0,
        totalOrders: 0,
        avgOrderValue: 0,
        uniqueCustomers: 0,
        totalItemsSold: 0,
        revenueTrend: 0,
        dateRange: {
          start: '',
          end: '',
          days: 90
        }
      },
      dailyRevenue: []
    };
  },
};

// Stats types
export interface StatsData {
  averageWaitTimeMs: number;
  completedOrdersCount: number;
  totalWaitTimeMs: number;
  lastUpdated: number;
}

// Stats API
export const statsApi = {
  /**
   * Get statistics for a branch including historical average wait time
   */
  get: async (branchId?: BranchId): Promise<StatsData> => {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);
    const queryString = params.toString();
    const endpoint = `/stats${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiCall<StatsData>(endpoint);
    return response.data || {
      averageWaitTimeMs: 0,
      completedOrdersCount: 0,
      totalWaitTimeMs: 0,
      lastUpdated: Date.now()
    };
  },

  /**
   * Recalculate stats from all completed orders for a branch (admin utility)
   */
  recalculate: async (branchId?: BranchId): Promise<StatsData> => {
    const response = await apiCall<StatsData>('/stats/recalculate', {
      method: 'POST',
      body: JSON.stringify({ branchId })
    });
    return response.data || {
      averageWaitTimeMs: 0,
      completedOrdersCount: 0,
      totalWaitTimeMs: 0,
      lastUpdated: Date.now()
    };
  }
};
