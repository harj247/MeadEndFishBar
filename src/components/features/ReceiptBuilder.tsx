/**
 * ReceiptBuilder — per-field receipt configuration with live 80mm preview.
 *
 * Architecture:
 *   ReceiptConfig → buildReceiptLines() → browser print / ESC/POS / live preview
 *
 * Every field in every section is independently configurable:
 *   enabled · drag-drop order · font size · font weight · alignment · uppercase · spacing
 *
 * The live preview and Print Test Receipt use EXACTLY the same buildReceiptLines()
 * function as real kitchen orders — one renderer, no parallel paths.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Save, Printer, RotateCcw, GripVertical, ChevronDown, ChevronRight,
  Loader2, Check,
} from 'lucide-react';
import { useVenueConfig } from '@/hooks/useVenueConfig';
import { getVenueConfig } from '@/lib/venueConfig';
import {
  ReceiptConfig, ReceiptField,
  FieldFontSize, FieldFontWeight, FieldAlign, FieldSpacing,
  DEFAULT_RECEIPT_CONFIG, mergeReceiptConfig,
  ORDER_INFO_FIELD_DEFS, CUSTOMER_INFO_FIELD_DEFS,
} from '@/lib/receiptConfig';
import { buildReceiptLines, lineToCSS } from '@/lib/printer';
import type { ReceiptLine } from '@/lib/printer';
import { Order } from '@/types';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────
// Sample order for preview / test print
// ─────────────────────────────────────────────────────────────────────────────

function makeSampleOrder(): Order {
  const now = new Date();
  const createdAt = new Date(now.getTime() - 22 * 60_000).toISOString();
  return {
    id:            'preview-order',
    orderNumber:   '142',
    customerName:  'Sarah Johnson',
    customerPhone: '07700 900123',
    customerEmail: 'sarah@example.com',
    notes:         'Extra sauce please',
    status:        'accepted',
    createdAt,
    estimatedReady: new Date(now.getTime() + 8 * 60_000).toISOString(),
    prepTime:       '30',
    subtotal:       11.90,
    total:          11.90,
    items: [
      { id: '1', menuItemId: 'cod-large', name: 'Cod (Large)', price: 7.50, quantity: 1, notes: 'Salt & Vinegar · Battered' },
      { id: '2', menuItemId: 'chips',     name: 'Chips',       price: 2.20, quantity: 1 },
      { id: '3', menuItemId: 'cola',      name: 'Pepsi Can',   price: 1.10, quantity: 2 },
      { id: '4', menuItemId: 'sauce',     name: 'Mushy Peas',  price: 1.00, quantity: 1 },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Controlled option sets for 80mm thermal
// ─────────────────────────────────────────────────────────────────────────────

const FONT_SIZES: { value: FieldFontSize; label: string }[] = [
  { value: 'small',  label: 'Small'  },
  { value: 'normal', label: 'Normal' },
  { value: 'large',  label: 'Large'  },
  { value: 'xlarge', label: 'XL'     },
];

const FONT_WEIGHTS: { value: FieldFontWeight; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'medium', label: 'Medium' },
  { value: 'bold',   label: 'Bold'   },
];

const ALIGNMENTS: { value: FieldAlign; label: string; icon: string }[] = [
  { value: 'left',   label: 'Left',   icon: '⬛▫▫' },
  { value: 'center', label: 'Centre', icon: '▫⬛▫' },
  { value: 'right',  label: 'Right',  icon: '▫▫⬛' },
];

const SPACINGS: { value: FieldSpacing; label: string }[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'normal',  label: 'Normal'  },
  { value: 'large',   label: 'Large'   },
];

// ─────────────────────────────────────────────────────────────────────────────
// Toggle component
// ─────────────────────────────────────────────────────────────────────────────

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      role="switch" aria-checked={on} onClick={onToggle}
      className={`flex-shrink-0 w-10 h-5 rounded-full transition-colors cursor-pointer relative ${on ? 'bg-[#f5a623]' : 'bg-gray-200'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${on ? 'left-5' : 'left-0.5'}`} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pill button group
// ─────────────────────────────────────────────────────────────────────────────

function PillGroup<T extends string>({
  value, options, onChange, small,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  small?: boolean;
}) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
      {options.map(o => (
        <button
          key={o.value} type="button" onClick={() => onChange(o.value)}
          className={`px-2 ${small ? 'py-1 text-[10px]' : 'py-1.5 text-[11px]'} font-semibold transition-colors ${
            value === o.value
              ? 'bg-[#0f1f3d] text-white'
              : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-field style editor (inline row)
// ─────────────────────────────────────────────────────────────────────────────

function FieldStyleControls({
  field, onChange,
}: {
  field: ReceiptField;
  onChange: (patch: Partial<ReceiptField>) => void;
}) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-1.5 pl-1">
      {/* Size + Weight */}
      <div>
        <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Size</p>
        <PillGroup<FieldFontSize>
          small value={field.fontSize ?? 'normal'} options={FONT_SIZES}
          onChange={v => onChange({ fontSize: v })} />
      </div>
      <div>
        <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Weight</p>
        <PillGroup<FieldFontWeight>
          small value={field.fontWeight ?? 'normal'} options={FONT_WEIGHTS}
          onChange={v => onChange({ fontWeight: v })} />
      </div>
      {/* Alignment + Spacing */}
      <div>
        <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Align</p>
        <PillGroup<FieldAlign>
          small value={field.align ?? 'left'}
          options={[
            { value: 'left',   label: '⬅' },
            { value: 'center', label: '↔' },
            { value: 'right',  label: '➡' },
          ]}
          onChange={v => onChange({ align: v })} />
      </div>
      <div>
        <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Spacing</p>
        <PillGroup<FieldSpacing>
          small value={field.spacing ?? 'normal'} options={SPACINGS}
          onChange={v => onChange({ spacing: v })} />
      </div>
      {/* Uppercase */}
      <div className="col-span-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <Toggle on={field.uppercase ?? false} onToggle={() => onChange({ uppercase: !(field.uppercase ?? false) })} />
          <span className="text-[11px] font-semibold text-gray-600">UPPERCASE</span>
        </label>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Single field row — enable/disable + expand for style controls
// ─────────────────────────────────────────────────────────────────────────────

function FieldRow({
  field, label, hint,
  onChange, dragHandleProps,
  isDragging,
}: {
  field: ReceiptField;
  label: string;
  hint: string;
  onChange: (patch: Partial<ReceiptField>) => void;
  dragHandleProps?: React.PointerEventHandler<HTMLButtonElement>;
  isDragging?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`rounded-xl border transition-all ${
      isDragging ? 'opacity-30 bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-100'
    }`}>
      <div className="flex items-center gap-1.5 px-2 py-2">
        {/* Drag handle */}
        <button
          type="button"
          onPointerDown={dragHandleProps}
          className="flex-shrink-0 p-1.5 cursor-grab active:cursor-grabbing text-gray-300 hover:text-[#f5a623] transition-colors touch-none"
          style={{ touchAction: 'none' }}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>

        {/* Label + hint */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => field.enabled && setOpen(o => !o)}
        >
          <p className="text-xs font-semibold text-gray-800 leading-tight">{label}</p>
          <p className="text-[10px] text-gray-400 leading-tight truncate">{hint}</p>
        </div>

        {/* Expand arrow (only when enabled) */}
        {field.enabled && (
          <button
            type="button" onClick={() => setOpen(o => !o)}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600"
          >
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Toggle */}
        <Toggle
          on={field.enabled}
          onToggle={() => { onChange({ enabled: !field.enabled }); if (field.enabled) setOpen(false); }}
        />
      </div>

      {/* Style controls — expanded */}
      {open && field.enabled && (
        <div className="px-3 pb-3 border-t border-gray-100 pt-2">
          <FieldStyleControls field={field} onChange={onChange} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Draggable field list — working mouse + touch drag-and-drop
// ─────────────────────────────────────────────────────────────────────────────

function DraggableFieldList({
  fields, defs, onChange,
}: {
  fields: ReceiptField[];
  defs:   { key: string; label: string; hint: string }[];
  onChange: (fields: ReceiptField[]) => void;
}) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const draggingKey   = useRef<string | null>(null);
  const dropIdxRef    = useRef<number>(-1);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dropAt,  setDropAt]  = useState<number>(-1);

  // Merge saved fields with defs, preserving order
  const ordered: ReceiptField[] = (() => {
    const result: ReceiptField[] = [...fields];
    for (const def of defs) {
      if (!result.find(f => f.key === def.key))
        result.push({ key: def.key, enabled: false, fontSize: 'normal', fontWeight: 'normal', align: 'left', uppercase: false, spacing: 'normal' });
    }
    return result.filter(f => defs.find(d => d.key === f.key));
  })();

  const getRowMids = () => {
    if (!containerRef.current) return [];
    return Array.from(containerRef.current.querySelectorAll<HTMLElement>('[data-field-key]')).map(el => ({
      key:  el.dataset.fieldKey!,
      midY: el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2,
    }));
  };

  const calcDropIdx = (clientY: number, srcKey: string) => {
    const mids = getRowMids().filter(m => m.key !== srcKey);
    for (let i = 0; i < mids.length; i++) { if (clientY < mids[i].midY) return i; }
    return mids.length;
  };

  const applyDrop = useCallback((srcKey: string, di: number) => {
    const without = ordered.filter(f => f.key !== srcKey);
    const clamped = Math.max(0, Math.min(di, without.length));
    const src     = ordered.find(f => f.key === srcKey)!;
    onChange([...without.slice(0, clamped), src, ...without.slice(clamped)]);
  }, [ordered, onChange]);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>, key: string) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    try { (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId); } catch { /* ignore */ }
    draggingKey.current = key;
    dropIdxRef.current  = -1;
    setDragKey(key);
    setDropAt(-1);
  };

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingKey.current) return;
    e.preventDefault();
    const di = calcDropIdx(e.clientY, draggingKey.current);
    dropIdxRef.current = di;
    setDropAt(di);
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingKey.current) return;
    const di = dropIdxRef.current >= 0 ? dropIdxRef.current : calcDropIdx(e.clientY, draggingKey.current);
    applyDrop(draggingKey.current, di);
    draggingKey.current = null;
    setDragKey(null);
    setDropAt(-1);
  }, [applyDrop]);

  const handlePointerCancel = useCallback(() => {
    draggingKey.current = null;
    setDragKey(null);
    setDropAt(-1);
  }, []);

  const updateField = (key: string, patch: Partial<ReceiptField>) =>
    onChange(ordered.map(f => f.key === key ? { ...f, ...patch } : f));

  // Build render list with drop indicators
  type Entry = { type: 'field'; field: ReceiptField } | { type: 'indicator' };
  const entries: Entry[] = [];
  if (dragKey !== null) {
    const remaining = ordered.filter(f => f.key !== dragKey);
    for (let i = 0; i <= remaining.length; i++) {
      if (dropAt === i) entries.push({ type: 'indicator' });
      if (i < remaining.length) entries.push({ type: 'field', field: remaining[i] });
    }
  } else {
    ordered.forEach(f => entries.push({ type: 'field', field: f }));
  }

  return (
    <div
      ref={containerRef}
      onPointerMove={dragKey !== null ? handlePointerMove : undefined}
      onPointerUp={dragKey !== null ? handlePointerUp : undefined}
      onPointerCancel={dragKey !== null ? handlePointerCancel : undefined}
      className="space-y-1.5 select-none"
      style={{ touchAction: dragKey !== null ? 'none' : undefined }}
    >
      {entries.map((entry, idx) => {
        if (entry.type === 'indicator') {
          return (
            <div key={`ind-${idx}`}
              className="h-1 rounded-full mx-3"
              style={{ background: '#f5a623' }} />
          );
        }
        const { field } = entry;
        const def = defs.find(d => d.key === field.key);
        if (!def) return null;
        return (
          <div key={field.key} data-field-key={field.key}>
            <FieldRow
              field={field}
              label={def.label}
              hint={def.hint}
              onChange={patch => updateField(field.key, patch)}
              dragHandleProps={e => handlePointerDown(e, field.key)}
              isDragging={dragKey === field.key}
            />
          </div>
        );
      })}

      {/* Ghost: dragged field follows cursor conceptually — shown at bottom */}
      {dragKey !== null && (() => {
        const f   = ordered.find(f => f.key === dragKey);
        const def = defs.find(d => d.key === dragKey);
        if (!f || !def) return null;
        return (
          <div className="rounded-xl border border-[#f5a623] bg-amber-50 flex items-center gap-1.5 px-2 py-2 opacity-80 pointer-events-none">
            <GripVertical className="w-3.5 h-3.5 text-[#f5a623]" />
            <p className="text-xs font-semibold text-[#0f1f3d]">{def.label}</p>
          </div>
        );
      })()}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Collapsible section wrapper
// ─────────────────────────────────────────────────────────────────────────────

function Section({
  title, icon, enabled, onToggleEnabled, defaultOpen = true, children,
}: {
  title: string; icon: React.ReactNode;
  enabled: boolean; onToggleEnabled: () => void;
  defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="w-8 h-8 rounded-lg bg-[#0f1f3d]/5 flex items-center justify-center flex-shrink-0 text-[#0f1f3d]">
          {icon}
        </div>
        <span className="flex-1 font-bold text-sm text-[#0f1f3d]">{title}</span>
        <div onClick={e => { e.stopPropagation(); onToggleEnabled(); }} className="flex-shrink-0">
          <Toggle on={enabled} onToggle={onToggleEnabled} />
        </div>
        <div className="flex-shrink-0 text-gray-400 ml-1">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </div>
      {open && enabled && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-50 space-y-3">
          {children}
        </div>
      )}
      {open && !enabled && (
        <div className="px-4 py-3 border-t border-gray-50">
          <p className="text-xs text-gray-400 italic">This section is disabled and will not appear on the receipt.</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Live 80mm receipt preview
// Uses buildReceiptLines() directly — same function as physical printing.
// ─────────────────────────────────────────────────────────────────────────────

function ReceiptPreview({ config }: { config: ReceiptConfig }) {
  const lines: ReceiptLine[] = buildReceiptLines(makeSampleOrder(), config);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="bg-[#0f1f3d] px-4 py-2.5 flex items-center gap-2">
        <Printer className="w-4 h-4 text-[#f5a623]" />
        <span className="text-white font-bold text-sm">80mm Receipt Preview</span>
        <span className="ml-auto text-white/40 text-[11px]">Live</span>
      </div>
      <div className="overflow-x-auto bg-[#faf9f7]">
        {/* Simulated thermal paper */}
        <div
          className="mx-auto bg-white shadow-[2px_0_4px_rgba(0,0,0,0.08),-2px_0_4px_rgba(0,0,0,0.08)]"
          style={{ width: '72mm', minHeight: '80mm', padding: '3mm 2mm', fontFamily: "'Courier New', monospace" }}
        >
          {lines.map((line, idx) => {
            const css = lineToCSS(line);
            return (
              <div
                key={idx}
                style={{
                  fontFamily:  "'Courier New', monospace",
                  fontSize:    css.fontSize,
                  fontWeight:  css.fontWeight,
                  lineHeight:  css.lineHeight,
                  color:       '#000',
                  whiteSpace:  'pre',
                  // align is baked into the padded text — Courier pre formatting handles it
                }}
              >
                {line.text || '\u00a0'}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Simple inline field style row (for non-draggable single fields)
// ─────────────────────────────────────────────────────────────────────────────

function SimpleFieldRow({
  label, hint, field, onChange,
}: {
  label: string; hint: string;
  field: ReceiptField;
  onChange: (patch: Partial<ReceiptField>) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => field.enabled && setOpen(o => !o)}>
          <p className="text-xs font-semibold text-gray-800">{label}</p>
          <p className="text-[10px] text-gray-400">{hint}</p>
        </div>
        {field.enabled && (
          <button type="button" onClick={() => setOpen(o => !o)} className="p-1 text-gray-400">
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        )}
        <Toggle on={field.enabled} onToggle={() => { onChange({ enabled: !field.enabled }); if (field.enabled) setOpen(false); }} />
      </div>
      {open && field.enabled && (
        <div className="px-3 pb-3 border-t border-gray-100 pt-2">
          <FieldStyleControls field={field} onChange={onChange} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Receipt Builder component
// ─────────────────────────────────────────────────────────────────────────────

export default function ReceiptBuilder() {
  const { config: venueConfig, save, saving } = useVenueConfig();
  const [cfg, setCfg]           = useState<ReceiptConfig>(() => mergeReceiptConfig(venueConfig.receiptConfig ?? null));
  const [dirty, setDirty]       = useState(false);
  const [printing, setPrinting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Sync when venueConfig arrives from DB
  useEffect(() => {
    if (venueConfig.receiptConfig) {
      setCfg(mergeReceiptConfig(venueConfig.receiptConfig));
      setDirty(false);
    }
  }, [venueConfig.receiptConfig]);

  const update = useCallback((patch: Partial<ReceiptConfig>) => {
    setCfg(prev => ({ ...prev, ...patch }));
    setDirty(true);
  }, []);

  // ── Shorthand section updaters ──────────────────────────────────────────
  const setHeader       = (p: Partial<ReceiptConfig['header']>)       => update({ header:       { ...cfg.header,       ...p } });
  const setOrderInfo    = (p: Partial<ReceiptConfig['orderInfo']>)    => update({ orderInfo:    { ...cfg.orderInfo,    ...p } });
  const setCustomerInfo = (p: Partial<ReceiptConfig['customerInfo']>) => update({ customerInfo: { ...cfg.customerInfo, ...p } });
  const setOrderItems   = (p: Partial<ReceiptConfig['orderItems']>)   => update({ orderItems:   { ...cfg.orderItems,   ...p } });
  const setTotals       = (p: Partial<ReceiptConfig['totals']>)       => update({ totals:       { ...cfg.totals,       ...p } });
  const setFooter       = (p: Partial<ReceiptConfig['footer']>)       => update({ footer:       { ...cfg.footer,       ...p } });

  // ── Save ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const ok = await save({ ...venueConfig, receiptConfig: cfg });
    if (ok) setDirty(false);
  };

  // ── Reset ───────────────────────────────────────────────────────────────
  const handleReset = () => {
    setCfg(mergeReceiptConfig(null));
    setDirty(true);
    setConfirmReset(false);
    toast.success('Receipt reset to default');
  };

  // ── Test print — uses identical path to real kitchen orders ─────────────
  const handleTestPrint = async () => {
    setPrinting(true);
    try {
      const { printViaBrowser } = await import('@/lib/printer');
      await printViaBrowser(makeSampleOrder(), cfg);
      toast.success('Test receipt sent to printer');
    } catch (e) {
      toast.error('Print failed: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setPrinting(false);
    }
  };

  const vc = getVenueConfig();

  // ── Header sub-fields helper ─────────────────────────────────────────────
  const headerSubFields: { key: keyof ReceiptConfig['header']; showKey: keyof ReceiptConfig['header']; label: string; hint: string }[] = [
    { key: 'businessNameField', showKey: 'showBusinessName', label: 'Business Name', hint: vc.businessName || 'From venue settings' },
    { key: 'addressField',      showKey: 'showAddress',      label: 'Address',       hint: [vc.address, vc.city, vc.postcode].filter(Boolean).join(', ') || 'From venue settings' },
    { key: 'phoneField',        showKey: 'showPhone',        label: 'Phone Number',  hint: vc.phone || 'From venue settings' },
    { key: 'websiteField',      showKey: 'showWebsite',      label: 'Website',       hint: cfg.header.websiteUrl || 'Enter URL below' },
    { key: 'customTextField',   showKey: 'showWebsite',      label: 'Custom Text',   hint: cfg.header.customHeaderText || 'Custom header text' },
  ];

  return (
    <div className="space-y-4">

      {/* ── Reset confirmation ─────────────────────────────────────────── */}
      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <RotateCcw className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Reset to Default?</h3>
                <p className="text-xs text-gray-500 mt-0.5">Restores standard compact receipt layout.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">All custom styling and field order will be replaced. Cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmReset(false)}
                className="flex-1 border border-gray-200 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50 text-sm">
                Cancel
              </button>
              <button onClick={handleReset}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" /> Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Top action bar ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h2 className="font-black text-[#0f1f3d] text-lg">Receipt Builder</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Every field is independently configurable. Changes apply to browser printing and thermal ESC/POS.
          </p>
        </div>
        <button onClick={() => setConfirmReset(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-2 rounded-xl hover:bg-gray-50 transition-all">
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
        <button onClick={handleTestPrint} disabled={printing}
          className="flex items-center gap-1.5 bg-[#0f1f3d] hover:bg-[#1a2f5a] disabled:opacity-60 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all">
          {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
          Print Test
        </button>
        <button onClick={handleSave} disabled={!dirty || saving}
          className="flex items-center gap-1.5 bg-[#f5a623] hover:bg-[#e09615] disabled:opacity-50 text-[#0f1f3d] font-bold px-5 py-2 rounded-xl text-sm transition-all">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : dirty ? <Save className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
        </button>
      </div>

      {/* ── Two-panel layout ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5 items-start">

        {/* ──── LEFT: Configuration ───────────────────────────────────────── */}
        <div className="space-y-3">

          {/* ── HEADER ─────────────────────────────────────────────────────── */}
          <Section
            title="Header" icon={<span className="text-sm">🏪</span>}
            enabled={cfg.header.enabled}
            onToggleEnabled={() => setHeader({ enabled: !cfg.header.enabled })}
          >
            <p className="text-[11px] text-gray-500 mb-2">
              Expand each field to configure size, weight, alignment, uppercase and spacing.
              Drag is not available for header fields — they always print in order.
            </p>
            <div className="space-y-1.5">
              {/* Business Name */}
              <SimpleFieldRow
                label="Business Name" hint={vc.businessName || 'From venue settings'}
                field={cfg.header.businessNameField}
                onChange={p => setHeader({ showBusinessName: p.enabled ?? cfg.header.showBusinessName, businessNameField: { ...cfg.header.businessNameField, ...p } })}
              />
              {/* Address */}
              <SimpleFieldRow
                label="Address" hint={[vc.address, vc.city, vc.postcode].filter(Boolean).join(', ') || 'From venue settings'}
                field={cfg.header.addressField}
                onChange={p => setHeader({ showAddress: p.enabled ?? cfg.header.showAddress, addressField: { ...cfg.header.addressField, ...p } })}
              />
              {/* Phone */}
              <SimpleFieldRow
                label="Phone Number" hint={vc.phone || 'From venue settings'}
                field={cfg.header.phoneField}
                onChange={p => setHeader({ showPhone: p.enabled ?? cfg.header.showPhone, phoneField: { ...cfg.header.phoneField, ...p } })}
              />
              {/* Website */}
              <SimpleFieldRow
                label="Website" hint={cfg.header.websiteUrl || 'Enter URL below'}
                field={cfg.header.websiteField}
                onChange={p => setHeader({ showWebsite: p.enabled ?? cfg.header.showWebsite, websiteField: { ...cfg.header.websiteField, ...p } })}
              />
              {cfg.header.showWebsite && (
                <input type="url" value={cfg.header.websiteUrl}
                  onChange={e => setHeader({ websiteUrl: e.target.value })}
                  placeholder="https://www.yoursite.com"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50" />
              )}
              {/* Custom header text */}
              <SimpleFieldRow
                label="Custom Header Text" hint="Optional — shown after address"
                field={cfg.header.customTextField}
                onChange={p => setHeader({ customTextField: { ...cfg.header.customTextField, ...p } })}
              />
              {cfg.header.customTextField.enabled && (
                <textarea
                  value={cfg.header.customHeaderText}
                  onChange={e => setHeader({ customHeaderText: e.target.value })}
                  rows={2} placeholder="e.g. Open 7 days a week"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50 resize-none" />
              )}
            </div>
          </Section>

          {/* ── ORDER INFORMATION ───────────────────────────────────────────── */}
          <Section
            title="Order Information" icon={<span className="text-sm">📋</span>}
            enabled={cfg.orderInfo.enabled}
            onToggleEnabled={() => setOrderInfo({ enabled: !cfg.orderInfo.enabled })}
          >
            <p className="text-[11px] text-gray-500">
              Drag to reorder. Expand any field to configure styling.
              Collection Time always uses estimatedReady (order time + kitchen prep) — the calculation is unchanged.
            </p>
            <DraggableFieldList
              fields={cfg.orderInfo.fields}
              defs={ORDER_INFO_FIELD_DEFS}
              onChange={fields => setOrderInfo({ fields })}
            />
          </Section>

          {/* ── CUSTOMER INFORMATION ────────────────────────────────────────── */}
          <Section
            title="Customer Information" icon={<span className="text-sm">👤</span>}
            enabled={cfg.customerInfo.enabled}
            onToggleEnabled={() => setCustomerInfo({ enabled: !cfg.customerInfo.enabled })}
          >
            <p className="text-[11px] text-gray-500">
              Drag to reorder. Delivery Address only prints on delivery orders.
            </p>
            <DraggableFieldList
              fields={cfg.customerInfo.fields}
              defs={CUSTOMER_INFO_FIELD_DEFS}
              onChange={fields => setCustomerInfo({ fields })}
            />
          </Section>

          {/* ── ORDER ITEMS ─────────────────────────────────────────────────── */}
          <Section
            title="Order Items" icon={<span className="text-sm">🍽️</span>}
            enabled={cfg.orderItems.enabled}
            onToggleEnabled={() => setOrderItems({ enabled: !cfg.orderItems.enabled })}
          >
            {/* Show/hide toggles */}
            <div className="space-y-1.5">
              {[
                { k: 'showQuantity',            label: 'Show quantity',          hint: 'e.g. 2x Cod' },
                { k: 'showPrice',               label: 'Show item price',        hint: 'e.g. £7.50' },
                { k: 'showModifiers',           label: 'Show options/modifiers', hint: 'e.g. Salt & Vinegar' },
                { k: 'showSpecialInstructions', label: 'Show special instructions', hint: 'Order-level notes' },
              ].map(({ k, label, hint }) => (
                <label key={k} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-3 py-2.5 cursor-pointer hover:bg-gray-100">
                  <div>
                    <p className="text-xs font-semibold text-gray-800">{label}</p>
                    <p className="text-[10px] text-gray-400">{hint}</p>
                  </div>
                  <Toggle
                    on={cfg.orderItems[k as keyof typeof cfg.orderItems] as boolean}
                    onToggle={() => setOrderItems({ [k]: !cfg.orderItems[k as keyof typeof cfg.orderItems] })}
                  />
                </label>
              ))}
            </div>
            {/* Field styling */}
            <div className="border-t border-gray-100 pt-3 space-y-1.5">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Field Styling</p>
              <SimpleFieldRow
                label="Item Line" hint="Product name + quantity + price"
                field={cfg.orderItems.itemField}
                onChange={p => setOrderItems({ itemField: { ...cfg.orderItems.itemField, ...p, enabled: true } })}
              />
              <SimpleFieldRow
                label="Modifiers / Options" hint="e.g. Salt & Vinegar"
                field={cfg.orderItems.modifierField}
                onChange={p => setOrderItems({ modifierField: { ...cfg.orderItems.modifierField, ...p, enabled: true } })}
              />
              <SimpleFieldRow
                label="Special Instructions" hint="Order notes / special requests"
                field={cfg.orderItems.instructionField}
                onChange={p => setOrderItems({ instructionField: { ...cfg.orderItems.instructionField, ...p, enabled: true } })}
              />
            </div>
          </Section>

          {/* ── TOTALS & PAYMENT ────────────────────────────────────────────── */}
          <Section
            title="Totals & Payment" icon={<span className="text-sm">💷</span>}
            enabled={cfg.totals.enabled}
            onToggleEnabled={() => setTotals({ enabled: !cfg.totals.enabled })}
          >
            <div className="space-y-1.5">
              {/* Show/hide toggles for optional lines */}
              {[
                { k: 'showSubtotal',       label: 'Subtotal',        hint: 'Only when different from total' },
                { k: 'showDeliveryCharge', label: 'Delivery Charge', hint: 'Only on delivery orders when > £0' },
              ].map(({ k, label, hint }) => (
                <label key={k} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-3 py-2.5 cursor-pointer">
                  <div>
                    <p className="text-xs font-semibold text-gray-800">{label}</p>
                    <p className="text-[10px] text-gray-400">{hint}</p>
                  </div>
                  <Toggle on={cfg.totals[k as 'showSubtotal'|'showDeliveryCharge']}
                    onToggle={() => setTotals({ [k]: !cfg.totals[k as 'showSubtotal'|'showDeliveryCharge'] })} />
                </label>
              ))}

              <div className="border-t border-gray-100 pt-2 space-y-1.5">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Field Styling</p>
                {cfg.totals.showSubtotal && (
                  <SimpleFieldRow label="Subtotal Line" hint="Subtotal: £X.XX"
                    field={cfg.totals.subtotalField}
                    onChange={p => setTotals({ subtotalField: { ...cfg.totals.subtotalField, ...p, enabled: true } })} />
                )}
                {cfg.totals.showDeliveryCharge && (
                  <SimpleFieldRow label="Delivery Line" hint="Delivery: £X.XX"
                    field={cfg.totals.deliveryField}
                    onChange={p => setTotals({ deliveryField: { ...cfg.totals.deliveryField, ...p, enabled: true } })} />
                )}

                {/* Total — shown/hidden + independently style label vs amount */}
                <label className="flex items-center justify-between gap-3 bg-blue-50 rounded-xl px-3 py-2.5 cursor-pointer border border-blue-100">
                  <div>
                    <p className="text-xs font-semibold text-blue-900">Total To Pay</p>
                    <p className="text-[10px] text-blue-600">Label and amount are styled independently below</p>
                  </div>
                  <Toggle on={cfg.totals.showTotal} onToggle={() => setTotals({ showTotal: !cfg.totals.showTotal })} />
                </label>
                {cfg.totals.showTotal && (
                  <>
                    <SimpleFieldRow
                      label="'TOTAL TO PAY' Label" hint="The heading line"
                      field={cfg.totals.totalLabelField}
                      onChange={p => setTotals({ totalLabelField: { ...cfg.totals.totalLabelField, ...p, enabled: true } })} />
                    <SimpleFieldRow
                      label="Total Amount (£)" hint="e.g. £16.00 — make this large + bold for prominence"
                      field={cfg.totals.totalAmountField}
                      onChange={p => setTotals({ totalAmountField: { ...cfg.totals.totalAmountField, ...p, enabled: true } })} />
                  </>
                )}

                {/* Payment method */}
                <label className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-3 py-2.5 cursor-pointer">
                  <div>
                    <p className="text-xs font-semibold text-gray-800">Payment Method</p>
                    <p className="text-[10px] text-gray-400">e.g. CASH IN STORE ONLY</p>
                  </div>
                  <Toggle on={cfg.totals.showPaymentMethod} onToggle={() => setTotals({ showPaymentMethod: !cfg.totals.showPaymentMethod })} />
                </label>
                {cfg.totals.showPaymentMethod && (
                  <SimpleFieldRow label="Payment Method Line" hint="Text from venue settings payment info"
                    field={cfg.totals.paymentMethodField}
                    onChange={p => setTotals({ paymentMethodField: { ...cfg.totals.paymentMethodField, ...p, enabled: true } })} />
                )}
              </div>
            </div>
          </Section>

          {/* ── FOOTER ──────────────────────────────────────────────────────── */}
          <Section
            title="Footer" icon={<span className="text-sm">🙏</span>}
            enabled={cfg.footer.enabled}
            onToggleEnabled={() => setFooter({ enabled: !cfg.footer.enabled })}
          >
            <div className="space-y-3">
              {/* Thank you */}
              <SimpleFieldRow label="Thank-you Message" hint={cfg.footer.thankYouMessage || 'Thank you for your order!'}
                field={cfg.footer.thankYouField}
                onChange={p => setFooter({ showThankYou: p.enabled ?? cfg.footer.showThankYou, thankYouField: { ...cfg.footer.thankYouField, ...p } })} />
              {cfg.footer.thankYouField.enabled && (
                <input type="text" value={cfg.footer.thankYouMessage}
                  onChange={e => setFooter({ thankYouMessage: e.target.value })}
                  placeholder="Thank you for your order!"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50" />
              )}
              {/* Website */}
              <SimpleFieldRow label="Website URL" hint={cfg.footer.websiteUrl || 'Enter URL below'}
                field={cfg.footer.footerWebField}
                onChange={p => setFooter({ showWebsite: p.enabled ?? cfg.footer.showWebsite, footerWebField: { ...cfg.footer.footerWebField, ...p } })} />
              {cfg.footer.footerWebField.enabled && (
                <input type="url" value={cfg.footer.websiteUrl}
                  onChange={e => setFooter({ websiteUrl: e.target.value })}
                  placeholder="https://www.yoursite.com"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50" />
              )}
              {/* Promo */}
              <SimpleFieldRow label="Promotional Message" hint="e.g. Follow us on Facebook"
                field={cfg.footer.promoField}
                onChange={p => setFooter({ promoField: { ...cfg.footer.promoField, ...p } })} />
              {cfg.footer.promoField.enabled && (
                <textarea value={cfg.footer.customPromoMessage}
                  onChange={e => setFooter({ customPromoMessage: e.target.value })}
                  rows={2} placeholder="e.g. Follow us on Facebook @MyTakeaway"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50 resize-none" />
              )}
              {/* Loyalty */}
              <SimpleFieldRow label="Loyalty Message" hint="e.g. Collect stamps for free food"
                field={cfg.footer.loyaltyField}
                onChange={p => setFooter({ loyaltyField: { ...cfg.footer.loyaltyField, ...p } })} />
              {cfg.footer.loyaltyField.enabled && (
                <textarea value={cfg.footer.loyaltyMessage}
                  onChange={e => setFooter({ loyaltyMessage: e.target.value })}
                  rows={2} placeholder="e.g. Collect 10 stamps and get a free chips!"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50 resize-none" />
              )}
            </div>
          </Section>

          {/* Bottom save */}
          <button onClick={handleSave} disabled={!dirty || saving}
            className="w-full bg-[#f5a623] hover:bg-[#e09615] disabled:opacity-60 text-[#0f1f3d] font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all text-base sticky bottom-4">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : dirty ? <Save className="w-5 h-5" /> : <Check className="w-5 h-5" />}
            {saving ? 'Saving…' : dirty ? 'Save Receipt Settings' : 'All changes saved'}
          </button>
        </div>

        {/* ──── RIGHT: Live preview ───────────────────────────────────────── */}
        <div className="xl:sticky xl:top-24 space-y-3">
          <ReceiptPreview config={cfg} />
          <p className="text-[11px] text-gray-400 text-center">Preview uses sample data. Updates live as you change settings.</p>
          <button onClick={handleTestPrint} disabled={printing}
            className="w-full flex items-center justify-center gap-2 bg-[#0f1f3d] hover:bg-[#1a2f5a] disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition-all">
            {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            {printing ? 'Printing…' : 'Print Test Receipt'}
          </button>
          <p className="text-[10px] text-gray-400 text-center">Uses the same renderer as real kitchen orders.</p>
        </div>

      </div>
    </div>
  );
}
