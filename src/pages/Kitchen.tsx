
import { useState, useEffect, useCallback, useRef, Component } from 'react';
import {
  Printer, Volume2, VolumeX, RefreshCw, Clock, CheckCircle,
  ChefHat, Package, AlertTriangle, Wifi, WifiOff, X, Lock, Eye, EyeOff,
  KeyRound, Bell, BellOff, Menu as MenuIcon, Timer, Plus, Trash2, GripVertical, BarChart2,
  ShieldAlert, LogOut, UserCog, Users, KeySquare, Usb, Unplug,
} from 'lucide-react';
import {
  isWebSerialSupported, connectSerialPrinter, disconnectSerialPrinter,
  isSerialConnected, getConnectedPortLabel,
} from '@/lib/thermalPrinter';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useKitchenOrders, useOrders } from '@/hooks/useOrders';
import { useVenueConfig } from '@/hooks/useVenueConfig';
import { Order } from '@/types';
import { formatPrice, formatTime } from '@/lib/utils';
import {
  getPrinterConfig, savePrinterConfig, printOrder, PrinterConfig,
} from '@/lib/printer';
import { isOpen } from '@/lib/openingHours';
import { getVenueConfig } from '@/lib/venueConfig';
import KitchenAnalytics from '@/components/features/KitchenAnalytics';
import SetupWizard, { isSetupComplete } from '@/components/features/SetupWizard';
import { toast } from 'sonner';

// ── Error boundary ─────────────────────────────────────────────────────────
class KitchenErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }
  componentDidCatch(error: Error) {
    console.error('[KitchenErrorBoundary] Caught:', error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0f1f3d] flex flex-col items-center justify-center gap-4 px-4">
          <ChefHat className="w-12 h-12 text-[#f5a623]" />
          <h2 className="text-white font-bold text-xl">Something went wrong</h2>
          <p className="text-white/50 text-sm text-center max-w-xs">{this.state.error}</p>
          <button
            onClick={() => { this.setState({ hasError: false, error: '' }); window.location.reload(); }}
            className="bg-[#f5a623] text-[#0f1f3d] font-bold px-6 py-3 rounded-xl"
          >
            Reload Kitchen Screen
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── PIN config ─────────────────────────────────────────────────────────────
const PIN_KEY       = 'kitchen_pin';
const ADMIN_PIN_KEY = 'kitchen_admin_pin';
const SESSION_KEY   = 'kitchen_session';
const DEFAULT_PIN   = '1234';
const DEFAULT_ADMIN_PIN = '9999';

function getPin()      { return localStorage.getItem(PIN_KEY)       || DEFAULT_PIN; }
function getAdminPin() { return localStorage.getItem(ADMIN_PIN_KEY) || DEFAULT_ADMIN_PIN; }

// ── Sound engine ────────────────────────────────────────────────────────────
function createAudioCtx() {
  try {
    return new (window.AudioContext || (window as unknown as Record<string, unknown>).webkitAudioContext as typeof AudioContext)();
  } catch { return null; }
}

function playTone(ctx: AudioContext, freq: number, start: number, duration: number, gain: number, type: OscillatorType = 'sine') {
  const osc = ctx.createOscillator();
  const g   = ctx.createGain();
  osc.connect(g); g.connect(ctx.destination);
  osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
  osc.type = type;
  g.gain.setValueAtTime(0, ctx.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.02);
  g.gain.linearRampToValueAtTime(0, ctx.currentTime + start + duration - 0.05);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + duration);
}

function playNewOrderSound(volume: number) {
  const ctx = createAudioCtx();
  if (!ctx) return;
  const g = volume / 100;
  playTone(ctx, 523, 0.00, 0.18, g, 'triangle');
  playTone(ctx, 659, 0.20, 0.18, g, 'triangle');
  playTone(ctx, 784, 0.40, 0.18, g, 'triangle');
  playTone(ctx, 1046, 0.60, 0.30, g * 0.9, 'triangle');
  playTone(ctx, 1046, 0.60, 0.30, g * 0.4, 'sine');
}

function playReadySound(volume: number) {
  const ctx = createAudioCtx();
  if (!ctx) return;
  const g = volume / 100;
  [523, 659, 784, 1046, 784, 1046].forEach((f, i) => {
    playTone(ctx, f, i * 0.12, 0.14, g * (i === 5 ? 1 : 0.7), 'sine');
  });
}

// ── Status helpers ──────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<Order['status'], { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  scheduled: { label: '⏰ Scheduled', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200', icon: <Clock className="w-4 h-4" /> },
  new:       { label: 'New Order',  color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',    icon: <Bell className="w-4 h-4" /> },
  accepted:  { label: 'Accepted',   color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200', icon: <CheckCircle className="w-4 h-4" /> },
  preparing: { label: 'Preparing',  color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', icon: <ChefHat className="w-4 h-4" /> },
  ready:     { label: 'Ready! 🎉',  color: 'text-green-700',  bg: 'bg-green-50 border-green-200',   icon: <Package className="w-4 h-4" /> },
  collected: { label: 'Collected',  color: 'text-gray-500',   bg: 'bg-gray-50 border-gray-200',     icon: <CheckCircle className="w-4 h-4" /> },
  cancelled: { label: 'Cancelled',  color: 'text-red-600',    bg: 'bg-red-50 border-red-200',       icon: <X className="w-4 h-4" /> },
};

const TABS: { id: 'active' | 'scheduled' | 'collected' | 'cancelled'; label: string }[] = [
  { id: 'active',    label: 'Active Orders' },
  { id: 'scheduled', label: 'Scheduled'    },
  { id: 'collected', label: 'Collected'    },
  { id: 'cancelled', label: 'Cancelled'    },
];

// ── Clock-time helpers ──────────────────────────────────────────────────────
function isClockTime(t?: string): boolean {
  return !!t && t.startsWith('time:');
}
function getClockHHMM(t: string): string {
  return t.replace('time:', '');
}
function formatClockTime(t: string): string {
  const hhmm = getClockHHMM(t);
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

const COLLECTED_CLEARED_KEY = 'kitchen_collected_cleared_at';

function getCollectedClearedAt(): string {
  const stored = localStorage.getItem(COLLECTED_CLEARED_KEY);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  if (!stored || new Date(stored) < todayStart) {
    const iso = todayStart.toISOString();
    localStorage.setItem(COLLECTED_CLEARED_KEY, iso);
    return iso;
  }
  return stored;
}

function clearCollectedNow() {
  const iso = new Date().toISOString();
  localStorage.setItem(COLLECTED_CLEARED_KEY, iso);
  return iso;
}

const BUSY_LOCKS_KEY = 'kitchen_busy_locks';

function loadBusyLocks(): Record<string, number> {
  try {
    const s = localStorage.getItem(BUSY_LOCKS_KEY);
    if (s) return JSON.parse(s) as Record<string, number>;
  } catch { /* ignore */ }
  return {};
}

function saveBusyLock(orderId: string, expiresAt: number) {
  const locks = loadBusyLocks();
  locks[orderId] = expiresAt;
  localStorage.setItem(BUSY_LOCKS_KEY, JSON.stringify(locks));
}

function removeBusyLock(orderId: string) {
  const locks = loadBusyLocks();
  delete locks[orderId];
  localStorage.setItem(BUSY_LOCKS_KEY, JSON.stringify(locks));
}

const TIMES_KEY = 'kitchen_accept_times';
const DEFAULT_TIMES = [15, 20, 30, 35, 45];

function getStoredTimes(): number[] {
  try {
    const stored = localStorage.getItem(TIMES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as number[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return DEFAULT_TIMES;
}

function saveStoredTimes(times: number[]) {
  localStorage.setItem(TIMES_KEY, JSON.stringify(times));
}

// ── Time Settings modal ─────────────────────────────────────────────────────
function TimeSettingsModal({
  times, onSave, onClose,
}: {
  times: number[];
  onSave: (times: number[]) => void;
  onClose: () => void;
}) {
  const [list, setList]   = useState<number[]>([...times]);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const addTime = () => {
    const val = parseInt(input, 10);
    if (isNaN(val) || val < 1 || val > 240) { setError('Enter a number between 1 and 240'); return; }
    if (list.includes(val)) { setError(`${val} min is already in the list`); return; }
    const next = [...list, val].sort((a, b) => a - b);
    setList(next);
    setInput('');
    setError('');
  };

  const removeTime = (val: number) => {
    if (list.length <= 1) { setError('You need at least one time option'); return; }
    setList(list.filter(t => t !== val));
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#0f1f3d] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden border border-white/10">
        <div className="bg-[#081529] px-5 py-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2">
            <Timer className="w-5 h-5 text-[#f5a623]" />
            <div>
              <h2 className="text-white font-bold">Collection Time Options</h2>
              <p className="text-white/50 text-xs">Times shown when accepting an order</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white p-1"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-bold text-gray-300 mb-2">Current options</p>
            <div className="space-y-2">
              {list.map(t => (
                <div key={t} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-white/20" />
                    <span className="text-white font-bold">{t} minutes</span>
                  </div>
                  <button onClick={() => removeTime(t)} className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-300 mb-2">Add a time option</p>
            <div className="flex gap-2">
              <input
                type="number" min={1} max={240} value={input}
                onChange={e => { setInput(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && addTime()}
                placeholder="e.g. 25"
                className="flex-1 bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50 focus:border-[#f5a623] font-mono"
              />
              <button onClick={addTime} className="bg-[#f5a623] hover:bg-[#e09615] text-[#0f1f3d] font-bold px-4 rounded-xl transition-all flex items-center gap-1">
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
            {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
          </div>
          <button onClick={() => { setList([...DEFAULT_TIMES]); setError(''); }} className="w-full text-xs text-white/40 hover:text-white/60 transition-colors py-1">
            Reset to defaults (15, 20, 30, 35, 45)
          </button>
          <button onClick={() => { onSave(list); onClose(); }} className="w-full bg-[#f5a623] hover:bg-[#e09615] text-[#0f1f3d] font-bold py-3 rounded-xl transition-all">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Accept modal ────────────────────────────────────────────────────────────
function AcceptModal({
  order, times, onConfirm, onClose,
}: {
  order: Order; times: number[];
  onConfirm: (minutes: number) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(times[Math.floor(times.length / 2)] ?? times[0] ?? 20);
  const validSelected = times.includes(selected) ? selected : times[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="bg-[#0f1f3d] px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-lg">Accept Order #{order.orderNumber}</h2>
            <p className="text-white/60 text-xs">{order.customerName} — {formatPrice(order.total)}</p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white p-1"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">
          <p className="text-gray-600 text-sm font-medium mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#f5a623]" /> Set collection time:
          </p>
          <div className={`grid gap-2 mb-5 ${times.length <= 4 ? 'grid-cols-4' : times.length <= 6 ? 'grid-cols-3' : 'grid-cols-4'}`}>
            {times.map(t => (
              <button key={t} onClick={() => setSelected(t)}
                className={`py-3 rounded-xl font-bold text-sm transition-all ${validSelected === t ? 'bg-[#f5a623] text-[#0f1f3d] shadow-md scale-105' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {t} min
              </button>
            ))}
          </div>
          {order.prepTime && order.prepTime !== 'asap' && (
            <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2 mb-4">Customer requested: ~{order.prepTime} min</p>
          )}
          <button onClick={() => onConfirm(validSelected)}
            className="w-full bg-[#f5a623] hover:bg-[#e09615] text-[#0f1f3d] font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95">
            <CheckCircle className="w-5 h-5" /> Accept — Ready in {validSelected} min
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Printer settings modal ──────────────────────────────────────────────────
function PrinterSettingsModal({
  config, onSave, onClose,
}: {
  config: PrinterConfig;
  onSave: (c: PrinterConfig) => void;
  onClose: () => void;
}) {
  const [autoPrint, setAutoPrint] = useState(config.autoPrint);
  const [printOn,   setPrintOn]   = useState<'new' | 'accepted'>(config.printOn);
  const [ip,        setIp]        = useState(config.ip ?? '');
  const [printerType, setPrinterType] = useState<'network' | 'bluetooth'>(config.printerType ?? 'bluetooth');
  const [serialConnected, setSerialConnected] = useState(isSerialConnected);
  const [serialLabel,     setSerialLabel]     = useState(getConnectedPortLabel);
  const [connecting, setConnecting] = useState(false);
  const [copiedFlag, setCopiedFlag] = useState(false);

  const testPrint = async () => {
    const testOrder: Order = {
      id: 'test', orderNumber: 'TEST-001',
      items: [{ id: '1', menuItemId: '1', name: 'Cod (Large)', price: 9.00, quantity: 1, notes: 'Salt & Vinegar' }],
      subtotal: 9.00, total: 9.00,
      customerName: 'Test Customer', customerPhone: '07700 900000',
      status: 'new', createdAt: new Date().toISOString(),
    };
    await printOrder(testOrder, { ip, printerType, autoPrint, printOn });
  };

  const handleCopyFlag = () => {
    navigator.clipboard.writeText('--kiosk-printing');
    setCopiedFlag(true);
    setTimeout(() => setCopiedFlag(false), 2500);
  };

  const handleConnectUSB = async () => {
    setConnecting(true);
    const result = await connectSerialPrinter();
    setConnecting(false);
    if (result.ok) {
      setSerialConnected(true);
      setSerialLabel(getConnectedPortLabel());
      toast.success('USB printer connected — receipts will print silently!');
    } else if (result.error && !result.error.includes('No printer selected')) {
      toast.error('Connection failed: ' + result.error);
    }
  };

  const handleDisconnectUSB = async () => {
    await disconnectSerialPrinter();
    setSerialConnected(false);
    setSerialLabel('');
    toast.success('USB printer disconnected');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#0f1f3d] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto border border-white/10">
        <div className="bg-[#081529] px-5 py-4 flex items-center justify-between sticky top-0 z-10 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Printer className="w-5 h-5 text-[#f5a623]" />
            <div>
              <h2 className="text-white font-bold">Printer Settings</h2>
              <p className="text-white/50 text-xs">Silent Bluetooth printing setup</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white p-1"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">

          {/* ── WHY dialog appears banner ── */}
          <div className="bg-amber-500/20 border-2 border-amber-500/50 rounded-xl px-4 py-3">
            <p className="text-sm font-black text-amber-300 flex items-center gap-2">
              ⚠️ Print dialog appearing?
            </p>
            <p className="text-xs text-amber-200/80 mt-1">
              Chrome requires the <code className="bg-black/30 px-1 rounded font-mono">--kiosk-printing</code> flag to suppress the dialog.
              Follow the 3 steps below — it's a one-time setup.
            </p>
          </div>

          {/* ── Copies per category pointer ── */}
          <div className="bg-[#1a2f5a] border border-[#f5a623]/20 rounded-xl px-4 py-3 flex items-start gap-3">
            <Printer className="w-4 h-4 text-[#f5a623] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-white">Kitchen print copies by category</p>
              <p className="text-[11px] text-white/50 mt-0.5 leading-relaxed">
                Configure how many copies each category prints in{' '}
                <strong className="text-white/70">Menu Admin → Categories</strong>.
                Each category has its own print count — items print separately per category, not as whole-order duplicates.
              </p>
            </div>
          </div>

          {/* ── Step-by-step ── */}
          <div className="bg-[#1a2f5a] border border-white/10 rounded-xl p-4 space-y-4">
            <p className="text-xs font-black text-white">3 steps to silent printing (one-time)</p>

            <div className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-[#f5a623] text-[#0f1f3d] font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              <div>
                <p className="text-xs font-bold text-white">Set your Bluetooth printer as the Windows default</p>
                <p className="text-[11px] text-white/50 mt-0.5 leading-relaxed">
                  Start → Settings → Bluetooth &amp; devices → Printers &amp; scanners<br />
                  → click your printer → <strong className="text-white/80">Set as default</strong>
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-[#f5a623] text-[#0f1f3d] font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              <div className="flex-1">
                <p className="text-xs font-bold text-white">Add the flag to your Chrome shortcut</p>
                <p className="text-[11px] text-white/50 mt-0.5 leading-relaxed">
                  Right-click your Chrome desktop shortcut → <strong className="text-white/80">Properties</strong><br />
                  In the <em>Target</em> field, add a space then paste this flag at the end:
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 bg-black/50 border border-[#f5a623]/30 rounded-lg px-3 py-2.5 text-[#f5a623] font-mono text-sm font-bold select-all">
                    --kiosk-printing
                  </code>
                  <button
                    onClick={handleCopyFlag}
                    className={`flex-shrink-0 px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
                      copiedFlag ? 'bg-green-500 text-white' : 'bg-[#f5a623] hover:bg-[#e09615] text-[#0f1f3d]'
                    }`}
                  >
                    {copiedFlag ? '✓ Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-[10px] text-white/30 mt-1.5">
                  Example target: <span className="font-mono">"C:\...\chrome.exe" --kiosk-printing</span>
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-[#f5a623] text-[#0f1f3d] font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
              <div>
                <p className="text-xs font-bold text-white">Close Chrome completely &amp; reopen from that shortcut</p>
                <p className="text-[11px] text-white/50 mt-0.5">
                  Make sure you close all Chrome windows first, then open Chrome using the shortcut you just edited.
                  All future prints will go directly to your Bluetooth printer — no dialog.
                </p>
              </div>
            </div>

            <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2.5">
              <p className="text-xs font-bold text-green-300">✅ Once done, use Test Print below to confirm it's working silently.</p>
            </div>
          </div>

          {/* ── Auto-print triggers ── */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white/60 uppercase tracking-wide block">Auto-print</label>
            <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3">
              <div>
                <p className="font-semibold text-sm text-green-300">✅ On order accept</p>
                <p className="text-xs text-green-400/70">Always prints when you accept an order</p>
              </div>
              <span className="text-xs bg-green-500/20 text-green-300 font-bold px-2 py-1 rounded-full border border-green-500/30">Always ON</span>
            </div>
            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <div>
                <p className="font-semibold text-sm text-white">📥 Also print on new order received</p>
                <p className="text-xs text-white/40">Print immediately when order arrives (before accepting)</p>
              </div>
              <button onClick={() => setAutoPrint(v => !v)}
                className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${autoPrint ? 'bg-[#f5a623]' : 'bg-white/20'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoPrint ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>
          </div>

          {/* ── USB advanced ── */}
          <details className="group">
            <summary className="text-xs font-bold text-white/30 hover:text-white/60 cursor-pointer select-none flex items-center gap-1.5 py-1">
              <Usb className="w-3.5 h-3.5" />
              Alternative: USB direct print (no Chrome flag needed)
            </summary>
            <div className="mt-3 bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
              <p className="text-xs text-white/60">If your printer has a USB cable you can plug in, this connects directly via Web Serial — fully silent, no Chrome flag required.</p>
              {serialConnected ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 bg-green-500/20 border border-green-500/30 rounded-lg px-3 py-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <p className="text-xs font-bold text-green-300 flex-1 truncate">USB connected: {serialLabel}</p>
                  </div>
                  <button onClick={handleDisconnectUSB}
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl text-xs font-bold transition-all">
                    <Unplug className="w-3.5 h-3.5" /> Disconnect USB
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleConnectUSB}
                  disabled={!isWebSerialSupported() || connecting}
                  className="w-full bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all"
                >
                  {connecting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Connecting…</> : <><Usb className="w-4 h-4" /> Connect USB Port</>}
                </button>
              )}
              {!isWebSerialSupported() && (
                <p className="text-[11px] text-amber-400">⚠️ Web Serial requires Chrome or Edge on desktop.</p>
              )}
            </div>
          </details>

          <div className="flex gap-3">
            <button onClick={testPrint}
              className="flex-1 border border-white/20 text-white font-bold py-3 rounded-xl hover:bg-white/10 flex items-center justify-center gap-2 text-sm transition-all">
              <Printer className="w-4 h-4" /> Test Print
            </button>
            <button onClick={() => { onSave({ ip, printerType, autoPrint, printOn }); onClose(); }}
              className="flex-1 bg-[#f5a623] hover:bg-[#e09615] text-[#0f1f3d] font-bold py-3 rounded-xl text-sm transition-all">
              Save &amp; Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Condiment chip helpers ────────────────────────────────────────────────
function getCondimentValues(): string[] {
  try {
    const cfg = getVenueConfig();
    if (Array.isArray(cfg.condimentOptions) && cfg.condimentOptions.length > 0) return cfg.condimentOptions;
  } catch { /* ignore */ }
  return ['Salt & Vinegar', 'Salt only', 'Vinegar only', 'No salt or vinegar', 'No seasoning'];
}

interface ParsedNote { condiment: string | null; customNote: string | null; }

function parseItemNote(notes: string): ParsedNote {
  const parts = notes.split(' · ');
  if (getCondimentValues().includes(parts[0])) {
    return { condiment: parts[0], customNote: parts.slice(1).join(' · ') || null };
  }
  return { condiment: null, customNote: notes };
}

const CONDIMENT_CHIP: Record<string, { emoji: string; bg: string; text: string; border: string }> = {
  'Salt & Vinegar':     { emoji: '🧂🍶', bg: 'bg-teal-100',   text: 'text-teal-800',   border: 'border-teal-300' },
  'Salt only':          { emoji: '🧂',    bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-300' },
  'Vinegar only':       { emoji: '🍶',    bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-300' },
  'No salt or vinegar': { emoji: '🚫',    bg: 'bg-gray-100',   text: 'text-gray-600',   border: 'border-gray-300' },
};

function ItemNote({ notes }: { notes: string }) {
  const { condiment, customNote } = parseItemNote(notes);
  const chip = condiment ? CONDIMENT_CHIP[condiment] : null;
  let saladText: string | null = null;
  let sauceText: string | null = null;
  let freeNote: string | null = null;
  const customChips: { label: string; value: string }[] = [];

  if (customNote) {
    const parts = customNote.split(' · ');
    const remaining: string[] = [];
    for (const p of parts) {
      if (p.startsWith('Salad: '))      saladText = p.replace('Salad: ', '');
      else if (p.startsWith('Sauce: ')) sauceText = p.replace('Sauce: ', '');
      else if (p.includes(': ')) {
        const colonIdx = p.indexOf(': ');
        customChips.push({ label: p.slice(0, colonIdx), value: p.slice(colonIdx + 2) });
      } else remaining.push(p);
    }
    freeNote = remaining.join(' · ') || null;
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {chip && (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${chip.bg} ${chip.text} ${chip.border}`}>
          <span>{chip.emoji}</span>{condiment}
        </span>
      )}
      {saladText && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border bg-green-100 text-green-800 border-green-300">
          🥗 {saladText}
        </span>
      )}
      {sauceText && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border bg-orange-100 text-orange-800 border-orange-300">
          🍶 {sauceText}
        </span>
      )}
      {customChips.map((c, i) => (
        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border bg-purple-100 text-purple-800 border-purple-300">
          🎛 {c.label}: {c.value}
        </span>
      ))}
      {freeNote && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
          📝 {freeNote}
        </span>
      )}
    </div>
  );
}

// ── Admin PIN modal ─────────────────────────────────────────────────────────
function AdminPinModal({
  title, subtitle, onConfirm, onClose,
}: {
  title: string;
  subtitle?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [pin, setPin]     = useState('');
  const [error, setError] = useState(false);

  const handleKey = (digit: string) => {
    if (pin.length >= 8) return;
    const next = pin + digit;
    setPin(next);
    setError(false);
    const stored = getAdminPin();
    if (next === stored) {
      onConfirm();
    } else if (next.length >= stored.length) {
      setTimeout(() => { setError(true); setPin(''); }, 300);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden">
        <div className="bg-red-600 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-white" />
            <div>
              <h2 className="text-white font-bold text-sm">{title}</h2>
              {subtitle && <p className="text-red-100 text-xs mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white p-1"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">
          <p className="text-center text-sm font-semibold text-gray-600 mb-3">Enter admin PIN to continue</p>
          <div className="flex justify-center gap-3 mb-4">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${
                pin.length > i ? 'bg-red-600 border-red-600' : 'border-gray-300'
              } ${error ? 'border-red-400 bg-red-100' : ''}`}>
                {pin.length > i && <div className="w-3 h-3 rounded-full bg-white" />}
              </div>
            ))}
          </div>
          {error && <p className="text-red-500 text-xs text-center mb-3">Incorrect admin PIN — try again</p>}
          <div className="grid grid-cols-3 gap-2">
            {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => (
              <button key={i}
                onClick={() => { if (k === '⌫') setPin(p => p.slice(0, -1)); else if (k) handleKey(k); }}
                className={`py-4 rounded-xl font-bold text-lg transition-all active:scale-90 ${
                  k ? 'bg-gray-100 hover:bg-gray-200 text-[#0f1f3d]' : ''
                }`}>
                {k}
              </button>
            ))}
          </div>
          <p className="text-center text-[11px] text-gray-400 mt-3">Admin action — requires admin PIN</p>
        </div>
      </div>
    </div>
  );
}

// ── Order card ─────────────────────────────────────────────────────────────
function KitchenOrderCard({
  order, orderCount, onStatusChange, onAccept, onPrint, onCancelRequest, lockSecondsRemaining,
}: {
  order: Order; orderCount: number;
  onStatusChange: (id: string, status: Order['status']) => void;
  onAccept: (order: Order) => void;
  onPrint: (order: Order) => void;
  onCancelRequest: (order: Order) => void;
  lockSecondsRemaining: number;
}) {
  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG['new'];
  const ageMs = Date.now() - new Date(order.createdAt).getTime();
  const isStale = order.status === 'new' && ageMs > 2 * 60 * 1000;

  const nextStatusMap: Partial<Record<Order['status'], Order['status']>> = {
    scheduled: 'new', accepted: 'ready', ready: 'collected',
  };
  const nextStatus = nextStatusMap[order.status];
  const nextLabel: Partial<Record<Order['status'], string>> = {
    scheduled: '✓ Accept Pre-Order', accepted: '→ Mark Ready', ready: '→ Mark Collected',
  };

  return (
    <div className={`rounded-2xl border-2 overflow-hidden ${cfg.bg} ${isStale ? 'ring-2 ring-red-400' : ''}`}>
      <div className="bg-[#0f1f3d] px-4 py-3 flex items-center justify-between">
        <div>
          <span className="text-[#f5a623] font-black text-base">#{order.orderNumber}</span>
          <span className="text-white/60 text-xs ml-2">{formatTime(order.createdAt)}</span>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.color}`}>
          {cfg.icon} {cfg.label}
        </div>
      </div>

      {isStale && (
        <div className="bg-red-500 text-white text-xs font-bold px-4 py-1.5 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5" /> WAITING OVER 2 MINUTES
        </div>
      )}

      {lockSecondsRemaining > 0 && (
        <div className="bg-amber-500 text-[#0f1f3d] text-xs font-bold px-4 py-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Customer deciding — do not start cooking yet
          </span>
          <span className="bg-[#0f1f3d] text-amber-300 px-2 py-0.5 rounded-full text-sm tabular-nums">
            {lockSecondsRemaining}s
          </span>
        </div>
      )}

      {order.status === 'cancelled' && (
        <div className="bg-red-600 text-white text-xs font-bold px-4 py-2 flex items-center gap-2">
          <X className="w-3.5 h-3.5" /> This order was cancelled
        </div>
      )}

      {orderCount > 0 && order.status !== 'cancelled' && (
        <div className={`px-4 py-2 flex items-center gap-3 border-b ${
          orderCount === 1 ? 'bg-sky-50 border-sky-100' : orderCount >= 5 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-100'
        }`}>
          <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center ${
            orderCount === 1 ? 'bg-sky-100' : orderCount >= 5 ? 'bg-[#f5a623]' : 'bg-green-100'
          }`}>
            <span className={`text-xl font-black leading-none ${
              orderCount === 1 ? 'text-sky-700' : orderCount >= 5 ? 'text-[#0f1f3d]' : 'text-green-800'
            }`}>{orderCount}</span>
            <span className={`text-[9px] font-bold uppercase tracking-wide leading-tight ${
              orderCount === 1 ? 'text-sky-500' : orderCount >= 5 ? 'text-[#0f1f3d]/70' : 'text-green-600'
            }`}>orders</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-black leading-tight ${
              orderCount === 1 ? 'text-sky-700' : orderCount >= 5 ? 'text-amber-800' : 'text-green-800'
            }`}>
              {orderCount === 1 ? '👋 First-time customer' : orderCount >= 5 ? '🏆 Loyal regular' : '⭐ Returning customer'}
            </p>
            <p className={`text-[10px] leading-tight mt-0.5 ${
              orderCount === 1 ? 'text-sky-500' : orderCount >= 5 ? 'text-amber-600' : 'text-green-600'
            }`}>
              {orderCount === 1 ? 'Welcome — first order ever' : `${orderCount} previous order${orderCount > 1 ? 's' : ''} from this number`}
            </p>
          </div>
        </div>
      )}

      <div className="px-4 pt-3 pb-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm">
        <div>
          <span className="text-xs text-gray-500">Customer</span>
          <p className="font-bold text-gray-900">{order.customerName}</p>
        </div>
        <div>
          <span className="text-xs text-gray-500">Phone</span>
          <p className="font-bold text-gray-900">{order.customerPhone}</p>
        </div>
        {order.prepTime && (
          <div className="col-span-2">
            <span className="text-xs text-gray-500">Requested collection</span>
            <p className="font-semibold text-blue-700 text-sm">
              {order.prepTime === 'asap' ? 'As soon as possible' : isClockTime(order.prepTime) ? `At ${formatClockTime(order.prepTime)}` : `~${order.prepTime} minutes`}
            </p>
          </div>
        )}
        {order.estimatedReady && (
          <div className="col-span-2">
            <span className="text-xs text-gray-500">Confirmed ready by</span>
            <p className="font-bold text-green-700">
              {new Date(order.estimatedReady).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        )}
      </div>

      <div className="px-4 py-2">
        <div className="bg-white/70 rounded-xl p-3 space-y-1">
          {order.items.map(item => (
            <div key={item.id} className="space-y-0.5">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-gray-800">{item.quantity}× {item.name}</span>
                <span className="font-semibold text-gray-600">{formatPrice(item.price * item.quantity)}</span>
              </div>
              {item.notes && <ItemNote notes={item.notes} />}
            </div>
          ))}
          <div className="border-t border-gray-200 mt-1 pt-1 flex justify-between font-bold text-sm">
            <span>Total</span><span>{formatPrice(order.total)}</span>
          </div>
        </div>
        {order.notes && (
          <p className="mt-2 text-xs bg-amber-100 text-amber-800 rounded-lg px-3 py-2">📝 {order.notes}</p>
        )}
      </div>

      <div className="px-4 pb-4 pt-1 flex gap-2 flex-wrap">
        {order.status === 'new' && (
          <button onClick={() => onAccept(order)}
            className="flex-1 bg-[#f5a623] hover:bg-[#e09615] text-[#0f1f3d] font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-1.5 transition-all active:scale-95">
            <CheckCircle className="w-4 h-4" /> Accept Order
          </button>
        )}
        {order.status === 'scheduled' && (
          <button onClick={() => onStatusChange(order.id, 'new')}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-1.5 transition-all active:scale-95">
            <CheckCircle className="w-4 h-4" /> Confirm Pre-Order
          </button>
        )}
        {nextStatus && order.status !== 'new' && order.status !== 'scheduled' && order.status !== 'cancelled' && (
          <button
            onClick={() => lockSecondsRemaining > 0 ? undefined : onStatusChange(order.id, nextStatus)}
            disabled={lockSecondsRemaining > 0}
            title={lockSecondsRemaining > 0 ? `Locked for ${lockSecondsRemaining}s — customer deciding` : undefined}
            className={`flex-1 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-1.5 transition-all ${
              lockSecondsRemaining > 0
                ? 'bg-amber-100 text-amber-700 border-2 border-amber-300 cursor-not-allowed'
                : 'bg-[#0f1f3d] hover:bg-[#1a2f5a] text-white active:scale-95'
            }`}>
            {lockSecondsRemaining > 0 ? <><Clock className="w-4 h-4" /> Wait {lockSecondsRemaining}s</> : nextLabel[order.status]}
          </button>
        )}
        {order.status !== 'collected' && order.status !== 'cancelled' && (
          <button
            onClick={() => onCancelRequest(order)}
            title="Cancel order (admin PIN required)"
            className="w-10 h-10 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 rounded-xl flex items-center justify-center transition-all group"
          >
            <X className="w-4 h-4 text-red-400 group-hover:text-red-600" />
          </button>
        )}
        {order.status !== 'cancelled' && (
          <button onClick={() => onPrint(order)}
            className="w-10 h-10 bg-white/80 hover:bg-white border border-gray-200 rounded-xl flex items-center justify-center transition-all" title="Print receipt">
            <Printer className="w-4 h-4 text-gray-600" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── PIN lock ────────────────────────────────────────────────────────────────
function PinLock({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin]               = useState('');
  const [error, setError]           = useState(false);
  const [newPin, setNewPin]         = useState('');
  const [changing, setChanging]     = useState(false);
  const [changingAdmin, setChangingAdmin] = useState(false);
  const [showPin, setShowPin]       = useState(false);

  const handleKeyPress = (digit: string) => {
    if (pin.length >= 8) return;
    const next = pin + digit;
    setPin(next);
    setError(false);
    const stored = getPin();
    if (next === stored) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      onUnlock();
    } else if (next.length >= stored.length) {
      setTimeout(() => { setError(true); setPin(''); }, 300);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1f3d] flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <ChefHat className="w-16 h-16 text-[#f5a623] mx-auto mb-3" />
        <h1 className="text-white font-black text-2xl">Kitchen Screen</h1>
        <p className="text-white/50 text-sm">{getVenueConfig().businessName}</p>
      </div>
      {!changing && !changingAdmin && (
        <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl">
          <p className="text-center font-bold text-[#0f1f3d] mb-4">Enter PIN</p>
          <div className="flex justify-center gap-3 mb-4">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${pin.length > i ? 'bg-[#0f1f3d] border-[#0f1f3d]' : 'border-gray-300'} ${error ? 'border-red-400 bg-red-100' : ''}`}>
                {pin.length > i && <div className="w-3 h-3 rounded-full bg-white" />}
              </div>
            ))}
          </div>
          {error && <p className="text-red-500 text-xs text-center mb-3">Incorrect PIN — try again</p>}
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) => (
              <button key={i}
                onClick={() => { if (k === '⌫') setPin(p => p.slice(0, -1)); else if (k) handleKeyPress(k); }}
                className={`py-4 rounded-xl font-bold text-lg transition-all active:scale-90 ${k ? 'bg-gray-100 hover:bg-gray-200 text-[#0f1f3d]' : ''}`}>
                {k}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => { setChanging(true); setPin(''); setNewPin(''); }} className="flex-1 text-xs text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1.5 py-2">
              <KeyRound className="w-3 h-3" /> Staff PIN
            </button>
            <button onClick={() => { setChangingAdmin(true); setPin(''); setNewPin(''); }} className="flex-1 text-xs text-red-400 hover:text-red-600 flex items-center justify-center gap-1.5 py-2">
              <ShieldAlert className="w-3 h-3" /> Admin PIN
            </button>
          </div>
        </div>
      )}
      {changing && (
        <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl space-y-3">
          <p className="font-bold text-[#0f1f3d] text-center">Change Staff PIN</p>
          <div>
            <label className="text-xs text-gray-600 font-semibold mb-1 block">Current PIN</label>
            <div className="relative">
              <input type={showPin ? 'text' : 'password'} value={pin} onChange={e => setPin(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm pr-9 focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50" />
              <button type="button" onClick={() => setShowPin(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-600 font-semibold mb-1 block">New PIN</label>
            <input type="password" value={newPin} onChange={e => setNewPin(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50" />
          </div>
          <button
            onClick={() => {
              if (pin !== getPin()) { toast.error('Incorrect current PIN'); return; }
              if (newPin.length < 4) { toast.error('New PIN must be at least 4 digits'); return; }
              localStorage.setItem(PIN_KEY, newPin);
              toast.success('Staff PIN updated!');
              setChanging(false); setPin(''); setNewPin('');
            }}
            className="w-full bg-[#f5a623] text-[#0f1f3d] font-bold py-3 rounded-xl"
          >
            Update Staff PIN
          </button>
          <button onClick={() => { setChanging(false); setPin(''); setNewPin(''); }} className="w-full text-xs text-gray-400 hover:text-gray-600 py-1">← Cancel</button>
        </div>
      )}
      {changingAdmin && (
        <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="font-bold text-[#0f1f3d] text-sm">Admin PIN</p>
              <p className="text-[11px] text-gray-400">Required to cancel orders</p>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-600 font-semibold mb-1 block">Current Admin PIN</label>
            <div className="relative">
              <input type={showPin ? 'text' : 'password'} value={pin} onChange={e => setPin(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm pr-9 focus:outline-none focus:ring-2 focus:ring-red-400/50" />
              <button type="button" onClick={() => setShowPin(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1 mt-1">New Admin PIN</label>
            <input type="password" value={newPin} onChange={e => setNewPin(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/50" />
          </div>
          <button
            onClick={() => {
              if (pin !== getAdminPin()) { toast.error('Incorrect current admin PIN'); return; }
              if (newPin.length < 4) { toast.error('New PIN must be at least 4 digits'); return; }
              localStorage.setItem(ADMIN_PIN_KEY, newPin);
              toast.success('Admin PIN updated!');
              setChangingAdmin(false); setPin(''); setNewPin('');
            }}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl"
          >
            Update Admin PIN
          </button>
          <p className="text-[11px] text-gray-400 text-center">Default admin PIN: <strong>9999</strong></p>
          <button onClick={() => { setChangingAdmin(false); setPin(''); setNewPin(''); }} className="w-full text-xs text-gray-400 hover:text-gray-600 py-1">← Cancel</button>
        </div>
      )}
    </div>
  );
}

// ── Role helpers ────────────────────────────────────────────────────────────
function getUserRole(user: import('@supabase/supabase-js').User | null): 'admin' | 'staff' {
  if (!user) return 'staff';
  return user.user_metadata?.role === 'admin' ? 'admin' : 'staff';
}

// ── Access Denied screen ──────────────────────────────────────────────────
function AccessDenied({ email, onSignOut }: { email?: string; onSignOut: () => void }) {
  return (
    <div className="min-h-screen bg-[#0f1f3d] flex flex-col items-center justify-center px-4 gap-6">
      <div className="w-20 h-20 rounded-2xl bg-red-500/20 flex items-center justify-center">
        <ShieldAlert className="w-10 h-10 text-red-400" />
      </div>
      <div className="text-center">
        <h1 className="text-white font-black text-2xl">Access Denied</h1>
        <p className="text-white/50 text-sm mt-2 max-w-xs">
          <strong className="text-white/70">{email}</strong> is not an authorised staff member.
          Ask an admin to add you via the Staff Management screen.
        </p>
      </div>
      <button
        onClick={onSignOut}
        className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold px-6 py-3 rounded-xl text-sm transition-all"
      >
        <LogOut className="w-4 h-4" /> Sign Out
      </button>
    </div>
  );
}

// ── PIN Management modal (admin only from inside kitchen) ─────────────────
function PinManagementModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab]         = useState<'admin' | 'staff'>('admin');
  const [current, setCurrent] = useState('');
  const [next, setNext]       = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError]     = useState('');

  const reset = () => { setCurrent(''); setNext(''); setConfirm(''); setError(''); };

  const handleSave = () => {
    const stored = tab === 'admin' ? getAdminPin() : getPin();
    if (current !== stored) { setError('Current PIN is incorrect'); return; }
    if (next.length < 4)    { setError('New PIN must be at least 4 characters'); return; }
    if (next !== confirm)   { setError('PINs do not match'); return; }
    localStorage.setItem(tab === 'admin' ? ADMIN_PIN_KEY : PIN_KEY, next);
    toast.success(tab === 'admin' ? 'Admin PIN updated' : 'Staff PIN updated');
    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#0f1f3d] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden border border-white/10">
        <div className="bg-[#081529] px-5 py-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2">
            <KeySquare className="w-5 h-5 text-[#f5a623]" />
            <div>
              <h2 className="text-white font-bold">PIN Management</h2>
              <p className="text-white/50 text-xs">Update screen lock PINs</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white p-1"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex border-b border-white/10">
          {(['admin', 'staff'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); reset(); }}
              className={`flex-1 py-3 text-sm font-semibold transition-all ${
                tab === t ? 'text-[#f5a623] border-b-2 border-[#f5a623]' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {t === 'admin' ? '🔴 Admin PIN' : '🟡 Staff Screen PIN'}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
            <p className="text-xs text-white/60">
              {tab === 'admin'
                ? 'Admin PIN is required to cancel orders. Default: 9999'
                : 'Staff PIN locks the kitchen screen. Default: 1234'}
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-300 block mb-1">Current {tab === 'admin' ? 'Admin' : 'Staff'} PIN</label>
            <div className="relative">
              <input
                type={showCur ? 'text' : 'password'}
                value={current}
                onChange={e => { setCurrent(e.target.value); setError(''); }}
                placeholder="Current PIN"
                className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-3 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50"
              />
              <button type="button" onClick={() => setShowCur(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                {showCur ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-300 block mb-1">New PIN</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={next}
                onChange={e => { setNext(e.target.value); setError(''); }}
                placeholder="New PIN (min 4 characters)"
                className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-3 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50"
              />
              <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-300 block mb-1">Confirm New PIN</label>
            <input
              type="password"
              value={confirm}
              onChange={e => { setConfirm(e.target.value); setError(''); }}
              placeholder="Repeat new PIN"
              className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 border border-white/20 text-white/70 font-bold py-3 rounded-xl hover:bg-white/10 text-sm transition-all">Cancel</button>
            <button onClick={handleSave} className="flex-1 bg-[#f5a623] hover:bg-[#e09615] text-[#0f1f3d] font-bold py-3 rounded-xl text-sm transition-all">
              Update PIN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Switch User modal ────────────────────────────────────────────────────────
function SwitchUserModal({
  onSwitchUser, onClose,
}: {
  onSwitchUser: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden">
        <div className="bg-[#0f1f3d] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-[#f5a623]" />
            <h2 className="text-white font-bold">Switch User</h2>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white p-1"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">
            This will sign you out and return to the login screen so another staff member can sign in.
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50 text-sm">Cancel</button>
            <button onClick={onSwitchUser} className="flex-1 bg-[#f5a623] hover:bg-[#e09615] text-[#0f1f3d] font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all">
              <UserCog className="w-4 h-4" /> Switch User
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main kitchen screen ─────────────────────────────────────────────────────
export default function Kitchen() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const userRole = getUserRole(user);
  const isAdmin = userRole === 'admin';
  const [showSetup, setShowSetup] = useState(false);
  const [setupChecked, setSetupChecked] = useState(false);
  const [unlocked, setUnlocked]             = useState(() => sessionStorage.getItem(SESSION_KEY) === 'true');
  const [activeTab, setActiveTab]           = useState<'active' | 'scheduled' | 'collected' | 'cancelled'>('active');
  const [volume, setVolume]                 = useState(70);
  const [muted, setMuted]                   = useState(false);
  const [repeatAlarm, setRepeatAlarm]       = useState(true);
  const [repeatAlarmSecs, setRepeatAlarmSecs] = useState<number>(() => {
    const s = localStorage.getItem('kitchen_alarm_interval');
    return s ? Math.min(60, Math.max(3, Number(s))) : 3;
  });
  const [showPrinterSettings, setShowPrinterSettings] = useState(false);
  const [showTimeSettings, setShowTimeSettings]       = useState(false);
  const [showAnalytics, setShowAnalytics]             = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled]       = useState<boolean>(() => localStorage.getItem('kitchen_analytics_enabled') !== 'false');
  const [acceptTimes, setAcceptTimes]                 = useState<number[]>(getStoredTimes);
  const [acceptingOrder, setAcceptingOrder]   = useState<Order | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [showSwitchUser, setShowSwitchUser] = useState(false);
  const [showPinManagement, setShowPinManagement] = useState(false);
  const [printerConfig, setPrinterConfig]     = useState<PrinterConfig>(getPrinterConfig);
  const [orderCounts, setOrderCounts]         = useState<Record<string, number>>({});
  const [collectedClearedAt, setCollectedClearedAt] = useState<string>(getCollectedClearedAt);

  const knownOrderIds  = useRef<Set<string>>(new Set());
  const repeatAlarmRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { orders, loading, lastSync, updateOrderStatus, refresh } = useKitchenOrders();
  const { getCustomerOrderCount } = useOrders();
  const { config: venueConfig, save: saveVenueConfig, loading: venueLoading } = useVenueConfig();
  const [togglingDelivery, setTogglingDelivery] = useState(false);
  const [busyLocks, setBusyLocks] = useState<Record<string, number>>(() => loadBusyLocks());
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
      setBusyLocks(prev => {
        const now = Date.now();
        const filtered = Object.fromEntries(
          Object.entries(prev).filter(([, exp]) => exp > now)
        );
        if (Object.keys(filtered).length !== Object.keys(prev).length) {
          localStorage.setItem(BUSY_LOCKS_KEY, JSON.stringify(filtered));
          return filtered;
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('kitchen_alarm_interval', String(repeatAlarmSecs));
  }, [repeatAlarmSecs]);

  useEffect(() => {
    localStorage.setItem('kitchen_analytics_enabled', String(analyticsEnabled));
    if (!analyticsEnabled) setShowAnalytics(false);
  }, [analyticsEnabled]);

  useEffect(() => {
    if (venueLoading || setupChecked) return;
    setSetupChecked(true);
    if (!isSetupComplete() && venueConfig.businessName === 'My Takeaway') {
      setShowSetup(true);
    }
  }, [venueLoading, venueConfig.businessName, setupChecked]);

  const handleToggleDelivery = useCallback(async () => {
    setTogglingDelivery(true);
    await saveVenueConfig({ ...venueConfig, deliveryEnabled: !venueConfig.deliveryEnabled });
    toast.success(venueConfig.deliveryEnabled ? 'Delivery disabled — collections only' : 'Delivery enabled');
    setTogglingDelivery(false);
  }, [venueConfig, saveVenueConfig]);

  useEffect(() => {
    if (loading) return;
    const missing = orders.filter(o => orderCounts[o.customerPhone] === undefined);
    if (missing.length === 0) return;
    missing.forEach(async o => {
      const count = await getCustomerOrderCount(o.customerPhone);
      setOrderCounts(prev => ({ ...prev, [o.customerPhone]: count }));
    });
  }, [orders, loading, orderCounts, getCustomerOrderCount]);

  useEffect(() => {
    if (loading) return;
    const newIds = new Set(orders.map(o => o.id));
    const incoming = orders.filter(o => o.status === 'new' && !knownOrderIds.current.has(o.id));
    knownOrderIds.current = newIds;
    if (incoming.length > 0 && !muted) {
      playNewOrderSound(volume);
      if (repeatAlarm) {
        if (repeatAlarmRef.current) clearInterval(repeatAlarmRef.current);
        repeatAlarmRef.current = setInterval(() => {
          if (!muted) playNewOrderSound(volume);
        }, repeatAlarmSecs * 1000);
      }
    }
    const hasNew = orders.some(o => o.status === 'new');
    if (!hasNew && repeatAlarmRef.current) {
      clearInterval(repeatAlarmRef.current);
      repeatAlarmRef.current = null;
    }
  }, [orders, loading, muted, volume, repeatAlarm, repeatAlarmSecs]);

  useEffect(() => {
    return () => {
      if (repeatAlarmRef.current) clearInterval(repeatAlarmRef.current);
    };
  }, []);

  const prevReadyCount = useRef(0);
  useEffect(() => {
    const readyCount = orders.filter(o => o.status === 'ready').length;
    if (readyCount > prevReadyCount.current && !muted) playReadySound(volume);
    prevReadyCount.current = readyCount;
  }, [orders, muted, volume]);

  const handleAcceptConfirm = useCallback(async (order: Order, minutes: number) => {
    // Collection time = order placement time + kitchen's proposed prep minutes
    // Do NOT use Date.now() — the customer must be told the time relative to WHEN THEY ORDERED.
    const orderTime = new Date(order.createdAt);
    const readyAt = new Date(orderTime.getTime() + minutes * 60 * 1000);
    console.log(`[accept] order placed: ${orderTime.toLocaleTimeString('en-GB')} + ${minutes}min → collection: ${readyAt.toLocaleTimeString('en-GB')}`);
    const requestedMins = order.prepTime && order.prepTime !== 'asap' && !isClockTime(order.prepTime)
      ? parseInt(order.prepTime, 10)
      : null;
    const overrun = requestedMins !== null ? minutes - requestedMins : 0;
    if (requestedMins !== null && overrun >= 15) {
      const expiresAt = Date.now() + 60 * 1000;
      saveBusyLock(order.id, expiresAt);
      setBusyLocks(prev => ({ ...prev, [order.id]: expiresAt }));
    }
    const enrichedOrder = {
      ...order,
      estimatedReady: readyAt.toISOString(),
      prepTime: String(minutes),
    };
    await updateOrderStatus(order.id, 'accepted', {
      estimatedReady: readyAt.toISOString(),
      prepTime: String(minutes),
    });
    printOrder(enrichedOrder, printerConfig);
    setAcceptingOrder(null);
    toast.success(`Order #${order.orderNumber} accepted — ready in ${minutes} min`);
  }, [updateOrderStatus, printerConfig]);

  const handleCancelConfirmed = useCallback(async (order: Order) => {
    setCancellingOrder(null);
    removeBusyLock(order.id);
    setBusyLocks(prev => { const n = { ...prev }; delete n[order.id]; return n; });
    await updateOrderStatus(order.id, 'cancelled');
    toast.success(`Order #${order.orderNumber} cancelled`);
  }, [updateOrderStatus]);

  const activeOrders    = orders.filter(o => ['new', 'accepted', 'preparing', 'ready'].includes(o.status));
  const scheduledOrders = orders.filter(o => o.status === 'scheduled');
  const collectedOrders = orders.filter(o => o.status === 'collected' && new Date(o.createdAt) >= new Date(collectedClearedAt));
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');

  const tabBadge = {
    active:    activeOrders.length,
    scheduled: scheduledOrders.length,
    collected: collectedOrders.length,
    cancelled: cancelledOrders.length,
  };

  const displayedOrders = {
    active:    activeOrders,
    scheduled: scheduledOrders,
    collected: collectedOrders,
    cancelled: cancelledOrders,
  }[activeTab];

  const userIsAuthorised = user?.user_metadata?.role === 'admin' || user?.user_metadata?.role === 'staff';
  if (!userIsAuthorised) {
    return (
      <AccessDenied
        email={user?.email}
        onSignOut={async () => {
          sessionStorage.removeItem(SESSION_KEY);
          await logout();
          navigate('/kitchen-login', { replace: true });
        }}
      />
    );
  }

  if (!unlocked) return <PinLock onUnlock={() => setUnlocked(true)} />;

  if (showSetup) {
    return <SetupWizard onComplete={() => { setShowSetup(false); }} fresh />;
  }

  const storeOpen = isOpen();

  return (
    <KitchenErrorBoundary>
      <div className="min-h-screen bg-[#0a1628] text-white">

        {/* Modals */}
        {acceptingOrder && (
          <AcceptModal
            order={acceptingOrder}
            times={acceptTimes}
            onConfirm={mins => handleAcceptConfirm(acceptingOrder, mins)}
            onClose={() => setAcceptingOrder(null)}
          />
        )}
        {showPinManagement && (
          <PinManagementModal onClose={() => setShowPinManagement(false)} />
        )}
        {showSwitchUser && (
          <SwitchUserModal
            onSwitchUser={async () => {
              sessionStorage.removeItem(SESSION_KEY);
              await logout();
              navigate('/kitchen-login', { replace: true });
            }}
            onClose={() => setShowSwitchUser(false)}
          />
        )}
        {cancellingOrder && (
          <AdminPinModal
            title={`Cancel Order #${cancellingOrder.orderNumber}`}
            subtitle="This cannot be undone"
            onConfirm={() => handleCancelConfirmed(cancellingOrder)}
            onClose={() => setCancellingOrder(null)}
          />
        )}
        {showPrinterSettings && (
          <PrinterSettingsModal
            config={printerConfig}
            onSave={cfg => { setPrinterConfig(cfg); savePrinterConfig(cfg); }}
            onClose={() => setShowPrinterSettings(false)}
          />
        )}
        {showTimeSettings && (
          <TimeSettingsModal
            times={acceptTimes}
            onSave={times => { setAcceptTimes(times); saveStoredTimes(times); }}
            onClose={() => setShowTimeSettings(false)}
          />
        )}
        {showAnalytics && analyticsEnabled && (
          <KitchenAnalytics onClose={() => setShowAnalytics(false)} />
        )}

        {/* Header */}
        <div className="bg-[#0f1f3d] border-b border-white/10 px-4 py-3 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <ChefHat className="w-6 h-6 text-[#f5a623] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="text-white font-black text-lg leading-tight truncate">{venueConfig.businessName}</h1>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-400' : 'bg-green-400'} flex-shrink-0`} />
                <span className="text-white/50 text-xs">
                  {loading ? 'Syncing…' : lastSync ? `Updated ${formatTime(lastSync)}` : 'Live'}
                </span>
                {user && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isAdmin ? 'bg-red-500/30 text-red-300' : 'bg-white/10 text-white/40'
                  }`}>
                    {isAdmin ? '★ Admin' : 'Staff'}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {isAdmin && (
                <>
                  <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${storeOpen ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${storeOpen ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                    {storeOpen ? 'Open' : 'Closed'}
                  </div>

                  <button
                    onClick={handleToggleDelivery}
                    disabled={togglingDelivery || venueLoading}
                    title={venueConfig.deliveryEnabled ? 'Delivery ON — click to disable' : 'Delivery OFF — click to enable'}
                    className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      venueConfig.deliveryEnabled
                        ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                        : 'bg-white/10 text-white/40 hover:bg-white/20'
                    }`}
                  >
                    {venueConfig.deliveryEnabled ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                    {venueConfig.deliveryEnabled ? 'Delivery' : 'Collection'}
                  </button>

                  <div className="hidden md:flex items-center gap-1.5 bg-white/5 rounded-xl px-3 py-1.5">
                    <Bell className="w-3.5 h-3.5 text-[#f5a623]" />
                    <input
                      type="range" min={3} max={60} step={1} value={repeatAlarmSecs}
                      onChange={e => setRepeatAlarmSecs(Number(e.target.value))}
                      className="w-16 accent-[#f5a623]"
                      title={`Alarm interval: ${repeatAlarmSecs}s`}
                    />
                    <span className="text-white/50 text-xs w-8 text-right">{repeatAlarmSecs}s</span>
                  </div>

                  <button onClick={() => setMuted(v => !v)}
                    className={`p-2 rounded-xl transition-all ${muted ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
                    title={muted ? 'Unmute' : 'Mute'}>
                    {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>

                  <button onClick={() => setRepeatAlarm(v => !v)}
                    className={`p-2 rounded-xl transition-all ${repeatAlarm ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-white/40 hover:bg-white/20'}`}
                    title={repeatAlarm ? 'Repeat alarm on' : 'Repeat alarm off'}>
                    {repeatAlarm ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => setAnalyticsEnabled(v => !v)}
                    title={analyticsEnabled ? 'Analytics enabled' : 'Analytics disabled'}
                    className={`p-2 rounded-xl transition-all ${
                      analyticsEnabled ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-white/5 text-white/20 hover:bg-white/10'
                    }`}>
                    <BarChart2 className="w-4 h-4" />
                  </button>
                  {analyticsEnabled && (
                    <button onClick={() => setShowAnalytics(true)}
                      className="hidden sm:flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white/70 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all">
                      View Stats
                    </button>
                  )}

                  <button onClick={() => setShowTimeSettings(true)}
                    className="p-2 bg-white/10 hover:bg-white/20 text-white/70 rounded-xl transition-all" title="Collection time options">
                    <Timer className="w-4 h-4" />
                  </button>

                  <button onClick={() => setShowPinManagement(true)}
                    className="p-2 bg-white/10 hover:bg-white/20 text-white/70 rounded-xl transition-all" title="Manage PINs">
                    <KeySquare className="w-4 h-4" />
                  </button>

                  <button onClick={() => setShowPrinterSettings(true)}
                    className="p-2 bg-white/10 hover:bg-white/20 text-white/70 rounded-xl transition-all" title="Printer settings">
                    <Printer className="w-4 h-4" />
                  </button>

                  <button onClick={refresh}
                    className="p-2 bg-white/10 hover:bg-white/20 text-white/70 rounded-xl transition-all" title="Refresh orders">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>

                  <button onClick={() => navigate('/menu-admin')}
                    className="p-2 bg-white/10 hover:bg-white/20 text-white/70 rounded-xl transition-all" title="Menu & Venue Settings">
                    <MenuIcon className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => { sessionStorage.removeItem(SESSION_KEY); setUnlocked(false); }}
                    className="p-2 bg-white/10 hover:bg-amber-500/20 hover:text-amber-400 text-white/70 rounded-xl transition-all"
                    title="Lock screen (PIN)">
                    <Lock className="w-4 h-4" />
                  </button>

                  {user && (
                    <button
                      onClick={async () => {
                        sessionStorage.removeItem(SESSION_KEY);
                        await logout();
                        navigate('/kitchen-login', { replace: true });
                      }}
                      className="p-2 bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-white/70 rounded-xl transition-all"
                      title={`Sign out (${user.email})`}>
                      <LogOut className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}

              {!isAdmin && (
                <>
                  <button onClick={refresh}
                    className="p-2 bg-white/10 hover:bg-white/20 text-white/70 rounded-xl transition-all" title="Refresh orders">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>

                  <button onClick={() => setShowSwitchUser(true)}
                    className="p-2 bg-white/10 hover:bg-[#f5a623]/20 hover:text-[#f5a623] text-white/70 rounded-xl transition-all" title="Switch user">
                    <UserCog className="w-4 h-4" />
                  </button>

                  {user && (
                    <button
                      onClick={async () => {
                        sessionStorage.removeItem(SESSION_KEY);
                        await logout();
                        navigate('/kitchen-login', { replace: true });
                      }}
                      className="p-2 bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-white/70 rounded-xl transition-all"
                      title={`Sign out (${user.email})`}>
                      <LogOut className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="bg-[#0f1f3d] border-b border-white/10 px-4">
          <div className="max-w-7xl mx-auto flex gap-1 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-[#f5a623] text-[#f5a623]'
                    : 'border-transparent text-white/50 hover:text-white/80'
                }`}
              >
                {tab.label}
                {tabBadge[tab.id] > 0 && (
                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                    tab.id === 'active' ? 'bg-[#f5a623] text-[#0f1f3d]' :
                    tab.id === 'cancelled' ? 'bg-red-500/30 text-red-300' :
                    'bg-white/20 text-white'
                  }`}>
                    {tabBadge[tab.id]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Orders grid */}
        <div className="max-w-7xl mx-auto px-4 py-4">
          {loading && displayedOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <RefreshCw className="w-8 h-8 text-[#f5a623] animate-spin" />
              <p className="text-white/50">Loading orders…</p>
            </div>
          ) : displayedOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
              {activeTab === 'active' ? (
                <>
                  <ChefHat className="w-16 h-16 text-white/10" />
                  <p className="text-white/40 font-bold text-lg">No active orders</p>
                  <p className="text-white/25 text-sm">New orders will appear here automatically</p>
                </>
              ) : activeTab === 'collected' ? (
                <>
                  <Package className="w-16 h-16 text-white/10" />
                  <p className="text-white/40 font-bold text-lg">No collected orders today</p>
                  <button onClick={() => setCollectedClearedAt(clearCollectedNow())} className="text-xs text-white/30 hover:text-white/50 mt-2 transition-colors">
                    Clear history
                  </button>
                </>
              ) : activeTab === 'cancelled' ? (
                <>
                  <X className="w-16 h-16 text-white/10" />
                  <p className="text-white/40 font-bold text-lg">No cancelled orders</p>
                </>
              ) : (
                <>
                  <Clock className="w-16 h-16 text-white/10" />
                  <p className="text-white/40 font-bold text-lg">No scheduled orders</p>
                </>
              )}
            </div>
          ) : (
            <>
              {activeTab === 'collected' && (
                <div className="flex justify-end mb-3">
                  <button
                    onClick={() => setCollectedClearedAt(clearCollectedNow())}
                    className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Clear collected orders
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {displayedOrders.map(order => {
                  const lockExpiry = busyLocks[order.id] ?? 0;
                  const lockSecsRemaining = Math.max(0, Math.ceil((lockExpiry - Date.now()) / 1000));
                  return (
                    <KitchenOrderCard
                      key={order.id}
                      order={order}
                      orderCount={orderCounts[order.customerPhone] ?? 0}
                      onStatusChange={updateOrderStatus}
                      onAccept={o => setAcceptingOrder(o)}
                      onPrint={o => printOrder(o, printerConfig)}
                      onCancelRequest={o => setCancellingOrder(o)}
                      lockSecondsRemaining={lockSecsRemaining}
                    />
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </KitchenErrorBoundary>
  );
}
