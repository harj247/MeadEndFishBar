import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  ChevronLeft, Plus, Pencil, Trash2, Eye, EyeOff, X, Save,
  Search, ChefHat, Loader2, Star, Crown,
  Upload, ImageIcon, Link2, Tag, ArrowUp, ArrowDown, Settings2,
  Globe, Clock, Building2, Truck, Navigation,
  Wand2, RotateCcw, Users, Mail, UserPlus, Shield, RefreshCw, UserX,
  GripVertical, Receipt, AlertTriangle, WifiOff, FileText,
} from 'lucide-react';
import ReceiptBuilder from '@/components/features/ReceiptBuilder';
import WebsitePages from '@/pages/WebsitePages';
import { useAuth } from '@/contexts/AuthContext';
import SetupWizard from '@/components/features/SetupWizard';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useMenuAdmin } from '@/hooks/useMenuItems';
import { useVenueConfig } from '@/hooks/useVenueConfig';
import { MenuItem, MenuCategory, CustomisationGroup, GroupCondition } from '@/types';
import { Filter } from 'lucide-react';
import { DayKey, DaySlot, DeliveryZone } from '@/lib/venueConfig';
import { formatPrice } from '@/lib/utils';
import { toast } from 'sonner';

// ── Salt & Vinegar Condiment Editor ──────────────────────────────────────────────────
function SaltVinegarEditor() {
  const { config, save, saving } = useVenueConfig();
  const [options, setOptions] = useState<string[]>(() => config.condimentOptions ?? []);
  const [newOpt, setNewOpt] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setOptions(config.condimentOptions ?? []);
    setDirty(false);
  }, [config.condimentOptions?.join('|')]);

  const add = () => {
    const val = newOpt.trim();
    if (!val) return;
    if (options.includes(val)) { toast.error('Option already exists'); return; }
    setOptions(prev => [...prev, val]);
    setNewOpt('');
    setDirty(true);
  };

  const remove = (idx: number) => {
    if (options.length <= 1) { toast.error('Keep at least one option'); return; }
    setOptions(prev => prev.filter((_, i) => i !== idx));
    setDirty(true);
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const next = [...options];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setOptions(next);
    setDirty(true);
  };

  const moveDown = (idx: number) => {
    if (idx === options.length - 1) return;
    const next = [...options];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    setOptions(next);
    setDirty(true);
  };

  const handleSave = async () => {
    await save({ ...config, condimentOptions: options });
    setDirty(false);
  };

  const resetDefaults = () => {
    setOptions(['Salt & Vinegar', 'Salt only', 'Vinegar only', 'No salt or vinegar', 'No seasoning']);
    setDirty(true);
  };

  return (
    <div className="bg-white rounded-2xl border border-teal-200 overflow-hidden">
      <div className="bg-teal-700 px-5 py-3 flex items-center gap-2">
        <span className="text-base">🧂</span>
        <h3 className="text-white font-bold text-sm">Salt &amp; Vinegar Condiment Options</h3>
        <span className="ml-auto text-[11px] text-teal-200">Shown when &ldquo;Ask Salt &amp; Vinegar&rdquo; is enabled on a menu item</span>
      </div>
      <div className="p-5 space-y-4">
        <p className="text-xs text-gray-500">
          These are the options shown to customers when an item has <strong>Ask Salt &amp; Vinegar</strong> turned on. Add, remove, or reorder them here — changes apply across all items instantly.
        </p>
        <div className="space-y-2">
          {options.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <button onClick={() => moveUp(idx)} disabled={idx === 0}
                  className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors">
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button onClick={() => moveDown(idx)} disabled={idx === options.length - 1}
                  className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors">
                  <ArrowDown className="w-3 h-3" />
                </button>
              </div>
              <span className="flex-1 text-sm font-semibold text-gray-800">{opt}</span>
              <button onClick={() => remove(idx)}
                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex-shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newOpt}
            onChange={e => setNewOpt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder="e.g. Extra Vinegar, No seasoning…"
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400"
          />
          <button onClick={add}
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 rounded-xl flex items-center gap-1 transition-all">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <button onClick={resetDefaults}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors underline-offset-2 hover:underline">
            Reset to defaults
          </button>
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="ml-auto flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-xl text-sm transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Condiment Options
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Smart Prep Time Keywords Editor ─────────────────────────────────────────
function SmartPrepTimeEditor() {
  const { config, save, saving } = useVenueConfig();
  const [keywords, setKeywords] = useState<string[]>(() => config.longCookKeywords ?? []);
  const [minutes, setMinutes]   = useState<number>(() => config.longCookMinutes ?? 30);
  const [input, setInput]       = useState('');
  const [dirty, setDirty]       = useState(false);

  useEffect(() => {
    setKeywords(config.longCookKeywords ?? []);
    setMinutes(config.longCookMinutes ?? 30);
    setDirty(false);
  }, [(config.longCookKeywords ?? []).join('|'), config.longCookMinutes]);

  const add = () => {
    const val = input.trim().toLowerCase();
    if (!val) return;
    if (keywords.includes(val)) { toast.error('Keyword already exists'); return; }
    setKeywords(prev => [...prev, val]);
    setInput('');
    setDirty(true);
  };

  const remove = (kw: string) => {
    setKeywords(prev => prev.filter(k => k !== kw));
    setDirty(true);
  };

  const handleSave = async () => {
    await save({ ...config, longCookKeywords: keywords, longCookMinutes: minutes });
    setDirty(false);
  };

  const resetDefaults = () => {
    setKeywords(['fish', 'cod', 'haddock', 'plaice', 'burger', 'chicken', 'scampi', 'sausage']);
    setMinutes(30);
    setDirty(true);
  };

  return (
    <div className="bg-white rounded-2xl border border-orange-200 overflow-hidden">
      <div className="bg-orange-600 px-5 py-3 flex items-center gap-2">
        <Clock className="w-4 h-4 text-white" />
        <h3 className="text-white font-bold text-sm">Smart Prep Time Detection</h3>
        <span className="ml-auto text-[11px] text-orange-200">Auto-selects a longer default prep time at checkout</span>
      </div>
      <div className="p-5 space-y-4">
        <p className="text-xs text-gray-500">
          When a cart contains an item whose name includes any of these keywords, checkout will default to the <strong>longer prep time</strong> below instead of 20 minutes. Update these to match your menu.
        </p>
        <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
          <div className="flex-1">
            <p className="text-xs font-bold text-orange-800">Longer default prep time (minutes)</p>
            <p className="text-[11px] text-orange-600 mt-0.5">Applied when a matching keyword is found in the cart</p>
          </div>
          <input
            type="number"
            min={1}
            max={240}
            value={minutes}
            onChange={e => { setMinutes(parseInt(e.target.value) || 30); setDirty(true); }}
            className="w-20 border border-orange-300 rounded-xl px-3 py-2 text-sm text-center font-mono font-bold text-orange-800 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/50"
          />
          <span className="text-xs font-bold text-orange-700">min</span>
        </div>
        <div>
          <p className="text-xs font-bold text-gray-700 mb-2">Trigger keywords <span className="font-normal text-gray-400">(matched case-insensitively against item names)</span></p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {keywords.length === 0 && (
              <p className="text-xs text-gray-400 italic">No keywords — default will always be 20 minutes.</p>
            )}
            {keywords.map(kw => (
              <span key={kw} className="inline-flex items-center gap-1.5 bg-orange-100 text-orange-800 border border-orange-300 text-xs font-semibold px-2.5 py-1 rounded-full">
                {kw}
                <button onClick={() => remove(kw)} className="text-orange-500 hover:text-orange-700 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && add()}
              placeholder="e.g. pizza, wings, steak…"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400"
            />
            <button onClick={add}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 rounded-xl flex items-center gap-1 transition-all">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <button onClick={resetDefaults}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors underline-offset-2 hover:underline">
            Reset to chippy defaults
          </button>
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="ml-auto flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-xl text-sm transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delivery Zones Editor ─────────────────────────────────────────────────
function DeliveryZonesEditor({
  zones,
  onChange,
}: {
  zones: DeliveryZone[];
  onChange: (zones: DeliveryZone[]) => void;
}) {
  const sorted = [...zones].sort((a, b) => a.maxMiles - b.maxMiles);

  const update = (idx: number, field: keyof DeliveryZone, val: string | number) => {
    const next = sorted.map((z, i) => i === idx ? { ...z, [field]: val } : z);
    onChange(next);
  };

  const add = () => {
    const maxExisting = sorted.reduce((m, z) => Math.max(m, z.maxMiles), 0);
    onChange([...sorted, { name: 'New Zone', maxMiles: maxExisting + 2, charge: 2.50 }]);
  };

  const remove = (idx: number) => onChange(sorted.filter((_, i) => i !== idx));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-xs font-bold text-gray-700">Delivery Zones by Distance</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Customer postcode is looked up via postcodes.io. Zones are matched by distance in miles from your postcode.
          </p>
        </div>
        <button type="button" onClick={add}
          className="flex items-center gap-1 bg-[#f5a623]/10 hover:bg-[#f5a623]/20 text-[#c87d00] font-bold text-xs px-3 py-1.5 rounded-lg transition-all flex-shrink-0 ml-3">
          <Plus className="w-3 h-3" /> Add Zone
        </button>
      </div>
      {sorted.length === 0 && (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl py-4 text-center">
          <Navigation className="w-6 h-6 text-gray-300 mx-auto mb-1" />
          <p className="text-xs text-gray-400">No delivery zones yet.</p>
        </div>
      )}
      {sorted.length > 0 && (
        <div className="space-y-2">
          {sorted.map((zone, idx) => (
            <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-3 grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
              <input type="text" value={zone.name} onChange={e => update(idx, 'name', e.target.value)}
                placeholder="e.g. Local"
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#f5a623]/40 bg-white" />
              <div className="flex items-center gap-1">
                <input type="number" min="0.1" step="0.5" value={zone.maxMiles}
                  onChange={e => update(idx, 'maxMiles', parseFloat(e.target.value) || 1)}
                  className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-center font-mono focus:outline-none focus:ring-2 focus:ring-[#f5a623]/40 bg-white" />
                <span className="text-[11px] text-gray-400 whitespace-nowrap">mi</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-gray-400">£</span>
                <input type="number" min="0" step="0.50" value={zone.charge}
                  onChange={e => update(idx, 'charge', parseFloat(e.target.value) || 0)}
                  className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-center font-mono focus:outline-none focus:ring-2 focus:ring-[#f5a623]/40 bg-white" />
              </div>
              <button type="button" onClick={() => remove(idx)}
                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Re-run setup wizard confirmation modal ─────────────────────────────────
function RerunWizardConfirm({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="bg-[#0f1f3d] px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-[#f5a623]/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Wand2 className="w-5 h-5 text-[#f5a623]" />
          </div>
          <div>
            <h2 className="text-white font-bold">Re-run Setup Wizard</h2>
            <p className="text-white/50 text-xs mt-0.5">Configure as a fresh deployment</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
            <p className="text-sm font-bold text-amber-900">Your menu will NOT be affected</p>
            <p className="text-xs text-amber-700">The wizard only updates venue settings. Menu items remain intact.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50 text-sm transition-all">Cancel</button>
            <button onClick={onConfirm}
              className="flex-1 bg-[#f5a623] hover:bg-[#e09615] text-[#0f1f3d] font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all">
              <Wand2 className="w-4 h-4" /> Launch Wizard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Emergency Stop Control — standalone component used in VenueSettings ───
const EMERGENCY_STYLE_OPTIONS: { value: string; label: string; description: string }[] = [
  { value: 'standard',      label: 'Standard',        description: 'Normal professional message card' },
  { value: 'large-clear',   label: 'Large & Clear',   description: 'Larger text, generous spacing — ideal for mobile' },
  { value: 'high-contrast', label: 'High Contrast',   description: 'Very strong dark text, maximum readability' },
];

function EmergencyStopControl() {
  const { config, save, saving } = useVenueConfig();
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    const newVal = !(config.emergencyStop ?? false);
    await save({ ...config, emergencyStop: newVal });
    setToggling(false);
  };

  const isOn = config.emergencyStop ?? false;

  return (
    <div className={`rounded-2xl border-2 overflow-hidden transition-all ${
      isOn ? 'border-red-500 shadow-lg shadow-red-500/20' : 'border-gray-200'
    }`}>
      {/* Header */}
      <div className={`px-5 py-4 flex items-center gap-3 ${
        isOn ? 'bg-red-600' : 'bg-[#0f1f3d]'
      }`}>
        {isOn
          ? <WifiOff className="w-5 h-5 text-white flex-shrink-0" />
          : <AlertTriangle className="w-5 h-5 text-[#f5a623] flex-shrink-0" />
        }
        <div className="flex-1">
          <h3 className="text-white font-black text-sm">Temporarily Stop Online Orders</h3>
          <p className="text-white/60 text-xs mt-0.5">
            Emergency override — blocks ALL new online orders immediately, regardless of opening hours
          </p>
        </div>
      </div>

      {/* Status + toggle */}
      <div className={`px-5 py-5 ${
        isOn ? 'bg-red-50' : 'bg-white'
      }`}>
        <div className="flex items-center gap-4">
          {/* Big status indicator */}
          <div className={`flex-1 rounded-xl px-4 py-3 border-2 ${
            isOn
              ? 'bg-red-100 border-red-300'
              : 'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                isOn ? 'bg-red-500 animate-pulse' : 'bg-green-500'
              }`} />
              <div>
                <p className={`font-black text-sm ${
                  isOn ? 'text-red-800' : 'text-green-800'
                }`}>
                  {isOn ? 'Online ordering is temporarily DISABLED' : 'Online ordering is ACTIVE'}
                </p>
                <p className={`text-xs mt-0.5 ${
                  isOn ? 'text-red-600' : 'text-green-600'
                }`}>
                  {isOn
                    ? 'Customers see a technical difficulty message. Existing kitchen orders are unaffected.'
                    : 'Customers can place orders normally according to your opening schedule.'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Toggle */}
          <div className="flex-shrink-0">
            <button
              type="button"
              onClick={handleToggle}
              disabled={toggling || saving}
              className={`relative w-16 h-8 rounded-full transition-all duration-300 disabled:opacity-60 ${
                isOn ? 'bg-red-500' : 'bg-gray-300'
              }`}
            >
              {(toggling || saving) && (
                <Loader2 className="absolute inset-0 m-auto w-4 h-4 text-white animate-spin" />
              )}
              {!toggling && !saving && (
                <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${
                  isOn ? 'left-9' : 'left-1'
                }`} />
              )}
            </button>
            <p className={`text-center text-[11px] font-black mt-1.5 ${
              isOn ? 'text-red-600' : 'text-gray-400'
            }`}>
              {isOn ? 'ON' : 'OFF'}
            </p>
          </div>
        </div>

        {/* Warning when ON */}
        {isOn && (
          <div className="mt-4 bg-red-600 rounded-xl px-4 py-3">
            <p className="text-white font-black text-sm flex items-center gap-2">
              <WifiOff className="w-4 h-4 flex-shrink-0" />
              Online ordering is currently stopped
            </p>
            <ul className="mt-2 space-y-1 text-red-100 text-xs">
              <li>• Customers see: &ldquo;Sorry, we are having technical difficulty now. Please try again later.&rdquo;</li>
              <li>• New orders are blocked even if the schedule says open</li>
              <li>• Existing kitchen orders are NOT affected</li>
              <li>• Turn OFF to restore normal ordering</li>
            </ul>
          </div>
        )}

        {/* Guidance when OFF */}
        {!isOn && (
          <p className="mt-3 text-xs text-gray-500">
            Use this if there is a technical problem (printer, internet, kitchen system) and you need to temporarily stop new online orders.
            The normal opening-hours schedule is unchanged — turning this OFF restores normal operation.
          </p>
        )}

        {/* Style preset */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="mb-2">
            <p className="text-xs font-bold text-gray-700">Technical Difficulty Screen</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Controls how the message appears to customers when ordering is stopped.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {EMERGENCY_STYLE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={async () => {
                  await save({ ...config, emergencyStopStyle: opt.value });
                }}
                disabled={saving}
                className={`text-left px-3 py-3 rounded-xl border-2 transition-all ${
                  (config.emergencyStopStyle ?? 'large-clear') === opt.value
                    ? 'border-[#f5a623] bg-amber-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <p className={`text-xs font-bold leading-tight ${
                  (config.emergencyStopStyle ?? 'large-clear') === opt.value ? 'text-[#0f1f3d]' : 'text-gray-700'
                }`}>{opt.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{opt.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


const SECTION_ORDER_KEY = 'venue_settings_section_order';

type SectionId =
  | 'emergency' | 'wizard' | 'identity' | 'logo' | 'hero' | 'hours'
  | 'delivery' | 'colours' | 'preptime' | 'payment' | 'receipt';

const DEFAULT_SECTION_ORDER: SectionId[] = [
  'emergency', 'wizard', 'identity', 'logo', 'hero', 'hours', 'delivery',
  'colours', 'preptime', 'payment', 'receipt',
];

function loadSectionOrder(): SectionId[] {
  try {
    const raw = localStorage.getItem(SECTION_ORDER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SectionId[];
      const merged = [...parsed.filter((id): id is SectionId => DEFAULT_SECTION_ORDER.includes(id as SectionId))];
      for (const id of DEFAULT_SECTION_ORDER) { if (!merged.includes(id)) merged.push(id); }
      return merged;
    }
  } catch { /* ignore */ }
  return [...DEFAULT_SECTION_ORDER];
}

function saveSectionOrder(order: SectionId[]) {
  localStorage.setItem(SECTION_ORDER_KEY, JSON.stringify(order));
}

// ── Venue Settings panel ────────────────────────────────────────────────────
const DAY_KEYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday',
  thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};

function VenueSettings() {
  const { config, saving, save } = useVenueConfig();
  const [form, setForm] = useState({ ...config });
  const [uploading, setUploading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [showWizardConfirm, setShowWizardConfirm] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [sectionOrder, setSectionOrder] = useState<SectionId[]>(loadSectionOrder);
  const dragSrcRef    = useRef<SectionId | null>(null);
  const touchSrcRef   = useRef<SectionId | null>(null);
  const touchGhostRef = useRef<HTMLDivElement | null>(null);

  const reorder = useCallback((from: SectionId, to: SectionId) => {
    if (from === to) return;
    setSectionOrder(prev => {
      const next = [...prev];
      const fi = next.indexOf(from);
      const ti = next.indexOf(to);
      if (fi === -1 || ti === -1) return prev;
      next.splice(fi, 1);
      next.splice(ti, 0, from);
      saveSectionOrder(next);
      return next;
    });
  }, []);

  const onDragStart = useCallback((id: SectionId) => { dragSrcRef.current = id; }, []);
  const onDragOver  = useCallback((e: React.DragEvent, id: SectionId) => {
    e.preventDefault();
    if (dragSrcRef.current && dragSrcRef.current !== id) reorder(dragSrcRef.current, id);
  }, [reorder]);
  const onDragEnd   = useCallback(() => { dragSrcRef.current = null; }, []);

  const onTouchStart = useCallback((e: React.TouchEvent, id: SectionId) => {
    touchSrcRef.current = id;
    const touch = e.touches[0];
    const ghost = document.createElement('div');
    ghost.style.cssText = [
      'position:fixed', 'pointer-events:none', 'z-index:9999', 'opacity:0.9',
      `left:${touch.clientX - 100}px`, `top:${touch.clientY - 22}px`,
      'width:200px', 'height:44px', 'background:#0f1f3d', 'border-radius:12px',
      'display:flex', 'align-items:center', 'justify-content:center',
      'gap:8px', 'color:#f5a623', 'font-weight:700', 'font-size:12px',
    ].join(';');
    ghost.textContent = 'Moving…';
    document.body.appendChild(ghost);
    touchGhostRef.current = ghost;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const ghost = touchGhostRef.current;
    if (!ghost) return;
    e.preventDefault();
    const touch = e.touches[0];
    ghost.style.left = `${touch.clientX - 100}px`;
    ghost.style.top  = `${touch.clientY - 22}px`;
    ghost.style.display = 'none';
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    ghost.style.display = 'flex';
    const sectionEl = el?.closest('[data-section-id]') as HTMLElement | null;
    const targetId = sectionEl?.dataset.sectionId as SectionId | undefined;
    if (targetId && touchSrcRef.current && targetId !== touchSrcRef.current) {
      reorder(touchSrcRef.current, targetId);
      touchSrcRef.current = targetId;
    }
  }, [reorder]);

  const onTouchEnd = useCallback(() => {
    touchGhostRef.current?.remove();
    touchGhostRef.current = null;
    touchSrcRef.current = null;
  }, []);

  if (showWizard) {
    return (
      <SetupWizard onComplete={() => { setShowWizard(false); window.location.reload(); }} fresh />
    );
  }

  useEffect(() => { setForm({ ...config }); }, [config.businessName]);

  const set = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const addSlot = (day: DayKey) => {
    const existing = form.openingHours[day] ?? [];
    set('openingHours', { ...form.openingHours, [day]: [...existing, { open: '16:00', close: '21:00' }] });
  };

  const removeSlot = (day: DayKey, idx: number) => {
    const updated = (form.openingHours[day] ?? []).filter((_, i) => i !== idx);
    set('openingHours', { ...form.openingHours, [day]: updated });
  };

  const updateSlot = (day: DayKey, idx: number, field: 'open' | 'close', val: string) => {
    const slots = [...(form.openingHours[day] ?? [])];
    slots[idx] = { ...slots[idx], [field]: val };
    set('openingHours', { ...form.openingHours, [day]: slots });
  };

  const handleLogoUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) { toast.error('Logo must be under 2 MB'); return; }
    setLogoUploading(true);
    const ext = file.name.split('.').pop();
    const path = `venue/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('menu-images').upload(path, file, { upsert: true });
    if (error) { toast.error('Upload failed: ' + error.message); setLogoUploading(false); return; }
    const { data: urlData } = supabase.storage.from('menu-images').getPublicUrl(path);
    set('logoUrl', urlData.publicUrl);
    toast.success('Logo uploaded!');
    setLogoUploading(false);
  };

  const handleHeroUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return; }
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `venue/hero-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('menu-images').upload(path, file, { upsert: true });
    if (error) { toast.error('Upload failed: ' + error.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('menu-images').getPublicUrl(path);
    set('heroImageUrl', urlData.publicUrl);
    toast.success('Hero image uploaded!');
    setUploading(false);
  };

  const handleSave = () => save(form);

  const renderSection = (id: SectionId): React.ReactNode => {
    switch (id) {

      case 'emergency': return (
        <EmergencyStopControl key="emergency" />
      );

      case 'wizard': return (
        <div className="bg-gradient-to-r from-[#0f1f3d] to-[#1a2f5a] rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#f5a623]/20 flex items-center justify-center flex-shrink-0">
            <Wand2 className="w-6 h-6 text-[#f5a623]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm">Deploying for a new client?</p>
            <p className="text-white/50 text-xs mt-0.5">Re-run the setup wizard to configure brand colours and business details from scratch.</p>
          </div>
          <button onClick={() => setShowWizardConfirm(true)}
            className="flex items-center gap-2 bg-[#f5a623] hover:bg-[#e09615] text-[#0f1f3d] font-bold px-4 py-2.5 rounded-xl text-sm transition-all flex-shrink-0 whitespace-nowrap">
            <RotateCcw className="w-4 h-4" /> Re-run Wizard
          </button>
        </div>
      );

      case 'identity': return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="bg-[#0f1f3d] px-5 py-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#f5a623]" />
            <h3 className="text-white font-bold text-sm">Business Identity</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Business Name *</label>
                <input type="text" value={form.businessName} onChange={e => set('businessName', e.target.value)}
                  placeholder="e.g. Mead End Fish Bar"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50 focus:border-[#f5a623]" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Tagline</label>
                <input type="text" value={form.tagline} onChange={e => set('tagline', e.target.value)}
                  placeholder="e.g. Biggleswade's Favourite Chippy"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50 focus:border-[#f5a623]" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Phone Number *</label>
                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                  placeholder="e.g. 01767 448081"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50 focus:border-[#f5a623]" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Payment Info</label>
                <input type="text" value={form.paymentInfo} onChange={e => set('paymentInfo', e.target.value)}
                  placeholder="e.g. Cash in store only"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50 focus:border-[#f5a623]" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-gray-600 block mb-1">Allergen Message</label>
                <textarea
                  value={(form as typeof form & { allergenMessage?: string }).allergenMessage ?? 'For allergen information please call the store.'}
                  onChange={e => set('allergenMessage' as keyof typeof form, e.target.value as never)}
                  rows={2} placeholder="e.g. For allergen information please call the store."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50 focus:border-[#f5a623] resize-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Address / Area</label>
                <input type="text" value={form.address} onChange={e => set('address', e.target.value)}
                  placeholder="e.g. Mead End"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50 focus:border-[#f5a623]" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">City / Town</label>
                  <input type="text" value={form.city} onChange={e => set('city', e.target.value)}
                    placeholder="Biggleswade"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50 focus:border-[#f5a623]" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Postcode <span className="text-red-500">*</span></label>
                  <input type="text" value={form.postcode} onChange={e => set('postcode', e.target.value)}
                    placeholder="e.g. SG18 8JR"
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50 focus:border-[#f5a623] ${
                      form.postcode && form.postcode.replace(/\s/g,'').length < 5 ? 'border-red-400 bg-red-50' : 'border-gray-200'
                    }`} />
                </div>
              </div>
            </div>

            {/* Hero Text Style */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span className="text-sm">🎨</span> Hero Banner Text Style
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-2">Placement</label>
                  <div className="grid grid-cols-3 gap-1.5 bg-gray-100 rounded-xl p-2">
                    {([
                      ['top-left','↖'],['top-center','↑'],['top-right','↗'],
                      ['center-left','←'],['center-center','·'],['center-right','→'],
                      ['bottom-left','↙'],['bottom-center','↓'],['bottom-right','↘'],
                    ] as const).map(([val, arrow]) => (
                      <button key={val} type="button" onClick={() => set('heroTextPlacement', val)}
                        className={`aspect-square rounded-lg text-base font-bold transition-all flex items-center justify-center ${
                          (form.heroTextPlacement ?? 'bottom-left') === val
                            ? 'bg-[#f5a623] text-[#0f1f3d] shadow-sm scale-105'
                            : 'bg-white text-gray-400 hover:bg-gray-50 hover:text-gray-700'
                        }`}>{arrow}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-2">Font</label>
                  <div className="space-y-1.5">
                    {([
                      ['sans','Sans-Serif','font-sans','Clean & modern'],
                      ['serif','Serif','font-serif','Classic & elegant'],
                      ['mono','Monospace','font-mono','Tech & minimal'],
                      ['slab','Slab Serif','','Bold & impactful'],
                    ] as const).map(([val, label, cls, hint]) => (
                      <button key={val} type="button" onClick={() => set('heroFontStyle', val)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border-2 transition-all ${
                          (form.heroFontStyle ?? 'sans') === val ? 'border-[#f5a623] bg-amber-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}>
                        <span className={`text-sm font-bold text-[#0f1f3d] ${cls || ''}`}
                          style={val === 'slab' ? { fontFamily: '"Rockwell","Courier New",serif' } : undefined}>{label}</span>
                        <span className="text-[10px] text-gray-400">{hint}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-2">Weight</label>
                    <label className="flex items-center justify-between cursor-pointer bg-gray-50 rounded-xl px-3 py-3 border border-gray-200">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Bold title</p>
                        <p className="text-[11px] text-gray-400">Extra-heavy heading weight</p>
                      </div>
                      <div onClick={() => set('heroBold', !(form.heroBold ?? true))}
                        className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${(form.heroBold ?? true) ? 'bg-[#f5a623]' : 'bg-gray-300'}`}>
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${(form.heroBold ?? true) ? 'left-5' : 'left-0.5'}`} />
                      </div>
                    </label>
                  </div>
                  <div className="relative rounded-xl overflow-hidden border border-gray-200 h-24 bg-gray-800"
                    style={{ background: form.accentColor || '#0f1f3d' }}>
                    <div className={`absolute inset-0 flex flex-col p-3 ${(() => {
                      const [v, h] = (form.heroTextPlacement ?? 'bottom-left').split('-');
                      const jm: Record<string,string> = { bottom: 'justify-end', center: 'justify-center', top: 'justify-start' };
                      const im: Record<string,string> = { left: 'items-start', center: 'items-center', right: 'items-end' };
                      return `${jm[v] ?? 'justify-end'} ${im[h] ?? 'items-start'}`;
                    })()}`}>
                      <p className={`text-white text-sm leading-tight ${(form.heroBold ?? true) ? 'font-black' : 'font-normal'} ${{ sans: 'font-sans', serif: 'font-serif', mono: 'font-mono', slab: '' }[form.heroFontStyle ?? 'sans'] ?? 'font-sans'}`}
                        style={form.heroFontStyle === 'slab' ? { fontFamily: '"Rockwell","Courier New",serif' } : undefined}>
                        {form.businessName || 'My Takeaway'}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: form.primaryColor || '#f5a623' }}>
                        {form.tagline || 'Order Online'}
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 text-center">Live preview</p>
                </div>
              </div>
            </div>

            {/* Hero Info Row */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span className="text-sm">⭐</span> Hero Info Row
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-center justify-between cursor-pointer bg-gray-50 rounded-xl px-3 py-3 border border-gray-200">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Show star rating</p>
                    <p className="text-[11px] text-gray-400">Display ★ stars on the hero banner</p>
                  </div>
                  <div onClick={() => set('heroShowStars', !(form.heroShowStars ?? true))}
                    className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${(form.heroShowStars ?? true) ? 'bg-[#f5a623]' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${(form.heroShowStars ?? true) ? 'left-5' : 'left-0.5'}`} />
                  </div>
                </label>
                {(form.heroShowStars ?? true) && (
                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-2">Number of stars (1–5)</label>
                    <div className="flex gap-2">
                      {[1,2,3,4,5].map(n => (
                        <button key={n} type="button" onClick={() => set('heroStarCount', n)}
                          className={`flex-1 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${
                            (form.heroStarCount ?? 5) === n ? 'border-[#f5a623] bg-amber-50 text-[#0f1f3d]' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}>{'★'.repeat(n)}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );

      case 'logo': return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="bg-[#0f1f3d] px-5 py-3 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#f5a623]" />
            <h3 className="text-white font-bold text-sm">Logo (Navbar Icon)</h3>
          </div>
          <div className="p-5 space-y-3">
            <p className="text-xs text-gray-500">Shown in the top-left of the navigation bar. Displayed as a 36×36 circle.</p>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#f5a623] flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-gray-200">
                {form.logoUrl ? <img src={form.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  : <span className="text-[#0f1f3d] font-black text-xl">{(form.businessName || 'M').charAt(0)}</span>}
              </div>
              <div className="flex-1 space-y-2">
                <input ref={logoInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }} />
                <button onClick={() => logoInputRef.current?.click()} disabled={logoUploading}
                  className="w-full border-2 border-dashed border-gray-300 hover:border-[#f5a623] rounded-xl py-3 flex items-center justify-center gap-2 transition-all text-sm text-gray-500 hover:text-[#f5a623] disabled:opacity-60">
                  {logoUploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</> : <><Upload className="w-4 h-4" /> {form.logoUrl ? 'Replace logo' : 'Upload logo'}</>}
                </button>
                <input type="url" value={form.logoUrl ?? ''} onChange={e => set('logoUrl', e.target.value)}
                  placeholder="Or paste image URL…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50 focus:border-[#f5a623]" />
                {form.logoUrl && <button onClick={() => set('logoUrl', '')} className="text-xs text-red-400 hover:text-red-600">Remove logo</button>}
              </div>
            </div>
          </div>
        </div>
      );

      case 'hero': return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="bg-[#0f1f3d] px-5 py-3 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#f5a623]" />
            <h3 className="text-white font-bold text-sm">Hero Banner &amp; Social Share Image</h3>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-xs text-gray-500">Shown as the hero banner on your menu page. Also used as the social share preview.</p>
            {form.heroImageUrl && (
              <div className="relative w-full h-40 rounded-xl overflow-hidden bg-gray-100">
                <img src={form.heroImageUrl} alt="Hero" className="w-full h-full object-cover" />
                <button onClick={() => set('heroImageUrl', '')}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleHeroUpload(f); }} />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="w-full border-2 border-dashed border-gray-300 hover:border-[#f5a623] rounded-xl py-4 flex items-center justify-center gap-2 transition-all text-sm text-gray-500 hover:text-[#f5a623] disabled:opacity-60">
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</> : <><Upload className="w-4 h-4" /> {form.heroImageUrl ? 'Replace image' : 'Upload hero image'}</>}
            </button>
            <input type="url" value={form.heroImageUrl} onChange={e => set('heroImageUrl', e.target.value)}
              placeholder="https://…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50 focus:border-[#f5a623]" />
            {form.heroImageUrl && (
              <div className="flex items-center gap-2">
                <input type="text" readOnly value={form.heroImageUrl}
                  className="flex-1 bg-white border border-blue-200 rounded-lg px-2.5 py-2 text-[11px] font-mono text-blue-900 focus:outline-none truncate" />
                <button onClick={() => { navigator.clipboard.writeText(form.heroImageUrl); toast.success('URL copied!'); }}
                  className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-all">Copy</button>
              </div>
            )}
          </div>
        </div>
      );

      case 'hours': return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="bg-[#0f1f3d] px-5 py-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#f5a623]" />
            <h3 className="text-white font-bold text-sm">Opening Hours</h3>
          </div>
          <div className="p-5 space-y-3">
            <p className="text-xs text-gray-500">Add multiple slots for split sessions (e.g. lunch &amp; dinner).</p>
            {DAY_KEYS.map(day => {
              const slots: DaySlot[] = form.openingHours[day] ?? [];
              return (
                <div key={day} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-gray-800">{DAY_LABELS[day]}</span>
                    <button onClick={() => addSlot(day)}
                      className="flex items-center gap-1 text-xs bg-[#f5a623]/10 hover:bg-[#f5a623]/20 text-[#c87d00] font-bold px-2.5 py-1 rounded-lg transition-all">
                      <Plus className="w-3 h-3" /> Add slot
                    </button>
                  </div>
                  {slots.length === 0 && <p className="text-xs text-gray-400 italic">Closed — no slots added</p>}
                  {slots.map((slot, idx) => (
                    <div key={idx} className="flex items-center gap-2 mt-2">
                      <input type="time" value={slot.open} onChange={e => updateSlot(day, idx, 'open', e.target.value)}
                        className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50" />
                      <span className="text-gray-400 text-xs">to</span>
                      <input type="time" value={slot.close} onChange={e => updateSlot(day, idx, 'close', e.target.value)}
                        className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50" />
                      <button onClick={() => removeSlot(day, idx)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      );

      case 'delivery': return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="bg-[#0f1f3d] px-5 py-3 flex items-center gap-2">
            <Truck className="w-4 h-4 text-[#f5a623]" />
            <h3 className="text-white font-bold text-sm">Delivery Options</h3>
          </div>
          <div className="p-5 space-y-4">
            <label className="flex items-center justify-between cursor-pointer bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
              <div>
                <p className="text-sm font-bold text-gray-800">🚚 Enable Delivery</p>
                <p className="text-xs text-gray-400">Customers can choose delivery at checkout</p>
              </div>
              <div onClick={() => set('deliveryEnabled', !form.deliveryEnabled)}
                className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${form.deliveryEnabled ? 'bg-[#f5a623]' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.deliveryEnabled ? 'left-5' : 'left-0.5'}`} />
              </div>
            </label>
            {form.deliveryEnabled && (
              <>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Minimum Order for Delivery (£)</label>
                  <input type="number" step="1.00" min="0" value={form.deliveryMinOrder ?? 0}
                    onChange={e => set('deliveryMinOrder', parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 15.00"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50 focus:border-[#f5a623]" />
                </div>
                <DeliveryZonesEditor zones={form.deliveryZones ?? []} onChange={zones => set('deliveryZones', zones)} />
              </>
            )}
            {!form.deliveryEnabled && <p className="text-xs text-gray-400 italic">Delivery is currently disabled.</p>}
          </div>
        </div>
      );

      case 'colours': return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="bg-[#0f1f3d] px-5 py-3 flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ background: 'linear-gradient(135deg, #f5a623 50%, #0f1f3d 50%)' }} />
            <h3 className="text-white font-bold text-sm">Brand Colours</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-2">Primary Colour</label>
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-10 rounded-xl overflow-hidden border-2 border-gray-200 flex-shrink-0 cursor-pointer">
                    <input type="color" value={form.primaryColor || '#f5a623'} onChange={e => set('primaryColor', e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <div className="w-full h-full rounded-xl" style={{ background: form.primaryColor || '#f5a623' }} />
                  </div>
                  <input type="text" value={form.primaryColor || '#f5a623'} onChange={e => set('primaryColor', e.target.value)}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50 focus:border-[#f5a623]" />
                </div>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {['#f5a623','#e63946','#2ec4b6','#06d6a0','#ff6b35','#d62828','#7b2d8b','#1d3557'].map(c => (
                    <button key={c} type="button" onClick={() => set('primaryColor', c)}
                      className="w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110 flex-shrink-0"
                      style={{ background: c, borderColor: form.primaryColor === c ? '#374151' : 'transparent' }} />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-2">Accent Colour</label>
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-10 rounded-xl overflow-hidden border-2 border-gray-200 flex-shrink-0 cursor-pointer">
                    <input type="color" value={form.accentColor || '#0f1f3d'} onChange={e => set('accentColor', e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <div className="w-full h-full rounded-xl" style={{ background: form.accentColor || '#0f1f3d' }} />
                  </div>
                  <input type="text" value={form.accentColor || '#0f1f3d'} onChange={e => set('accentColor', e.target.value)}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50 focus:border-[#f5a623]" />
                </div>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {['#0f1f3d','#1a1a2e','#2d3436','#212529','#0d1b2a','#1b4332','#370617','#4a0e8f'].map(c => (
                    <button key={c} type="button" onClick={() => set('accentColor', c)}
                      className="w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110 flex-shrink-0"
                      style={{ background: c, borderColor: form.accentColor === c ? '#f5a623' : 'transparent' }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden border border-gray-200">
              <div className="px-4 py-3 flex items-center justify-between" style={{ background: form.accentColor || '#0f1f3d' }}>
                <span className="text-white font-bold text-sm">{form.businessName || 'Your Restaurant'}</span>
                <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: form.primaryColor || '#f5a623', color: form.accentColor || '#0f1f3d' }}>View Order</span>
              </div>
            </div>
          </div>
        </div>
      );

      case 'preptime': return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="bg-[#0f1f3d] px-5 py-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#f5a623]" />
            <h3 className="text-white font-bold text-sm">Preferred Collection Time</h3>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gray-700">Time Options</p>
                <button type="button" onClick={() => {
                  const opts = form.prepTimeOptions ?? [];
                  set('prepTimeOptions', [...opts, { value: String((opts.length + 1) * 10), label: '' }]);
                }} className="flex items-center gap-1 bg-[#f5a623]/10 hover:bg-[#f5a623]/20 text-[#c87d00] font-bold text-xs px-3 py-1.5 rounded-lg transition-all">
                  <Plus className="w-3 h-3" /> Add Option
                </button>
              </div>
              <div className="space-y-2">
                {(form.prepTimeOptions ?? []).map((opt, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_80px_auto] gap-2 items-center">
                    <input type="text" value={opt.label}
                      onChange={e => { const next = (form.prepTimeOptions ?? []).map((o, i) => i === idx ? { ...o, label: e.target.value } : o); set('prepTimeOptions', next); }}
                      placeholder="e.g. Around 20 minutes"
                      className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50" />
                    <div className="flex items-center gap-1">
                      <input type="number" min="1" value={opt.value}
                        onChange={e => { const next = (form.prepTimeOptions ?? []).map((o, i) => i === idx ? { ...o, value: e.target.value } : o); set('prepTimeOptions', next); }}
                        className="w-full border border-gray-200 rounded-xl px-2 py-2 text-xs text-center font-mono focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50" />
                      <span className="text-[11px] text-gray-400">min</span>
                    </div>
                    <button type="button" onClick={() => set('prepTimeOptions', (form.prepTimeOptions ?? []).filter((_, i) => i !== idx))}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Helper note</label>
              <textarea value={form.prepTimeNote ?? ''} onChange={e => set('prepTimeNote', e.target.value)}
                rows={2} placeholder="e.g. The kitchen will reply back with an estimated time to collect."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50 focus:border-[#f5a623] resize-none" />
            </div>
          </div>
        </div>
      );

      case 'payment': return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="bg-[#0f1f3d] px-5 py-3 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-[#f5a623]" />
            <h3 className="text-white font-bold text-sm">Online Payment Link</h3>
          </div>
          <div className="p-5 space-y-4">
            <label className="flex items-center justify-between cursor-pointer bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
              <div>
                <p className="text-sm font-bold text-gray-800">💳 Enable payment link</p>
                <p className="text-xs text-gray-400">Shows a payment button on the checkout page</p>
              </div>
              <div onClick={() => set('paymentLinkEnabled', !form.paymentLinkEnabled)}
                className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${form.paymentLinkEnabled ? 'bg-[#f5a623]' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.paymentLinkEnabled ? 'left-5' : 'left-0.5'}`} />
              </div>
            </label>
            {form.paymentLinkEnabled && (
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Payment URL *</label>
                <input type="url" value={form.paymentLinkUrl ?? ''} onChange={e => set('paymentLinkUrl', e.target.value)}
                  placeholder="https://buy.stripe.com/… or https://paypal.me/…"
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50 focus:border-[#f5a623] ${form.paymentLinkUrl ? 'border-green-400 bg-green-50' : 'border-gray-200'}`} />
              </div>
            )}
          </div>
        </div>
      );

      // ── Receipt Builder — full config editor with live preview ──
      case 'receipt': return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="bg-[#0f1f3d] px-5 py-3 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#f5a623]" />
            <h3 className="text-white font-bold text-sm">Receipt Builder</h3>
          </div>
          <div className="p-5">
            <ReceiptBuilder />
          </div>
        </div>
      );

      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      {showWizardConfirm && (
        <RerunWizardConfirm
          onConfirm={() => { localStorage.removeItem('setup_complete'); setShowWizardConfirm(false); setShowWizard(true); }}
          onClose={() => setShowWizardConfirm(false)}
        />
      )}
      {sectionOrder.map(id => (
        <div key={id} data-section-id={id} draggable
          onDragStart={() => onDragStart(id)} onDragOver={e => onDragOver(e, id)} onDragEnd={onDragEnd}
          onTouchStart={e => onTouchStart(e, id)} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
          className="relative group/drag" style={{ touchAction: 'none' }}>
          <div className="absolute -left-0.5 top-0 bottom-0 z-10 flex items-center opacity-0 group-hover/drag:opacity-100 transition-opacity cursor-grab select-none">
            <div className="bg-[#0f1f3d] hover:bg-[#1a2f5a] rounded-l-xl px-1.5 py-4 flex items-center justify-center h-10 self-center mt-1">
              <GripVertical className="w-3.5 h-3.5 text-[#f5a623]" />
            </div>
          </div>
          {renderSection(id)}
        </div>
      ))}
      <button onClick={handleSave} disabled={saving}
        className="w-full bg-[#f5a623] hover:bg-[#e09615] disabled:opacity-60 text-[#0f1f3d] font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all text-base sticky bottom-4">
        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
        {saving ? 'Saving…' : 'Save All Settings'}
      </button>
    </div>
  );
}

// ── Category modal ─────────────────────────────────────────────────────────
function CategoryModal({
  category, maxSortOrder, onSave, onClose,
}: {
  category: Partial<MenuCategory> | null;
  maxSortOrder: number;
  onSave: (data: { id: string; name: string; icon: string; sortOrder: number }) => void;
  onClose: () => void;
}) {
  const isNew = !category?.id;
  const [name, setName]           = useState(category?.name ?? '');
  const [icon, setIcon]           = useState(category?.icon ?? '');
  const [sortOrder, setSortOrder] = useState(category?.sortOrder ?? maxSortOrder + 1);
  const [saving, setSaving]       = useState(false);
  const QUICK_EMOJIS = ['🐟','🍟','🌭','🍔','🍗','🥧','🧆','🍽️','🧒','🍰','🥤','🥗','🫔','🥩','🍕','🌮'];

  const handleSave = () => {
    if (!name.trim()) { toast.error('Category name is required'); return; }
    if (!icon.trim()) { toast.error('Please choose an icon/emoji'); return; }
    setSaving(true);
    const id = category?.id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    onSave({ id, name: name.trim(), icon: icon.trim(), sortOrder });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="bg-[#0f1f3d] px-5 py-4 flex items-center justify-between">
          <h2 className="text-white font-bold">{isNew ? 'Add Category' : 'Edit Category'}</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white p-1"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-2">Category Icon / Emoji *</label>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0 border-2 border-[#f5a623]">{icon || '?'}</div>
              <input type="text" value={icon} onChange={e => setIcon(e.target.value)} placeholder="Type or pick below"
                maxLength={4} className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-lg text-center font-bold focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50 focus:border-[#f5a623]" />
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_EMOJIS.map(e => (
                <button key={e} type="button" onClick={() => setIcon(e)}
                  className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${icon === e ? 'bg-[#f5a623] scale-110' : 'bg-gray-100 hover:bg-gray-200'}`}>{e}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Category Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Burgers"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50 focus:border-[#f5a623]" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Display Order</label>
            <input type="number" min={0} value={sortOrder} onChange={e => setSortOrder(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50 focus:border-[#f5a623]" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 font-bold py-3 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-[#f5a623] hover:bg-[#e09615] disabled:opacity-60 text-[#0f1f3d] font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isNew ? 'Add Category' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Customisation Group modal ───────────────────────────────────────────────
function CustomGroupModal({
  group, onSave, onClose,
}: {
  group: Partial<CustomisationGroup> | null;
  onSave: (data: Omit<CustomisationGroup, 'sortOrder'>) => void;
  onClose: () => void;
}) {
  const isNew = !group?.id;
  const [name, setName]           = useState(group?.name ?? '');
  const [type, setType]           = useState<'single' | 'multi'>(group?.type ?? 'single');
  const [maxSelect, setMaxSelect] = useState(group?.maxSelect ?? 1);
  const [required, setRequired]   = useState(group?.required ?? false);
  const [global, setGlobal]       = useState(group?.global ?? false);
  const [options, setOptions]     = useState<string[]>(group?.options ?? []);
  const [newOption, setNewOption] = useState('');
  const [saving, setSaving]       = useState(false);

  const addOption = () => {
    const val = newOption.trim();
    if (!val) return;
    if (options.includes(val)) { toast.error('Option already exists'); return; }
    setOptions(prev => [...prev, val]);
    setNewOption('');
  };
  const removeOption = (opt: string) => setOptions(prev => prev.filter(o => o !== opt));

  const handleSave = () => {
    if (!name.trim()) { toast.error('Group name is required'); return; }
    if (options.length < 1) { toast.error('Add at least one option'); return; }
    setSaving(true);
    const id = group?.id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
    onSave({ id, name: name.trim(), type, maxSelect, required, global, options });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-[#0f1f3d] px-5 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-white font-bold">{isNew ? 'New Customisation Group' : 'Edit Group'}</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white p-1"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Group Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Drink Choice, Cooking Preference"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50 focus:border-[#f5a623]" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-2">Selection Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setType('single')}
                className={`py-2.5 rounded-xl font-semibold text-sm border-2 transition-all ${type === 'single' ? 'border-[#f5a623] bg-amber-50 text-[#0f1f3d]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                Single choice
              </button>
              <button type="button" onClick={() => setType('multi')}
                className={`py-2.5 rounded-xl font-semibold text-sm border-2 transition-all ${type === 'multi' ? 'border-[#f5a623] bg-amber-50 text-[#0f1f3d]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                Multiple choice
              </button>
            </div>
          </div>
          {type === 'multi' && (
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Max selections allowed</label>
              <input type="number" min={1} max={20} value={maxSelect} onChange={e => setMaxSelect(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50 focus:border-[#f5a623]" />
            </div>
          )}
          <label className="flex items-center justify-between cursor-pointer bg-indigo-50 rounded-xl px-4 py-3 border border-indigo-100">
            <div>
              <p className="text-sm font-semibold text-indigo-900">🌐 Show on all items</p>
              <p className="text-xs text-indigo-500 mt-0.5">Appears on every menu item automatically</p>
            </div>
            <div onClick={() => setGlobal(v => !v)}
              className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${global ? 'bg-indigo-600' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${global ? 'left-5' : 'left-0.5'}`} />
            </div>
          </label>
          <label className="flex items-center justify-between cursor-pointer bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
            <span className="text-sm font-semibold text-gray-700">Required selection</span>
            <div onClick={() => setRequired(v => !v)}
              className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${required ? 'bg-[#f5a623]' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${required ? 'left-5' : 'left-0.5'}`} />
            </div>
          </label>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-2">Options *</label>
            {options.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                    <span className="text-sm text-gray-800 font-medium">{opt}</span>
                    <button onClick={() => removeOption(opt)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input type="text" value={newOption} onChange={e => setNewOption(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addOption()}
                placeholder="e.g. Pepsi Can, No Drink…"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50 focus:border-[#f5a623]" />
              <button onClick={addOption}
                className="bg-[#f5a623] hover:bg-[#e09615] text-[#0f1f3d] font-bold px-4 rounded-xl flex items-center gap-1 transition-all">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50 text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-[#f5a623] hover:bg-[#e09615] disabled:opacity-60 text-[#0f1f3d] font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isNew ? 'Create Group' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit / Add item modal ───────────────────────────────────────────────────
function ItemModal({
  item, categories, customGroups, items: allItems, onSave, onClose,
}: {
  item: Partial<MenuItem> | null;
  categories: { id: string; name: string; icon: string }[];
  customGroups: CustomisationGroup[];
  items: MenuItem[];
  onSave: (data: MenuItem) => void;
  onClose: () => void;
}) {
  const isNew = !item?.id;
  const [form, setForm] = useState<Partial<MenuItem>>({
    id: item?.id ?? '', name: item?.name ?? '', description: item?.description ?? '',
    price: item?.price ?? 0, category: item?.category ?? categories[0]?.id ?? 'fish',
    categories: item?.categories ?? [], image: item?.image ?? '',
    popular: item?.popular ?? false, featured: item?.featured ?? false,
    showCondiments: item?.showCondiments ?? false, customGroupIds: item?.customGroupIds ?? [],
    customGroupConditions: item?.customGroupConditions ?? {},
    suggestedAddon: (() => {
      const sa = item?.suggestedAddon;
      if (!sa) return undefined;
      // Migrate old single targetItemId / targetGroupId → targetItemIds array
      const oldSingle = (sa as { targetItemId?: string; targetGroupId?: string });
      const ids: string[] = Array.isArray((sa as { targetItemIds?: string[] }).targetItemIds)
        ? (sa as { targetItemIds: string[] }).targetItemIds
        : (oldSingle.targetItemId ? [oldSingle.targetItemId] : []);
      return { enabled: sa.enabled, question: sa.question, targetItemIds: ids, yesText: sa.yesText, noText: sa.noText };
    })(),
  });
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageTab, setImageTab]   = useState<'upload' | 'url'>('upload');
  const [imageFileSize, setImageFileSize] = useState<string | null>(null);
  const fileInputRef              = useRef<HTMLInputElement>(null);
  // Tracks whether the size was already read from a File object (skips HEAD request)
  const sizeFromFileRef           = useRef(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.round(bytes / 1024)} KB`;
  };

  // When the modal opens with an existing image URL, attempt to get its size via HEAD
  useEffect(() => {
    if (!form.image || sizeFromFileRef.current) return;
    let cancelled = false;
    setImageFileSize('Checking…');
    fetch(form.image, { method: 'HEAD' })
      .then(res => {
        if (cancelled) return;
        const cl = res.headers.get('content-length');
        setImageFileSize(cl ? formatFileSize(parseInt(cl, 10)) : 'Unknown');
      })
      .catch(() => { if (!cancelled) setImageFileSize('Unknown'); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.image]);

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return; }
    sizeFromFileRef.current = true;
    setImageFileSize(formatFileSize(file.size));
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `items/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('menu-images').upload(path, file, { upsert: true });
    if (error) { toast.error('Upload failed: ' + error.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('menu-images').getPublicUrl(path);
    set('image', urlData.publicUrl);
    toast.success('Image uploaded!');
    setUploading(false);
  };

  const set = (field: keyof MenuItem, val: unknown) => setForm(prev => ({ ...prev, [field]: val }));

  const toggleGroup = (groupId: string) => {
    setForm(prev => {
      const current = prev.customGroupIds ?? [];
      const next = current.includes(groupId) ? current.filter(id => id !== groupId) : [...current, groupId];
      // When disabling a group, remove any stored condition for it
      const conditions = { ...(prev.customGroupConditions ?? {}) };
      if (!next.includes(groupId)) delete conditions[groupId];
      return { ...prev, customGroupIds: next, customGroupConditions: conditions };
    });
  };

  const setGroupCondition = (groupId: string, condition: GroupCondition | undefined) => {
    setForm(prev => {
      const conditions = { ...(prev.customGroupConditions ?? {}) };
      if (condition) conditions[groupId] = condition;
      else delete conditions[groupId];
      return { ...prev, customGroupConditions: conditions };
    });
  };

  const handleSave = async () => {
    if (!form.name?.trim()) { toast.error('Name is required'); return; }
    if (form.price === undefined || form.price < 0) { toast.error('Price must be 0 or more'); return; }
    if (isNew && !form.id?.trim()) {
      form.id = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
    }
    if (form.categories) form.categories = form.categories.filter(id => id !== form.category);
    setSaving(true);
    onSave({ ...form, customGroupConditions: form.customGroupConditions ?? {} } as MenuItem);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-[#0f1f3d] px-5 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-white font-bold">{isNew ? 'Add New Item' : 'Edit Item'}</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white p-1"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-bold text-gray-600 block mb-1">Item Name *</label>
              <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Cod (Large)"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50 focus:border-[#f5a623]" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Price (£) *</label>
              <input type="number" step="0.10" min="0" value={form.price} onChange={e => set('price', parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50 focus:border-[#f5a623]" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Primary Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50 focus:border-[#f5a623]">
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-gray-600 block mb-2">Also appears in <span className="font-normal text-gray-400">(optional)</span></label>
              <div className="flex flex-wrap gap-1.5">
                {categories.filter(c => c.id !== form.category).map(c => {
                  const active = (form.categories ?? []).includes(c.id);
                  return (
                    <button key={c.id} type="button"
                      onClick={() => { const current = form.categories ?? []; set('categories', active ? current.filter(id => id !== c.id) : [...current, c.id]); }}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${active ? 'border-[#f5a623] bg-amber-50 text-[#0f1f3d]' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}>
                      <span>{c.icon}</span> {c.name}
                      {active && <span className="ml-0.5 text-[#f5a623] font-black">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-gray-600 block mb-1">Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                placeholder="Short description..." rows={2}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50 focus:border-[#f5a623]" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-gray-600 block mb-1">Item Photo</label>
              {form.image && (
                <>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="text-xs font-bold text-gray-600">Image Size:</span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                      !imageFileSize || imageFileSize === 'Checking…'
                        ? 'bg-gray-50 text-gray-400 border-gray-200'
                        : imageFileSize === 'Unknown'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-blue-50 text-blue-800 border-blue-200'
                    }`}>
                      {imageFileSize ?? 'Checking…'}
                    </span>
                  </div>
                  <div className="relative w-full h-36 rounded-xl overflow-hidden bg-gray-100 mb-2">
                    <img src={form.image} alt="preview" className="w-full h-full object-cover" />
                    <button onClick={() => { set('image', ''); setImageFileSize(null); sizeFromFileRef.current = false; }} className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-all">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
              <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-2">
                <button onClick={() => setImageTab('upload')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-all ${imageTab === 'upload' ? 'bg-[#0f1f3d] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                  <Upload className="w-3.5 h-3.5" /> Upload Photo
                </button>
                <button onClick={() => { setImageTab('url'); setImageFileSize(null); sizeFromFileRef.current = false; }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-all ${imageTab === 'url' ? 'bg-[#0f1f3d] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                  <Link2 className="w-3.5 h-3.5" /> Paste URL
                </button>
              </div>
              {imageTab === 'upload' ? (
                <div>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                    className="w-full border-2 border-dashed border-gray-300 hover:border-[#f5a623] rounded-xl py-6 flex flex-col items-center gap-2 transition-all group disabled:opacity-60">
                    {uploading ? <><Loader2 className="w-6 h-6 text-[#f5a623] animate-spin" /><span className="text-xs text-gray-500">Uploading…</span></>
                      : <><ImageIcon className="w-6 h-6 text-gray-400 group-hover:text-[#f5a623] transition-colors" />
                          <span className="text-xs font-semibold text-gray-500 group-hover:text-[#f5a623] transition-colors">Click to choose photo</span>
                          <span className="text-[10px] text-gray-400">JPG, PNG, WebP · max 5 MB</span></>}
                  </button>
                </div>
              ) : (
                <input type="url" value={form.image ?? ''} onChange={e => set('image', e.target.value)}
                  placeholder="https://images.unsplash.com/…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50 focus:border-[#f5a623]" />
              )}
            </div>
            <div className="col-span-2 space-y-2">
              <label className="flex items-center justify-between cursor-pointer bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-amber-900 flex items-center gap-1.5"><Crown className="w-4 h-4 text-amber-600" /> Featured item</p>
                  <p className="text-xs text-amber-600 mt-0.5">Shows as a large hero card — best for specials</p>
                </div>
                <div onClick={() => set('featured', !form.featured)}
                  className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${form.featured ? 'bg-amber-500' : 'bg-gray-200'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.featured ? 'left-6' : 'left-0.5'}`} />
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                <div onClick={() => set('popular', !form.popular)}
                  className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${form.popular ? 'bg-[#f5a623]' : 'bg-gray-200'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.popular ? 'left-6' : 'left-0.5'}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Mark as Popular</p>
                  <p className="text-xs text-gray-400">Adds a 🔥 Popular badge on the card</p>
                </div>
              </label>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-bold text-gray-600 mb-2">Built-in customisations</p>
              <div className="bg-gray-50 rounded-xl border border-gray-200">
                <label className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-100 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">🧂 Ask Salt &amp; Vinegar</p>
                    <p className="text-xs text-gray-400">Show salt / vinegar options</p>
                  </div>
                  <div onClick={() => set('showCondiments', !form.showCondiments)}
                    className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${form.showCondiments ? 'bg-[#f5a623]' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.showCondiments ? 'left-5' : 'left-0.5'}`} />
                  </div>
                </label>
              </div>
            </div>
            {/* ── Suggested Add-ons ──────────────────────────────────────── */}
            <div className="col-span-2">
              <div className="bg-white rounded-2xl border border-indigo-200 overflow-hidden">
                <div className="bg-indigo-700 px-4 py-3 flex items-center gap-2">
                  <span className="text-base">💡</span>
                  <h3 className="text-white font-bold text-sm">Suggested Add-on</h3>
                  <span className="ml-auto text-[11px] text-indigo-300">Optional upsell shown after customer taps Add</span>
                </div>
                <div className="p-4 space-y-3">
                  <label className="flex items-center justify-between cursor-pointer bg-indigo-50 rounded-xl px-4 py-3 border border-indigo-100">
                    <div>
                      <p className="text-sm font-semibold text-indigo-900">Enable suggestion for this item</p>
                      <p className="text-xs text-indigo-500 mt-0.5">Shows a prompt after the customer taps Add</p>
                    </div>
                    <div
                      onClick={() => {
                        const cur = form.suggestedAddon;
                        if (cur?.enabled) {
                          set('suggestedAddon', { ...cur, enabled: false });
                        } else {
                          set('suggestedAddon', {
                            enabled: true,
                            question: cur?.question ?? '',
                            targetItemIds: cur?.targetItemIds ?? [],
                            yesText: cur?.yesText ?? 'Add selected items',
                            noText: cur?.noText ?? 'No thanks',
                          });
                        }
                      }}
                      className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${(form.suggestedAddon?.enabled) ? 'bg-indigo-600' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${(form.suggestedAddon?.enabled) ? 'left-5' : 'left-0.5'}`} />
                    </div>
                  </label>

                  {form.suggestedAddon?.enabled && (
                    <div className="space-y-3 pt-1">
                      <div>
                        <label className="text-xs font-bold text-gray-600 block mb-1">Question shown to customer *</label>
                        <input
                          type="text"
                          value={form.suggestedAddon?.question ?? ''}
                          onChange={e => set('suggestedAddon', { ...form.suggestedAddon!, question: e.target.value })}
                          placeholder="e.g. Would you like chips with your fish?"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-600 block mb-1">Suggested menu items <span className="font-normal text-gray-400">(tick one or more)</span></label>
                        <div className="border border-gray-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                          {allItems
                            .filter(i => i.id !== form.id && i.available !== false)
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(i => {
                              const checked = (form.suggestedAddon?.targetItemIds ?? []).includes(i.id);
                              const catIcon = categories.find(c => c.id === i.category)?.icon ?? '';
                              return (
                                <label key={i.id}
                                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0 ${
                                    checked ? 'bg-indigo-50' : 'bg-white hover:bg-gray-50'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      const current = form.suggestedAddon?.targetItemIds ?? [];
                                      const next = checked
                                        ? current.filter(id => id !== i.id)
                                        : [...current, i.id];
                                      set('suggestedAddon', { ...form.suggestedAddon!, targetItemIds: next });
                                    }}
                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 accent-indigo-600 flex-shrink-0 cursor-pointer"
                                  />
                                  <span className="text-sm flex-1 min-w-0">
                                    <span className={`font-semibold ${ checked ? 'text-indigo-900' : 'text-gray-800'}`}>
                                      {catIcon} {i.name}
                                    </span>
                                    <span className="text-gray-400 ml-1 text-xs">£{i.price.toFixed(2)}</span>
                                  </span>
                                  {checked && <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">Selected</span>}
                                </label>
                              );
                            })
                          }
                          {allItems.filter(i => i.id !== form.id && i.available !== false).length === 0 && (
                            <p className="text-xs text-gray-400 italic px-3 py-3">No other available items in menu.</p>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">Checked items will be shown as optional suggestions when the customer adds this item.</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-gray-600 block mb-1">Yes button text</label>
                          <input
                            type="text"
                            value={form.suggestedAddon?.yesText ?? ''}
                            onChange={e => set('suggestedAddon', { ...form.suggestedAddon!, yesText: e.target.value })}
                            placeholder="e.g. Yes, add chips"
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-600 block mb-1">No button text</label>
                          <input
                            type="text"
                            value={form.suggestedAddon?.noText ?? ''}
                            onChange={e => set('suggestedAddon', { ...form.suggestedAddon!, noText: e.target.value })}
                            placeholder="e.g. No thanks"
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {customGroups.length > 0 && (
              <div className="col-span-2">
                <p className="text-xs font-bold text-gray-600 mb-2">Custom customisation groups</p>
                <div className="bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-100">
                  {customGroups.map(g => {
                    const linked = g.global || (form.customGroupIds ?? []).includes(g.id);
                    const condition = (form.customGroupConditions ?? {})[g.id] as GroupCondition | undefined;
                    return (
                      <div key={g.id} className={`flex flex-col px-4 py-3 first:rounded-t-xl last:rounded-b-xl ${g.global ? 'opacity-60' : ''}`}>
                        {/* ON/OFF toggle row */}
                        <label className={`flex items-center justify-between cursor-pointer hover:bg-gray-100 -mx-4 px-4 py-1 rounded-xl ${g.global ? 'pointer-events-none' : ''}`}>
                          <div>
                            <p className="text-sm font-semibold text-gray-700">
                              {g.name}
                              {g.global && <span className="ml-2 text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">🌐 Always on</span>}
                            </p>
                            <p className="text-xs text-gray-400">
                              {g.type === 'single' ? 'Single choice' : `Multi-select (max ${g.maxSelect})`} · {g.options.length} options
                            </p>
                          </div>
                          {g.global ? <span className="text-[10px] text-indigo-600 font-bold">Auto</span> : (
                            <div onClick={() => toggleGroup(g.id)}
                              className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${linked ? 'bg-[#0f1f3d]' : 'bg-gray-300'}`}>
                              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${linked ? 'left-5' : 'left-0.5'}`} />
                            </div>
                          )}
                        </label>

                        {/* Display condition — only when enabled and not global */}
                        {linked && !g.global && (
                          <div className="mt-2 pl-1">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Filter className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <span className="text-[11px] font-bold text-gray-500">Display condition</span>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`cond-${g.id}-${form.id}`}
                                  checked={!condition}
                                  onChange={() => setGroupCondition(g.id, undefined)}
                                  className="accent-[#0f1f3d] flex-shrink-0"
                                />
                                <span className="text-xs text-gray-700">Always show</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer flex-wrap">
                                <input
                                  type="radio"
                                  name={`cond-${g.id}-${form.id}`}
                                  checked={condition?.type === 'cart_has_category'}
                                  onChange={() => setGroupCondition(g.id, { type: 'cart_has_category', value: categories[0]?.id ?? '' })}
                                  className="accent-[#0f1f3d] flex-shrink-0"
                                />
                                <span className="text-xs text-gray-700 whitespace-nowrap">Only when cart contains category:</span>
                                {condition?.type === 'cart_has_category' && (
                                  <select
                                    value={condition.value}
                                    onChange={e => setGroupCondition(g.id, { type: 'cart_has_category', value: e.target.value })}
                                    onClick={e => e.stopPropagation()}
                                    className="flex-1 min-w-[140px] border border-[#f5a623] bg-amber-50 rounded-lg px-2 py-1 text-xs font-semibold text-[#0f1f3d] focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50 cursor-pointer"
                                  >
                                    {categories.map(c => (
                                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                    ))}
                                  </select>
                                )}
                              </label>
                            </div>
                            {condition?.type === 'cart_has_category' && (
                              <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 mt-1.5 leading-relaxed">
                                This group will only appear when the basket contains an item from <strong>{categories.find(c => c.id === condition.value)?.name ?? condition.value}</strong>.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50 text-sm transition-all">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-[#f5a623] hover:bg-[#e09615] disabled:opacity-60 text-[#0f1f3d] font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm transition-all">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isNew ? 'Add Item' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Staff Manager ────────────────────────────────────────────────────────────
interface StaffUser {
  id: string; email: string | undefined; created_at: string;
  last_sign_in_at: string | null; invited_at: string | null;
  confirmed_at: string | null; role?: 'admin' | 'staff';
}

function StaffManager() {
  const { user: currentUser } = useAuth();
  const [staff, setStaff]     = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole]   = useState<'staff' | 'admin'>('staff');
  const [inviting, setInviting]       = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<StaffUser | null>(null);
  const [removing, setRemoving]           = useState(false);
  const [togglingRole, setTogglingRole]   = useState<string | null>(null);

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  };

  const fetchStaff = async () => {
    setLoading(true);
    const headers = await getAuthHeaders();
    const { data, error } = await supabase.functions.invoke('manage-staff', { method: 'GET', headers } as Parameters<typeof supabase.functions.invoke>[1]);
    if (error) {
      let msg = error.message;
      try { const e = error as unknown as { context?: { text?: () => Promise<string> } }; if (e.context?.text) msg = await e.context.text(); } catch { /* ignore */ }
      toast.error('Could not load staff list: ' + msg);
    } else { setStaff((data?.users ?? []) as StaffUser[]); }
    setLoading(false);
  };

  useEffect(() => { fetchStaff(); }, []);

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    if (!email || !email.includes('@')) { toast.error('Enter a valid email address'); return; }
    setInviting(true);
    const headers = await getAuthHeaders();
    const { error } = await supabase.functions.invoke('manage-staff', { method: 'POST', body: { email, role: inviteRole }, headers } as Parameters<typeof supabase.functions.invoke>[1]);
    setInviting(false);
    if (error) {
      let msg = error.message;
      try { const e = error as unknown as { context?: { text?: () => Promise<string> } }; if (e.context?.text) msg = await e.context.text(); } catch { /* ignore */ }
      toast.error('Invite failed: ' + msg); return;
    }
    toast.success(`Invite sent to ${email} as ${inviteRole === 'admin' ? 'Admin' : 'Staff'}`);
    setInviteEmail(''); setInviteRole('staff');
    await fetchStaff();
  };

  const handleToggleRole = async (user: StaffUser) => {
    const newRole = user.role === 'admin' ? 'staff' : 'admin';
    setTogglingRole(user.id);
    const headers = await getAuthHeaders();
    const { error } = await supabase.functions.invoke('manage-staff', { method: 'PATCH', body: { userId: user.id, role: newRole }, headers } as Parameters<typeof supabase.functions.invoke>[1]);
    setTogglingRole(null);
    if (error) {
      let msg = error.message;
      try { const e = error as unknown as { context?: { text?: () => Promise<string> } }; if (e.context?.text) msg = await e.context.text(); } catch { /* ignore */ }
      toast.error('Could not update role: ' + msg); return;
    }
    toast.success(`${user.email} is now ${newRole === 'admin' ? 'an Admin' : 'a Staff member'}`);
    setStaff(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
  };

  const handleRemove = async (user: StaffUser) => {
    setRemoving(true);
    const headers = await getAuthHeaders();
    const { error } = await supabase.functions.invoke('manage-staff', { method: 'DELETE', body: { userId: user.id }, headers } as Parameters<typeof supabase.functions.invoke>[1]);
    setRemoving(false); setConfirmRemove(null);
    if (error) {
      let msg = error.message;
      try { const e = error as unknown as { context?: { text?: () => Promise<string> } }; if (e.context?.text) msg = await e.context.text(); } catch { /* ignore */ }
      toast.error('Could not remove user: ' + msg); return;
    }
    toast.success('Access revoked for ' + user.email);
    setStaff(prev => prev.filter(u => u.id !== user.id));
  };

  const formatRelative = (iso: string | null): string => {
    if (!iso) return 'Never';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (mins < 2) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-5">
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <UserX className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Revoke access?</h3>
                <p className="text-xs text-gray-500 mt-0.5">This permanently deletes their account.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5 bg-gray-50 rounded-xl px-4 py-3 font-mono break-all">{confirmRemove.email}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmRemove(null)} className="flex-1 border border-gray-200 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50 text-sm">Cancel</button>
              <button onClick={() => handleRemove(confirmRemove)} disabled={removing}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
                {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />} Revoke Access
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3">
        <p className="text-sm font-bold text-blue-900 flex items-center gap-2"><Shield className="w-4 h-4" /> Invite-only access</p>
        <p className="text-xs text-blue-700 mt-1">Only email addresses you invite here can access the kitchen.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="bg-[#0f1f3d] px-5 py-3 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-[#f5a623]" />
          <h3 className="text-white font-bold text-sm">Invite Staff Member</h3>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setInviteRole('staff')}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${inviteRole === 'staff' ? 'border-[#0f1f3d] bg-[#0f1f3d] text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'}`}>
              <Users className="w-4 h-4 flex-shrink-0" />
              <div className="text-left"><p className="font-bold leading-tight">Staff</p><p className="text-[10px] opacity-70 leading-tight">Orders only</p></div>
            </button>
            <button type="button" onClick={() => setInviteRole('admin')}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${inviteRole === 'admin' ? 'border-red-600 bg-red-600 text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'}`}>
              <Shield className="w-4 h-4 flex-shrink-0" />
              <div className="text-left"><p className="font-bold leading-tight">Admin</p><p className="text-[10px] opacity-70 leading-tight">Full access</p></div>
            </button>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
                placeholder="staff@example.com"
                className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50 focus:border-[#f5a623]" />
            </div>
            <button onClick={handleInvite} disabled={inviting}
              className={`flex items-center gap-2 disabled:opacity-60 font-bold px-5 py-3 rounded-xl text-sm transition-all flex-shrink-0 ${inviteRole === 'admin' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-[#f5a623] hover:bg-[#e09615] text-[#0f1f3d]'}`}>
              {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {inviting ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="bg-[#0f1f3d] px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#f5a623]" />
            <h3 className="text-white font-bold text-sm">Staff Accounts</h3>
            {!loading && <span className="bg-white/10 text-white/70 text-[11px] font-bold px-2 py-0.5 rounded-full">{staff.length}</span>}
          </div>
          <button onClick={fetchStaff} disabled={loading} className="p-1.5 text-white/40 hover:text-white/80 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {loading ? <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 text-[#f5a623] animate-spin" /></div>
        : staff.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-2 text-gray-400">
            <Users className="w-10 h-10 opacity-30" />
            <p className="text-sm font-semibold">No staff accounts yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {staff.map(u => {
              const isSelf = u.id === currentUser?.id;
              const isPending = !u.confirmed_at;
              const isAdmin = u.role === 'admin';
              return (
                <div key={u.id} className="px-5 py-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm ${isSelf ? 'bg-[#f5a623] text-[#0f1f3d]' : isPending ? 'bg-gray-100 text-gray-400' : isAdmin ? 'bg-red-600 text-white' : 'bg-[#0f1f3d] text-white'}`}>
                    {isPending ? <Mail className="w-4 h-4" /> : (u.email?.[0]?.toUpperCase() ?? '?')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-gray-900 truncate">{u.email}</span>
                      {isSelf && <span className="text-[10px] font-bold bg-[#f5a623] text-[#0f1f3d] px-2 py-0.5 rounded-full">You</span>}
                      {isPending && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Pending invite</span>}
                      {!isPending && isAdmin && <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-0.5"><Shield className="w-2.5 h-2.5" /> Admin</span>}
                      {!isPending && !isAdmin && <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex items-center gap-0.5"><Users className="w-2.5 h-2.5" /> Staff</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {isPending ? `Invited ${formatRelative(u.invited_at ?? u.created_at)}` : `Last sign-in: ${formatRelative(u.last_sign_in_at)} · Joined ${formatRelative(u.created_at)}`}
                    </p>
                  </div>
                  {!isSelf ? (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {!isPending && (
                        <button onClick={() => handleToggleRole(u)} disabled={togglingRole === u.id}
                          title={isAdmin ? 'Demote to Staff' : 'Promote to Admin'}
                          className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all ${isAdmin ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-indigo-600 border-indigo-200 hover:bg-indigo-50'}`}>
                          {togglingRole === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Shield className="w-3 h-3" />}
                          {isAdmin ? 'Staff' : 'Admin'}
                        </button>
                      )}
                      <button onClick={() => setConfirmRemove(u)}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 border border-red-100 hover:border-red-200 rounded-xl transition-all">
                        <UserX className="w-3.5 h-3.5" /> Revoke
                      </button>
                    </div>
                  ) : <span className="text-xs text-gray-300 italic flex-shrink-0">Cannot remove self</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main menu admin page ────────────────────────────────────────────────────
type AdminTab = 'items' | 'categories' | 'customisations' | 'settings' | 'staff' | 'pages';

export default function MenuAdmin() {
  const navigate = useNavigate();
  const {
    items, categories, customGroups, loading, saving,
    toggleItem, toggleCategory, updateItem, addItem, deleteItem, moveItem,
    addCategory, updateCategory, deleteCategory,
    addCustomGroup, updateCustomGroup, deleteCustomGroup,
  } = useMenuAdmin();

  const [adminTab, setAdminTab]         = useState<AdminTab>('items');
  const [searchQuery, setSearchQuery]   = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterAvail, setFilterAvail]   = useState<'all' | 'available' | 'hidden'>('all');
  const [editingItem, setEditingItem]   = useState<Partial<MenuItem> | null | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<Partial<MenuCategory> | null | undefined>(undefined);
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<string | null>(null);
  const [editingGroup, setEditingGroup] = useState<Partial<CustomisationGroup> | null | undefined>(undefined);
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState<string | null>(null);
  const [expandedGroupItems, setExpandedGroupItems] = useState<string | null>(null);
  const [groupItemSearch, setGroupItemSearch] = useState('');

  const filtered = useMemo(() => {
    return items.filter(item => {
      if (filterCategory !== 'all' && item.category !== filterCategory) return false;
      if (filterAvail === 'available' && !item.available) return false;
      if (filterAvail === 'hidden' && item.available) return false;
      if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [items, filterCategory, filterAvail, searchQuery]);

  const handleSaveItem = async (data: MenuItem) => {
    const isNew = !items.find(i => i.id === data.id);
    let success: boolean;
    if (isNew) { success = await addItem(data); }
    else { success = await updateItem(data.id, { name: data.name, description: data.description, price: data.price, category: data.category, popular: data.popular, featured: data.featured, image: data.image, showCondiments: data.showCondiments, customGroupIds: data.customGroupIds, customGroupConditions: data.customGroupConditions, categories: data.categories ?? [], suggestedAddon: data.suggestedAddon ?? undefined }); }
    if (success) setEditingItem(undefined);
  };

  const handleSaveCategory = async (data: { id: string; name: string; icon: string; sortOrder: number }) => {
    const existing = categories.find(c => c.id === data.id);
    let success: boolean | undefined;
    if (!existing) success = await addCategory(data);
    else success = await updateCategory(data.id, { name: data.name, icon: data.icon, sortOrder: data.sortOrder });
    if (success) setEditingCategory(undefined);
  };

  const handleSaveGroup = async (data: Omit<CustomisationGroup, 'sortOrder'>) => {
    const existing = customGroups.find(g => g.id === data.id);
    let success: boolean | undefined;
    if (!existing) success = await addCustomGroup(data);
    else success = await updateCustomGroup(data.id, { name: data.name, type: data.type, maxSelect: data.maxSelect, required: data.required, global: data.global, options: data.options });
    if (success) setEditingGroup(undefined);
  };

  const handleMoveCat = async (id: string, dir: 'up' | 'down') => {
    const sorted = [...categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const idx = sorted.findIndex(c => c.id === id);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    await Promise.all([
      updateCategory(sorted[idx].id, { sortOrder: sorted[swapIdx].sortOrder ?? swapIdx }),
      updateCategory(sorted[swapIdx].id, { sortOrder: sorted[idx].sortOrder ?? idx }),
    ]);
  };

  const availableCount = items.filter(i => i.available).length;
  const hiddenCount    = items.filter(i => !i.available).length;
  const maxSortOrder   = categories.reduce((m, c) => Math.max(m, c.sortOrder ?? 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {editingItem !== undefined && (
        <ItemModal item={editingItem} categories={categories} customGroups={customGroups} items={items}
          onSave={handleSaveItem} onClose={() => setEditingItem(undefined)} />
      )}
      {editingCategory !== undefined && (
        <CategoryModal category={editingCategory} maxSortOrder={maxSortOrder}
          onSave={handleSaveCategory} onClose={() => setEditingCategory(undefined)} />
      )}
      {editingGroup !== undefined && (
        <CustomGroupModal group={editingGroup} onSave={handleSaveGroup} onClose={() => setEditingGroup(undefined)} />
      )}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <h3 className="font-bold text-gray-900 text-lg mb-2">Delete Item?</h3>
            <p className="text-gray-500 text-sm mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 border border-gray-200 text-gray-600 font-bold py-3 rounded-xl">Cancel</button>
              <button onClick={async () => { await deleteItem(confirmDelete); setConfirmDelete(null); }} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl">Delete</button>
            </div>
          </div>
        </div>
      )}
      {confirmDeleteCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <h3 className="font-bold text-gray-900 text-lg mb-2">Delete Category?</h3>
            <p className="text-gray-500 text-sm mb-5">Items will remain but won't appear until reassigned.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteCat(null)} className="flex-1 border border-gray-200 text-gray-600 font-bold py-3 rounded-xl">Cancel</button>
              <button onClick={async () => { await deleteCategory(confirmDeleteCat); setConfirmDeleteCat(null); }} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl">Delete</button>
            </div>
          </div>
        </div>
      )}
      {confirmDeleteGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <h3 className="font-bold text-gray-900 text-lg mb-2">Delete Group?</h3>
            <p className="text-gray-500 text-sm mb-5">This will remove the group from all menu items.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteGroup(null)} className="flex-1 border border-gray-200 text-gray-600 font-bold py-3 rounded-xl">Cancel</button>
              <button onClick={async () => { await deleteCustomGroup(confirmDeleteGroup); setConfirmDeleteGroup(null); }} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-[#0f1f3d] px-4 py-4 sticky top-0 z-30 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/kitchen')} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <ChefHat className="w-5 h-5 text-[#f5a623]" />
            <h1 className="text-white font-black text-lg">Menu Management</h1>
          </div>
          {saving && <Loader2 className="w-4 h-4 text-[#f5a623] animate-spin" />}
          {adminTab === 'items' && (
            <button onClick={() => setEditingItem(null)}
              className="flex items-center gap-2 bg-[#f5a623] hover:bg-[#e09615] text-[#0f1f3d] font-bold px-4 py-2 rounded-xl text-sm transition-all">
              <Plus className="w-4 h-4" /> Add Item
            </button>
          )}
          {adminTab === 'categories' && (
            <button onClick={() => setEditingCategory(null)}
              className="flex items-center gap-2 bg-[#f5a623] hover:bg-[#e09615] text-[#0f1f3d] font-bold px-4 py-2 rounded-xl text-sm transition-all">
              <Plus className="w-4 h-4" /> Add Category
            </button>
          )}
          {adminTab === 'customisations' && (
            <button onClick={() => setEditingGroup(null)}
              className="flex items-center gap-2 bg-[#f5a623] hover:bg-[#e09615] text-[#0f1f3d] font-bold px-4 py-2 rounded-xl text-sm transition-all">
              <Plus className="w-4 h-4" /> New Group
            </button>
          )}
          {adminTab === 'staff' && (
            <span className="flex items-center gap-1.5 text-white/50 text-xs">
              <Shield className="w-3.5 h-3.5" /> Invite-only
            </span>
          )}
        </div>
        <div className="max-w-6xl mx-auto mt-3 flex gap-1 overflow-x-auto">
          {([
            ['items', 'Menu Items', ''],
            ['categories', 'Categories', ''],
            ['customisations', 'Customisations', ''],
            ['pages', 'Website', ''],
            ['settings', 'Venue Settings', ''],
            ['staff', 'Staff', ''],
          ] as const).map(([id, label]) => (
            <button key={id} onClick={() => setAdminTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${adminTab === id ? 'bg-[#f5a623] text-[#0f1f3d]' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>
              {id === 'categories' && <Tag className="w-3.5 h-3.5" />}
              {id === 'customisations' && <Settings2 className="w-3.5 h-3.5" />}
              {id === 'pages' && <FileText className="w-3.5 h-3.5" />}
              {id === 'settings' && <Globe className="w-3.5 h-3.5" />}
              {id === 'staff' && <Users className="w-3.5 h-3.5" />}
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-5 space-y-4">

        {/* ── ITEMS TAB ── */}
        {adminTab === 'items' && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center">
                <p className="text-3xl font-black text-[#0f1f3d]">{items.length}</p>
                <p className="text-xs text-gray-500 font-semibold mt-1">Total Items</p>
              </div>
              <div className="bg-green-50 rounded-2xl p-4 border border-green-100 text-center">
                <p className="text-3xl font-black text-green-700">{availableCount}</p>
                <p className="text-xs text-green-600 font-semibold mt-1">Available</p>
              </div>
              <div className="bg-gray-100 rounded-2xl p-4 border border-gray-200 text-center">
                <p className="text-3xl font-black text-gray-500">{hiddenCount}</p>
                <p className="text-xs text-gray-500 font-semibold mt-1">Hidden</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search items…"
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50 focus:border-[#f5a623] bg-white" />
              </div>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50">
                <option value="all">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
              <select value={filterAvail} onChange={e => setFilterAvail(e.target.value as 'all' | 'available' | 'hidden')}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50">
                <option value="all">All Items</option>
                <option value="available">Available only</option>
                <option value="hidden">Hidden only</option>
              </select>
            </div>
            {loading ? <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-[#f5a623] animate-spin" /></div>
            : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 py-12 text-center text-gray-400">
                <Search className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="font-semibold">No items match your filter</p>
              </div>
            ) : (
              (() => {
                const catOrder = [...categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
                const groups: { cat: typeof categories[0]; items: typeof filtered }[] = [];
                catOrder.forEach(cat => {
                  const catItems = filtered.filter(i => i.category === cat.id).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
                  if (catItems.length > 0) groups.push({ cat, items: catItems });
                });
                const knownCatIds = new Set(catOrder.map(c => c.id));
                const uncategorised = filtered.filter(i => !knownCatIds.has(i.category)).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
                if (uncategorised.length > 0) groups.push({ cat: { id: '_', name: 'Uncategorised', icon: '❓', sortOrder: 9999 }, items: uncategorised });
                return (
                  <div className="space-y-3">
                    {groups.map(({ cat, items: groupItems }) => (
                      <div key={cat.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                          <span className="text-lg">{cat.icon}</span>
                          <span className="font-bold text-[#0f1f3d] text-sm">{cat.name}</span>
                          <span className="ml-auto text-xs text-gray-400">{groupItems.length} item{groupItems.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="divide-y divide-gray-50">
                          {groupItems.map((item, idx) => (
                            <div key={item.id} className={`px-4 py-3 flex items-center gap-2 transition-colors ${!item.available ? 'opacity-50 bg-gray-50' : ''}`}>
                              <div className="flex flex-col gap-0.5 flex-shrink-0">
                                <button onClick={() => moveItem(item.id, 'up')} disabled={idx === 0}
                                  className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors">
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => moveItem(item.id, 'down')} disabled={idx === groupItems.length - 1}
                                  className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors">
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                                {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                                  : <div className="w-full h-full flex items-center justify-center text-lg">{categories.find(c => c.id === item.category)?.icon ?? '🍽️'}</div>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-sm text-gray-900 truncate">{item.name}</span>
                                  {item.featured && <Crown className="w-3 h-3 text-amber-500 fill-amber-500 flex-shrink-0" />}
                                  {item.popular && <Star className="w-3 h-3 text-[#f5a623] fill-[#f5a623] flex-shrink-0" />}
                                  {(item.customGroupIds ?? []).length > 0 && <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{(item.customGroupIds ?? []).length} group{(item.customGroupIds ?? []).length > 1 ? 's' : ''}</span>}
                                  {!item.available && <span className="bg-gray-200 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full">Hidden</span>}
                                </div>
                                <p className="text-xs text-gray-400 truncate">{item.description}</p>
                              </div>
                              <span className="font-black text-[#0f1f3d] text-base flex-shrink-0">{formatPrice(item.price)}</span>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <button onClick={() => toggleItem(item.id, !item.available)}
                                  className={`p-2 rounded-xl transition-all ${item.available ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                                  {item.available ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                </button>
                                <button onClick={() => setEditingItem(item)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-all">
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => setConfirmDelete(item.id)} className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl transition-all">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
          </>
        )}

        {/* ── CATEGORIES TAB ── */}
        {adminTab === 'categories' && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 flex items-start gap-3 text-sm">
              <span className="text-lg flex-shrink-0">🖨️</span>
              <div>
                <p className="font-bold text-blue-900">Kitchen Print Copies</p>
                <p className="text-xs text-blue-700 mt-0.5">Set how many times items in each category print on the kitchen receipt. Set to 2 for stations that need a duplicate.</p>
              </div>
            </div>
            {loading ? <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-[#f5a623] animate-spin" /></div>
            : (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h2 className="font-bold text-[#0f1f3d] text-sm">{categories.length} categories</h2>
                </div>
                {categories.length === 0 ? (
                  <div className="py-12 text-center text-gray-400">
                    <Tag className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold">No categories yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {[...categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map((cat, idx, arr) => (
                      <div key={cat.id} className={`px-4 py-3 flex items-center gap-3 ${!cat.available ? 'opacity-50 bg-gray-50' : ''}`}>
                        <div className="flex flex-col gap-0.5 flex-shrink-0">
                          <button onClick={() => handleMoveCat(cat.id, 'up')} disabled={idx === 0}
                            className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors">
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleMoveCat(cat.id, 'down')} disabled={idx === arr.length - 1}
                            className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors">
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">{cat.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-gray-900">{cat.name}</span>
                            {!cat.available && <span className="bg-gray-200 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full">Hidden</span>}
                          </div>
                          <p className="text-xs text-gray-400">
                            {items.filter(i => i.category === cat.id).length} items · {items.filter(i => i.category === cat.id && i.available).length} available
                            {cat.modifierOnly ? ' · Modifier only' : ''}
                          </p>
                        </div>
                        <div className="flex-shrink-0 hidden sm:flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">🖨️ Prints</span>
                          <select value={cat.printCopies ?? 1} onChange={e => updateCategory(cat.id, { printCopies: Number(e.target.value) })}
                            className="border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold text-[#0f1f3d] bg-white focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50 cursor-pointer">
                            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button onClick={() => toggleCategory(cat.id, !cat.available)}
                            className={`p-2 rounded-xl transition-all ${cat.available ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                            {cat.available ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          <button onClick={() => setEditingCategory(cat)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-all">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setConfirmDeleteCat(cat.id)} className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── CUSTOMISATIONS TAB ── */}
        {adminTab === 'customisations' && (
          <>
            <div className="bg-purple-50 border border-purple-200 rounded-2xl px-4 py-3 text-sm text-purple-800">
              <strong>Customisation Groups</strong> let you ask customers questions when adding items.
            </div>
            <SaltVinegarEditor />
            <SmartPrepTimeEditor />
            {loading ? <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-[#f5a623] animate-spin" /></div>
            : customGroups.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 py-16 flex flex-col items-center gap-3 text-center px-4">
                <Settings2 className="w-12 h-12 text-gray-300" />
                <p className="font-bold text-gray-500">No customisation groups yet</p>
                <button onClick={() => setEditingGroup(null)}
                  className="mt-2 bg-[#f5a623] hover:bg-[#e09615] text-[#0f1f3d] font-bold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all">
                  <Plus className="w-4 h-4" /> Create First Group
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {customGroups.map(group => {
                  const linkedItems = items.filter(i => (i.customGroupIds ?? []).includes(group.id));
                  const isExpanded = expandedGroupItems === group.id;
                  const toggleItemLink = async (item: MenuItem) => {
                    const current = item.customGroupIds ?? [];
                    const next = current.includes(group.id) ? current.filter(id => id !== group.id) : [...current, group.id];
                    await updateItem(item.id, { customGroupIds: next });
                  };
                  const visibleCategories = categories.filter(c => !c.modifierOnly);
                  const searchLower = groupItemSearch.toLowerCase();
                  const filteredForPicker = items.filter(i =>
                    !categories.find(c => c.id === i.category)?.modifierOnly &&
                    (!groupItemSearch || i.name.toLowerCase().includes(searchLower))
                  );
                  return (
                    <div key={group.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                      <div className="px-4 py-3 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                          <Settings2 className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-gray-900">{group.name}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${group.type === 'single' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                              {group.type === 'single' ? 'Single choice' : `Multi max ${group.maxSelect}`}
                            </span>
                            {group.required && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Required</span>}
                            {group.global && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">🌐 All items</span>}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{group.options.length} options · {group.global ? 'shown on all items' : `linked to ${linkedItems.length} item${linkedItems.length !== 1 ? 's' : ''}`}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {group.options.slice(0, 6).map(opt => <span key={opt} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{opt}</span>)}
                            {group.options.length > 6 && <span className="text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">+{group.options.length - 6} more</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button onClick={() => setEditingGroup(group)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-all"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => setConfirmDeleteGroup(group.id)} className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <div className="px-4 pb-3 border-t border-gray-50 pt-2.5">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Linked items</p>
                          <button onClick={() => { setExpandedGroupItems(isExpanded ? null : group.id); setGroupItemSearch(''); }}
                            className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all ${isExpanded ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                            {isExpanded ? <><X className="w-3 h-3" /> Done</> : <><Plus className="w-3 h-3" /> Manage items</>}
                          </button>
                        </div>
                        {group.global ? (
                          <p className="text-[11px] text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 font-semibold">🌐 Shown on every item automatically.</p>
                        ) : linkedItems.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {linkedItems.map(i => (
                              <button key={i.id} onClick={() => toggleItemLink(i)}
                                className="group flex items-center gap-1 text-[11px] bg-purple-50 hover:bg-red-50 text-purple-700 hover:text-red-600 border border-purple-200 hover:border-red-300 font-semibold px-2 py-0.5 rounded-full transition-all">
                                {i.name}<X className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100" />
                              </button>
                            ))}
                          </div>
                        ) : <p className="text-[11px] text-gray-400 italic">No items linked yet.</p>}
                        {isExpanded && (
                          <div className="mt-3 border border-purple-200 rounded-xl overflow-hidden">
                            <div className="bg-purple-50 px-3 py-2 border-b border-purple-100">
                              <p className="text-xs font-bold text-purple-800 mb-1.5">Toggle to link / unlink from <em>{group.name}</em></p>
                              <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-purple-400" />
                                <input type="text" value={groupItemSearch} onChange={e => setGroupItemSearch(e.target.value)} placeholder="Search items…"
                                  className="w-full pl-8 pr-3 py-1.5 border border-purple-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-300" />
                              </div>
                            </div>
                            <div className="max-h-72 overflow-y-auto bg-white divide-y divide-gray-50">
                              {visibleCategories.map(cat => {
                                const catItems = filteredForPicker.filter(i => i.category === cat.id);
                                if (catItems.length === 0) return null;
                                return (
                                  <div key={cat.id}>
                                    <div className="px-3 py-1.5 bg-gray-50 sticky top-0 z-10">
                                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-wide">{cat.icon} {cat.name}</p>
                                    </div>
                                    {catItems.map(item => {
                                      const linked = (item.customGroupIds ?? []).includes(group.id);
                                      return (
                                        <label key={item.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-purple-50 transition-colors">
                                          <div onClick={() => toggleItemLink(item)}
                                            className={`w-10 h-5 rounded-full transition-all relative flex-shrink-0 ${linked ? 'bg-purple-600' : 'bg-gray-200'}`}>
                                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${linked ? 'left-5' : 'left-0.5'}`} />
                                          </div>
                                          <p className={`text-xs font-semibold truncate flex-1 ${linked ? 'text-purple-800' : 'text-gray-700'}`}>{item.name}</p>
                                          {linked && <span className="text-[9px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">Linked</span>}
                                        </label>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                              {filteredForPicker.length === 0 && <div className="py-6 text-center text-gray-400 text-xs">No items match</div>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── SETTINGS TAB ── */}
        {adminTab === 'settings' && <VenueSettings />}

        {/* ── WEBSITE PAGES TAB ── */}
        {adminTab === 'pages' && <WebsitePages />}

        {/* ── STAFF TAB ── */}
        {adminTab === 'staff' && <StaffManager />}
      </div>
    </div>
  );
}
