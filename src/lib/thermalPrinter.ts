/**
 * Web Serial API — direct ESC/POS printing to USB thermal printers.
 * Chrome/Edge desktop only. No print dialog ever shown.
 *
 * printViaSerial() accepts ReceiptLine[] from buildReceiptLines().
 * Each line's render properties (fontSize, fontWeight, align) drive
 * ESC/POS commands directly — NO string markers, NO format guessing.
 */

import type { ReceiptLine } from '@/lib/printer';

// ── ESC/POS byte constants ─────────────────────────────────────────────────
const ESC = 0x1b;
const GS  = 0x1d;

function init():               Uint8Array { return new Uint8Array([ESC, 0x40]);       }
function alignCenter():        Uint8Array { return new Uint8Array([ESC, 0x61, 0x01]); }
function alignLeft():          Uint8Array { return new Uint8Array([ESC, 0x61, 0x00]); }
function alignRight():         Uint8Array { return new Uint8Array([ESC, 0x61, 0x02]); }
function boldOn():             Uint8Array { return new Uint8Array([ESC, 0x45, 0x01]); }
function boldOff():            Uint8Array { return new Uint8Array([ESC, 0x45, 0x00]); }
// ESC ! byte: bit4 = double-height, bit3 = double-width, bit0 = alt font
function dblHeightOn():        Uint8Array { return new Uint8Array([ESC, 0x21, 0x10]); } // double-height
function dblHeightWidthOn():   Uint8Array { return new Uint8Array([ESC, 0x21, 0x30]); } // double-height + double-width
function normalSize():         Uint8Array { return new Uint8Array([ESC, 0x21, 0x00]); }
function feedLines(n: number): Uint8Array { return new Uint8Array([ESC, 0x64, n]);    }
function partialCut():         Uint8Array { return new Uint8Array([GS,  0x56, 0x01]); }

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out   = new Uint8Array(total);
  let off = 0;
  for (const a of arrays) { out.set(a, off); off += a.length; }
  return out;
}

// ── Port state ────────────────────────────────────────────────────────────
interface SerialPortLike {
  open(opts: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  writable: WritableStream<Uint8Array>;
  getInfo?: () => { usbVendorId?: number; usbProductId?: number };
}

let _port:   SerialPortLike | null = null;
let _writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
let _label  = '';

export function isSerialConnected():    boolean { return _port !== null && _writer !== null; }
export function getConnectedPortLabel(): string  { return _label; }
export function isWebSerialSupported(): boolean  {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

// ── Connect ───────────────────────────────────────────────────────────────
export async function connectSerialPrinter(): Promise<{ ok: boolean; error?: string }> {
  if (!isWebSerialSupported())
    return { ok: false, error: 'Web Serial is not supported. Use Chrome or Edge on desktop.' };

  try {
    const serial = (navigator as Navigator & { serial: { requestPort(): Promise<SerialPortLike> } }).serial;
    const port   = await serial.requestPort();

    let opened = false;
    for (const baud of [115200, 9600, 19200, 38400, 57600]) {
      try { await port.open({ baudRate: baud }); opened = true; break; } catch { /* try next */ }
    }
    if (!opened)
      return { ok: false, error: 'Could not open serial port. Check printer is on and connected.' };

    _port   = port;
    _writer = port.writable.getWriter();
    const info = port.getInfo?.();
    _label = info?.usbVendorId
      ? `USB ${info.usbVendorId.toString(16).toUpperCase()}:${(info.usbProductId ?? 0).toString(16).toUpperCase()}`
      : 'USB Serial Printer';

    await _writer.write(init());
    console.log('[thermalPrinter] Connected to', _label);
    return { ok: true };
  } catch (e: unknown) {
    const msg = (e as Error).message ?? String(e);
    if (msg.includes('No port selected') || msg.includes('cancelled'))
      return { ok: false, error: 'No printer selected.' };
    return { ok: false, error: msg };
  }
}

// ── Disconnect ────────────────────────────────────────────────────────────
export async function disconnectSerialPrinter(): Promise<void> {
  try { _writer?.releaseLock(); } catch { /* ignore */ }
  try { await _port?.close();   } catch { /* ignore */ }
  _port = null; _writer = null; _label = '';
  console.log('[thermalPrinter] Disconnected');
}

// ── printViaSerial ────────────────────────────────────────────────────────
// Accepts ReceiptLine[] produced by buildReceiptLines().
// Translates each line's render properties into ESC/POS byte sequences.
// No string markers, no format guessing — pure property-driven output.

export async function printViaSerial(lines: ReceiptLine[]): Promise<{ ok: boolean; error?: string }> {
  if (!_writer) return { ok: false, error: 'Printer not connected.' };

  const enc    = new TextEncoder();
  const chunks: Uint8Array[] = [init(), alignLeft(), boldOff(), normalSize()];

  for (const line of lines) {
    const { text, kind, fontSize, fontWeight, align } = line;

    // ── Skip blank lines with compact spacing ────────────────────────────
    if (kind === 'blank') {
      chunks.push(enc.encode('\n'));
      continue;
    }

    // ── Alignment ────────────────────────────────────────────────────────
    // Note: text coming in from buildReceiptLines() is already padded for
    // left/centre/right via spaces, but ESC/POS alignment commands produce
    // cleaner output — apply both so either approach works.
    if (align === 'center') {
      chunks.push(alignCenter());
    } else if (align === 'right') {
      chunks.push(alignRight());
    } else {
      chunks.push(alignLeft());
    }

    // ── Size ─────────────────────────────────────────────────────────────
    if (fontSize === 'xlarge') {
      chunks.push(dblHeightWidthOn());
    } else if (fontSize === 'large') {
      chunks.push(dblHeightOn());
    } else {
      chunks.push(normalSize());
    }

    // ── Weight ───────────────────────────────────────────────────────────
    if (fontWeight === 'bold' || fontWeight === 'medium') {
      chunks.push(boldOn());
    } else {
      chunks.push(boldOff());
    }

    // ── Text ─────────────────────────────────────────────────────────────
    // For centred/right text that was space-padded by buildReceiptLines,
    // strip the leading spaces — ESC/POS alignment handles position natively.
    // For left-aligned text keep as-is (space-pad in text = intentional indent).
    let printText = text;
    if (align === 'center' || align === 'right') {
      printText = text.trimStart();
    }
    chunks.push(enc.encode(printText + '\n'));

    // ── Reset after each line ────────────────────────────────────────────
    chunks.push(boldOff(), normalSize(), alignLeft());
  }

  // Feed and cut
  chunks.push(feedLines(4), partialCut());

  const job = concat(...chunks);
  try {
    await _writer.write(job);
    console.log('[thermalPrinter] Receipt sent ✓');
    return { ok: true };
  } catch (e: unknown) {
    const msg = (e as Error).message ?? 'Write failed';
    console.error('[thermalPrinter] Write error:', msg);
    await disconnectSerialPrinter();
    return { ok: false, error: msg };
  }
}
