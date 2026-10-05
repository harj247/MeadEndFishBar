import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { MapPin, Clock, Phone, Star, Loader2, LogIn, UserPlus, X, Eye, EyeOff, Check, ChevronRight } from 'lucide-react';
import Header from '@/components/layout/Header';
import CartDrawer from '@/components/features/CartDrawer';
import MenuCard from '@/components/features/MenuCard';
import CondimentModal from '@/components/features/CondimentModal';
import { useCart } from '@/hooks/useCart';
import { useMenuItems } from '@/hooks/useMenuItems';
import { MenuItem } from '@/types';
import { isOpen, nextOpenTime, todayHoursText, weekHoursLines, minutesToClose } from '@/lib/openingHours';
import { getVenueConfig } from '@/lib/venueConfig';
import { sendOtp, verifyOtpAndRegister, signIn, getSavedProfile } from '@/lib/auth';
import { useVenueConfig } from '@/hooks/useVenueConfig';
import heroBanner from '@/assets/hero-banner.jpg';

// ── Suggested Add-on modal ─────────────────────────────────────────────────
function SuggestedAddonModal({
  item,
  targetItems,
  onConfirm,
  onNo,
}: {
  item: MenuItem;
  targetItems: MenuItem[];
  onConfirm: (selected: MenuItem[]) => void;
  onNo: () => void;
}) {
  const addon = item.suggestedAddon!;
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());

  const toggle = (id: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectedItems = targetItems.filter(i => checkedIds.has(i.id));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={onNo}>
      <div
        className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2.5 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>
        <div className="bg-[#0f1f3d] px-5 py-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-white/60 text-xs font-semibold">{item.name}</p>
            <h2 className="text-white font-bold text-base leading-tight mt-0.5">
              {addon.question || 'Would you like anything else?'}
            </h2>
          </div>
          <button onClick={onNo} className="text-white/50 hover:text-white p-1 flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Checkbox list of suggested items */}
        <div className="px-5 pt-4 pb-2 space-y-2 max-h-64 overflow-y-auto">
          {targetItems.map(ti => {
            const checked = checkedIds.has(ti.id);
            return (
              <label
                key={ti.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                  checked ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                onClick={() => toggle(ti.id)}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  checked ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white'
                }`}>
                  {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
                {ti.image && (
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <img src={ti.image} alt={ti.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${checked ? 'text-indigo-900' : 'text-gray-800'}`}>{ti.name}</p>
                  {ti.description && (
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{ti.description}</p>
                  )}
                  <p className="text-xs font-black text-indigo-700 mt-0.5">
                    {ti.price === 0 ? 'Free' : `£${ti.price.toFixed(2)}`}
                  </p>
                </div>
              </label>
            );
          })}
        </div>

        <div className="px-5 pb-6 pt-3 flex flex-col gap-2">
          <button
            onClick={() => onConfirm(selectedItems)}
            disabled={selectedItems.length === 0}
            className="w-full bg-[#f5a623] hover:bg-[#e09615] disabled:opacity-50 disabled:cursor-not-allowed text-[#0f1f3d] font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-base"
          >
            <Check className="w-5 h-5" strokeWidth={3} />
            {selectedItems.length === 0
              ? (addon.yesText || 'Add selected items')
              : `Add ${selectedItems.length} item${selectedItems.length > 1 ? 's' : ''}`
            }
          </button>
          <button
            onClick={onNo}
            className="w-full border-2 border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-800 font-semibold py-3.5 rounded-2xl transition-all active:scale-[0.98] text-sm"
          >
            {addon.noText || 'No thanks'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Closed overlay ──────────────────────────────────────────────────────────
const SCHEDULE_MODE_KEY = 'mead_schedule_mode';

function ClosedOverlay({ onSchedule }: { onSchedule: () => void }) {
  const closedVenue = getVenueConfig();
  const [showHours, setShowHours] = useState(false);
  const weekHours = weekHoursLines();
  const todayDow = new Date().getDay();

  const handleSchedule = () => {
    sessionStorage.setItem(SCHEDULE_MODE_KEY, 'true');
    onSchedule();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[var(--brand-accent)]/95 backdrop-blur-sm flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-sm w-full">
        <div className="w-20 h-20 bg-[var(--brand-primary)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-10 h-10 text-[var(--brand-primary)]" />
        </div>
        <h1 className="text-white font-black text-2xl mb-1">Store Closed</h1>
        <p className="text-white/60 text-sm mb-2">Would you like to place a scheduled order?</p>
        <div className="inline-flex items-center gap-2 bg-[var(--brand-primary)]/20 rounded-full px-4 py-2 mb-6">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <span className="text-[var(--brand-primary)] font-bold text-sm">Opens {nextOpenTime()}</span>
        </div>

        <button
          onClick={handleSchedule}
          className="w-full bg-[var(--brand-primary)] hover:opacity-90 text-[var(--brand-accent)] font-black py-4 rounded-2xl text-base mb-3 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <Clock className="w-5 h-5" />
          Schedule an Order
        </button>
        <p className="text-white/50 text-xs mb-5">
          Browse the menu &amp; place your order now — the store will accept and confirm it once they open.
        </p>

        <div className="bg-white/10 rounded-2xl overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-white font-bold text-sm">Today: {todayHoursText()}</p>
          </div>
          <button
            onClick={() => setShowHours(v => !v)}
            className="w-full px-4 py-3 text-white/60 text-xs font-semibold hover:text-white/80 transition-colors flex items-center justify-center gap-1"
          >
            {showHours ? 'Hide' : 'View all opening hours'}
          </button>
          {showHours && (
            <div className="px-4 pb-3 space-y-1.5">
              {weekHours.map((row, i) => (
                <div
                  key={row.day}
                  className={`flex justify-between text-xs ${i === todayDow ? 'text-[var(--brand-primary)] font-bold' : 'text-white/60'}`}
                >
                  <span>{row.day}</span>
                  <span>{row.hours}</span>
                </div>
              ))}
              <span className="flex-shrink-0 w-4 inline-block" aria-hidden="true" />
            </div>
          )}
        </div>

        <a
          href={`tel:${closedVenue.phone.replace(/\s/g, '')}`}
          className="block w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-xl text-sm transition-all"
        >
          📞 Call us: {closedVenue.phone}
        </a>
        <p className="text-white/30 text-xs mt-4">{closedVenue.businessName} · {closedVenue.city} · {closedVenue.paymentInfo}</p>
      </div>
    </div>
  );
}

// ── Sign-in / Register modal ────────────────────────────────────────────────
type AuthStep = 'choose' | 'login' | 'register-email' | 'register-otp';

function SignInModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [step, setStep] = useState<AuthStep>('choose');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) { toast.error('Enter email and password'); return; }
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      toast.success('Welcome back!');
      onDone();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Sign in failed');
    } finally { setBusy(false); }
  };

  const handleSendOtp = async () => {
    if (!email.trim() || !email.includes('@')) { toast.error('Enter a valid email'); return; }
    setBusy(true);
    try {
      await sendOtp(email.trim());
      setStep('register-otp');
      toast.success('4-digit code sent — check your email');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to send code');
    } finally { setBusy(false); }
  };

  const handleVerify = async () => {
    if (otp.length < 4) { toast.error('Enter the 4-digit code'); return; }
    if (!name.trim()) { toast.error('Enter your name'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setBusy(true);
    try {
      await verifyOtpAndRegister(email.trim(), otp.trim(), password, name.trim(), phone.trim());
      toast.success('Account created! Details saved for next order.');
      onDone();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Verification failed');
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="bg-[var(--brand-accent)] px-5 py-4 flex items-center justify-between">
          <p className="text-white font-bold">
            {step === 'choose' ? '👋 Welcome Back' : step === 'login' ? 'Sign In' : step === 'register-otp' ? 'Verify Email' : 'Create Account'}
          </p>
          <button onClick={onClose} className="text-white/40 hover:text-white p-1"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {step === 'choose' && (
            <>
              <p className="text-gray-500 text-sm">Sign in for faster checkout — your name and phone will be pre-filled automatically.</p>
              <button
                onClick={() => setStep('login')}
                className="w-full bg-[var(--brand-primary)] hover:opacity-90 text-[var(--brand-accent)] font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <LogIn className="w-4 h-4" /> Sign In
              </button>
              <button
                onClick={() => setStep('register-email')}
                className="w-full bg-[var(--brand-accent)] hover:opacity-90 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <UserPlus className="w-4 h-4" /> Create Account
              </button>
              <p className="text-center text-xs text-gray-400">Free — just email verification required</p>
            </>
          )}

          {step === 'login' && (
            <>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" autoFocus
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Password</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••" onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)] pr-10" />
                  <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button onClick={handleLogin} disabled={busy}
                className="w-full bg-[var(--brand-primary)] hover:opacity-90 disabled:opacity-60 text-[var(--brand-accent)] font-bold py-3 rounded-xl transition-all">
                {busy ? 'Signing in…' : 'Sign In'}
              </button>
              <button onClick={() => setStep('choose')} className="w-full text-xs text-gray-400 hover:text-gray-600 py-1">← Back</button>
            </>
          )}

          {step === 'register-email' && (
            <>
              <p className="text-xs text-gray-500">We'll send a 4-digit verification code to your email.</p>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Email address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" autoFocus onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)]" />
              </div>
              <button onClick={handleSendOtp} disabled={busy}
                className="w-full bg-[var(--brand-primary)] hover:opacity-90 disabled:opacity-60 text-[var(--brand-accent)] font-bold py-3 rounded-xl transition-all">
                {busy ? 'Sending…' : 'Send Verification Code'}
              </button>
              <button onClick={() => setStep('choose')} className="w-full text-xs text-gray-400 hover:text-gray-600 py-1">← Back</button>
            </>
          )}

          {step === 'register-otp' && (
            <>
              <p className="text-xs text-gray-500">Code sent to <strong>{email}</strong></p>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">4-digit code</label>
                <input type="text" inputMode="numeric" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="0000" autoFocus
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-center tracking-[0.3em] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Your name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. John Smith"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Phone <span className="font-normal text-gray-400">(optional — for order updates)</span></label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="07700 900000"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Set a password</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)] pr-10" />
                  <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button onClick={handleVerify} disabled={busy}
                className="w-full bg-[var(--brand-primary)] hover:opacity-90 disabled:opacity-60 text-[var(--brand-accent)] font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all">
                {busy ? 'Creating…' : <><Check className="w-4 h-4" /> Create Account</>}
              </button>
              <button onClick={() => setStep('register-email')} className="w-full text-xs text-gray-400 hover:text-gray-600 py-1">← Resend code</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function Index() {
  const [cartOpen, setCartOpen] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [condimentItem, setCondimentItem] = useState<MenuItem | null>(null);
  const [suggestedAddonPending, setSuggestedAddonPending] = useState<{
    item: MenuItem;
    targetItems: MenuItem[];
  } | null>(null);
  const [activeCategory, setActiveCategory] = useState('');
  const [profile, setProfile] = useState(getSavedProfile);
  const [currentlyOpen, setCurrentlyOpen] = useState(() => isOpen());
  const [scheduleMode, setScheduleMode] = useState(() => sessionStorage.getItem('mead_schedule_mode') === 'true');
  const [emergencyStop, setEmergencyStop] = useState(false);
  const [emergencyStopStyle, setEmergencyStopStyle] = useState<string>('large-clear');
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hintPlayed, setHintPlayed] = useState(() => sessionStorage.getItem('cat_hint_played') === 'true');
  const [minsToClose, setMinsToClose] = useState<number | null>(() => minutesToClose());
  const [closingBannerDismissed, setClosingBannerDismissed] = useState(false);
  const { config: venue, loading: venueLoading } = useVenueConfig();

  // Re-evaluate open/closed whenever venue config loads or every minute
  useEffect(() => {
    setCurrentlyOpen(isOpen());
    setMinsToClose(minutesToClose());
    setEmergencyStop(venue.emergencyStop ?? false);
    setEmergencyStopStyle(venue.emergencyStopStyle ?? 'large-clear');
  }, [venueLoading, venue.openingHours, venue.emergencyStop, venue.emergencyStopStyle]);

  // Poll emergency stop status every 30 seconds so customers see it update quickly
  useEffect(() => {
    const timer = setInterval(async () => {
      setCurrentlyOpen(isOpen());
      setMinsToClose(minutesToClose());
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data } = await supabase
          .from('venue_config')
          .select('emergency_stop, emergency_stop_style')
          .eq('id', 'default')
          .single();
        if (data) {
          const d = data as { emergency_stop: boolean; emergency_stop_style?: string };
          setEmergencyStop(d.emergency_stop ?? false);
          setEmergencyStopStyle(d.emergency_stop_style ?? 'large-clear');
        }
      } catch { /* ignore */ }
    }, 30_000);
    return () => clearInterval(timer);
  }, []);

  // Reset dismissal when no longer in closing-soon window
  useEffect(() => {
    if (minsToClose === null || minsToClose > 20) setClosingBannerDismissed(false);
  }, [minsToClose]);

  const closingSoon  = minsToClose !== null && minsToClose <= 20 && minsToClose > 15;
  const ordersCutoff = minsToClose !== null && minsToClose <= 15;

  const { items, addItem, removeItem, updateQuantity, clearCart, subtotal, itemCount } = useCart();
  const { items: menuItems, categories: allCategories, customGroups, loading } = useMenuItems();
  const categories   = allCategories.filter(c => !c.modifierOnly);
  // Items from modifier-only categories OR any category named "Extras"/"Sides" feed into the Add Extras panel
  const extrasItems  = menuItems.filter(i => {
    const cat = allCategories.find(c => c.id === i.category);
    if (!cat) return false;
    const name = cat.name.toLowerCase();
    return cat.modifierOnly || name.includes('extra') || name.includes('side');
  });
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const categoryBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id);
    }
  }, [categories, activeCategory]);

  // Ref to hold a queue of add-on items to open after the current CondimentModal is confirmed.
  // Items in this queue go directly to their own CondimentModal (no nested addon prompts).
  const pendingAddonItemsRef = useRef<MenuItem[]>([]);
  // Tracks whether the condimentItem currently open was opened as an addon (not a direct user tap).
  // Used to suppress suggestedAddon prompts for addon items (avoids infinite chains).
  const isAddonItemRef = useRef(false);

  // Open an item's CondimentModal directly (no addon check — used for addon-queue items).
  const openCondimentDirect = useCallback((menuItem: MenuItem) => {
    isAddonItemRef.current = true;
    setCondimentItem(menuItem);
  }, []);

  // Pop the next addon from the queue and open its CondimentModal, or clear if empty.
  const processNextAddonItem = useCallback(() => {
    const next = pendingAddonItemsRef.current.shift();
    if (next) {
      setTimeout(() => openCondimentDirect(next), 80);
    }
  }, [openCondimentDirect]);

  // User confirmed selection from the multi-select addon modal.
  // Queue selected items; they will be opened one-by-one via processNextAddonItem.
  const handleAddonConfirm = useCallback((_triggerItem: MenuItem, selectedItems: MenuItem[]) => {
    setSuggestedAddonPending(null);
    if (selectedItems.length > 0) {
      pendingAddonItemsRef.current = [...selectedItems];
    }
    processNextAddonItem();
  }, [processNextAddonItem]);

  // User tapped No thanks — dismiss addon modal and process any already-queued items.
  const handleAddonNo = useCallback(() => {
    setSuggestedAddonPending(null);
    processNextAddonItem();
  }, [processNextAddonItem]);

  // openCondimentOrAddon: always goes straight to CondimentModal.
  // The suggestedAddon prompt is shown AFTER customisations are confirmed (in handleCondimentConfirm).
  const openCondimentOrAddon = useCallback((menuItem: MenuItem) => {
    isAddonItemRef.current = false;
    setCondimentItem(menuItem);
  }, []);

  const handleAddItem = (menuItem: MenuItem) => {
    if (!currentlyOpen && !scheduleMode) {
      toast.error(`We're closed right now. Opens ${nextOpenTime()}`);
      return;
    }
    if (ordersCutoff) {
      toast.error('Online orders have closed for tonight.', { description: `Call us on ${venue.phone} to check if we can still help.` });
      return;
    }
    if (menuItem.category === 'sauces') {
      const sauceCount = items.filter(i => i.menuItemId.startsWith('sauce-')).reduce((sum, i) => sum + i.quantity, 0);
      if (sauceCount >= 2) {
        toast.error('Maximum 2 sauces per order', { description: 'Remove a sauce first to add a different one.' });
        return;
      }
    }
    openCondimentOrAddon(menuItem);
  };

  const handleCondimentConfirm = (menuItem: MenuItem, condiment: string, note: string, extras: { item: MenuItem; quantity: number }[]) => {
    const itemNote = [condiment, note].filter(Boolean).join(' · ') || undefined;
    addItem(menuItem, undefined, itemNote);
    // Add each extra as a separate cart item
    extras.forEach(({ item: extra, quantity }) => {
      for (let i = 0; i < quantity; i++) addItem(extra);
    });
    setCondimentItem(null);
    const extraCount = extras.reduce((s, e) => s + e.quantity, 0);
    toast.success(`${menuItem.name} added${extraCount > 0 ? ` + ${extraCount} extra${extraCount > 1 ? 's' : ''}` : ''}`, {
      description: 'Tap "View Order" to checkout',
      duration: 1800,
    });

    // Determine whether this item was opened as an addon (from the queue).
    const wasAddonItem = isAddonItemRef.current;
    isAddonItemRef.current = false;

    // If the queue already has items waiting, open the next one directly.
    if (pendingAddonItemsRef.current.length > 0) {
      processNextAddonItem();
      return;
    }

    // Only show the Suggested Add-on prompt for directly-tapped items (not addon-queue items).
    // This prevents infinite addon chains (e.g. Chips suggesting Gravy which suggests something else).
    if (!wasAddonItem) {
      const addon = menuItem.suggestedAddon;
      if (addon?.enabled && Array.isArray(addon.targetItemIds) && addon.targetItemIds.length > 0) {
        const targetItems = addon.targetItemIds
          .map(id => menuItems.find(i => i.id === id && i.available !== false))
          .filter((i): i is MenuItem => Boolean(i));
        if (targetItems.length > 0) {
          setSuggestedAddonPending({ item: menuItem, targetItems });
          return;
        }
      }
    }
  };

  const scrollToCategory = (catId: string) => {
    setActiveCategory(catId);
    const el = categoryRefs.current[catId];
    if (el) {
      const yOffset = -120;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
    // Scroll the selected pill into view within the horizontal carousel
    const bar = categoryBarRef.current;
    if (bar) {
      const btn = bar.querySelector(`[data-cat="${catId}"]`) as HTMLElement | null;
      if (btn) {
        const barLeft  = bar.scrollLeft;
        const barRight = barLeft + bar.clientWidth;
        const btnLeft  = btn.offsetLeft;
        const btnRight = btnLeft + btn.offsetWidth;
        const padding  = 16; // px breathing room
        if (btnLeft < barLeft + padding) {
          bar.scrollTo({ left: btnLeft - padding, behavior: 'smooth' });
        } else if (btnRight > barRight - padding) {
          bar.scrollTo({ left: btnRight - bar.clientWidth + padding, behavior: 'smooth' });
        }
      }
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 140;
      let activeCat = '';
      for (const cat of categories) {
        const el = categoryRefs.current[cat.id];
        if (el) {
          const top = el.offsetTop;
          const bottom = top + el.offsetHeight;
          if (scrollPos >= top && scrollPos < bottom) {
            activeCat = cat.id;
          }
        }
      }
      if (activeCat && activeCat !== activeCategory) {
        setActiveCategory(activeCat);
        // Keep the active pill visible in the carousel without stealing focus
        const bar = categoryBarRef.current;
        if (bar) {
          const btn = bar.querySelector(`[data-cat="${activeCat}"]`) as HTMLElement | null;
          if (btn) {
            const barLeft  = bar.scrollLeft;
            const barRight = barLeft + bar.clientWidth;
            const btnLeft  = btn.offsetLeft;
            const btnRight = btnLeft + btn.offsetWidth;
            const padding  = 16;
            if (btnLeft < barLeft + padding) {
              bar.scrollTo({ left: btnLeft - padding, behavior: 'smooth' });
            } else if (btnRight > barRight - padding) {
              bar.scrollTo({ left: btnRight - bar.clientWidth + padding, behavior: 'smooth' });
            }
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [categories, activeCategory]);

  // ── Category bar scroll state ─────────────────────────────────────────────
  const checkScrollability = useCallback(() => {
    const bar = categoryBarRef.current;
    if (!bar) return;
    const threshold = 4;
    setCanScrollLeft(bar.scrollLeft > threshold);
    setCanScrollRight(bar.scrollLeft + bar.clientWidth < bar.scrollWidth - threshold);
  }, []);

  const scrollCategoryBarRight = useCallback(() => {
    const bar = categoryBarRef.current;
    if (!bar) return;
    bar.scrollBy({ left: Math.max(bar.clientWidth * 0.65, 180), behavior: 'smooth' });
  }, []);

  // Observe bar size changes (e.g. categories loading) and recheck scrollability
  useEffect(() => {
    checkScrollability();
    const bar = categoryBarRef.current;
    if (!bar) return;
    const ro = new ResizeObserver(checkScrollability);
    ro.observe(bar);
    return () => ro.disconnect();
  }, [checkScrollability, categories]);

  // One-time subtle hint animation — only when categories overflow
  useEffect(() => {
    if (hintPlayed || categories.length === 0) return;
    const bar = categoryBarRef.current;
    if (!bar) return;
    // Only run if content actually overflows
    if (bar.scrollWidth <= bar.clientWidth + 4) return;
    const timer = setTimeout(() => {
      bar.scrollBy({ left: 56, behavior: 'smooth' });
      setTimeout(() => {
        bar.scrollBy({ left: -56, behavior: 'smooth' });
        sessionStorage.setItem('cat_hint_played', 'true');
        setHintPlayed(true);
      }, 420);
    }, 900);
    return () => clearTimeout(timer);
  }, [categories.length, hintPlayed]);

  const handleSignInDone = useCallback(() => {
    setShowSignIn(false);
    setProfile(getSavedProfile());
    toast.success('Signed in — your details will be pre-filled at checkout');
  }, []);

  return (
    <div className="min-h-screen bg-[#f8f8f5]">
      {!currentlyOpen && !scheduleMode && <ClosedOverlay onSchedule={() => setScheduleMode(true)} />}

      {/* Emergency stop overlay — only when schedule says OPEN but emergency override is ON */}
      {currentlyOpen && emergencyStop && (() => {
        const preset = emergencyStopStyle || 'large-clear';

        // Outer backdrop
        const backdropClass = preset === 'high-contrast'
          ? 'bg-black/80'
          : 'bg-black/55';

        // Card
        const cardBase = 'relative bg-white rounded-2xl w-full text-center';
        const cardClass = preset === 'high-contrast'
          ? `${cardBase} max-w-md shadow-2xl border-2 border-gray-900 p-6 sm:p-8`
          : preset === 'large-clear'
          ? `${cardBase} max-w-md shadow-xl p-8 sm:p-10`
          : `${cardBase} max-w-sm shadow-lg p-6`;

        // Icon circle
        const iconClass = preset === 'high-contrast'
          ? 'w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-5'
          : 'w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5';
        const iconSize = preset === 'large-clear' ? 'text-3xl' : 'text-2xl';

        // Heading
        const headingClass = preset === 'high-contrast'
          ? 'font-black text-black text-2xl mb-3'
          : preset === 'large-clear'
          ? 'font-black text-gray-900 text-3xl mb-3'
          : 'font-bold text-gray-900 text-xl mb-3';

        // Body
        const bodyClass = preset === 'high-contrast'
          ? 'font-medium text-black text-base'
          : preset === 'large-clear'
          ? 'text-gray-700 text-base'
          : 'text-gray-600 text-sm';

        // Badge
        const badgeClass = preset === 'high-contrast'
          ? 'inline-flex items-center gap-2 bg-black text-white rounded-full px-4 py-2 my-5 text-sm font-bold'
          : 'inline-flex items-center gap-2 bg-red-100 text-red-700 rounded-full px-4 py-2 my-5 text-sm font-bold';
        const badgeDotClass = preset === 'high-contrast'
          ? 'w-2 h-2 rounded-full bg-white animate-pulse flex-shrink-0'
          : 'w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0';

        // Phone button
        const phoneClass = preset === 'high-contrast'
          ? 'flex items-center justify-center gap-2 w-full bg-black hover:bg-gray-900 text-white font-black py-4 rounded-xl transition-all text-lg'
          : preset === 'large-clear'
          ? 'flex items-center justify-center gap-2 w-full bg-[var(--brand-accent)] hover:opacity-90 text-white font-black py-4 rounded-xl transition-all text-lg'
          : 'flex items-center justify-center gap-2 w-full bg-[var(--brand-accent)] hover:opacity-90 text-white font-bold py-3 rounded-xl transition-all text-base';

        return (
          <div className={`fixed inset-0 z-50 ${backdropClass} flex items-center justify-center px-4 py-8`}>
            <div className={cardClass}>
              {/* Icon */}
              <div className={iconClass}>
                <span className={iconSize}>⚠️</span>
              </div>

              {/* Heading */}
              <h1 className={headingClass}>Technical Difficulty</h1>

              {/* Body */}
              <p className={bodyClass}>Sorry, we are having technical difficulty now.</p>
              <p className={`${bodyClass} mt-1`}>Please try again later.</p>

              {/* Status badge */}
              <div className={badgeClass}>
                <div className={badgeDotClass} />
                <span>Online ordering temporarily unavailable</span>
              </div>

              {/* Phone */}
              {venue.phone && (
                <a href={`tel:${venue.phone.replace(/\s/g, '')}`} className={phoneClass}>
                  <Phone className="w-5 h-5 flex-shrink-0" />
                  Call us: {venue.phone}
                </a>
              )}

              <p className="text-center text-xs text-gray-400 mt-4">{venue.businessName}{venue.city ? ` · ${venue.city}` : ''}</p>
            </div>
          </div>
        );
      })()}

      {scheduleMode && !currentlyOpen && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-indigo-700 text-white px-4 py-2.5 flex items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-200 flex-shrink-0" />
            <p className="text-sm font-semibold">
              <span className="font-black">Scheduling a pre-order</span>
              <span className="text-indigo-200 ml-1 hidden sm:inline">— the store will confirm when they open</span>
            </p>
          </div>
          <button
            onClick={() => { setScheduleMode(false); sessionStorage.removeItem('mead_schedule_mode'); }}
            className="text-indigo-200 hover:text-white p-1 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Closing-soon banner — 20 to 15 min before close */}
      {closingSoon && !closingBannerDismissed && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 shadow-lg">
          <div className="max-w-3xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <Clock className="w-5 h-5 text-amber-900 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-900 font-black text-sm leading-tight">
                  Closing soon &mdash; {minsToClose} minute{minsToClose !== 1 ? 's' : ''} left to order online
                </p>
                <p className="text-amber-800 text-xs mt-0.5">
                  We stop taking online orders 15 minutes before closing. Place your order now, or call us to check.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <a
                href={`tel:${venue.phone.replace(/\s/g, '')}`}
                className="flex items-center gap-1.5 bg-amber-900 hover:bg-amber-950 text-amber-100 font-bold px-4 py-2 rounded-xl text-sm transition-all whitespace-nowrap"
              >
                <Phone className="w-3.5 h-3.5" />
                {venue.phone}
              </a>
              <button
                onClick={() => setClosingBannerDismissed(true)}
                className="p-1.5 text-amber-800 hover:text-amber-950 transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orders-cutoff banner — last 15 min before close */}
      {ordersCutoff && currentlyOpen && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 shadow-lg">
          <div className="max-w-3xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <Clock className="w-5 h-5 text-red-100 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-black text-sm leading-tight">
                  Online orders are now closed
                </p>
                <p className="text-red-200 text-xs mt-0.5">
                  We stop taking orders 15 minutes before closing. Call us &mdash; we may still be able to help!
                </p>
              </div>
            </div>
            <a
              href={`tel:${venue.phone.replace(/\s/g, '')}`}
              className="flex items-center gap-1.5 bg-white hover:bg-red-50 text-red-700 font-black px-4 py-2.5 rounded-xl text-sm transition-all whitespace-nowrap flex-shrink-0"
            >
              <Phone className="w-3.5 h-3.5" />
              Call {venue.phone}
            </a>
          </div>
        </div>
      )}

      {suggestedAddonPending && (
        <SuggestedAddonModal
          item={suggestedAddonPending.item}
          targetItems={suggestedAddonPending.targetItems}
          onConfirm={selected => handleAddonConfirm(suggestedAddonPending.item, selected)}
          onNo={handleAddonNo}
        />
      )}

      {condimentItem && (
        <CondimentModal
          item={condimentItem}
          customGroups={customGroups.filter(g => {
            // 1. Must be enabled for this item (global or explicitly linked)
            if (!g.global && !(condimentItem.customGroupIds ?? []).includes(g.id)) return false;
            // 2. Evaluate optional display condition — no condition = always show
            const condition = (condimentItem.customGroupConditions ?? {})[g.id];
            if (!condition) return true;
            if (condition.type === 'cart_has_category') {
              // Show only when the live cart contains at least one item from the specified category
              return items.some(cartItem => {
                const mi = menuItems.find(m => m.id === cartItem.menuItemId);
                return mi?.category === condition.value;
              });
            }
            if (condition.type === 'cart_has_item') {
              return items.some(cartItem => cartItem.menuItemId === condition.value);
            }
            return true; // unknown condition type — default to showing the group
          })}
          extrasItems={extrasItems}
          cartItemNames={items.map(i => i.name)}
          onConfirm={handleCondimentConfirm}
          onClose={() => setCondimentItem(null)}
        />
      )}

      {showSignIn && (
        <SignInModal onClose={() => setShowSignIn(false)} onDone={handleSignInDone} />
      )}

      <Header
        itemCount={itemCount}
        onCartOpen={() => setCartOpen(true)}
        onSignInClick={() => setShowSignIn(true)}
      />

      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        items={items}
        subtotal={subtotal}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        onClearCart={clearCart}
      />

      {/* Hero Banner */}
      <div className="relative h-48 sm:h-64 lg:h-80 overflow-hidden">
        <img src={venue.heroImageUrl || heroBanner} alt={venue.businessName} className="w-full h-full object-cover" fetchPriority="high" decoding="async" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--brand-accent)]/80 via-[var(--brand-accent)]/50 to-transparent" />
        {/* Text overlay — placement controlled by heroTextPlacement */}
        {(() => {
          const placement = venue.heroTextPlacement || 'bottom-left';
          const [vert, horiz] = placement.split('-') as [string, string];
          const justifyMap: Record<string, string> = {
            left: 'items-start', center: 'items-center', right: 'items-end',
          };
          const alignMap: Record<string, string> = {
            bottom: 'justify-end', center: 'justify-center', top: 'justify-start',
          };
          const textAlignMap: Record<string, string> = {
            left: 'text-left', center: 'text-center', right: 'text-right',
          };
          const fontMap: Record<string, string> = {
            sans:  'font-sans',
            serif: 'font-serif',
            mono:  'font-mono',
            slab:  '',  // custom via style
          };
          const horizKey = horiz || 'left';
          const vertKey  = vert  || 'bottom';
          const fontClass = fontMap[venue.heroFontStyle || 'sans'] ?? 'font-sans';
          const boldClass = venue.heroBold !== false ? 'font-black' : 'font-normal';
          return (
            <div className={`absolute inset-0 flex flex-col px-4 sm:px-8 py-6 sm:py-8 ${alignMap[vertKey] ?? 'justify-end'} ${justifyMap[horizKey] ?? 'items-start'}`}>
              <div className={`${textAlignMap[horizKey] ?? 'text-left'}`}
                style={venue.heroFontStyle === 'slab' ? { fontFamily: '"Rockwell", "Courier New", serif' } : undefined}
              >
                <h1 className={`text-white text-2xl sm:text-4xl leading-tight drop-shadow-lg ${fontClass} ${boldClass}`}>
                  {venue.businessName}
                </h1>
                <p className={`text-[var(--brand-primary)] text-sm sm:text-base font-semibold mt-1 ${fontClass}`}>{venue.tagline}</p>
                <div className={`flex flex-wrap items-center gap-3 mt-2 text-white/80 text-xs sm:text-sm ${
                  horizKey === 'center' ? 'justify-center' : horizKey === 'right' ? 'justify-end' : ''
                }`}>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {venue.city}{venue.postcode ? `, ${venue.postcode}` : ''}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {venue.deliveryEnabled ? 'Delivery & Collection' : 'Collection Only'}</span>
                  {venue.heroShowStars !== false && (
                    <span className="flex items-center gap-0.5">
                      {Array.from({ length: Math.min(Math.max(venue.heroStarCount ?? 5, 1), 5) }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-[var(--brand-primary)] text-[var(--brand-primary)]" />
                      ))}
              <span className="flex-shrink-0 w-4 inline-block" aria-hidden="true" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Info Bar */}
      <div className="bg-[var(--brand-accent)] text-white/90 text-xs sm:text-sm px-4 py-2 flex flex-wrap items-center justify-center gap-4 sm:gap-8">
        <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-[var(--brand-primary)]" /> {venue.phone}</span>
        {venue.allergenMessage && (
          <span className="flex items-center gap-1.5">
            <span className="text-[var(--brand-primary)]">⚠️</span> {venue.allergenMessage}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
          <span>{todayHoursText()}</span>
        </span>
        <span className="bg-[var(--brand-primary)] text-[var(--brand-accent)] text-xs font-bold px-2 py-0.5 rounded-full">💷 {venue.paymentInfo}</span>
      </div>

      {/* Open/Closed status pill */}
      <div className="max-w-6xl mx-auto px-4 pt-3 pb-0 flex items-center gap-2">
        {currentlyOpen ? (
          <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Open now — ordering available
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            Closed — opens {nextOpenTime()}
          </span>
        )}
        {!profile && (
          <button
            onClick={() => setShowSignIn(true)}
            className="ml-auto text-xs text-[var(--brand-primary)] font-semibold hover:underline flex items-center gap-1"
          >
            Sign in for faster checkout →
          </button>
        )}
        {profile && (
          <span className="ml-auto text-xs text-gray-500 font-medium">
            👋 {profile.name.split(' ')[0]}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="w-10 h-10 text-[var(--brand-primary)] animate-spin" />
          <p className="text-gray-500 text-sm">Loading menu…</p>
        </div>
      ) : (
        <>
          {/* Sticky Category Bar */}
          <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
            <div className="relative" style={{ maxWidth: '100vw' }}>
              {/* Left fade — visible once user has scrolled away from the start */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-10 transition-opacity duration-200"
                style={{
                  opacity: canScrollLeft ? 1 : 0,
                  background: 'linear-gradient(to right, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0) 100%)',
                }}
              />

              {/* Scrollable pill row */}
              <div
                ref={categoryBarRef}
                className="scrollbar-hide flex gap-2 px-4 py-2"
                style={{
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  WebkitOverflowScrolling: 'touch',
                  whiteSpace: 'nowrap',
                  maxWidth: '100vw',
                }}
                onScroll={checkScrollability}
              >
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    data-cat={cat.id}
                    onClick={() => scrollToCategory(cat.id)}
                    className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                      activeCategory === cat.id
                        ? 'bg-[var(--brand-accent)] text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span>{cat.icon}</span> {cat.name}
                  </button>
                ))}
                {/* Right-hand breathing room so last pill is never hidden under the fade */}
                <span className="flex-shrink-0 w-10 inline-block" aria-hidden="true" />
              </div>

              {/* Right fade + arrow — visible when more categories exist to the right */}
              <div
                className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 flex items-center justify-end transition-opacity duration-200"
                style={{
                  opacity: canScrollRight ? 1 : 0,
                  width: '72px',
                  background: 'linear-gradient(to left, rgba(255,255,255,0.97) 30%, rgba(255,255,255,0) 100%)',
                }}
              >
                {/* Tappable arrow — pointer-events-auto so only the button is interactive */}
                <button
                  aria-label="Scroll categories right"
                  onClick={scrollCategoryBarRight}
                  tabIndex={canScrollRight ? 0 : -1}
                  className="pointer-events-auto flex items-center justify-center w-11 h-11 mr-0.5 rounded-full transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.9)',
                    boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
                    border: '1px solid rgba(0,0,0,0.07)',
                  }}
                >
                  <ChevronRight
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: 'var(--brand-accent)', strokeWidth: 2.5 }}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Menu Content */}
          <div className="max-w-6xl mx-auto px-4 pb-24">
            {(() => {
              // Track a global card index across all categories so we can
              // give above-the-fold cards (index 0–7) eager / high-priority loading.
              let globalIdx = 0;
              return categories.map(cat => {
                const catItems = menuItems.filter(i =>
                  i.category === cat.id ||
                  (i.categories ?? []).includes(cat.id)
                );
                if (catItems.length === 0) return null;
                return (
                  <div
                    key={cat.id}
                    ref={el => { categoryRefs.current[cat.id] = el; }}
                    className="pt-6"
                  >
                    <h2 className="text-xl font-black text-[var(--brand-accent)] mb-3 flex items-center gap-2">
                      <span className="text-2xl">{cat.icon}</span> {cat.name}
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {catItems.map(item => (
                        <MenuCard key={item.id} item={item} onAdd={handleAddItem} renderIndex={globalIdx++} />
                      ))}
                      <span className="flex-shrink-0 w-4 inline-block" aria-hidden="true" />
                    </div>
                  </div>
                );
              });
            })()}

            {/* Footer */}
            <div className="mt-12 bg-[var(--brand-accent)] rounded-2xl p-5 text-white text-center">
              <p className="font-bold text-[var(--brand-primary)] text-lg mb-1">Allergen Information</p>
              <p className="text-white/70 text-sm">{venue.allergenMessage || 'For allergen information please call the store.'}</p>
              <p className="text-white/50 text-xs mt-3">{venue.businessName} · {venue.city} · {venue.phone}</p>
            </div>
          </div>
        </>
      )}

      {/* Mobile Sticky Cart Button */}
      {itemCount > 0 && (currentlyOpen || scheduleMode) && (
        <div className="fixed bottom-4 left-4 right-4 z-40 md:hidden">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full bg-[var(--brand-primary)] hover:opacity-90 text-[var(--brand-accent)] font-bold py-4 rounded-2xl flex items-center justify-between px-5 shadow-xl transition-all active:scale-[0.98]"
          >
            <span className="bg-[var(--brand-accent)] text-white text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center">{itemCount}</span>
            <span className="text-base">View Order</span>
            <span className="font-black text-base">£{subtotal.toFixed(2)}</span>
          </button>
        </div>
      )}
    </div>
  );
}
