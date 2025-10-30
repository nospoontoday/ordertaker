import { useState, useEffect, useCallback } from 'react';
import { orderDB, Order } from '@/lib/db';

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Load orders from IndexedDB
  const loadOrders = useCallback(async () => {
    try {
      const loadedOrders = await orderDB.getAllOrders();
      setOrders(loadedOrders);
    } catch (error) {
      console.error('Failed to load orders:', error);
      // Fallback to localStorage if IndexedDB fails
      const fallbackData = localStorage.getItem('orders');
      if (fallbackData) {
        setOrders(JSON.parse(fallbackData));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Save order to IndexedDB
  const saveOrder = useCallback(async (order: Order) => {
    try {
      await orderDB.saveOrder(order);
      await loadOrders(); // Reload to get updated list
    } catch (error) {
      console.error('Failed to save order:', error);
      throw error;
    }
  }, [loadOrders]);

  // Save multiple orders
  const saveOrders = useCallback(async (ordersToSave: Order[]) => {
    try {
      await orderDB.saveOrders(ordersToSave);
      await loadOrders(); // Reload to get updated list
    } catch (error) {
      console.error('Failed to save orders:', error);
      throw error;
    }
  }, [loadOrders]);

  // Delete order
  const deleteOrder = useCallback(async (orderId: string) => {
    try {
      await orderDB.deleteOrder(orderId);
      await loadOrders(); // Reload to get updated list
    } catch (error) {
      console.error('Failed to delete order:', error);
      throw error;
    }
  }, [loadOrders]);

  // Get single order
  const getOrder = useCallback(async (orderId: string): Promise<Order | undefined> => {
    try {
      return await orderDB.getOrder(orderId);
    } catch (error) {
      console.error('Failed to get order:', error);
      return undefined;
    }
  }, []);

  // Update order in list (optimistic update)
  const updateOrderOptimistic = useCallback((updatedOrder: Order) => {
    setOrders(prevOrders =>
      prevOrders.map(order => order.id === updatedOrder.id ? updatedOrder : order)
    );
    // Save in background
    saveOrder(updatedOrder).catch(console.error);
  }, [saveOrder]);

  // Load orders on mount
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  return {
    orders,
    loading,
    saveOrder,
    saveOrders,
    deleteOrder,
    getOrder,
    updateOrderOptimistic,
    reloadOrders: loadOrders,
  };
}
