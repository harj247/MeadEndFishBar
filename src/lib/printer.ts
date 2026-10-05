// Thermal receipt printer — 80mm / 32-char width
// Supports:
//   A) Browser print (Bluetooth system printer paired via OS, prints via hidden iframe)
//   B) Web Serial ESC/POS (USB thermal printer connected via Chrome/Edge serial API)
//
// buildReceiptLines() is the SINGLE source of truth for receipt content and layout.
// Every ReceiptLine carries its text plus full render metadata — no markers, no
// invisible characters. Both print paths read the same metadata array.

import { Order } from '@/types';
import { formatPrice } from '@/lib/utils';
import { getVenueConfig } from '@/lib/venueConfig';
import {
  ReceiptConfig, ReceiptField,
  FieldFontSize, FieldFontWeight, FieldAlign, FieldSpacing,
  mergeReceiptConfig,
} from '@/lib/receiptConfig';

const AUTO_PRINT_KEY   = 'mead_auto_print';
const PRINT_ON_KEY     = 'mead_print_on';
const PRINTER_IP_KEY   = 'mead_printer_ip';
const PRINTER_TYPE_KEY = 'mead_printer_type';

export interface PrinterConfig {
  ip:          string;
  printerType: 'network' | 'bluetooth';
  autoPrint:   boolean;
  printOn:     'new' | 'accepted';
}

export function getPrinterConfig(): PrinterConfig {
  return {
    ip:          localStorage.getItem(PRINTER_IP_KEY) ?? '',
    printerType: (localStorage.getItem(PRINTER_TYPE_KEY) as 'network' | 'bluetooth') ?? 'network',
    autoPrint:   localStorage.getItem(AUTO_PRINT_KEY) === 'true',
    printOn:     (localStorage.getItem(PRINT_ON_KEY) as 'new' | 'accepted') ?? 'accepted',
  };
}

export function savePrinterConfig(config: PrinterConfig) {
  localStorage.setItem(PRINTER_IP_KEY,   config.ip);
  localStorage.setItem(PRINTER_TYPE_KEY, config.printerType);
  localStorage.setItem(AUTO_PRINT_KEY,   String(config.autoPrint));
  localStorage.setItem(PRINT_ON_KEY,     config.printOn);
}

// ── Layout constants ──────────────────────────────────────────────────────

const W = 32; // printable char width for 80mm @ 12cpi Courier

function padLR(left: string, right: string): string {
  const gap = W - left.length - right.length;
  return left + ' '.repeat(Math.max(1, gap)) + right;
}

function ctr(text: string): string {
  const sp = Math.max(0, Math.floor((W - text.length) / 2));
  return ' '.repeat(sp) + text;
}

function rgt(text: string): string {
  const sp = Math.max(0, W - text.length);
  return ' '.repeat(sp) + text;
}

function div(ch = '-'): string { return ch.repeat(W); }

// ── ReceiptLine type ──────────────────────────────────────────────────────
// Each line carries plain text plus per-field render metadata.
// Both print paths (browser HTML and ESC/POS) read this metadata directly.
// NO string markers used anywhere.

export type LineKind =
  | 'heading'    // business name / section headers
  | 'subheading' // order type banner
  | 'emphasis'   // collection time, important labels
  | 'total-amt'  // total £ amount
  | 'divider'    // separator lines
  | 'normal'     // regular receipt text
  | 'blank';     // intentional vertical space

export interface ReceiptLine {
  text:       string;
  kind:       LineKind;
  // Per-field render properties — from ReceiptConfig
  fontSize:   FieldFontSize;
  fontWeight: FieldFontWeight;
  align:      FieldAlign;
  uppercase:  boolean;
  spacing:    FieldSpacing;
}

// ── Default render props per LineKind ─────────────────────────────────────
// Used when a line is generated without an explicit field config (dividers, blanks).

const KIND_DEFAULTS: Record<LineKind, Pick<ReceiptLine, 'fontSize' | 'fontWeight' | 'align' | 'uppercase' | 'spacing'>> = {
  heading:    { fontSize: 'large',  fontWeight: 'bold',   align: 'center', uppercase: true,  spacing: 'normal' },
  subheading: { fontSize: 'normal', fontWeight: 'bold',   align: 'center', uppercase: true,  spacing: 'normal' },
  emphasis:   { fontSize: 'large',  fontWeight: 'bold',   align: 'left',   uppercase: true,  spacing: 'normal' },
  'total-amt':{ fontSize: 'xlarge', fontWeight: 'bold',   align: 'center', uppercase: false, spacing: 'normal' },
  divider:    { fontSize: 'normal', fontWeight: 'medium', align: 'left',   uppercase: false, spacing: 'compact' },
  normal:     { fontSize: 'normal', fontWeight: 'normal', align: 'left',   uppercase: false, spacing: 'normal' },
  blank:      { fontSize: 'small',  fontWeight: 'normal', align: 'left',   uppercase: false, spacing: 'compact' },
};

// ── Field → ReceiptLine render props extractor ───────────────────────────

function fieldProps(field: ReceiptField | undefined, fallbackKind: LineKind): Pick<ReceiptLine, 'fontSize' | 'fontWeight' | 'align' | 'uppercase' | 'spacing'> {
  if (!field) return KIND_DEFAULTS[fallbackKind];
  return {
    fontSize:   field.fontSize   ?? KIND_DEFAULTS[fallbackKind].fontSize,
    fontWeight: field.fontWeight ?? KIND_DEFAULTS[fallbackKind].fontWeight,
    align:      field.align      ?? KIND_DEFAULTS[fallbackKind].align,
    uppercase:  field.uppercase  ?? KIND_DEFAULTS[fallbackKind].uppercase,
    spacing:    field.spacing    ?? KIND_DEFAULTS[fallbackKind].spacing,
  };
}

// ── Collection/delivery time resolver ─────────────────────────────────────
// Formula: estimatedReady (primary) = order.createdAt + kitchen prep minutes
// NEVER uses Date.now(). estimatedReady is set by kitchen at accept time.

export function resolvePickupTime(order: Order): string | null {
  if (order.estimatedReady) {
    const t = new Date(order.estimatedReady);
    if (!isNaN(t.getTime()))
      return t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  if (order.prepTime && /^\d+$/.test(order.prepTime.trim())) {
    const mins = parseInt(order.prepTime.trim(), 10);
    if (!isNaN(mins) && mins > 0) {
      const base = new Date(order.createdAt);
      const t    = new Date(base.getTime() + mins * 60_000);
      console.log(`[resolvePickupTime] ${base.toLocaleTimeString('en-GB')} + ${mins}min = ${t.toLocaleTimeString('en-GB')}`);
      return t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }
  }
  if (order.prepTime && /^\d{1,2}:\d{2}$/.test(order.prepTime.trim()))
    return order.prepTime.trim();
  return null;
}

// ── Apply text transforms ─────────────────────────────────────────────────

function applyText(text: string, field: Pick<ReceiptLine, 'uppercase'>): string {
  return field.uppercase ? text.toUpperCase() : text;
}

function applyAlign(text: string, align: FieldAlign): string {
  if (align === 'center') return ctr(text);
  if (align === 'right')  return rgt(text);
  return text; // left — no padding
}

// ── buildReceiptLines ─────────────────────────────────────────────────────
// Single source of truth for receipt content.
// Returns ReceiptLine[] — used by browser print, ESC/POS, live preview, test print.

export function buildReceiptLines(order: Order, configOverride?: ReceiptConfig): ReceiptLine[] {
  const vc  = getVenueConfig();
  const cfg = configOverride ?? mergeReceiptConfig(vc.receiptConfig ?? null);

  const isDelivery = !!(order.deliveryAddress);
  const pickupTime = resolvePickupTime(order);
  const orderedAt  = new Date(order.createdAt);
  const orderedDate = orderedAt.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const orderedTime = orderedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const L: ReceiptLine[] = [];

  function addLine(text: string, kind: LineKind, props?: Partial<Pick<ReceiptLine, 'fontSize'|'fontWeight'|'align'|'uppercase'|'spacing'>>): void {
    const base = KIND_DEFAULTS[kind];
    L.push({
      text,
      kind,
      fontSize:   props?.fontSize   ?? base.fontSize,
      fontWeight: props?.fontWeight ?? base.fontWeight,
      align:      props?.align      ?? base.align,
      uppercase:  props?.uppercase  ?? base.uppercase,
      spacing:    props?.spacing    ?? base.spacing,
    });
  }

  function addFromField(rawText: string, kind: LineKind, field: ReceiptField | undefined): void {
    if (!field) { addLine(rawText, kind); return; }
    const p = fieldProps(field, kind);
    const finalText = applyAlign(applyText(rawText, p), p.align);
    addLine(finalText, kind, p);
  }

  function blank(spacing: FieldSpacing = 'compact'): void {
    addLine('', 'blank', { spacing });
  }

  function dline(ch = '-'): void {
    addLine(div(ch), 'divider', KIND_DEFAULTS.divider);
  }

  // ── HEADER ──────────────────────────────────────────────────────────────
  if (cfg.header.enabled) {
    blank();
    if (cfg.header.showBusinessName && vc.businessName) {
      const f = cfg.header.businessNameField;
      const p = fieldProps(f, 'heading');
      addLine(applyAlign(applyText(vc.businessName, p), p.align), 'heading', p);
    }
    if (cfg.header.showAddress) {
      const parts = [vc.address, vc.city, vc.postcode].filter(Boolean);
      if (parts.length) {
        const f = cfg.header.addressField;
        const p = fieldProps(f, 'normal');
        const text = applyText(parts.join(', '), p);
        addLine(applyAlign(text, p.align), 'normal', p);
      }
    }
    if (cfg.header.showPhone && vc.phone) {
      const f = cfg.header.phoneField;
      const p = fieldProps(f, 'normal');
      addLine(applyAlign(applyText(vc.phone, p), p.align), 'normal', p);
    }
    if (cfg.header.showWebsite && cfg.header.websiteUrl) {
      const f = cfg.header.websiteField;
      const p = fieldProps(f, 'normal');
      addLine(applyAlign(cfg.header.websiteUrl, p.align), 'normal', p);
    }
    if (cfg.header.customHeaderText) {
      const f = cfg.header.customTextField;
      const p = fieldProps(f, 'normal');
      for (const part of cfg.header.customHeaderText.split('\n'))
        if (part.trim()) addLine(applyAlign(applyText(part.trim(), p), p.align), 'normal', p);
    }
    blank();
  }

  // ── ORDER INFORMATION ────────────────────────────────────────────────────
  if (cfg.orderInfo.enabled) {
    for (const field of cfg.orderInfo.fields) {
      if (!field.enabled) continue;
      const p = fieldProps(field, 'normal');

      switch (field.key) {
        case 'orderType': {
          const raw = isDelivery ? '** DELIVERY ORDER **' : '** COLLECTION ORDER **';
          const text = applyAlign(applyText(raw, p), p.align);
          addLine(text, 'subheading', p);
          dline('=');
          break;
        }
        case 'collectionTime':
          if (pickupTime && !isDelivery) {
            const raw = `COLLECTION TIME: ${pickupTime}`;
            addLine(applyAlign(applyText(raw, p), p.align), 'emphasis', p);
          }
          break;
        case 'deliveryTime':
          if (pickupTime && isDelivery) {
            const raw = `DELIVERY TIME: ${pickupTime}`;
            addLine(applyAlign(applyText(raw, p), p.align), 'emphasis', p);
          }
          break;
        case 'orderNumber':
          if (order.orderNumber) {
            const raw = padLR('ORDER:', order.orderNumber);
            addLine(applyText(raw, p), 'normal', p);
          }
          break;
        case 'orderDate':
          addLine(applyText(padLR('Date:', orderedDate), p), 'normal', p);
          break;
        case 'orderTime':
          addLine(applyText(padLR('Time:', orderedTime), p), 'normal', p);
          break;
      }
    }
    dline();
  }

  // ── CUSTOMER INFORMATION ─────────────────────────────────────────────────
  if (cfg.customerInfo.enabled) {
    let any = false;
    for (const field of cfg.customerInfo.fields) {
      if (!field.enabled) continue;
      const p = fieldProps(field, 'normal');

      switch (field.key) {
        case 'customerName':
          if (order.customerName) {
            addLine(applyText(padLR('Name:', order.customerName), p), 'normal', p);
            any = true;
          }
          break;
        case 'phone':
          if (order.customerPhone) {
            addLine(applyText(padLR('Phone:', order.customerPhone), p), 'normal', p);
            any = true;
          }
          break;
        case 'deliveryAddress':
          if (isDelivery && order.deliveryAddress) {
            const addr = order.deliveryAddress;
            if (addr.length <= W - 9) {
              addLine(applyText(padLR('Address:', addr), p), 'normal', p);
            } else {
              addLine('Address:', 'normal', p);
              let rem = addr;
              while (rem.length > W) { addLine('  ' + rem.slice(0, W - 2), 'normal', p); rem = rem.slice(W - 2); }
              if (rem.trim()) addLine('  ' + rem, 'normal', p);
            }
            any = true;
          }
          break;
      }
    }
    if (any) dline();
  }

  // ── ORDER ITEMS ───────────────────────────────────────────────────────────
  if (cfg.orderItems.enabled) {
    const itemP = fieldProps(cfg.orderItems.itemField, 'normal');
    const modP  = fieldProps(cfg.orderItems.modifierField, 'normal');
    const insP  = fieldProps(cfg.orderItems.instructionField, 'normal');

    for (const item of order.items) {
      const qty  = cfg.orderItems.showQuantity ? `${item.quantity}x ` : '';
      const prc  = cfg.orderItems.showPrice ? formatPrice(item.price * item.quantity) : '';
      const name = `${qty}${item.name}`;

      let rawLine: string;
      if (prc) {
        const gap = W - name.length - prc.length;
        rawLine = gap >= 1 ? (name + ' '.repeat(gap) + prc) : name;
        if (gap < 1) {
          // Name too long — price on next line
          addLine(applyText(name, itemP), 'normal', itemP);
          addLine(applyText(rgt(prc), itemP), 'normal', { ...itemP, align: 'right' });
          rawLine = ''; // already added
        }
      } else {
        rawLine = name;
      }
      if (rawLine) addLine(applyText(rawLine, itemP), 'normal', itemP);

      if (cfg.orderItems.showModifiers && item.notes) {
        for (const seg of item.notes.split(' · ').filter(Boolean)) {
          const modLine = `  ${seg}`;
          if (modLine.length <= W) {
            addLine(applyText(modLine, modP), 'normal', modP);
          } else {
            let rem = modLine;
            while (rem.length > W) { addLine(rem.slice(0, W), 'normal', modP); rem = '    ' + rem.slice(W); }
            if (rem.trim()) addLine(rem, 'normal', modP);
          }
        }
      }
    }

    if (cfg.orderItems.showSpecialInstructions && order.notes) {
      dline();
      const noteText = `NOTE: ${order.notes}`;
      if (noteText.length <= W) {
        addLine(applyText(noteText, insP), 'normal', insP);
      } else {
        addLine('NOTE:', 'normal', insP);
        let rem = order.notes;
        while (rem.length > W) { addLine('  ' + rem.slice(0, W - 2), 'normal', insP); rem = rem.slice(W - 2); }
        if (rem.trim()) addLine('  ' + rem, 'normal', insP);
      }
    }
  }

  // ── TOTALS & PAYMENT ──────────────────────────────────────────────────────
  if (cfg.totals.enabled) {
    dline('=');

    if (cfg.totals.showSubtotal && order.subtotal !== undefined && order.subtotal !== order.total) {
      const p = fieldProps(cfg.totals.subtotalField, 'normal');
      addLine(applyText(padLR('Subtotal:', formatPrice(order.subtotal)), p), 'normal', p);
    }

    if (cfg.totals.showDeliveryCharge && isDelivery) {
      const dc = order.total - (order.subtotal ?? order.total);
      if (dc > 0) {
        const p = fieldProps(cfg.totals.deliveryField, 'normal');
        addLine(applyText(padLR('Delivery:', formatPrice(dc)), p), 'normal', p);
      }
    }

    if (cfg.totals.showTotal) {
      const lp = fieldProps(cfg.totals.totalLabelField, 'emphasis');
      addLine(applyAlign(applyText('TOTAL TO PAY', lp), lp.align), 'emphasis', lp);

      const ap = fieldProps(cfg.totals.totalAmountField, 'total-amt');
      addLine(applyAlign(formatPrice(order.total), ap.align), 'total-amt', ap);
    }

    dline('=');

    if (cfg.totals.showPaymentMethod && vc.paymentInfo) {
      const p = fieldProps(cfg.totals.paymentMethodField, 'normal');
      addLine(applyAlign(applyText(vc.paymentInfo, p), p.align), 'normal', p);
    }
  }

  // ── FOOTER ────────────────────────────────────────────────────────────────
  if (cfg.footer.enabled) {
    dline();
    if (cfg.footer.showThankYou && cfg.footer.thankYouMessage) {
      const p = fieldProps(cfg.footer.thankYouField, 'normal');
      addLine(applyAlign(applyText(cfg.footer.thankYouMessage, p), p.align), 'normal', p);
    }
    if (cfg.footer.showWebsite && cfg.footer.websiteUrl) {
      const p = fieldProps(cfg.footer.footerWebField, 'normal');
      addLine(applyAlign(cfg.footer.websiteUrl, p.align), 'normal', p);
    }
    for (const part of (cfg.footer.customPromoMessage ?? '').split('\n')) {
      if (part.trim()) {
        const p = fieldProps(cfg.footer.promoField, 'normal');
        addLine(applyAlign(applyText(part.trim(), p), p.align), 'normal', p);
      }
    }
    for (const part of (cfg.footer.loyaltyMessage ?? '').split('\n')) {
      if (part.trim()) {
        const p = fieldProps(cfg.footer.loyaltyField, 'normal');
        addLine(applyAlign(applyText(part.trim(), p), p.align), 'normal', p);
      }
    }
  }

  // Trailing feed
  blank('compact');
  blank('compact');

  return L;
}

// ── Plain-text export (for debugging/logging) ─────────────────────────────
export function formatReceiptText(order: Order, configOverride?: ReceiptConfig): string {
  return buildReceiptLines(order, configOverride).map(l => l.text).join('\n');
}

// ── CSS values for browser printing ──────────────────────────────────────

export function lineToCSS(line: ReceiptLine): { fontSize: string; fontWeight: string; lineHeight: string } {
  const sizePx: Record<FieldFontSize, string> = {
    small:  '11px',
    normal: '13px',
    large:  '15px',
    xlarge: '18px',
  };
  const weightNum: Record<FieldFontWeight, string> = {
    normal: '400',
    medium: '600',
    bold:   '700',
  };
  const lhMap: Record<FieldSpacing, string> = {
    compact: '1.2',
    normal:  '1.5',
    large:   '1.9',
  };
  if (line.kind === 'blank') return { fontSize: '4px', fontWeight: '400', lineHeight: '1' };
  return {
    fontSize:   sizePx[line.fontSize]   ?? '13px',
    fontWeight: weightNum[line.fontWeight] ?? '400',
    lineHeight: lhMap[line.spacing]     ?? '1.5',
  };
}

// ── Browser HTML receipt ──────────────────────────────────────────────────
// Uses ReceiptLine render properties directly — no kind-based lookup needed.

export function printViaBrowser(order: Order, configOverride?: ReceiptConfig): Promise<void> {
  return new Promise((resolve) => {
    const lines = buildReceiptLines(order, configOverride);
    const esc   = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const divs = lines.map(line => {
      const css = lineToCSS(line);
      const content = line.text === '' ? '\u00a0' : esc(line.text);
      return `<div style="font-size:${css.fontSize};font-weight:${css.fontWeight};line-height:${css.lineHeight}">${content}</div>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: 80mm auto; margin: 4mm 3mm 6mm 3mm; }
  html, body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 13px;
    line-height: 1.5;
    width: 72mm;
    color: #000;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  div {
    font-family: 'Courier New', Courier, monospace;
    color: #000;
    white-space: pre-wrap;
    word-break: break-all;
    overflow-wrap: anywhere;
  }
  @media print {
    @page { size: 80mm auto; margin: 4mm 3mm 6mm 3mm; }
    * { color: #000 !important; background: #fff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important; }
  }
</style>
</head>
<body>${divs}</body>
</html>`;

    const frameId = `__rcpt_${Date.now()}__`;
    const iframe  = document.createElement('iframe');
    iframe.id     = frameId;
    iframe.style.cssText =
      'position:fixed;top:-9999px;left:-9999px;width:80mm;height:1px;border:none;visibility:hidden;';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) { console.error('[printer] iframe unavailable'); resolve(); return; }

    doc.open();
    doc.write(html);
    doc.close();

    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      resolve();
      setTimeout(() => document.getElementById(frameId)?.remove(), 3000);
    };
  });
}

// ── Per-category copy count ───────────────────────────────────────────────
export interface CategoryPrintCounts { [categoryId: string]: number; }

function itemCopyCount(item: Record<string, unknown>, counts: CategoryPrintCounts): number {
  if (typeof item.category === 'string' && item.category)
    return counts[item.category] ?? 1;
  return 1;
}

export function buildPrintRounds(order: Order, counts: CategoryPrintCounts): Order[] {
  const maxCopies = order.items.reduce(
    (m, item) => Math.max(m, itemCopyCount(item as Record<string, unknown>, counts)), 1);
  const rounds: Order[] = [];
  for (let r = 1; r <= maxCopies; r++) {
    const ri = order.items.filter(
      item => itemCopyCount(item as Record<string, unknown>, counts) >= r);
    if (ri.length) rounds.push({ ...order, items: ri });
  }
  return rounds.length ? rounds : [order];
}

// ── Main print entry point ────────────────────────────────────────────────

export async function printOrder(order: Order, _config?: PrinterConfig): Promise<void> {
  const counts: CategoryPrintCounts = {};
  const catById: Record<string, string> = {};

  try {
    const { supabase } = await import('@/lib/supabase');
    const [catsRes, itemsRes] = await Promise.all([
      supabase.from('menu_categories').select('id, print_copies'),
      supabase.from('menu_items').select('id, category'),
    ]);
    if (catsRes.data)
      for (const r of catsRes.data as { id: string; print_copies: number | null }[])
        counts[r.id] = r.print_copies && r.print_copies > 0 ? r.print_copies : 1;
    if (itemsRes.data)
      for (const r of itemsRes.data as { id: string; category: string }[])
        catById[r.id] = r.category;
  } catch (e) {
    console.warn('[printer] Could not fetch category counts:', e);
  }

  const enriched: Order = {
    ...order,
    items: order.items.map(item => ({
      ...item,
      ...({ category: catById[item.menuItemId] ?? '' } as Record<string, unknown>),
    })),
  };

  const rounds = buildPrintRounds(enriched, counts);
  console.log(`[printer] #${order.orderNumber} → ${rounds.length} round(s)`);

  const { isSerialConnected, printViaSerial } = await import('@/lib/thermalPrinter');

  for (let i = 0; i < rounds.length; i++) {
    const ro = rounds[i];
    if (isSerialConnected()) {
      const result = await printViaSerial(buildReceiptLines(ro));
      if (result.ok) {
        if (i < rounds.length - 1) await new Promise(r => setTimeout(r, 1200));
        continue;
      }
      console.warn('[printer] Serial failed, falling back to browser:', result.error);
    }
    await printViaBrowser(ro);
    if (i < rounds.length - 1) await new Promise(r => setTimeout(r, 1500));
  }
}
