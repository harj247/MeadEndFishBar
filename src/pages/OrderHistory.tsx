import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, RefreshCw, Clock, CheckCircle, ChefHat, Truck, Store, RotateCcw, LogIn, ShoppingBag, AlertCircle, MapPin } from 'lucide-react';
import { useCustomerOrders } from '@/hooks/useCustomerOrders';
import { useCart } from '@/hooks/useCart';
import { getSavedProfile } from '@/lib/auth';
import { formatPrice } from '@/lib/utils';
import { Order } from '@/types';
import { toast } from 'sonner';

// ── Status pipeline ──────────────────────────────────────────────────────────

const STATUS_STEPS: Order['status'][] = ['new', 'accepted', 'preparing', 'ready', 'collected'];

const STATUS_META: Record<Order['status'], { label: string; emoji: string; color: string; bg: string; border: string; description: string }> = {
  scheduled: { label: 'Scheduled',    emoji: '⏰', color: 'text-indigo-700', bg: 'bg-indigo-50',  border: 'border-indigo-300', description: 'Your pre-order is booked — the kitchen will confirm when they open.' },
  new:       { label: 'Received',     emoji: '📋', color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-300',   description: 'Your order has been received and is waiting to be accepted.' },
  accepted:  { label: 'Accepted',     emoji: '✅', color: 'text-indigo-700', bg: 'bg-indigo-50',  border: 'border-indigo-200', description: 'The kitchen has accepted your order and will start cooking soon.' },
  preparing: { label: 'Cooking 🍳',   emoji: '🍳', color: 'text-orange-700', bg: 'bg-orange-50',  border: 'border-orange-300', description: 'Your food is being freshly cooked right now — nearly there!' },
  ready:     { label: 'Ready! 🎉',    emoji: '🎉', color: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-300',  description: 'Your order is ready and waiting for you at the counter!' },
  collected: { label: 'Collected',    emoji: '🛍️', color: 'text-gray-600',   bg: 'bg-gray-50',    border: 'border-gray-200',   description: 'Order complete — thank you for visiting!' },
};

// ── Live status tracker ──────────────────────────────────────────────────────

function StatusTracker({ status }: { status: Order['status'] }) {
  const meta = STATUS_META[status];
  const currentIdx = STATUS_STEPS.indexOf(status);
  const isScheduled = status === 'scheduled';

  if (isScheduled) {
    return (
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center gap-3">
        <span className="text-2xl">⏰</span>
        <div>
          <p className="font-bold text-indigo-800 text-sm">Pre-order Scheduled</p>
          <p className="text-indigo-600 text-xs mt-0.5">{meta.description}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Status banner */}
      <div className={`rounded-xl px-4 py-3 flex items-center gap-3 border ${meta.bg} ${meta.border}`}>
        <span className="text-2xl">{meta.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-sm ${meta.color}`}>{meta.label}</p>
          <p className="text-gray-600 text-xs mt-0.5">{meta.description}</p>
        </div>
        {status !== 'collected' && (
          <span className="flex h-2 w-2 flex-shrink-0">
            <span className={`animate-ping absolute h-2 w-2 rounded-full opacity-75 ${status === 'ready' ? 'bg-green-500' : 'bg-blue-400'}`} />
            <span className={`relative h-2 w-2 rounded-full ${status === 'ready' ? 'bg-green-500' : 'bg-blue-500'}`} />
          </span>
        )}
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-0 overflow-x-auto pb-1">
        {STATUS_STEPS.map((step, idx) => {
          const stepMeta  = STATUS_META[step];
          const done      = idx < currentIdx;
          const active    = idx === currentIdx;
          const isLast    = idx === STATUS_STEPS.length - 1;

          return (
            <div key={step} className="flex items-center flex-1 min-w-0">
              {/* Step circle */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  done   ? 'bg-[#0f1f3d] border-[#0f1f3d] text-white' :
                  active ? 'bg-[#f5a623] border-[#f5a623] text-[#0f1f3d] shadow-md scale-110' :
                           'bg-white border-gray-200 text-gray-300'
                }`}>
                  {done ? <CheckCircle className="w-3.5 h-3.5" /> : stepMeta.emoji}
                </div>
                <span className={`text-[9px] font-semibold text-center leading-tight max-w-[48px] ${
                  active ? 'text-[#0f1f3d]' : done ? 'text-gray-500' : 'text-gray-300'
                }`}>
                  {stepMeta.label.replace(' 🍳', '').replace(' 🎉', '')}
                </span>
              </div>
              {/* Connector */}
              {!isLast && (
                <div className={`flex-1 h-0.5 mx-1 rounded-full transition-all ${done || active ? 'bg-[#0f1f3d]' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Order card ───────────────────────────────────────────────────────────────

function OrderHistoryCard({
  order,
  onReorder,
}: {
  order: Order;
  onReorder: (order: Order) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = STATUS_META[order.status];
  const isActive = !['collected'].includes(order.status);
  const isDelivery = !!order.deliveryAddress;
  const dateStr = new Date(order.createdAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const timeStr = new Date(order.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`bg-white rounded-2xl border-2 overflow-hidden shadow-sm transition-all ${
      isActive ? 'border-[#f5a623]' : 'border-gray-100'
    }`}>
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between ${isActive ? 'bg-[#0f1f3d]' : 'bg-gray-50'}`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 ${
            isActive ? 'bg-[#f5a623] text-[#0f1f3d]' : 'bg-gray-200 text-gray-600'
          }`}>
            #{order.orderNumber}
          </div>
          <div>
            <p className={`font-bold text-sm ${isActive ? 'text-white' : 'text-gray-800'}`}>
              {dateStr} · {timeStr}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isDelivery
                ? <Truck className={`w-3 h-3 ${isActive ? 'text-[#f5a623]' : 'text-gray-400'}`} />
                : <Store className={`w-3 h-3 ${isActive ? 'text-[#f5a623]' : 'text-gray-400'}`} />}
              <span className={`text-[10px] font-semibold ${isActive ? 'text-white/70' : 'text-gray-400'}`}>
                {isDelivery ? 'Delivery' : 'Collection'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-black ${isActive ? 'text-[#f5a623]' : 'text-[#0f1f3d]'}`}>
            {formatPrice(order.total)}
          </span>
          <span className={`text-xs font-bold px-2 py-1 rounded-full border ${meta.bg} ${meta.color} ${meta.border}`}>
            {meta.emoji} {meta.label}
          </span>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Live tracker — shown for active orders */}
        {isActive && <StatusTracker status={order.status} />}

        {/* Estimated ready time */}
        {order.estimatedReady && order.status !== 'collected' && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-amber-800 text-sm">
              <span className="font-bold">Est. ready at </span>
              {new Date(order.estimatedReady).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        )}

        {/* Delivery address */}
        {order.deliveryAddress && (
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
            <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-blue-800 text-sm font-medium">{order.deliveryAddress}</p>
          </div>
        )}

        {/* Items summary / expanded */}
        <div>
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-full flex items-center justify-between text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <span className="font-semibold">
              {order.items.length} item{order.items.length !== 1 ? 's' : ''} · {formatPrice(order.subtotal)} subtotal
            </span>
            <span className="text-gray-400">{expanded ? '▲ Hide' : '▼ Show'} items</span>
          </button>

          {expanded && (
            <div className="mt-2 bg-gray-50 rounded-xl divide-y divide-gray-100 overflow-hidden">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-800">{item.quantity}× {item.name}</span>
                    {item.notes && (
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate">📝 {item.notes}</p>
                    )}
                  </div>
                  <span className="font-semibold text-gray-600 ml-2 flex-shrink-0">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
              {order.total !== order.subtotal && (
                <div className="flex justify-between px-3 py-2 text-xs text-gray-500 font-medium">
                  <span>Delivery charge</span>
                  <span>{formatPrice(order.total - order.subtotal)}</span>
                </div>
              )}
              <div className="flex justify-between px-3 py-2 font-bold text-[#0f1f3d] text-sm bg-gray-100">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Reorder CTA */}
        {order.status === 'collected' && (
          <button
            onClick={() => onReorder(order)}
            className="w-full flex items-center justify-center gap-2 bg-[#f5a623] hover:bg-[#e09615] text-[#0f1f3d] font-bold py-2.5 rounded-xl text-sm transition-all active:scale-[0.98]"
          >
            <RotateCcw className="w-4 h-4" />
            Reorder — same items
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function OrderHistory() {
  const navigate = useNavigate();
  const profile = getSavedProfile();
  const { orders, loading, error, refresh } = useCustomerOrders(profile?.phone ?? null);
  const { addItem } = useCart();

  // Auto-refresh every 5 s title indicator when an active order is in progress
  const hasActive = orders.some(o => !['collected'].includes(o.status));

  useEffect(() => {
    if (hasActive) {
      const interval = setInterval(refresh, 5000);
      return () => clearInterval(interval);
    }
  }, [hasActive, refresh]);

  const handleReorder = (order: Order) => {
    if (order.items.length === 0) { toast.error('No items to reorder'); return; }
    // addItem adds 1 unit each call — call it quantity times per item
    order.items.forEach(item => {
      const menuItem = {
        id:          item.menuItemId || item.id,
        name:        item.name,
        price:       item.price,
        category:    '',
        description: '',
      };
      for (let i = 0; i < item.quantity; i++) {
        addItem(menuItem, undefined, item.notes);
      }
    });
    toast.success(`${order.items.length} item${order.items.length !== 1 ? 's' : ''} added to your cart`);
    navigate('/checkout');
  };

  // ── Not logged in ────────────────────────────────────────────────────────
  if (!profile) {
    return (
      <div className="min-h-screen bg-[#f8f8f5] flex flex-col">
        <div className="bg-[#0f1f3d] text-white px-4 py-4 sticky top-0 z-20">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-lg">Order History</h1>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4 py-20">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
            <ShoppingBag className="w-8 h-8 text-[#f5a623]" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#0f1f3d]">Sign in to view your orders</h2>
            <p className="text-gray-500 text-sm mt-1 max-w-xs">
              Create a free account or sign in to see your order history and reorder your favourites.
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 bg-[#f5a623] hover:bg-[#e09615] text-[#0f1f3d] font-bold px-6 py-3 rounded-xl transition-all"
          >
            <LogIn className="w-4 h-4" />
            Go to menu &amp; sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f8f5]">
      {/* Header */}
      <div className="bg-[#0f1f3d] text-white px-4 py-4 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold text-lg leading-tight">Order History</h1>
              <p className="text-white/50 text-xs">{profile.name} · {profile.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasActive && (
              <span className="flex items-center gap-1 text-[10px] font-bold bg-green-500/20 border border-green-500/30 text-green-400 px-2 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                LIVE
              </span>
            )}
            <button
              onClick={refresh}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-white/60" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Active orders section */}
        {!loading && orders.filter(o => o.status !== 'collected').length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-[#f5a623] rounded-full animate-pulse" />
              <h2 className="font-black text-[#0f1f3d] text-sm uppercase tracking-wide">Active Orders</h2>
            </div>
            <div className="space-y-4">
              {orders
                .filter(o => o.status !== 'collected')
                .map(order => (
                  <OrderHistoryCard key={order.id} order={order} onReorder={handleReorder} />
                ))}
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="w-8 h-8 text-[#f5a623] animate-spin" />
            <p className="text-gray-500 text-sm">Loading your orders…</p>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-4">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="font-bold text-red-700 text-sm">{error}</p>
              <button onClick={refresh} className="text-xs text-red-600 underline mt-0.5">Try again</button>
            </div>
          </div>
        )}

        {/* Past orders section */}
        {!loading && orders.filter(o => o.status === 'collected').length > 0 && (
          <div>
            <h2 className="font-black text-[#0f1f3d] text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-400" />
              Past Orders
            </h2>
            <div className="space-y-3">
              {orders
                .filter(o => o.status === 'collected')
                .map(order => (
                  <OrderHistoryCard key={order.id} order={order} onReorder={handleReorder} />
                ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center">
              <ChefHat className="w-8 h-8 text-[#f5a623]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#0f1f3d]">No orders yet</h2>
              <p className="text-gray-500 text-sm mt-1">Your order history will appear here once you place your first order.</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 bg-[#f5a623] hover:bg-[#e09615] text-[#0f1f3d] font-bold px-6 py-3 rounded-xl transition-all"
            >
              Browse the menu
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
