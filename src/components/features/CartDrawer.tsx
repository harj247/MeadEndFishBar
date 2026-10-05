import { X, ShoppingCart, Minus, Plus, Trash2, ArrowRight } from 'lucide-react';
import { CartItem } from '@/types';
import { formatPrice } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  subtotal: number;
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart?: () => void;
}

export default function CartDrawer({
  isOpen, onClose, items, subtotal, onUpdateQuantity, onRemoveItem, onClearCart
}: CartDrawerProps) {
  const navigate = useNavigate();

  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div className={`fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 flex flex-col shadow-2xl transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="bg-[var(--brand-accent)] text-white px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[var(--brand-primary)]" />
            <h2 className="font-bold text-lg">Your Order</h2>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && onClearCart && (
              <button
                onClick={onClearCart}
                className="flex items-center gap-1 text-xs text-white/60 hover:text-red-300 hover:bg-white/10 px-2 py-1 rounded-lg transition-all"
                title="Clear basket"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            )}
              <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Collection Badge */}
        <div className="bg-[var(--brand-primary)]/10 border-b border-[var(--brand-primary)]/20 px-4 py-2 flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--brand-accent)]">🏪 Collection Only</span>
          <span className="text-xs text-gray-500">• Cash payment in store</span>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">🐟</div>
              <p className="text-gray-500 font-medium">Your order is empty</p>
              <p className="text-gray-400 text-sm mt-1">Add some delicious items!</p>
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">{item.name}</p>
                  {item.notes && <p className="text-xs text-gray-500 mt-0.5">Note: {item.notes}</p>}
                  <p className="text-[var(--brand-accent)] font-bold text-sm mt-1">{formatPrice(item.price)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                    className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                  >
                    {item.quantity === 1 ? <Trash2 className="w-3 h-3 text-red-500" /> : <Minus className="w-3 h-3" />}
                  </button>
                  <span className="w-5 text-center font-bold text-sm">{item.quantity}</span>
                  <button
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    className="w-7 h-7 rounded-full bg-[var(--brand-primary)] flex items-center justify-center hover:opacity-80 transition-colors"
                  >
                    <Plus className="w-3 h-3 text-white" />
                  </button>
                </div>
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="p-1 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 px-4 py-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium">Subtotal</span>
              <span className="font-bold text-lg text-[var(--brand-accent)]">{formatPrice(subtotal)}</span>
            </div>
            <p className="text-xs text-gray-400 text-center">No delivery fee • Pay cash in store</p>
            <button
              onClick={handleCheckout}
              className="w-full bg-[var(--brand-primary)] hover:opacity-90 text-[var(--brand-accent)] font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-base"
            >
              Place Order
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
