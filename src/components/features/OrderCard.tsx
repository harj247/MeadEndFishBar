import { Clock, CheckCircle, ChefHat, Package, Printer, Truck } from 'lucide-react';
import { Order } from '@/types';
import { formatTime, formatPrice, printReceipt } from '@/lib/utils';
import { cn } from '@/lib/utils';

/** Parse delivery zone and distance from note like "DELIVERY TO: ... [Local zone, 2mi]" */
function parseDeliveryInfo(notes: string | undefined): { zone: string; miles: string } | null {
  if (!notes) return null;
  const match = notes.match(/\[([^,]+),\s*([\d.]+)mi\]/);
  if (!match) return null;
  return { zone: match[1].trim(), miles: match[2] };
}

function isDeliveryOrder(order: Order): boolean {
  return Boolean(
    order.deliveryAddress ||
    (order.notes && order.notes.startsWith('DELIVERY TO:'))
  );
}

/** Extract readable delivery address from deliveryAddress field or notes */
function getDeliveryAddress(order: Order): string | null {
  // Prefer dedicated deliveryAddress field
  if (order.deliveryAddress) return order.deliveryAddress;
  // Fall back to parsing from notes: "DELIVERY TO: POSTCODE — ADDRESS [zone] | notes"
  if (!order.notes) return null;
  const match = order.notes.match(/^DELIVERY TO:\s*(.+?)(?:\s*\[.*?\])?(?:\s*\|.*)?$/);
  return match ? match[1].trim() : null;
}

interface OrderCardProps {
  order: Order;
  onStatusUpdate: (id: string, status: Order['status']) => void;
}

const STATUS_CONFIG = {
  new: { label: 'New Order', color: 'bg-red-500', textColor: 'text-red-700', bg: 'bg-red-50 border-red-200', pulse: true },
  accepted: { label: 'Accepted', color: 'bg-blue-500', textColor: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', pulse: false },
  preparing: { label: 'Preparing', color: 'bg-orange-500', textColor: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', pulse: false },
  ready: { label: 'Ready!', color: 'bg-green-500', textColor: 'text-green-700', bg: 'bg-green-50 border-green-200', pulse: false },
  collected: { label: 'Collected', color: 'bg-gray-400', textColor: 'text-gray-500', bg: 'bg-gray-50 border-gray-200', pulse: false },
};

const NEXT_STATUS: Record<Order['status'], Order['status'] | null> = {
  new: 'accepted',
  accepted: 'preparing',
  preparing: 'ready',
  ready: 'collected',
  collected: null,
};

const NEXT_LABEL: Record<Order['status'], string> = {
  new: 'Accept Order',
  accepted: 'Start Preparing',
  preparing: 'Mark as Ready',
  ready: 'Mark Collected',
  collected: '',
};

const STATUS_ICON: Record<Order['status'], React.ReactNode> = {
  new: <Clock className="w-4 h-4" />,
  accepted: <CheckCircle className="w-4 h-4" />,
  preparing: <ChefHat className="w-4 h-4" />,
  ready: <Package className="w-4 h-4" />,
  collected: <CheckCircle className="w-4 h-4" />,
};

export default function OrderCard({ order, onStatusUpdate }: OrderCardProps) {
  const config = STATUS_CONFIG[order.status];
  const nextStatus = NEXT_STATUS[order.status];

  return (
    <div className={cn('rounded-2xl border-2 p-4 flex flex-col gap-3', config.bg, order.status === 'new' && 'ring-2 ring-red-400 ring-offset-1')}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-[#0f1f3d]">#{order.orderNumber}</span>
            <span className={cn('flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full text-white', config.color, config.pulse && 'animate-pulse')}>
              {STATUS_ICON[order.status]} {config.label}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-0.5">{order.customerName} • {order.customerPhone}</p>
          <p className="text-xs text-gray-400">{formatTime(order.createdAt)}</p>
          {isDeliveryOrder(order) && (() => {
            const delivery = parseDeliveryInfo(order.notes);
            const address  = getDeliveryAddress(order);
            return (
              <div className="mt-2 bg-blue-600 rounded-xl px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <Truck className="w-4 h-4 text-blue-200 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-blue-200 uppercase tracking-wide leading-none mb-0.5">Delivery Address</p>
                    {address ? (
                      <p className="text-white font-bold text-sm leading-snug break-words">{address}</p>
                    ) : (
                      <p className="text-blue-200 text-xs italic">Address not recorded</p>
                    )}
                    {delivery && (
                      <p className="text-blue-300 text-[11px] font-semibold mt-0.5">
                        {delivery.zone} zone · {delivery.miles} mi
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
        <div className="text-right">
          <p className="font-bold text-[#0f1f3d] text-lg">{formatPrice(order.total)}</p>
          <p className="text-xs text-gray-400">CASH</p>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white/60 rounded-xl px-3 py-2 space-y-1">
        {order.items.map(item => (
          <div key={item.id} className="flex justify-between items-center text-sm">
            <span className="text-gray-800 font-medium">{item.quantity}× {item.name}</span>
            <span className="text-gray-500 text-xs">{formatPrice(item.price * item.quantity)}</span>
          </div>
        ))}
        {order.prepTime && order.prepTime !== 'asap' && (
          <p className="text-xs text-blue-700 font-medium bg-blue-50 rounded px-2 py-1 mt-1">
            🕐 Collect in: {order.prepTime} min
          </p>
        )}
        {order.notes && (
          <p className="text-xs text-orange-700 font-medium bg-orange-50 rounded px-2 py-1 mt-1">
            📝 {order.notes}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {nextStatus && (
          <button
            onClick={() => onStatusUpdate(order.id, nextStatus)}
            className="flex-1 bg-[#0f1f3d] hover:bg-[#1a3060] text-white font-bold py-2.5 rounded-xl text-sm transition-all active:scale-95 flex items-center justify-center gap-1.5"
          >
            {STATUS_ICON[nextStatus]}
            {NEXT_LABEL[order.status]}
          </button>
        )}
        <button
          onClick={() => printReceipt(order)}
          className="flex items-center gap-1.5 px-3 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold rounded-xl text-sm transition-all active:scale-95"
        >
          <Printer className="w-4 h-4" />
          Print
        </button>
      </div>
    </div>
  );
}
