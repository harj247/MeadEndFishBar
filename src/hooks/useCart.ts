import { useState, useEffect, useCallback } from 'react';
import { CartItem, MenuItem } from '@/types';

const CART_KEY = 'mead_end_cart';

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((menuItem: MenuItem, selectedOptions?: Record<string, string>, notes?: string) => {
    const cartItemId = `${menuItem.id}-${Date.now()}`;
    setItems(prev => {
      // Check if identical item exists (same id, same options)
      const optionKey = JSON.stringify(selectedOptions || {});
      const existing = prev.find(i =>
        i.menuItemId === menuItem.id &&
        JSON.stringify(i.selectedOptions || {}) === optionKey &&
        !i.notes && !notes
      );
      if (existing) {
        return prev.map(i =>
          i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, {
        id: cartItemId,
        menuItemId: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: 1,
        selectedOptions,
        notes,
      }];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(i => i.id !== id));
    } else {
      setItems(prev => prev.map(i => i.id === id ? { ...i, quantity } : i));
    }
  }, []);

  const updateItemNote = useCallback((id: string, note: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, notes: note || undefined } : i));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return { items, addItem, removeItem, updateQuantity, updateItemNote, clearCart, subtotal, itemCount };
}
