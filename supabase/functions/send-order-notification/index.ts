import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

interface NotificationPayload {
  orderId:        string;
  orderNumber:    string;
  customerName:   string;
  customerPhone:  string;
  customerEmail?: string;  // direct email from order, no DB lookup needed
  estimatedReady: string; // ISO timestamp
  items:          OrderItem[];
  total:          number;
  businessName:   string;
  businessPhone:  string;
  deliveryAddress?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: NotificationPayload = await req.json();
    console.log('[send-order-notification] Processing order:', payload.orderNumber);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Use email from order payload directly; fall back to phone-based profile lookup
    let customerEmail: string | null = payload.customerEmail ?? null;

    if (!customerEmail) {
      // Legacy fallback: look up by phone for orders placed before email field was added
      const { data: profiles, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('email')
        .eq('phone', payload.customerPhone)
        .limit(1);

      if (profileError) {
        console.warn('[send-order-notification] Profile lookup error:', profileError.message);
      }
      customerEmail = profiles?.[0]?.email ?? null;
    }

    if (!customerEmail) {
      console.log('[send-order-notification] No email found for order:', payload.orderNumber, '— skipping email');
      return new Response(
        JSON.stringify({ success: false, reason: 'no_email' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Format estimated ready time
    const readyTime = new Date(payload.estimatedReady).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/London',
    });

    // Build items HTML
    const itemsHtml = payload.items
      .map(item => {
        const notes = item.notes
          ? `<div style="font-size:12px;color:#888;margin-top:2px">${item.notes}</div>`
          : '';
        return `
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #f0f0f0">
              <strong>${item.quantity}× ${item.name}</strong>${notes}
            </td>
            <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:bold">
              £${(item.price * item.quantity).toFixed(2)}
            </td>
          </tr>`;
      })
      .join('');

    const isDelivery = !!payload.deliveryAddress;

    const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f8f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:500px;margin:0 auto;padding:24px 16px">

    <!-- Header -->
    <div style="background:#0f1f3d;border-radius:16px 16px 0 0;padding:24px;text-align:center">
      <div style="width:56px;height:56px;background:#f5a623;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px">
        <span style="font-size:28px">✅</span>
      </div>
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:900">Your Order is Confirmed!</h1>
      <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:14px">Hi ${payload.customerName} — here's your order summary</p>
    </div>

    <!-- Status banner -->
    <div style="background:#f5a623;padding:14px 24px;text-align:center">
      <p style="margin:0;font-weight:900;font-size:16px;color:#0f1f3d">
        ${isDelivery ? '🚚 Your order is being prepared for delivery' : '🏪 Ready to collect at approximately ' + readyTime}
      </p>
    </div>

    <!-- Order details -->
    <div style="background:#fff;padding:24px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <span style="font-size:13px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Order Number</span>
        <span style="font-size:20px;font-weight:900;color:#0f1f3d">#${payload.orderNumber}</span>
      </div>

      <table style="width:100%;border-collapse:collapse">
        ${itemsHtml}
        <tr>
          <td style="padding:12px 0 0;font-weight:900;font-size:16px">Total to Pay</td>
          <td style="padding:12px 0 0;text-align:right;font-weight:900;font-size:20px;color:#0f1f3d">£${payload.total.toFixed(2)}</td>
        </tr>
      </table>

      ${isDelivery ? `
      <div style="background:#f0f7ff;border-radius:10px;padding:12px 14px;margin-top:16px">
        <p style="margin:0;font-size:13px;font-weight:700;color:#1d4ed8">🚗 Delivering to:</p>
        <p style="margin:4px 0 0;font-size:14px;color:#1e40af;font-weight:600">${payload.deliveryAddress}</p>
        <p style="margin:6px 0 0;font-size:12px;color:#64748b">Pay the driver on delivery</p>
      </div>` : `
      <div style="background:#f0fdf4;border-radius:10px;padding:12px 14px;margin-top:16px">
        <p style="margin:0;font-size:13px;font-weight:700;color:#15803d">📍 Collect from:</p>
        <p style="margin:4px 0 0;font-size:14px;color:#166534;font-weight:600">${payload.businessName}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#166534">Ready around <strong>${readyTime}</strong></p>
        <p style="margin:6px 0 0;font-size:12px;color:#64748b">Pay in cash at collection</p>
      </div>`}
    </div>

    <!-- Footer -->
    <div style="background:#f8f8f5;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 16px 16px;padding:20px 24px;text-align:center">
      <p style="margin:0;font-size:13px;color:#6b7280">Any questions? Call us:</p>
      <a href="tel:${payload.businessPhone.replace(/\s/g, '')}" style="display:inline-block;margin-top:6px;font-size:16px;font-weight:700;color:#0f1f3d;text-decoration:none">${payload.businessPhone}</a>
      <p style="margin:12px 0 0;font-size:11px;color:#9ca3af">${payload.businessName} · Online Ordering</p>
    </div>

  </div>
</body>
</html>`;

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      console.error('[send-order-notification] RESEND_API_KEY not set');
      return new Response(
        JSON.stringify({ success: false, reason: 'missing_api_key' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${payload.businessName} <orders@resend.dev>`,
        to: [customerEmail],
        subject: `✅ Order #${payload.orderNumber} Confirmed — ${isDelivery ? 'On its way!' : `Ready at ${readyTime}`}`,
        html: emailHtml,
      }),
    });

    const emailData = await emailRes.json();

    if (!emailRes.ok) {
      console.error('[send-order-notification] Resend error:', JSON.stringify(emailData));
      return new Response(
        JSON.stringify({ success: false, reason: 'resend_error', detail: emailData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log('[send-order-notification] Email sent to', customerEmail, 'id:', emailData.id);
    return new Response(
      JSON.stringify({ success: true, emailId: emailData.id, sentTo: customerEmail }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error('[send-order-notification] Unexpected error:', err);
    return new Response(
      JSON.stringify({ success: false, reason: 'internal_error', detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
