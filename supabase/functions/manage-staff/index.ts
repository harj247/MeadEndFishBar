import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── GET — list all users via DB function ─────────────────────────────────
  if (req.method === 'GET') {
    console.log('[manage-staff] Listing users, requested by:', user.email);

    const { data, error } = await supabaseAdmin.rpc('get_all_users_admin');

    if (error) {
      console.error('[manage-staff] RPC error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const users = ((data ?? []) as Array<{
      id: string;
      email: string;
      created_at: string;
      last_sign_in_at: string | null;
      invited_at: string | null;
      confirmed_at: string | null;
      raw_user_meta_data: { role?: string } | null;
    }>).map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      invited_at: u.invited_at,
      confirmed_at: u.confirmed_at,
      role: u.raw_user_meta_data?.role === 'admin' ? 'admin' : 'staff',
    }));

    return new Response(JSON.stringify({ users }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── POST — invite a new staff member ─────────────────────────────────────
  if (req.method === 'POST') {
    const body = await req.json();
    const email: string | undefined = body?.email?.trim();
    const role: string = body?.role === 'admin' ? 'admin' : 'staff';

    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'A valid email address is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[manage-staff] Inviting:', email, 'as', role, '— by:', user.email);

    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { role },
    });
    if (error) {
      console.error('[manage-staff] invite error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ user: data.user }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── PATCH — update user role ──────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const body = await req.json();
    const userId: string | undefined = body?.userId;
    const newRole: string = body?.role === 'admin' ? 'admin' : 'staff';

    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (userId === user.id) {
      return new Response(JSON.stringify({ error: 'You cannot change your own role' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[manage-staff] Updating role for:', userId, 'to', newRole, '— by:', user.email);

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { role: newRole },
    });

    if (error) {
      console.error('[manage-staff] updateRole error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, role: newRole }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── DELETE — remove a user ────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const body = await req.json();
    const userId: string | undefined = body?.userId;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (userId === user.id) {
      return new Response(JSON.stringify({ error: 'You cannot remove your own account' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[manage-staff] Deleting user:', userId, '— by:', user.email);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) {
      console.error('[manage-staff] delete error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
