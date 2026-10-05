import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { name, email } = await req.json();

    if (!name || !email) {
      return new Response(
        JSON.stringify({ success: false, reason: 'missing_fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Store in DB
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { error: dbError } = await supabaseAdmin
      .from('interest_registrations')
      .insert({ name: name.trim(), email: email.trim().toLowerCase() });

    if (dbError) {
      console.error('[register-interest] DB insert error:', dbError.message);
    }

    // Send notification email to inbox
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      console.error('[register-interest] RESEND_API_KEY not set');
      // Still return success — registration is saved to DB
      return new Response(
        JSON.stringify({ success: true, emailSent: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8f8f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:480px;margin:0 auto;padding:24px 16px">
    <div style="background:#0f1f3d;border-radius:16px 16px 0 0;padding:24px;text-align:center">
      <div style="width:52px;height:52px;background:#f5a623;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px">
        <span style="font-size:26px">🐟</span>
      </div>
      <h1 style="color:#fff;margin:0;font-size:20px;font-weight:900">New Interest Registration</h1>
      <p style="color:rgba(255,255,255,0.6);margin:6px 0 0;font-size:13px">Someone wants to hear about your online ordering launch</p>
    </div>
    <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:0">
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#888;font-size:13px;font-weight:600;width:80px">Name</td>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-weight:700;font-size:15px;color:#0f1f3d">${name}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#888;font-size:13px;font-weight:600">Email</td>
          <td style="padding:10px 0;font-weight:700;font-size:15px;color:#0f1f3d">
            <a href="mailto:${email}" style="color:#f5a623;text-decoration:none">${email}</a>
          </td>
        </tr>
      </table>
    </div>
    <div style="background:#f8f8f5;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 16px 16px;padding:16px 24px;text-align:center">
      <p style="margin:0;font-size:12px;color:#9ca3af">Registered via the Mead End Fish Bar coming soon page</p>
    </div>
  </div>
</body>
</html>`;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Mead End Fish Bar <orders@resend.dev>',
        to: ['info@meadendfishbar.co.uk'],
        reply_to: email,
        subject: `🐟 New Interest Registration — ${name}`,
        html: emailHtml,
      }),
    });

    const emailData = await emailRes.json();

    if (!emailRes.ok) {
      console.error('[register-interest] Resend error:', JSON.stringify(emailData));
      return new Response(
        JSON.stringify({ success: true, emailSent: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log('[register-interest] Notification sent for:', email);
    return new Response(
      JSON.stringify({ success: true, emailSent: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error('[register-interest] Unexpected error:', err);
    return new Response(
      JSON.stringify({ success: false, reason: 'internal_error', detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
