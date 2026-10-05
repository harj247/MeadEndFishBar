import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Clock, MapPin, Phone, Printer, RefreshCw, UserPlus, LogIn, X, Eye, EyeOff, Check, ChefHat, Package, ShoppingBag } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useOrders } from '@/hooks/useOrders';
import { formatPrice, formatTime, printReceipt } from '@/lib/utils';
import { sendOtp, verifyOtpAndRegister, signIn, getSavedProfile } from '@/lib/auth';
import { nextOpenTime } from '@/lib/openingHours';
import { getVenueConfig } from '@/lib/venueConfig';
import { Order } from '@/types';
import { toast } from 'sonner';

// ── Account prompt states ────────────────────────────────────────────────────
type AccountStep = 'idle' | 'prompt' | 'login' | 'register-email' | 'register-otp' | 'register-done';

function AccountPrompt({
  customerName,
  customerPhone,
  onDismiss,
}: {
  customerName: string;
  customerPhone: string;
  onDismiss: () => void;
}) {
  const [step, setStep] = useState<AccountStep>('prompt');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSendOtp = async () => {
    if (!email.trim() || !email.includes('@')) { toast.error('Enter a valid email'); return; }
    setBusy(true);
    try {
      await sendOtp(email.trim());
      setStep('register-otp');
      toast.success('Verification code sent — check your email');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to send code');
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    if (otp.length < 4) { toast.error('Enter the 4-digit code from your email'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setBusy(true);
    try {
      await verifyOtpAndRegister(email.trim(), otp.trim(), password, customerName, customerPhone);
      setStep('register-done');
      toast.success('Account created! Your details are saved for next time.');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) { toast.error('Enter your email and password'); return; }
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      setStep('register-done');
      toast.success('Signed in! Your details will be pre-filled next time.');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Sign in failed');
    } finally {
      setBusy(false);
    }
  };

  // ── Done ──────────────────────────────────────────────────────────────────
  if (step === 'register-done') {
    const venue = getVenueConfig();
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
            <Check className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-green-800">You&apos;re all set!</p>
            <p className="text-green-700 text-sm">Your name and phone will be pre-filled next time you order at {venue.businessName}.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Prompt ────────────────────────────────────────────────────────────────
  if (step === 'prompt') {
    return (
      <div className="bg-[var(--brand-accent)] rounded-2xl p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[var(--brand-primary)]" />
            <p className="font-bold text-white text-sm">Save time next time</p>
          </div>
          <button onClick={onDismiss} className="p-1 text-white/40 hover:text-white/70 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-white/70 text-sm mb-4">
          Create a free account and your name &amp; phone number will be pre-filled automatically on your next order.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setStep('register-email')}
            className="flex-1 bg-[var(--brand-primary)] hover:opacity-90 text-[var(--brand-accent)] font-bold py-2.5 rounded-xl text-sm transition-all active:scale-95 flex items-center justify-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" /> Create Account
          </button>
          <button
            onClick={() => setStep('login')}
            className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 rounded-xl text-sm transition-all active:scale-95 flex items-center justify-center gap-1.5"
          >
            <LogIn className="w-4 h-4" /> Sign In
          </button>
        </div>
        <button onClick={onDismiss} className="w-full mt-2 text-xs text-white/30 hover:text-white/50 transition-colors py-1">
          No thanks
        </button>
      </div>
    );
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  if (step === 'login') {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-[var(--brand-accent)] px-4 py-3 flex items-center justify-between">
          <p className="font-bold text-white text-sm flex items-center gap-2"><LogIn className="w-4 h-4 text-[var(--brand-primary)]" /> Sign In</p>
          <button onClick={onDismiss} className="p-1 text-white/40 hover:text-white/70"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)]" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Password</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)] pr-10" />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button onClick={handleLogin} disabled={busy}
            className="w-full bg-[var(--brand-primary)] hover:opacity-90 disabled:opacity-60 text-[var(--brand-accent)] font-bold py-3 rounded-xl text-sm transition-all">
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
          <button onClick={() => setStep('prompt')} className="w-full text-xs text-gray-400 hover:text-gray-600 py-1">← Back</button>
        </div>
      </div>
    );
  }

  // ── Register: email step ──────────────────────────────────────────────────
  if (step === 'register-email') {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-[var(--brand-accent)] px-4 py-3 flex items-center justify-between">
          <p className="font-bold text-white text-sm flex items-center gap-2"><UserPlus className="w-4 h-4 text-[var(--brand-primary)]" /> Create Account</p>
          <button onClick={onDismiss} className="p-1 text-white/40 hover:text-white/70"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-gray-500">We&apos;ll send a 4-digit code to verify your email.</p>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Email address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)]" />
          </div>
          <button onClick={handleSendOtp} disabled={busy}
            className="w-full bg-[var(--brand-primary)] hover:opacity-90 disabled:opacity-60 text-[var(--brand-accent)] font-bold py-3 rounded-xl text-sm transition-all">
            {busy ? 'Sending…' : 'Send Verification Code'}
          </button>
          <button onClick={() => setStep('prompt')} className="w-full text-xs text-gray-400 hover:text-gray-600 py-1">← Back</button>
        </div>
      </div>
    );
  }

  // ── Register: OTP + password step ────────────────────────────────────────
  if (step === 'register-otp') {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-[var(--brand-accent)] px-4 py-3 flex items-center justify-between">
          <p className="font-bold text-white text-sm flex items-center gap-2"><UserPlus className="w-4 h-4 text-[var(--brand-primary)]" /> Verify &amp; Set Password</p>
          <button onClick={onDismiss} className="p-1 text-white/40 hover:text-white/70"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-gray-500">Code sent to <strong>{email}</strong></p>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">4-digit verification code</label>
            <input type="text" inputMode="numeric" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="0000"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-center tracking-[0.3em] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)]" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Set a password</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)] pr-10" />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button onClick={handleVerify} disabled={busy}
            className="w-full bg-[var(--brand-primary)] hover:opacity-90 disabled:opacity-60 text-[var(--brand-accent)] font-bold py-3 rounded-xl text-sm transition-all">
            {busy ? 'Creating account…' : 'Create Account'}
          </button>
          <button onClick={() => setStep('register-email')} className="w-full text-xs text-gray-400 hover:text-gray-600 py-1">← Resend code</button>
        </div>
      </div>
    );
  }

  return null;
}

// ── Busy banner with 1-minute cancel timer ─────────────────────────────────
function BusyBanner({
  readyTime,
  phone,
  orderId,
  onCancelled,
}: {
  readyTime: string;
  phone: string;
  orderId: string;
  onCancelled: () => void;
}) {
  const CANCEL_WINDOW = 60; // seconds
  const [secondsLeft, setSecondsLeft] = useState(CANCEL_WINDOW);
  const [expired, setExpired] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (expired) return;
    const interval = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(interval);
          setExpired(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [expired]);

  const handleCancel = async () => {
    setCancelling(true);
    const { supabase } = await import('@/lib/supabase');
    await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
    setCancelling(false);
    onCancelled();
  };

  if (expired) {
    return (
      <div className="mt-2 bg-green-50 border border-green-300 rounded-xl px-3 py-3">
        <p className="text-sm font-bold text-green-800 flex items-start gap-2">
          <span className="text-base flex-shrink-0">👨‍🍳</span>
          <span>We&apos;ve started cooking your order — it will be ready at <strong>{readyTime}</strong>. Thank you for your patience!</span>
        </p>
      </div>
    );
  }

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timerStr = mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}s`;
  const urgency = secondsLeft <= 15;

  // ── Confirm cancellation step ─────────────────────────────────────────────
  if (confirmingCancel) {
    return (
      <div className="mt-2 bg-red-50 border border-red-300 rounded-xl px-3 py-3 space-y-2">
        <p className="text-sm font-bold text-red-800">Cancel your order?</p>
        <p className="text-xs text-red-700">This cannot be undone — your order will be cancelled immediately and the kitchen will be notified.</p>
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => setConfirmingCancel(false)}
            className="flex-1 border border-red-300 text-red-700 font-bold py-2.5 rounded-xl text-sm hover:bg-red-100 transition-all"
          >
            Keep my order
          </button>
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm transition-all"
          >
            {cancelling ? 'Cancelling…' : 'Yes, cancel'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`mt-2 border rounded-xl px-3 py-3 transition-colors ${
      urgency ? 'bg-red-50 border-red-300' : 'bg-amber-50 border-amber-300'
    }`}>
      <p className={`text-sm font-bold flex items-start gap-2 ${
        urgency ? 'text-red-800' : 'text-amber-800'
      }`}>
        <span className="text-base flex-shrink-0">⏳</span>
        <span>We&apos;re a little busy right now — your order will be ready to collect at <strong>{readyTime}</strong>.</span>
      </p>
      <div className={`mt-2 flex items-center gap-2 rounded-lg px-3 py-2 ${
        urgency ? 'bg-red-100' : 'bg-amber-100'
      }`}>
        <div className={`flex-shrink-0 text-center font-black text-lg leading-none tabular-nums ${
          urgency ? 'text-red-700' : 'text-amber-700'
        }`}>
          {timerStr}
        </div>
        <p className={`text-xs ${urgency ? 'text-red-700' : 'text-amber-700'}`}>
          {urgency
            ? 'Last chance to cancel!'
            : "You have this long to cancel if you no longer want your order."}
        </p>
      </div>
      {/* Self-serve cancel button */}
      <button
        onClick={() => setConfirmingCancel(true)}
        className={`mt-2 w-full font-bold py-2.5 rounded-xl text-sm transition-all active:scale-95 ${
          urgency
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-amber-600 hover:bg-amber-700 text-white'
        }`}
      >
        Cancel My Order
      </button>
      <p className={`text-xs mt-2 ${urgency ? 'text-red-700' : 'text-amber-700'}`}>
        Or call us:{' '}
        <a href={`tel:${phone.replace(/\s/g, '')}`} className="font-bold underline">
          {phone}
        </a>
      </p>
    </div>
  );
}

// ── Main confirmation page ───────────────────────────────────────────────────

export default function OrderConfirmation() {
  const { id } = useParams<{ id: string }>();
  const { getOrder } = useOrders();

  const [order, setOrder]             = useState<Order | undefined>(undefined);
  const [loading, setLoading]         = useState(true);
  const [showAccount, setShowAccount] = useState(true);

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    const result = await getOrder(id);
    setOrder(result);
    setLoading(false);
  }, [id, getOrder]);

  // Initial load — also clear the cart from localStorage so next customer starts fresh
  useEffect(() => {
    fetchOrder();
    localStorage.removeItem('mead_end_cart');
  }, [fetchOrder]);

  // Poll every 5 s to reflect status changes from kitchen
  useEffect(() => {
    const interval = setInterval(fetchOrder, 5000);
    return () => clearInterval(interval);
  }, [fetchOrder]);

  // Hide account prompt if user already has a saved profile
  useEffect(() => {
    if (getSavedProfile()) setShowAccount(false);
  }, []);

  // Customer self-cancelled — refresh immediately
  const handleCustomerCancelled = useCallback(() => {
    fetchOrder();
    toast.success('Your order has been cancelled.');
  }, [fetchOrder]);

  const venue = getVenueConfig();

  // ── Progress stepper ─────────────────────────────────────────────────────
  const STEPS: { key: Order['status'][]; label: string; icon: React.ReactNode }[] = [
    { key: ['scheduled', 'new'],    label: 'Placed',    icon: <ShoppingBag className="w-4 h-4" /> },
    { key: ['accepted'],            label: 'Accepted',  icon: <CheckCircle className="w-4 h-4" /> },
    { key: ['preparing'],           label: 'Preparing', icon: <ChefHat className="w-4 h-4" /> },
    { key: ['ready'],               label: 'Ready',     icon: <Package className="w-4 h-4" /> },
    { key: ['collected'],           label: 'Collected', icon: <Check className="w-4 h-4" /> },
  ];

  const stepIndex = (status: Order['status']) => {
    for (let i = 0; i < STEPS.length; i++) {
      if (STEPS[i].key.includes(status)) return i;
    }
    return 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f8f5] flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 text-[var(--brand-primary)] animate-spin" />
        <p className="text-gray-500 text-sm">Loading your order…</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#f8f8f5] flex flex-col items-center justify-center text-center px-4">
        <div className="text-6xl mb-4">🤔</div>
        <h2 className="text-xl font-bold text-[var(--brand-accent)]">Order not found</h2>
        <Link to="/" className="mt-4 bg-[var(--brand-primary)] text-[var(--brand-accent)] font-bold px-6 py-3 rounded-xl inline-block">
          Back to Menu
        </Link>
      </div>
    );
  }

  const STATUS_LABELS: Record<Order['status'], string> = {
    scheduled: '⏰ Scheduled — awaiting store confirmation',
    new:       'Received — waiting to be accepted',
    accepted:  'Order accepted!',
    preparing: 'Being prepared in the kitchen',
    ready:     'Ready for collection! 🎉',
    collected: 'Collected — enjoy your food!',
    cancelled: 'Order Cancelled',
  };

  const STATUS_COLORS: Record<Order['status'], string> = {
    scheduled: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    new:       'text-blue-700 bg-blue-50 border-blue-200',
    accepted:  'text-blue-700 bg-blue-50 border-blue-200',
    preparing: 'text-orange-700 bg-orange-50 border-orange-200',
    ready:     'text-green-700 bg-green-50 border-green-200',
    collected: 'text-gray-600 bg-gray-50 border-gray-200',
    cancelled: 'text-red-700 bg-red-50 border-red-200',
  };

  return (
    <div className="min-h-screen bg-[#f8f8f5]">
      {/* Success / Cancelled Header */}
      <div className={`text-white pt-8 pb-12 px-4 text-center ${order.status === 'cancelled' ? 'bg-red-700' : 'bg-[var(--brand-accent)]'}`}>
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${order.status === 'cancelled' ? 'bg-red-500' : 'bg-[var(--brand-primary)]'}`}>
          {order.status === 'cancelled'
            ? <X className="w-9 h-9 text-white" />
            : <CheckCircle className="w-9 h-9 text-[var(--brand-accent)]" />
          }
        </div>
        <h1 className="text-2xl font-black">
          {order.status === 'cancelled' ? 'Order Cancelled' : 'Order Placed!'}
        </h1>
        <p className="text-white/70 text-sm mt-1">
          {order.status === 'cancelled' ? `Order #${order.orderNumber} has been cancelled.` : `Thank you, ${order.customerName}!`}
        </p>
        <div className="mt-3 inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5">
          <span className={`font-bold text-lg ${order.status === 'cancelled' ? 'text-red-200' : 'text-[var(--brand-primary)]'}`}>#{order.orderNumber}</span>
          <span className="text-white/60 text-sm">•</span>
          <span className="text-white/80 text-sm">{formatTime(order.createdAt)}</span>
        </div>
      </div>

      {/* ── Progress Stepper (hidden when cancelled) ── */}
      {order.status === 'cancelled' ? (
        <div className="bg-red-700 pb-6 px-4 pt-2">
          <div className="max-w-md mx-auto flex flex-col items-center gap-1 text-center">
            <p className="text-red-100 text-xs">
              If this was a mistake, please call us on{' '}
              <a href={`tel:${venue.phone.replace(/\s/g,'')}`} className="font-bold underline text-white">{venue.phone}</a>
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-[var(--brand-accent)] pb-6 px-4">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between relative">
              {/* Connector line behind steps */}
              <div className="absolute top-4 left-0 right-0 h-0.5 bg-white/15 z-0" />
              <div
                className="absolute top-4 left-0 h-0.5 bg-[var(--brand-primary)] z-0 transition-all duration-700"
                style={{ width: `${(stepIndex(order.status) / (STEPS.length - 1)) * 100}%` }}
              />
              {STEPS.map((step, i) => {
                const current = stepIndex(order.status);
                const done    = i < current;
                const active  = i === current;
                return (
                  <div key={step.label} className="relative z-10 flex flex-col items-center gap-1.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                      done
                        ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-[var(--brand-accent)]'
                        : active
                        ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-[var(--brand-accent)] ring-4 ring-[var(--brand-primary)]/30'
                        : 'bg-transparent border-white/20 text-white/25'
                    }`}>
                      {done ? <Check className="w-4 h-4" /> : step.icon}
                    </div>
                    <span className={`text-[10px] font-bold whitespace-nowrap transition-colors ${
                      active ? 'text-[var(--brand-primary)]' : done ? 'text-white/70' : 'text-white/25'
                    }`}>{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto px-4 -mt-6 pb-12 space-y-4">

        {/* Live Status Card */}
        <div className={`rounded-2xl border p-4 ${STATUS_COLORS[order.status]}`}>
          <p className="font-bold text-sm flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {order.status === 'new'
              ? `Waiting for ${venue.businessName} to confirm your order`
              : STATUS_LABELS[order.status]}
          </p>
          {order.status === 'cancelled' && (
            <p className="text-xs mt-2 text-red-600">
              Your order has been cancelled. To reorder or for any queries, please call us on{' '}
              <a href={`tel:${venue.phone.replace(/\s/g,'')}`} className="font-bold underline">{venue.phone}</a>.
            </p>
          )}
          {order.status === 'scheduled' && (
            <p className="text-xs mt-1 opacity-80 font-medium">
              Your order has been saved. The kitchen will accept and confirm it when the store opens — opens {nextOpenTime()}.
            </p>
          )}
          {order.status === 'new' && (
            <p className="text-xs mt-1 opacity-75">
              We&apos;ve received your order and will confirm it shortly. You&apos;ll receive a confirmation email once accepted.
            </p>
          )}
          {(order.status === 'accepted' || order.status === 'preparing' || order.status === 'ready') && (() => {
            // ── Resolve collection time ──────────────────────────────────────
            // Priority 1: estimatedReady stored in DB (ISO string set by kitchen at accept time)
            //             This is pre-calculated as: order.createdAt + kitchenPrepMinutes
            // Priority 2: Fallback — compute from prepTime + createdAt if estimatedReady is missing
            //             (handles orders accepted before the DB-persistence fix was deployed)
            // NEVER use Date.now() as the base; always use the order creation timestamp.
            const resolveCollectionTime = (): string | null => {
              // Path 1: estimatedReady ISO timestamp (primary — set by kitchen)
              if (order.estimatedReady) {
                const t = new Date(order.estimatedReady);
                if (!isNaN(t.getTime())) {
                  return t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                }
              }
              // Path 2: compute from createdAt + prepTime minutes (fallback)
              if (order.prepTime && /^\d+$/.test(order.prepTime.trim())) {
                const mins = parseInt(order.prepTime.trim(), 10);
                if (!isNaN(mins) && mins > 0) {
                  const base = new Date(order.createdAt);
                  const t = new Date(base.getTime() + mins * 60_000);
                  console.log(`[OrderConfirmation] fallback: createdAt=${base.toLocaleTimeString('en-GB')} + ${mins}min = ${t.toLocaleTimeString('en-GB')}`);
                  return t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                }
              }
              return null;
            };

            const readyTime = resolveCollectionTime();
            const estimatedMs = order.estimatedReady ? new Date(order.estimatedReady).getTime() : null;

            const requestedMs = (() => {
              if (!order.prepTime || order.prepTime === 'asap') return null;
              if (order.prepTime.startsWith('time:')) {
                const [h, m] = order.prepTime.replace('time:', '').split(':').map(Number);
                const d = new Date();
                d.setHours(h, m, 0, 0);
                return d.getTime();
              }
              return new Date(order.createdAt).getTime() + Number(order.prepTime) * 60 * 1000;
            })();
            // Only show busy banner when kitchen's confirmed time is 15+ min beyond customer's request
            const kitchenRunningLate = estimatedMs && requestedMs && estimatedMs > requestedMs + 15 * 60 * 1000;
            const isDelivery = !!order.deliveryAddress;
            return (
              <>
                {/* Collection/delivery time — shown once kitchen accepts and persists through
                    accepted → preparing → ready states. Uses estimatedReady (primary) or
                    createdAt+prepTime fallback — same source as the kitchen receipt. */}
                {!isDelivery && readyTime && (
                  <div className="mt-3 bg-white border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span className="text-sm font-semibold text-blue-700">Collection time</span>
                    </div>
                    <span className="text-xl font-black text-blue-800 tabular-nums">{readyTime}</span>
                  </div>
                )}
                {isDelivery && readyTime && (
                  <div className="mt-3 bg-white border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span className="text-sm font-semibold text-blue-700">Estimated delivery</span>
                    </div>
                    <span className="text-xl font-black text-blue-800 tabular-nums">{readyTime}</span>
                  </div>
                )}
                {/* Busy banner — only shown while order is still being prepared, not when ready */}
                {(order.status === 'accepted' || order.status === 'preparing') && kitchenRunningLate && readyTime && (
                  <BusyBanner
                    readyTime={readyTime}
                    phone={venue.phone}
                    orderId={order.id}
                    onCancelled={handleCustomerCancelled}
                  />
                )}
                {order.customerEmail && (
                  <div className="flex items-center gap-2 mt-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                    <span className="text-base">📧</span>
                    <span className="text-xs font-medium text-blue-700">Confirmation email sent to <strong>{order.customerEmail}</strong></span>
                  </div>
                )}
              </>
            );
          })()}
          {order.status !== 'cancelled' && (
            <p className="text-xs mt-2 opacity-50 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Status updates automatically
            </p>
          )}
        </div>

        {/* Account Prompt — hide if cancelled */}
        {showAccount && order.status !== 'cancelled' && (
          <AccountPrompt
            customerName={order.customerName}
            customerPhone={order.customerPhone}
            onDismiss={() => setShowAccount(false)}
          />
        )}

        {/* Collection / Delivery Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-[var(--brand-primary)] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-[var(--brand-accent)] text-sm">
                {order.deliveryAddress ? 'Delivering to' : 'Collect from'}
              </p>
              <p className="text-gray-600 text-sm">
                {order.deliveryAddress ?? `${venue.businessName}${venue.city ? `, ${venue.city}` : ''}${venue.postcode ? `, ${venue.postcode}` : ''}`}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-[var(--brand-primary)] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-[var(--brand-accent)] text-sm">Any questions?</p>
              <a href={`tel:${venue.phone.replace(/\s/g,'')}`} className="text-[var(--brand-primary)] text-sm font-semibold">{venue.phone}</a>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-bold text-[var(--brand-accent)]">Order Summary</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {order.items.map(item => (
              <div key={item.id} className="px-4 py-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-800">{item.quantity}× {item.name}</span>
                  <span className="font-semibold text-[#0f1f3d]">{formatPrice(item.price * item.quantity)}</span>
                </div>
                {item.notes && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {item.notes.split(' · ').filter(Boolean).map((seg, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                        {seg}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {order.notes && (
            <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 text-xs text-amber-800">
              📝 Note: {order.notes}
            </div>
          )}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
            <span className="font-bold text-gray-700">{venue.paymentInfo || 'Cash in store'}</span>
            <span className="font-black text-lg text-[var(--brand-accent)]">{formatPrice(order.total)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => printReceipt(order)}
            className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 font-bold py-3.5 rounded-xl hover:bg-gray-50 transition-all"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>
          <Link
            to="/"
            className="flex-1 flex items-center justify-center bg-[var(--brand-primary)] text-[var(--brand-accent)] font-bold py-3.5 rounded-xl hover:opacity-90 transition-all text-center"
          >
            {order.status === 'cancelled' ? 'Reorder' : 'Order Again'}
          </Link>
        </div>
      </div>
    </div>
  );
}
