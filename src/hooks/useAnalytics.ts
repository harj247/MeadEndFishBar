import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export type AnalyticsPeriod = 'today' | '7days' | '30days' | 'alltime';

export interface DailyStat {
  date: string;   // "Mon", "Tue" or "Jan 1"
  orders: number;
  revenue: number;
}

export interface HourlyStat {
  hour: string;   // "12pm", "1pm"
  orders: number;
}

export interface ItemStat {
  name: string;
  quantity: number;
  revenue: number;
}

export interface AnalyticsData {
  totalOrders:    number;
  totalRevenue:   number;
  avgOrderValue:  number;
  collectionCount: number;
  deliveryCount:   number;
  completedCount:  number;  // collected
  cancelledCount:  number;  // never completed (not used — kept for extension)
  dailyStats:     DailyStat[];
  hourlyStats:    HourlyStat[];
  topItems:       ItemStat[];
  // Comparison vs previous period
  prevOrders:     number;
  prevRevenue:    number;
}

function startOf(period: AnalyticsPeriod): string | null {
  const now = new Date();
  if (period === 'today') {
    now.setHours(0, 0, 0, 0);
    return now.toISOString();
  }
  if (period === '7days') {
    now.setDate(now.getDate() - 6);
    now.setHours(0, 0, 0, 0);
    return now.toISOString();
  }
  if (period === '30days') {
    now.setDate(now.getDate() - 29);
    now.setHours(0, 0, 0, 0);
    return now.toISOString();
  }
  return null; // alltime
}

function prevPeriodStart(period: AnalyticsPeriod): string | null {
  const now = new Date();
  if (period === 'today') {
    now.setDate(now.getDate() - 1);
    now.setHours(0, 0, 0, 0);
    return now.toISOString();
  }
  if (period === '7days') {
    now.setDate(now.getDate() - 13);
    now.setHours(0, 0, 0, 0);
    return now.toISOString();
  }
  if (period === '30days') {
    now.setDate(now.getDate() - 59);
    now.setHours(0, 0, 0, 0);
    return now.toISOString();
  }
  return null;
}

function prevPeriodEnd(period: AnalyticsPeriod): string | null {
  const now = new Date();
  if (period === 'today') {
    now.setHours(0, 0, 0, 0);
    return now.toISOString();
  }
  if (period === '7days') {
    now.setDate(now.getDate() - 7);
    now.setHours(23, 59, 59, 999);
    return now.toISOString();
  }
  if (period === '30days') {
    now.setDate(now.getDate() - 30);
    now.setHours(23, 59, 59, 999);
    return now.toISOString();
  }
  return null;
}

function buildDailyStats(
  orders: Array<{ created_at: string; total: number }>,
  period: AnalyticsPeriod
): DailyStat[] {
  if (period === 'today') {
    // Group by hour
    const byHour: Record<number, { orders: number; revenue: number }> = {};
    for (const o of orders) {
      const h = new Date(o.created_at).getHours();
      if (!byHour[h]) byHour[h] = { orders: 0, revenue: 0 };
      byHour[h].orders++;
      byHour[h].revenue += Number(o.total);
    }
    const now = new Date().getHours();
    const result: DailyStat[] = [];
    for (let h = 0; h <= now; h++) {
      const ampm = h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
      result.push({ date: ampm, orders: byHour[h]?.orders ?? 0, revenue: byHour[h]?.revenue ?? 0 });
    }
    return result;
  }

  const days = period === '7days' ? 7 : 30;
  const map: Record<string, { orders: number; revenue: number }> = {};
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    map[key] = { orders: 0, revenue: 0 };
  }

  for (const o of orders) {
    const key = new Date(o.created_at).toISOString().slice(0, 10);
    if (map[key]) {
      map[key].orders++;
      map[key].revenue += Number(o.total);
    }
  }

  return Object.entries(map).map(([key, val]) => {
    const d = new Date(key);
    const label = days <= 7
      ? d.toLocaleDateString('en-GB', { weekday: 'short' })
      : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return { date: label, orders: val.orders, revenue: val.revenue };
  });
}

function buildHourlyStats(orders: Array<{ created_at: string }>): HourlyStat[] {
  const byHour: Record<number, number> = {};
  for (let h = 0; h < 24; h++) byHour[h] = 0;
  for (const o of orders) {
    const h = new Date(o.created_at).getHours();
    byHour[h]++;
  }
  return Array.from({ length: 24 }, (_, h) => {
    const ampm = h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
    return { hour: ampm, orders: byHour[h] };
  }).filter(s => s.orders > 0);
}

function buildTopItems(
  orders: Array<{ items: unknown }>
): ItemStat[] {
  const map: Record<string, { quantity: number; revenue: number }> = {};

  for (const o of orders) {
    let items: Array<{ name?: string; quantity?: number; price?: number }> = [];
    try {
      const raw = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
      items = Array.isArray(raw) ? raw : [];
    } catch { /* skip */ }

    for (const item of items) {
      if (!item?.name) continue;
      const qty = Number(item.quantity ?? 1);
      const price = Number(item.price ?? 0);
      if (!map[item.name]) map[item.name] = { quantity: 0, revenue: 0 };
      map[item.name].quantity += qty;
      map[item.name].revenue  += qty * price;
    }
  }

  return Object.entries(map)
    .map(([name, val]) => ({ name, ...val }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8);
}

const EMPTY: AnalyticsData = {
  totalOrders: 0, totalRevenue: 0, avgOrderValue: 0,
  collectionCount: 0, deliveryCount: 0,
  completedCount: 0, cancelledCount: 0,
  dailyStats: [], hourlyStats: [], topItems: [],
  prevOrders: 0, prevRevenue: 0,
};

export function useAnalytics(period: AnalyticsPeriod) {
  const [data, setData]       = useState<AnalyticsData>(EMPTY);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);

    const since = startOf(period);
    // Respect analytics clear date — take whichever is more recent
    const clearedAt = localStorage.getItem('analytics_cleared_at');
    const effectiveSince = since && clearedAt
      ? (since > clearedAt ? since : clearedAt)
      : since ?? clearedAt ?? null;

    let query = supabase.from('orders').select('*').not('order_number', 'like', '%-%');
    if (effectiveSince) query = query.gte('created_at', effectiveSince);

    const { data: rows, error } = await query.order('created_at', { ascending: true });
    if (error || !rows) { setLoading(false); return; }

    // Previous period for comparison
    const pStart = prevPeriodStart(period);
    const pEnd   = prevPeriodEnd(period);
    let prevOrders = 0, prevRevenue = 0;
    if (pStart && pEnd) {
      const { data: prev } = await supabase
        .from('orders')
        .select('total')
        .not('order_number', 'like', '%-%')
        .gte('created_at', pStart)
        .lt('created_at', pEnd);
      prevOrders  = prev?.length ?? 0;
      prevRevenue = prev?.reduce((s, r) => s + Number(r.total), 0) ?? 0;
    }

    const total = rows.reduce((s, r) => s + Number(r.total), 0);
    const deliveryCount    = rows.filter(r => r.delivery_address).length;
    const collectionCount  = rows.length - deliveryCount;
    const completedCount   = rows.filter(r => r.status === 'collected').length;

    setData({
      totalOrders:    rows.length,
      totalRevenue:   total,
      avgOrderValue:  rows.length > 0 ? total / rows.length : 0,
      collectionCount,
      deliveryCount,
      completedCount,
      cancelledCount: 0,
      dailyStats:  buildDailyStats(rows as Array<{ created_at: string; total: number }>, period),
      hourlyStats: buildHourlyStats(rows as Array<{ created_at: string }>),
      topItems:    buildTopItems(rows as Array<{ items: unknown }>),
      prevOrders,
      prevRevenue,
    });

    setLoading(false);
  }, [period]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, refresh: fetch };
}
