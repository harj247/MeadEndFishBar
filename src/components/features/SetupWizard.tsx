import { useState, useCallback } from 'react';
import {
  ChefHat, Building2, Phone, MapPin, Palette, Shield, KeyRound,
  ChevronRight, ChevronLeft, CheckCircle, Loader2, Eye, EyeOff,
  ShieldAlert, Zap,
} from 'lucide-react';
import { useVenueConfig } from '@/hooks/useVenueConfig';
import { toast } from 'sonner';

const SETUP_KEY       = 'setup_complete';
const PIN_KEY         = 'kitchen_pin';
const ADMIN_PIN_KEY   = 'kitchen_admin_pin';

export function isSetupComplete(): boolean {
  return localStorage.getItem(SETUP_KEY) === 'true';
}

const PRIMARY_PRESETS = ['#f5a623','#e63946','#2ec4b6','#06d6a0','#ff6b35','#d62828','#7b2d8b','#1d3557'];
const ACCENT_PRESETS  = ['#0f1f3d','#1a1a2e','#2d3436','#212529','#0d1b2a','#1b4332','#370617','#4a0e8f'];

type Step = 'business' | 'contact' | 'branding' | 'pins' | 'done';
const STEPS: Step[] = ['business', 'contact', 'branding', 'pins', 'done'];
const STEP_LABELS: Record<Step, string> = {
  business: 'Business',
  contact:  'Contact',
  branding: 'Branding',
  pins:     'Security',
  done:     'Done',
};
const STEP_ICONS: Record<Step, React.ReactNode> = {
  business: <Building2 className="w-4 h-4" />,
  contact:  <Phone      className="w-4 h-4" />,
  branding: <Palette    className="w-4 h-4" />,
  pins:     <Shield     className="w-4 h-4" />,
  done:     <CheckCircle className="w-4 h-4" />,
};

interface SetupWizardProps {
  onComplete: () => void;
  /** When true, wizard starts with blank fields (fresh client deployment). */
  fresh?: boolean;
}

export default function SetupWizard({ onComplete, fresh = false }: SetupWizardProps) {
  const { config, save } = useVenueConfig();

  const [step, setStep] = useState<Step>('business');
  const [saving, setSaving] = useState(false);

  // Form state — fresh mode starts blank; normal mode pre-fills from existing config
  const [businessName, setBusinessName] = useState(fresh ? '' : (config.businessName === 'My Takeaway' ? '' : config.businessName));
  const [tagline,      setTagline]      = useState(fresh ? '' : (config.tagline === 'Order Online' ? '' : config.tagline));
  const [phone,        setPhone]        = useState(fresh ? '' : config.phone);
  const [address,      setAddress]      = useState(fresh ? '' : config.address);
  const [city,         setCity]         = useState(fresh ? '' : config.city);
  const [postcode,     setPostcode]     = useState(fresh ? '' : config.postcode);
  const [primaryColor, setPrimaryColor] = useState(fresh ? '#f5a623' : (config.primaryColor || '#f5a623'));
  const [accentColor,  setAccentColor]  = useState(fresh ? '#0f1f3d' : (config.accentColor  || '#0f1f3d'));
  const [staffPin,     setStaffPin]     = useState('');
  const [adminPin,     setAdminPin]     = useState('');
  const [showStaff,    setShowStaff]    = useState(false);
  const [showAdmin,    setShowAdmin]    = useState(false);

  const stepIndex     = STEPS.indexOf(step);
  const totalProgress = STEPS.length - 1; // 'done' is final

  // ── Validation per step ──
  const canAdvance = useCallback((): boolean => {
    if (step === 'business') return businessName.trim().length >= 2;
    if (step === 'contact')  return phone.trim().length >= 6 && postcode.trim().replace(/\s/,'').length >= 5;
    if (step === 'branding') return true;
    if (step === 'pins')     return staffPin.length >= 4 && adminPin.length >= 4 && staffPin !== adminPin;
    return true;
  }, [step, businessName, phone, postcode, staffPin, adminPin]);

  const next = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };

  const back = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  const handleFinish = async () => {
    setSaving(true);
    const success = await save({
      ...config,
      businessName:  businessName.trim() || 'My Takeaway',
      tagline:       tagline.trim() || 'Order Online',
      phone:         phone.trim(),
      address:       address.trim(),
      city:          city.trim(),
      postcode:      postcode.trim().toUpperCase(),
      primaryColor,
      accentColor,
    });
    if (!success) { setSaving(false); return; }
    if (staffPin.length >= 4) localStorage.setItem(PIN_KEY, staffPin);
    if (adminPin.length >= 4) localStorage.setItem(ADMIN_PIN_KEY, adminPin);
    localStorage.setItem(SETUP_KEY, 'true');
    setSaving(false);
    setStep('done');
  };

  // ── PIN error messages ──
  const pinError = step === 'pins' && staffPin.length >= 4 && adminPin.length >= 4 && staffPin === adminPin
    ? 'Staff and admin PINs must be different'
    : null;

  return (
    <div className="min-h-screen bg-[#0a1628] flex flex-col items-center justify-center px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#f5a623] mb-4 shadow-lg shadow-[#f5a623]/30">
          <ChefHat className="w-8 h-8 text-[#0f1f3d]" />
        </div>
        <h1 className="text-white font-black text-2xl">Welcome to Kitchen Screen</h1>
        <p className="text-white/50 text-sm mt-1">Quick setup — takes under 2 minutes</p>
      </div>

      {/* Progress bar */}
      {step !== 'done' && (
        <div className="w-full max-w-md mb-6">
          <div className="flex items-center justify-between mb-2">
            {STEPS.slice(0, -1).map((s, i) => {
              const current = STEPS.indexOf(step);
              const done    = i < current;
              const active  = i === current;
              return (
                <div key={s} className="flex flex-col items-center gap-1 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    done   ? 'bg-[#f5a623] text-[#0f1f3d]' :
                    active ? 'bg-white text-[#0f1f3d] ring-2 ring-[#f5a623]' :
                             'bg-white/10 text-white/40'
                  }`}>
                    {done ? <CheckCircle className="w-4 h-4" /> : STEP_ICONS[s]}
                  </div>
                  <span className={`text-[10px] font-semibold ${active ? 'text-[#f5a623]' : done ? 'text-white/60' : 'text-white/30'}`}>
                    {STEP_LABELS[s]}
                  </span>
                  {i < STEPS.length - 2 && (
                    <div className={`absolute`} />
                  )}
                </div>
              );
            })}
          </div>
          {/* connector bar */}
          <div className="h-1 bg-white/10 rounded-full mx-4 -mt-1">
            <div
              className="h-1 bg-[#f5a623] rounded-full transition-all duration-500"
              style={{ width: `${(stepIndex / (totalProgress - 1)) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Card */}
      <div className="w-full max-w-md">

        {/* ── STEP: Business ── */}
        {step === 'business' && (
          <WizardCard
            title="What's your business called?"
            subtitle="This appears on receipts, the customer menu, and notification emails."
            icon={<Building2 className="w-5 h-5 text-[#f5a623]" />}
          >
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">Business Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  placeholder="e.g. Mario's Pizza, The Golden Chippy…"
                  autoFocus
                  className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/60 focus:border-[#f5a623] transition-all"
                />
                {businessName.trim().length > 0 && businessName.trim().length < 2 && (
                  <p className="text-red-400 text-xs mt-1">Must be at least 2 characters</p>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">Tagline <span className="text-white/40 font-normal">(optional)</span></label>
                <input
                  type="text"
                  value={tagline}
                  onChange={e => setTagline(e.target.value)}
                  placeholder="e.g. Biggleswade's Favourite Chippy"
                  className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/60 focus:border-[#f5a623] transition-all"
                />
              </div>
              {businessName.trim().length >= 2 && (
                <div className="bg-[#f5a623]/10 border border-[#f5a623]/30 rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#f5a623] flex items-center justify-center font-black text-[#0f1f3d] text-lg flex-shrink-0">
                    {businessName.trim().charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">{businessName.trim()}</p>
                    {tagline && <p className="text-white/50 text-xs">{tagline.trim()}</p>}
                  </div>
                </div>
              )}
            </div>
          </WizardCard>
        )}

        {/* ── STEP: Contact ── */}
        {step === 'contact' && (
          <WizardCard
            title="How can customers reach you?"
            subtitle="Your phone number is shown on order confirmations, and the postcode is used for delivery distance checks."
            icon={<Phone className="w-5 h-5 text-[#f5a623]" />}
          >
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">Phone Number <span className="text-red-400">*</span></label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. 01767 448081"
                  autoFocus
                  className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/60 focus:border-[#f5a623] transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">Street / Area</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="e.g. 12 High Street"
                  className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/60 focus:border-[#f5a623] transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1.5">Town / City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="e.g. Biggleswade"
                    className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/60 focus:border-[#f5a623] transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1.5">Postcode <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={postcode}
                    onChange={e => setPostcode(e.target.value.toUpperCase())}
                    placeholder="SG18 8JR"
                    maxLength={8}
                    className={`w-full bg-white/10 border text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-[#f5a623]/60 focus:border-[#f5a623] transition-all ${
                      postcode.trim().replace(/\s/,'').length > 0 && postcode.trim().replace(/\s/,'').length < 5
                        ? 'border-red-500/60'
                        : 'border-white/20'
                    }`}
                  />
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#f5a623] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-white/60">
                  Your postcode is used to calculate delivery distances from your store.
                  Must be a full UK postcode (e.g. SG18 8JR).
                </p>
              </div>
            </div>
          </WizardCard>
        )}

        {/* ── STEP: Branding ── */}
        {step === 'branding' && (
          <WizardCard
            title="Choose your brand colours"
            subtitle="These are applied to buttons, the header, and price tags across the entire customer-facing site."
            icon={<Palette className="w-5 h-5 text-[#f5a623]" />}
          >
            <div className="space-y-5">
              {/* Primary colour */}
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-2">Primary Colour <span className="text-white/40 font-normal">(buttons, highlights, prices)</span></label>
                <div className="flex items-center gap-3 mb-2">
                  <div className="relative w-12 h-10 rounded-xl overflow-hidden border-2 border-white/20 flex-shrink-0 cursor-pointer">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={e => setPrimaryColor(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="w-full h-full" style={{ background: primaryColor }} />
                  </div>
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="flex-1 bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#f5a623]/60"
                  />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {PRIMARY_PRESETS.map(c => (
                    <button key={c} type="button" onClick={() => setPrimaryColor(c)}
                      className="w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 flex-shrink-0"
                      style={{ background: c, borderColor: primaryColor === c ? '#fff' : 'transparent' }} />
                  ))}
                </div>
              </div>

              {/* Accent colour */}
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-2">Accent Colour <span className="text-white/40 font-normal">(header, dark backgrounds)</span></label>
                <div className="flex items-center gap-3 mb-2">
                  <div className="relative w-12 h-10 rounded-xl overflow-hidden border-2 border-white/20 flex-shrink-0 cursor-pointer">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={e => setAccentColor(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="w-full h-full" style={{ background: accentColor }} />
                  </div>
                  <input
                    type="text"
                    value={accentColor}
                    onChange={e => setAccentColor(e.target.value)}
                    className="flex-1 bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#f5a623]/60"
                  />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {ACCENT_PRESETS.map(c => (
                    <button key={c} type="button" onClick={() => setAccentColor(c)}
                      className="w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 flex-shrink-0"
                      style={{ background: c, borderColor: accentColor === c ? '#f5a623' : 'transparent' }} />
                  ))}
                </div>
              </div>

              {/* Live preview */}
              <div className="rounded-xl overflow-hidden border border-white/10">
                <div className="px-4 py-3 flex items-center justify-between" style={{ background: accentColor }}>
                  <span className="text-white font-bold text-sm">{businessName || 'Your Restaurant'}</span>
                  <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: primaryColor, color: accentColor }}>
                    View Order
                  </span>
                </div>
                <div className="px-4 py-2.5 flex items-center gap-3" style={{ background: accentColor, opacity: 0.85 }}>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: primaryColor, color: accentColor }}>
                    💷 Cash Only
                  </span>
                  <span className="text-xs" style={{ color: primaryColor }}>📞 {phone || '01234 567890'}</span>
                </div>
              </div>
              <p className="text-xs text-white/40 text-center">Live preview of your header &amp; primary button</p>
            </div>
          </WizardCard>
        )}

        {/* ── STEP: PINs ── */}
        {step === 'pins' && (
          <WizardCard
            title="Set your security PINs"
            subtitle="Two separate PINs protect your kitchen screen. Staff can manage orders; admins can also cancel orders."
            icon={<Shield className="w-5 h-5 text-[#f5a623]" />}
          >
            <div className="space-y-5">
              {/* Staff PIN */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#f5a623]/20 flex items-center justify-center flex-shrink-0">
                    <KeyRound className="w-4 h-4 text-[#f5a623]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Staff PIN</p>
                    <p className="text-xs text-white/50">For all kitchen staff — accept, prepare, mark ready</p>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type={showStaff ? 'text' : 'password'}
                    value={staffPin}
                    onChange={e => setStaffPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="Enter 4–8 digit PIN"
                    autoFocus
                    className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-3 pr-10 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-[#f5a623]/60 focus:border-[#f5a623] transition-all"
                  />
                  <button type="button" onClick={() => setShowStaff(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                    {showStaff ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {staffPin.length > 0 && staffPin.length < 4 && (
                  <p className="text-amber-400 text-xs">Minimum 4 digits</p>
                )}
              </div>

              {/* Admin PIN */}
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <ShieldAlert className="w-4 h-4 text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Admin PIN</p>
                    <p className="text-xs text-white/50">Required to cancel orders — keep this private</p>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type={showAdmin ? 'text' : 'password'}
                    value={adminPin}
                    onChange={e => setAdminPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="Enter a different 4–8 digit PIN"
                    className="w-full bg-white/10 border border-red-500/30 text-white placeholder-white/30 rounded-xl px-4 py-3 pr-10 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                  />
                  <button type="button" onClick={() => setShowAdmin(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                    {showAdmin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {adminPin.length > 0 && adminPin.length < 4 && (
                  <p className="text-amber-400 text-xs">Minimum 4 digits</p>
                )}
              </div>

              {pinError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                  <p className="text-red-400 text-xs font-semibold">{pinError}</p>
                </div>
              )}

              <div className="bg-[#f5a623]/10 border border-[#f5a623]/20 rounded-xl px-4 py-3">
                <p className="text-xs text-[#f5a623]/80">
                  <strong className="text-[#f5a623]">Tip:</strong> PINs are stored on this device only. You can change them any time from the lock screen.
                </p>
              </div>
            </div>
          </WizardCard>
        )}

        {/* ── STEP: Done ── */}
        {step === 'done' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl shadow-lg shadow-[#f5a623]/30" style={{ background: primaryColor }}>
              <Zap className="w-10 h-10" style={{ color: accentColor }} />
            </div>
            <div>
              <h2 className="text-white font-black text-2xl">{businessName || 'Your kitchen'} is ready!</h2>
              <p className="text-white/50 text-sm mt-2">Your kitchen dashboard is configured and ready to receive orders.</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-left space-y-2">
              <SummaryRow label="Business name" value={businessName} />
              {phone     && <SummaryRow label="Phone"         value={phone} />}
              {postcode  && <SummaryRow label="Postcode"      value={postcode} />}
              <SummaryRow label="Staff PIN"  value={'●'.repeat(staffPin.length)} />
              <SummaryRow label="Admin PIN"  value={'●'.repeat(adminPin.length)} />
              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-white/40">Brand colours</span>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md border border-white/20" style={{ background: primaryColor }} />
                  <div className="w-5 h-5 rounded-md border border-white/20" style={{ background: accentColor }} />
                </div>
              </div>
            </div>
            <button
              onClick={onComplete}
              className="w-full py-4 rounded-xl font-black text-base transition-all active:scale-95 hover:opacity-90"
              style={{ background: primaryColor, color: accentColor }}
            >
              Launch Kitchen Screen →
            </button>
            <p className="text-xs text-white/30">You can update all these settings anytime in Menu Admin → Venue Settings</p>
          </div>
        )}

        {/* Navigation buttons */}
        {step !== 'done' && (
          <div className="flex gap-3 mt-4">
            {stepIndex > 0 && (
              <button
                onClick={back}
                className="flex items-center gap-1.5 px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all text-sm"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}

            {step !== 'pins' ? (
              <button
                onClick={next}
                disabled={!canAdvance()}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: '#f5a623', color: '#0f1f3d' }}
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={!canAdvance() || !!pinError || saving}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: '#f5a623', color: '#0f1f3d' }}
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                ) : (
                  <>Finish Setup <CheckCircle className="w-4 h-4" /></>
                )}
              </button>
            )}
          </div>
        )}

        {/* Skip link */}
        {step !== 'done' && (
          <div className="text-center mt-3">
            <button
              onClick={() => {
                localStorage.setItem(SETUP_KEY, 'true');
                onComplete();
              }}
              className="text-xs text-white/25 hover:text-white/50 transition-colors"
            >
              Skip setup and go to kitchen →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helper sub-components ──────────────────────────────────────────────────
function WizardCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <div className="bg-[#0f1f3d] px-5 py-4 flex items-start gap-3 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl bg-[#f5a623]/20 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div>
          <h2 className="text-white font-bold text-base">{title}</h2>
          <p className="text-white/50 text-xs mt-0.5 leading-snug">{subtitle}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-white/40">{label}</span>
      <span className="text-xs text-white font-semibold">{value}</span>
    </div>
  );
}
