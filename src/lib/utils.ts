import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Returns the original image URL unchanged.
 * Supabase image transform API is not available on this tier.
 */
export function getOptimizedImageUrl(
  url: string | undefined | null,
  _width?: number,
  _quality?: number,
): string {
  return url ?? '';
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(pence: number): string {
  return `£${pence.toFixed(2)}`;
}

export function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

type OscType = 'sine' | 'square' | 'sawtooth' | 'triangle';

function createAudioContext() {
  return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
}

function scheduleBeep(
  ctx: AudioContext,
  freq: number,
  start: number,
  duration: number,
  volume: number,
  type: OscType = 'sine'
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = freq;
  osc.type = type;
  gain.gain.setValueAtTime(0, ctx.currentTime + start);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + duration);
}

/** New order alert — urgent ascending tri-tone ding */
export function playNewOrderAlert(volume = 0.6) {
  try {
    const ctx = createAudioContext();
    const v = Math.max(0, Math.min(1, volume));
    // Ascending trio: C5 → E5 → G5, then repeat once
    scheduleBeep(ctx, 523, 0.00, 0.18, v, 'sine');   // C5
    scheduleBeep(ctx, 659, 0.22, 0.18, v, 'sine');   // E5
    scheduleBeep(ctx, 784, 0.44, 0.28, v, 'sine');   // G5
    scheduleBeep(ctx, 523, 0.80, 0.12, v * 0.7, 'sine');
    scheduleBeep(ctx, 659, 0.96, 0.12, v * 0.7, 'sine');
    scheduleBeep(ctx, 784, 1.12, 0.22, v * 0.7, 'sine');
  } catch {
    console.log('Audio not available');
  }
}

/** Ready-for-collection alert — bright celebratory fanfare */
export function playReadyAlert(volume = 0.6) {
  try {
    const ctx = createAudioContext();
    const v = Math.max(0, Math.min(1, volume));
    // Fanfare: G5 → C6 → E6 → G6 descend back
    scheduleBeep(ctx, 784,  0.00, 0.14, v,        'triangle');  // G5
    scheduleBeep(ctx, 1047, 0.16, 0.14, v,        'triangle');  // C6
    scheduleBeep(ctx, 1319, 0.32, 0.14, v,        'triangle');  // E6
    scheduleBeep(ctx, 1568, 0.48, 0.30, v,        'triangle');  // G6
    scheduleBeep(ctx, 1319, 0.82, 0.10, v * 0.6,  'triangle');  // E6
    scheduleBeep(ctx, 1047, 0.96, 0.10, v * 0.6,  'triangle');  // C6
    scheduleBeep(ctx, 1568, 1.10, 0.35, v * 0.8,  'triangle');  // G6 finish
  } catch {
    console.log('Audio not available');
  }
}

/** Legacy alias kept for backward compatibility */
export function playOrderAlert(volume = 0.6) {
  playNewOrderAlert(volume);
}

export function printReceipt(order: import('@/types').Order) {
  const receiptWindow = window.open('', '_blank', 'width=350,height=600');
  if (!receiptWindow) return;

  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding:2px 0;">${item.quantity}x ${item.name}</td>
      <td style="text-align:right;padding:2px 0;">£${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  receiptWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt - Order #${order.orderNumber}</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 13px; margin: 0; padding: 16px; max-width: 280px; }
        .center { text-align: center; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; }
        .total-row td { font-weight: bold; font-size: 15px; padding-top: 4px; }
        h2 { margin: 4px 0; font-size: 18px; }
        p { margin: 2px 0; }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="center">
        <h2>MEAD END FISH BAR</h2>
        <p>Biggleswade</p>
        <p>Tel: 01767 000000</p>
      </div>
      <div class="divider"></div>
      <p><strong>Order #${order.orderNumber}</strong></p>
      <p>Time: ${formatTime(order.createdAt)}</p>
      <p>Name: ${order.customerName}</p>
      <p>Tel: ${order.customerPhone}</p>
      <p>Type: COLLECTION</p>
      <p>Payment: CASH IN STORE</p>
      ${order.prepTime ? `<p>Collection: ${order.prepTime === 'asap' ? 'ASAP' : `~${order.prepTime} min`}</p>` : ''}
      ${order.notes ? `<p>Notes: ${order.notes}</p>` : ''}
      <div class="divider"></div>
      <table>
        ${itemsHtml}
        <tr><td colspan="2"><div class="divider"></div></td></tr>
        <tr class="total-row">
          <td>TOTAL</td>
          <td style="text-align:right;">£${order.total.toFixed(2)}</td>
        </tr>
      </table>
      <div class="divider"></div>
      <div class="center">
        <p>Please pay at the counter</p>
        <p>Thank you for your order!</p>
        <p style="margin-top:8px;font-size:11px;">Allergen info available on request</p>
      </div>
    </body>
    </html>
  `);
  receiptWindow.document.close();
  receiptWindow.focus();
  setTimeout(() => {
    receiptWindow.print();
  }, 500);
}
