import { useState, useEffect, useCallback, useRef } from 'react';
import { Order } from '@/types';
import { supabase } from '@/lib/supabase';

// ── Helpers ─────────────────────────────────────────────────────────

function normaliseItem(raw: unknown, idx: number) {
  if (!raw || typeof raw !== 'object') return { id: String(idx), menuItemId: '', name: 'Unknown item', price: 0, quantity: 1 };
  const r = raw as Record<string, unknown>;
  const name     = String(r.name       ?? r.item_name    ?? '');
  const rawPrice = r.price             ?? r.unit_price   ?? 0;
  const rawQty   = r.quantity          ?? r.qty          ?? 1;
  const id       = String(r.id         ?? r.item_id      ?? idx);
  const notes    = String(r.notes      ?? r.note         ?? '') || undefined;
  const price    = Number(rawPrice);
  const quantity = Number(rawQty);
  return { id, menuItemId: String(r.menuItemId ?? r.menu_item_id ?? id), name: name || 'Item', price: isNaN(price) ? 0 : price, quantity: isNaN(quantity) ? 1 : quantity, notes };
}

function parseItems(raw: unknown) {
  let parsed: unknown = raw;
  let attempts = 0;
  while (typeof parsed === 'string' && attempts < 4) {
    try { parsed = JSON.parse(parsed); } catch { break; }
    attempts++;
  }
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) parsed = [parsed];
  if (!Array.isArray(parsed)) return [];
  return parsed.map((item, idx) => normaliseItem(item, idx));
}

function rowToOrder(row: Record<string, unknown>): Order {
  return {
    id:             row.id as string,
    orderNumber:    row.order_number as string,
    items:          parseItems(row.items),
    subtotal:       Number(row.subtotal),
    total:          Number(row.total),
    customerName:   row.customer_name as string,
    customerPhone:  row.customer_phone as string,
    notes:          (row.notes as string | null) ?? undefined,
    prepTime:       (row.prep_time as string | null) ?? undefined,
    status:         row.status as Order['status'],
    createdAt:      row.created_at as string,
    estimatedReady: (row.estimated_ready  as string | null) ?? undefined,
    deliveryAddress:(row.delivery_address as string | null) ?? undefined,
  };
}

/**
 * Fetches and polls orders for a specific customer phone number.
 * Polls every 5 seconds for status updates on active orders.
 */
export function useCustomerOrders(phone: string | null) {
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const firstLoad = useRef(true);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!phone) { setOrders([]); setLoading(false); return; }

    const { data, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_phone', phone)
      .order('created_at', { ascending: false })
      .limit(50);

    if (fetchError) {
      console.error('[useCustomerOrders] Fetch error:', fetchError);
      if (!silent) setError('Could not load your orders.');
      setLoading(false);
      return;
    }

    const mapped = (data ?? []).map(row => rowToOrder(row as Record<string, unknown>));
    setOrders(mapped);
    setError(null);

    if (firstLoad.current) {
      setLoading(false);
      firstLoad.current = false;
    }
  }, [phone]);

  // Initial load
  useEffect(() => {
    firstLoad.current = true;
    setLoading(true);
    fetchOrders(false);
  }, [fetchOrders]);

  // Poll every 5 s — only while there is an active order
  useEffect(() => {
    const hasActive = orders.some(o => !['collected'].includes(o.status));
    if (!hasActive) return;
    const interval = setInterval(() => fetchOrders(true), 5000);
    return () => clearInterval(interval);
  }, [orders, fetchOrders]);

  return { orders, loading, error, refresh: () => fetchOrders(false) };
}
