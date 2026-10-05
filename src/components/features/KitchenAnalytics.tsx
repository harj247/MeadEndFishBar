import { useState } from 'react';
import {
  X, TrendingUp, TrendingDown, ShoppingBag, PoundSterling,
  Truck, Store, RefreshCw, Award, Clock, Trash2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell,
} from 'recharts';
import { useAnalytics, AnalyticsPeriod } from '@/hooks/useAnalytics';
import { toast } from 'sonner';

const ANALYTICS_CLEARED_KEY = 'analytics_cleared_at';

const PERIODS: { id: AnalyticsPeriod; label: string }[] = [
  { id: 'today',   label: 'Today'    },
  { id: '7days',   label: '7 Days'   },
  { id: '30days',  label: '30 Days'  },
  { id: 'alltime', label: 'All Time' },
];

function fmt(n: number) {
  return `£${n.toFixed(2)}`;
}

function pct(current: number, prev: number): { value: number; up: boolean } | null {
  if (!prev) return null;
  const val = ((current - prev) / prev) * 100;
  return { value: Math.abs(Math.round(val)), up: val >= 0 };
}

function StatCard({
  label, value, sub, change, icon, accent,
}: {
  label: string;
  value: string;
  sub?: string;
  change?: { value: number; up: boolean } | null;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{label}</span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accent ?? 'bg-[#f5a623]/20'}`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-2xl font-black text-white">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
      {change && (
        <div className={`flex items-center gap-1 text-xs font-bold ${change.up ? 'text-green-400' : 'text-red-400'}`}>
          {change.up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {change.value}% vs previous period
        </div>
      )}
    </div>
  );
}

// Custom tooltip for bar charts
function ChartTooltip({ active, payload, label, prefix = '' }: {
  active?: boolean; payload?: Array<{ value: number }>; label?: string; prefix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a2f5a] border border-white/20 rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="text-gray-400 mb-0.5">{label}</p>
      <p className="text-white font-black">{prefix}{typeof payload[0].value === 'number' ? (prefix === '£' ? payload[0].value.toFixed(2) : payload[0].value) : ''}</p>
    </div>
  );
}

export default function KitchenAnalytics({ onClose }: { onClose: () => void }) {
  const [period, setPeriod] = useState<AnalyticsPeriod>('today');
  const [revenueMode, setRevenueMode] = useState<'orders' | 'revenue'>('orders');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const { data, loading, refresh } = useAnalytics(period);

  const orderChange   = pct(data.totalOrders,  data.prevOrders);
  const revenueChange = pct(data.totalRevenue, data.prevRevenue);

  const clearedAt = localStorage.getItem(ANALYTICS_CLEARED_KEY);

  const handleClearAnalytics = () => {
    const now = new Date().toISOString();
    localStorage.setItem(ANALYTICS_CLEARED_KEY, now);
    refresh();
    setShowClearConfirm(false);
    toast.success('Analytics cleared — stats now count from this moment forward');
  };

  // Max quantity for top items bar width
  const maxQty = Math.max(...data.topItems.map(i => i.quantity), 1);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Clear confirm modal */}
      {showClearConfirm && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
          <div className="bg-[#0f1f3d] border border-red-500/30 rounded-2xl w-full max-w-sm shadow-2xl p-6 relative z-20">
            <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-white font-black text-lg text-center mb-2">Clear Analytics?</h3>
            <p className="text-gray-400 text-sm text-center mb-1">
              This hides all historical order stats from the analytics view.
            </p>
            <p className="text-gray-500 text-xs text-center mb-6">
              Orders are <strong className="text-gray-400">not deleted</strong> — only the analytics display resets to count from now.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 border border-white/10 text-gray-300 font-bold py-3 rounded-xl hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAnalytics}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-all"
              >
                Clear Stats
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-2xl h-full bg-[#0a1628] border-l border-white/10 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#081529] px-5 py-4 flex items-center justify-between border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#f5a623]/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#f5a623]" />
            </div>
            <div>
              <h2 className="text-white font-black text-base">Analytics</h2>
              <p className="text-gray-500 text-xs">
                {clearedAt
                  ? `Since ${new Date(clearedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                  : 'Order performance & insights'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refresh()}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-gray-400" />
            </button>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="p-2 bg-white/5 hover:bg-red-500/20 rounded-xl transition-all group"
              title="Clear analytics data"
            >
              <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-400 transition-colors" />
            </button>
            <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Period selector */}
        <div className="px-5 py-3 flex gap-1.5 flex-shrink-0 border-b border-white/5">
          {PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                period === p.id
                  ? 'bg-[#f5a623] text-[#0f1f3d]'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <RefreshCw className="w-8 h-8 text-[#f5a623] animate-spin" />
              <p className="text-gray-500 text-sm">Loading analytics…</p>
            </div>
          ) : (
            <>
              {/* Key metrics */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Total Orders"
                  value={String(data.totalOrders)}
                  change={period !== 'alltime' ? orderChange : null}
                  icon={<ShoppingBag className="w-4 h-4 text-[#f5a623]" />}
                />
                <StatCard
                  label="Revenue"
                  value={fmt(data.totalRevenue)}
                  change={period !== 'alltime' ? revenueChange : null}
                  icon={<PoundSterling className="w-4 h-4 text-green-400" />}
                  accent="bg-green-500/20"
                />
                <StatCard
                  label="Avg Order Value"
                  value={fmt(data.avgOrderValue)}
                  icon={<Award className="w-4 h-4 text-purple-400" />}
                  accent="bg-purple-500/20"
                />
                <StatCard
                  label="Completion Rate"
                  value={data.totalOrders > 0 ? `${Math.round((data.completedCount / data.totalOrders) * 100)}%` : '—'}
                  sub={`${data.completedCount} of ${data.totalOrders} collected`}
                  icon={<Clock className="w-4 h-4 text-blue-400" />}
                  accent="bg-blue-500/20"
                />
              </div>

              {/* Collection vs Delivery split */}
              {(data.collectionCount > 0 || data.deliveryCount > 0) && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Order Type Split</p>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      <Store className="w-4 h-4 text-[#f5a623]" />
                      <span className="text-sm text-white font-semibold">Collection</span>
                    </div>
                    <span className="text-white font-black">{data.collectionCount}</span>
                    <span className="text-gray-500 text-xs w-10 text-right">
                      {data.totalOrders > 0 ? `${Math.round((data.collectionCount / data.totalOrders) * 100)}%` : '0%'}
                    </span>
                  </div>
                  {/* Bar */}
                  <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-[#f5a623] rounded-full transition-all"
                      style={{ width: data.totalOrders > 0 ? `${(data.collectionCount / data.totalOrders) * 100}%` : '0%' }}
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <Truck className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-white font-semibold">Delivery</span>
                    <span className="ml-auto text-white font-black">{data.deliveryCount}</span>
                    <span className="text-gray-500 text-xs w-10 text-right">
                      {data.totalOrders > 0 ? `${Math.round((data.deliveryCount / data.totalOrders) * 100)}%` : '0%'}
                    </span>
                  </div>
                </div>
              )}

              {/* Orders / Revenue chart */}
              {data.dailyStats.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                      {period === 'today' ? 'Orders by Hour' : 'Orders by Day'}
                    </p>
                    <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
                      <button
                        onClick={() => setRevenueMode('orders')}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${revenueMode === 'orders' ? 'bg-[#f5a623] text-[#0f1f3d]' : 'text-gray-400 hover:text-white'}`}
                      >
                        Orders
                      </button>
                      <button
                        onClick={() => setRevenueMode('revenue')}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${revenueMode === 'revenue' ? 'bg-[#f5a623] text-[#0f1f3d]' : 'text-gray-400 hover:text-white'}`}
                      >
                        Revenue
                      </button>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={data.dailyStats} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#6b7280', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip prefix={revenueMode === 'revenue' ? '£' : ''} />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                      <Bar
                        dataKey={revenueMode}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                      >
                        {data.dailyStats.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={(revenueMode === 'orders' ? entry.orders : entry.revenue) > 0 ? '#f5a623' : 'rgba(255,255,255,0.1)'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Top items */}
              {data.topItems.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">Top Menu Items</p>
                  <div className="space-y-3">
                    {data.topItems.map((item, i) => (
                      <div key={item.name}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className={`text-xs font-black w-5 flex-shrink-0 ${
                              i === 0 ? 'text-[#f5a623]' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-700' : 'text-gray-600'
                            }`}>{i + 1}</span>
                            <span className="text-sm text-white font-semibold truncate">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                            <span className="text-xs text-gray-400">{item.quantity} sold</span>
                            <span className="text-xs font-bold text-green-400">{fmt(item.revenue)}</span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              i === 0 ? 'bg-[#f5a623]' : 'bg-[#f5a623]/50'
                            }`}
                            style={{ width: `${(item.quantity / maxQty) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Busiest hours (not today — already shown in daily chart) */}
              {period !== 'today' && data.hourlyStats.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">Busiest Hours</p>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={data.hourlyStats} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="hour" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                      <Bar dataKey="orders" radius={[3, 3, 0, 0]} maxBarSize={32}>
                        {data.hourlyStats.map((entry, i) => (
                          <Cell key={i} fill={entry.orders > 0 ? '#3b82f6' : 'rgba(255,255,255,0.1)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Empty state */}
              {data.totalOrders === 0 && !loading && (
                <div className="text-center py-12 text-gray-600">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-semibold text-gray-500">No orders in this period</p>
                  {clearedAt && (
                    <p className="text-xs text-gray-600 mt-1">
                      Stats cleared on {new Date(clearedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
