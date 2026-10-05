import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── DB row shape (snake_case) ──────────────────────────────────────
export interface OrderRow {
  id: string;
  order_number: string;
  items: string; // JSON string stored in JSONB
  subtotal: number;
  total: number;
  customer_name: string;
  customer_phone: string;
  notes: string | null;
  status: 'new' | 'accepted' | 'preparing' | 'ready' | 'collected';
  created_at: string;
  estimated_ready: string | null;
}
