import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChefHat, Mail, Lock, KeyRound, Eye, EyeOff, ArrowRight, Loader2, LogIn } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useVenueConfig } from '@/hooks/useVenueConfig';
import { toast } from 'sonner';

type Step = 'email' | 'otp' | 'set-password' | 'sign-in';

export default function KitchenLogin() {
  const { user, loading } = useAuth();
  const navigate          = useNavigate();
  const location          = useLocation();
  const { config }        = useVenueConfig();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/kitchen';

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) navigate(from, { replace: true });
  }, [user, loading, navigate, from]);

  const [step,       setStep]       = useState<Step>('email');
  const [email,      setEmail]      = useState('');
  const [otp,        setOtp]        = useState('');
  const [password,   setPassword]   = useState('');
  const [showPw,     setShowPw]     = useState(false);
  const [busy,       setBusy]       = useState(false);
  const [isNewUser,  setIsNewUser]  = useState(false);

  // ── Step 1: Check if user exists → OTP or sign-in ────────────────────────
  const handleEmailSubmit = async () => {
    if (!email.trim()) { toast.error('Please enter your email'); return; }
    setBusy(true);

    // Only allow registered staff — do not auto-create accounts for unknown emails
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    });

    setBusy(false);
    if (error) {
      // shouldCreateUser:false returns an error if the email isn't registered
      if (error.message.toLowerCase().includes('not found') || error.status === 400) {
        toast.error('This email is not registered. Ask an admin to add you in Staff Management.');
      } else {
        toast.error(error.message);
      }
      return;
    }

    // Check if this account already has a password by looking at user_profiles
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', email.trim())
      .maybeSingle();

    // If profile exists → returning user, offer sign-in with password as well
    // If not → new user, must verify OTP then set password
    setIsNewUser(!profile);
    setStep('otp');
    toast.success('Check your email — a 4-digit code is on its way');
  };

  // ── Step 2a: Verify OTP ───────────────────────────────────────────────────
  const handleOtpSubmit = async () => {
    if (otp.length < 4) { toast.error('Enter the 4-digit code'); return; }
    setBusy(true);

    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp.trim(),
      type: 'email',
    });

    setBusy(false);
    if (error) { toast.error('Invalid or expired code — try again'); return; }

    // New user needs to set a password; existing user is signed in via OTP
    if (isNewUser || !data.user?.user_metadata?.has_password) {
      setStep('set-password');
    } else {
      // Existing user signed in via OTP link — they're in
      toast.success('Signed in!');
      navigate(from, { replace: true });
    }
  };

  // ── Step 2b: Sign in with password (returning user) ───────────────────────
  const handlePasswordSignIn = async () => {
    if (!password) { toast.error('Enter your password'); return; }
    setBusy(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setBusy(false);
    if (error) { toast.error('Incorrect password'); return; }
    toast.success('Welcome back!');
    navigate(from, { replace: true });
  };

  // ── Step 3: Set password for new staff account ────────────────────────────
  const handleSetPassword = async () => {
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setBusy(true);

    const { error } = await supabase.auth.updateUser({
      password,
      data: { has_password: true },
    });

    if (error) { setBusy(false); toast.error(error.message); return; }

    // Upsert user_profiles so the account is recognised on future logins
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      await supabase.from('user_profiles').upsert({
        id:       currentUser.id,
        email:    email.trim(),
        username: email.split('@')[0],
      });
    }

    setBusy(false);
    toast.success('Account created — welcome!');
    navigate(from, { replace: true });
  };

  // ── Also offer direct sign-in link ───────────────────────────────────────
  const switchToSignIn = () => { setStep('sign-in'); setOtp(''); };
  const switchToOtp    = () => { setStep('otp');     setPassword(''); };

  const primaryColor = config.primaryColor  || '#f5a623';
  const accentColor  = config.accentColor   || '#0f1f3d';
  const logoUrl      = config.logoUrl;
  const bizName      = config.businessName  || 'Kitchen';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: accentColor }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: accentColor }}
    >
      <div className="w-full max-w-sm">
        {/* Logo / brand */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden"
            style={{ background: primaryColor }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt={bizName} className="w-full h-full object-cover" />
            ) : (
              <ChefHat className="w-8 h-8" style={{ color: accentColor }} />
            )}
          </div>
          <div className="text-center">
            <h1 className="text-white font-black text-xl">{bizName}</h1>
            <p className="text-white/50 text-sm mt-0.5">Staff Login</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Card header */}
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-700">
              {step === 'email'        && 'Enter your staff email'}
              {step === 'otp'         && 'Enter the code sent to your email'}
              {step === 'set-password' && 'Create a password for your account'}
              {step === 'sign-in'     && 'Sign in with your password'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {step === 'email'        && 'A one-time code will be sent to verify your email'}
              {step === 'otp'         && `Code sent to ${email}`}
              {step === 'set-password' && 'You only need to do this once'}
              {step === 'sign-in'     && `Signing in as ${email}`}
            </p>
          </div>

          <div className="p-6 space-y-4">
            {/* ── EMAIL STEP ── */}
            {step === 'email' && (
              <>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleEmailSubmit()}
                    placeholder="your@email.com"
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                  />
                </div>
                <button
                  onClick={handleEmailSubmit}
                  disabled={busy}
                  className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                  style={{ background: primaryColor, color: accentColor }}
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Mail className="w-4 h-4" /> Send Code</>}
                </button>
              </>
            )}

            {/* ── OTP STEP ── */}
            {step === 'otp' && (
              <>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={e => e.key === 'Enter' && handleOtpSubmit()}
                    placeholder="4-digit code"
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-center tracking-[0.4em] font-mono font-bold focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                  />
                </div>
                <button
                  onClick={handleOtpSubmit}
                  disabled={busy}
                  className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                  style={{ background: primaryColor, color: accentColor }}
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ArrowRight className="w-4 h-4" /> Verify Code</>}
                </button>
                {/* Offer password sign-in if returning user */}
                {!isNewUser && (
                  <button onClick={switchToSignIn} className="w-full text-xs text-gray-400 hover:text-gray-600 text-center py-1 transition-colors">
                    Already have a password? Sign in directly →
                  </button>
                )}
                <button onClick={() => setStep('email')} className="w-full text-xs text-gray-400 hover:text-gray-600 text-center py-1 transition-colors">
                  ← Change email
                </button>
              </>
            )}

            {/* ── SET PASSWORD STEP (new staff) ── */}
            {step === 'set-password' && (
              <>
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <p className="text-xs font-bold text-green-800">Email verified ✓</p>
                  <p className="text-xs text-green-600 mt-0.5">Set a password so you can sign in quickly next time.</p>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSetPassword()}
                    placeholder="Choose a password (min 6 chars)"
                    autoFocus
                    className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                  />
                  <button
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  onClick={handleSetPassword}
                  disabled={busy}
                  className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                  style={{ background: primaryColor, color: accentColor }}
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><LogIn className="w-4 h-4" /> Create Account &amp; Enter Kitchen</>}
                </button>
              </>
            )}

            {/* ── DIRECT SIGN-IN STEP ── */}
            {step === 'sign-in' && (
              <>
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                  <p className="text-xs font-bold text-gray-700">{email}</p>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handlePasswordSignIn()}
                    placeholder="Your password"
                    autoFocus
                    className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                  />
                  <button
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  onClick={handlePasswordSignIn}
                  disabled={busy}
                  className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                  style={{ background: primaryColor, color: accentColor }}
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><LogIn className="w-4 h-4" /> Sign In</>}
                </button>
                <button onClick={switchToOtp} className="w-full text-xs text-gray-400 hover:text-gray-600 text-center py-1 transition-colors">
                  Use OTP code instead →
                </button>
                <button onClick={() => setStep('email')} className="w-full text-xs text-gray-400 hover:text-gray-600 text-center py-1 transition-colors">
                  ← Change email
                </button>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          Kitchen &amp; admin access only — not for customer ordering
        </p>
      </div>
    </div>
  );
}
