import { useState, useEffect, useCallback, useRef } from 'react';
import { Order, CartItem } from '@/types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// ── Helpers ─────────────────────────────────────────────────────────

function generateOrderNumber(): string {
  return String(Math.floor(Math.random() * 900) + 100);
}

// Normalise a single item from any source into CartItem shape
function normaliseItem(raw: unknown, idx: number): CartItem {
  if (!raw || typeof raw !== 'object') {
    return { id: String(idx), menuItemId: '', name: 'Unknown item', price: 0, quantity: 1 };
  }
  const r = raw as Record<string, unknown>;
  // Support both camelCase and snake_case field names from any source
  const name       = String(r.name       ?? r.item_name    ?? r.product_name ?? '');
  const rawPrice   = r.price             ?? r.unit_price   ?? r.item_price   ?? 0;
  const rawQty     = r.quantity          ?? r.qty          ?? r.count        ?? 1;
  const id         = String(r.id         ?? r.item_id      ?? idx);
  const menuItemId = String(r.menuItemId ?? r.menu_item_id ?? id);
  const notes      = String(r.notes      ?? r.note         ?? r.selectedNote ?? '') || undefined;
  const price      = Number(rawPrice);
  const quantity   = Number(rawQty);
  return {
    id,
    menuItemId,
    name:     name     || 'Item',
    price:    isNaN(price)    ? 0 : price,
    quantity: isNaN(quantity) ? 1 : quantity,
    notes,
  };
}

// Parse items field — handles single or double JSON serialisation and unknown shapes
function parseItems(raw: unknown): CartItem[] {
  let parsed: unknown = raw;
  // Unwrap any number of JSON string wrapping layers (handles double-serialised JSONB)
  let attempts = 0;
  while (typeof parsed === 'string' && attempts < 4) {
    try { parsed = JSON.parse(parsed); } catch { break; }
    attempts++;
  }
  // If still not an array, try wrapping in array
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    parsed = [parsed];
  }
  if (!Array.isArray(parsed)) {
    console.warn('[parseItems] Could not parse items:', typeof raw, String(raw).slice(0, 100));
    return [];
  }
  return parsed.map((item, idx) => normaliseItem(item, idx));
}

// Convert a Supabase row → our Order type
function rowToOrder(row: Record<string, unknown>): Order {
  return {
    id:            row.id as string,
    orderNumber:   row.order_number as string,
    items:         parseItems(row.items),
    subtotal:      Number(row.subtotal),
    total:         Number(row.total),
    customerName:  row.customer_name as string,
    customerPhone: row.customer_phone as string,
    customerEmail: (row.customer_email as string | null) ?? undefined,
    notes:         (row.notes as string | null) ?? undefined,
    prepTime:      (row.prep_time as string | null) ?? undefined,
    status:        row.status as Order['status'],
    createdAt:     row.created_at as string,
    estimatedReady:   (row.estimated_ready  as string | null) ?? undefined,
    deliveryAddress:   (row.delivery_address as string | null) ?? undefined,
  };
}

// ── Customer hook (place order + read single order) ─────────────────

export function useOrders() {
  const placeOrder = useCallback(
    async (
      orderData: Omit<Order, 'id' | 'orderNumber' | 'status' | 'createdAt'>,
      initialStatus: Order['status'] = 'new'
    ): Promise<Order> => {
      const newOrder = {
        order_number:   generateOrderNumber(),
        items:          JSON.stringify(orderData.items),
        subtotal:       orderData.subtotal,
        total:          orderData.total,
        customer_name:  orderData.customerName,
        customer_phone: orderData.customerPhone,
        customer_email: orderData.customerEmail ?? null,
        notes:          orderData.notes ?? null,
        prep_time:      orderData.prepTime ?? null,
        status:         initialStatus,
      };

      console.log('[useOrders] Placing order:', newOrder.order_number);

      const { data, error } = await supabase
        .from('orders')
        .insert(newOrder)
        .select()
        .single();

      if (error || !data) {
        console.error('[useOrders] Insert error:', error);
        throw new Error(error?.message ?? 'Failed to place order');
      }

      console.log('[useOrders] Order placed, id:', data.id);
      return rowToOrder(data as Record<string, unknown>);
    },
    []
  );

  const getOrder = useCallback(async (id: string): Promise<Order | undefined> => {
    console.log('[useOrders] Fetching order:', id);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error('[useOrders] Fetch error:', error);
      return undefined;
    }
    const order = rowToOrder(data as Record<string, unknown>);
    console.log(`[useOrders] getOrder #${order.orderNumber} status=${order.status} estimatedReady=${order.estimatedReady ?? 'null'} prepTime=${order.prepTime ?? 'null'}`);
    return order;
  }, []);

  /** Count previous orders from the same phone number */
  const getCustomerOrderCount = useCallback(async (phone: string): Promise<number> => {
    const { count, error } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('customer_phone', phone);
    if (error) return 0;
    return count ?? 0;
  }, []);

  return { placeOrder, getOrder, getCustomerOrderCount };
}

// ── Kitchen hook (poll all orders every 3 s) ────────────────────────

export function useKitchenOrders() {
  const [orders, setOrders]     = useState<Order[]>([]);
  const [loading, setLoading]   = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const firstLoad               = useRef(true);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) console.log('[useKitchenOrders] Fetching orders...');

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      // Only load orders generated by this system (3-digit order numbers)
      // This filters out foreign orders from other deployments sharing the DB
      .not('order_number', 'like', '%-%')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[useKitchenOrders] Fetch error:', error);
      if (!silent) toast.error('Could not load orders from server');
      // Don't wipe existing orders on a failed poll — keep showing last known state
      return;
    }

    const mapped = (data ?? []).map(row => rowToOrder(row as Record<string, unknown>));

    // Always apply updated orders on first load.
    // On subsequent polls, skip only if we got a genuinely empty result AND we
    // already have orders — prevents a transient Supabase empty response from
    // wiping the screen. But if orders actually changed (e.g. customer cancel),
    // we must apply the new list so the kitchen reflects it immediately.
    if (firstLoad.current) {
      setOrders(mapped);
    } else {
      setOrders(prev => {
        // Always update if counts differ or any status has changed
        if (mapped.length === 0 && prev.length > 0) return prev; // guard against transient empty
        const hasChange = mapped.length !== prev.length ||
          mapped.some(m => { const p = prev.find(o => o.id === m.id); return !p || p.status !== m.status; });
        return hasChange ? mapped : prev;
      });
    }
    setLastSync(new Date());

    if (firstLoad.current) {
      setLoading(false);
      firstLoad.current = false;
      console.log(`[useKitchenOrders] Initial load: ${mapped.length} orders`);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchOrders(false);
  }, [fetchOrders]);

  // Poll every 1.5 seconds — fast enough to catch customer-side cancellations promptly
  useEffect(() => {
    const interval = setInterval(() => fetchOrders(true), 1500);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const updateOrderStatus = useCallback(
    async (
      id: string,
      status: Order['status'],
      extra?: { estimatedReady?: string; prepTime?: string },
    ) => {
      console.log('[useKitchenOrders] Updating order', id, '→', status, extra ?? '');

      // Optimistic UI — apply status + any extra fields immediately
      setOrders(prev => prev.map(o =>
        o.id === id
          ? {
              ...o,
              status,
              ...(extra?.estimatedReady ? { estimatedReady: extra.estimatedReady } : {}),
              ...(extra?.prepTime       ? { prepTime:       extra.prepTime       } : {}),
            }
          : o
      ));

      // Build DB payload — always include status; include extra fields when provided
      const payload: Record<string, unknown> = { status };
      if (extra?.estimatedReady) payload.estimated_ready = extra.estimatedReady;
      if (extra?.prepTime)       payload.prep_time       = extra.prepTime;

      const { error } = await supabase
        .from('orders')
        .update(payload)
        .eq('id', id);

      if (error) {
        console.error('[useKitchenOrders] Update error:', error);
        toast.error('Failed to update order status');
        // Roll back optimistic update
        fetchOrders(true);
      }
    },
    [fetchOrders]
  );

  return { orders, loading, lastSync, updateOrderStatus, refresh: fetchOrders };
}
