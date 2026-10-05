import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Clock, MapPin, Banknote, ChevronRight, Trash2, Plus, Minus, User, MessageSquare, Truck, Store, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { DeliveryZone } from '@/lib/venueConfig';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/hooks/useCart';
import { useOrders } from '@/hooks/useOrders';
import { useVenueConfig } from '@/hooks/useVenueConfig';
import { formatPrice } from '@/lib/utils';
import { getSavedProfile, signOut } from '@/lib/auth';
import { toast } from 'sonner';

const CUSTOM_TIME_OPTION = { value: 'custom', label: '🕐 Choose a specific time…' };

/** Normalise UK postcode — accepts SG188JR or SG18 8JR → SG18 8JR */
function normalisePostcode(raw: string): string {
  const stripped = raw.replace(/\s/g, '').toUpperCase();
  if (stripped.length >= 5) return stripped.slice(0, -3) + ' ' + stripped.slice(-3);
  return stripped.toUpperCase();
}

/** Fetch full house-level addresses for a UK postcode using Nominatim */
async function fetchAddressSuggestions(postcode: string): Promise<string[]> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(postcode)}&countrycodes=gb&format=json&addressdetails=1&limit=50`;
    const res  = await fetch(url, { headers: { 'Accept-Language': 'en-GB', 'User-Agent': 'FishBarOrderingApp/1.0' } });
    const data = await res.json() as Array<{
      address: {
        house_number?: string;
        road?: string;
        suburb?: string;
        town?: string;
        city?: string;
      }
    }>;

    const seen = new Set<string>();
    const entries: { display: string; sortKey: number }[] = [];

    for (const item of data) {
      const house = item.address?.house_number;
      const road  = item.address?.road;
      if (!road) continue;
      const display = house ? `${house} ${road}` : road;
      if (!seen.has(display)) {
        seen.add(display);
        const num = house ? parseInt(house, 10) : NaN;
        entries.push({ display, sortKey: isNaN(num) ? 99999 : num });
      }
    }

    entries.sort((a, b) => a.sortKey - b.sortKey);
    return entries.map(e => e.display);
  } catch {
    return [];
  }
}

export default function Checkout() {
  const navigate = useNavigate();
  const { items, subtotal, updateQuantity, updateItemNote, clearCart } = useCart();
  const { placeOrder } = useOrders();
  const { config: venue } = useVenueConfig();

  const [orderType, setOrderType] = useState<'collection' | 'delivery'>('collection');
  const handleSetOrderType = (type: 'collection' | 'delivery') => {
    setOrderType(type);
    if (type === 'delivery') {
      setForm(prev => {
        const mins = parseInt(prev.prepTime);
        return (!isNaN(mins) && mins < 30) ? { ...prev, prepTime: '30' } : prev;
      });
    }
  };
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryPostcode, setDeliveryPostcode] = useState('');
  const [postcodeStatus, setPostcodeStatus] = useState<'idle' | 'checking' | 'ok' | 'outside' | 'error'>('idle');
  const [detectedZone, setDetectedZone] = useState<DeliveryZone | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [manualAddress, setManualAddress] = useState(false);
  // Smart default: longCookMinutes if cart has any longCookKeyword, else first prepTimeOption
  const getSmartDefaultTime = useCallback((cartItems: typeof items) => {
    const keywords = venue.longCookKeywords ?? ['fish', 'cod', 'haddock', 'plaice', 'burger', 'chicken', 'scampi', 'sausage'];
    const longMins  = String(venue.longCookMinutes ?? 30);
    const needsLonger = cartItems.some(item =>
      keywords.some(kw => item.name.toLowerCase().includes(kw.toLowerCase()))
    );
    return needsLonger ? longMins : '20';
  }, [venue.longCookKeywords, venue.longCookMinutes]);

  const [form, setForm] = useState(() => {
    return { name: '', phone: '', email: '', notes: '', prepTime: '20' };
  });
  const postcodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [customTime, setCustomTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [savedProfile, setSavedProfile] = useState(getSavedProfile());
  const isScheduled = sessionStorage.getItem('mead_schedule_mode') === 'true';

  const hasZones = (venue.deliveryZones ?? []).length > 0;

  const activeDeliveryCharge =
    orderType === 'delivery' && postcodeStatus === 'ok'
      ? (hasZones ? (detectedZone?.charge ?? 0) : (venue.deliveryCharge ?? 0))
      : 0;
  const orderTotal = subtotal + activeDeliveryCharge;
  const belowMinOrder = orderType === 'delivery' && (venue.deliveryMinOrder ?? 0) > 0 && subtotal < (venue.deliveryMinOrder ?? 0);
  const postcodeBlocking = orderType === 'delivery' && postcodeStatus !== 'ok';

  const lookupPostcode = useCallback(async (pc: string) => {
    const clean = normalisePostcode(pc);
    const fullPostcodeRegex = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/;
    if (!fullPostcodeRegex.test(clean)) {
      setPostcodeStatus('idle');
      setDetectedZone(null);
      return;
    }

    const zones = (venue.deliveryZones ?? []);

    setPostcodeStatus('checking');
    setDetectedZone(null);

    try {
      const venuePostcodeClean = venue.postcode?.replace(/\s/g, '').toUpperCase() ?? '';

      if (venuePostcodeClean.length < 5) {
        toast.error('Delivery distance check unavailable — please contact the store.');
        setPostcodeStatus('error');
        return;
      }

      let vLat: number | null = null;
      let vLon: number | null = null;
      const venueRes  = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(venuePostcodeClean)}`);
      const venueJson = await venueRes.json();
      if (venueJson.status === 200) {
        vLat = venueJson.result.latitude;
        vLon = venueJson.result.longitude;
      }

      if (vLat === null) {
        toast.error('Could not look up venue location — please contact the store.');
        setPostcodeStatus('error');
        return;
      }

      const custRes  = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(clean)}`);
      const custJson = await custRes.json();

      if (custJson.status !== 200) {
        setPostcodeStatus('error');
        return;
      }
      const cLat: number = custJson.result.latitude;
      const cLon: number = custJson.result.longitude;

      const R = 3958.8;
      const dLat = (cLat - vLat) * Math.PI / 180;
      const dLon = (cLon - vLon) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(vLat * Math.PI / 180) * Math.cos(cLat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
      const distMiles = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      console.log(`[postcode] ${clean} is ${distMiles.toFixed(2)} miles from ${venue.postcode}`);

      if (zones.length === 0) {
        setPostcodeStatus('ok');
        const addrs = await fetchAddressSuggestions(clean);
        setAddressSuggestions(addrs);
        setSelectedAddress('');
        return;
      }

      const sorted = [...zones].sort((a, b) => a.maxMiles - b.maxMiles);
      const zone = sorted.find(z => distMiles <= z.maxMiles);
      if (zone) {
        setDetectedZone(zone);
        setPostcodeStatus('ok');
      } else {
        setPostcodeStatus('outside');
        return;
      }

      const addrs = await fetchAddressSuggestions(clean);
      setAddressSuggestions(addrs);
      setSelectedAddress('');
    } catch (err) {
      console.error('[postcode lookup]', err);
      setPostcodeStatus('error');
    }
  }, [venue.postcode, venue.deliveryZones]);

  useEffect(() => {
    if (orderType !== 'delivery') return;
    if (postcodeTimer.current) clearTimeout(postcodeTimer.current);
    postcodeTimer.current = setTimeout(() => lookupPostcode(deliveryPostcode), 600);
    return () => { if (postcodeTimer.current) clearTimeout(postcodeTimer.current); };
  }, [deliveryPostcode, orderType, lookupPostcode]);

  useEffect(() => {
    if (orderType !== 'delivery') {
      setPostcodeStatus('idle');
      setDetectedZone(null);
      setAddressSuggestions([]);
      setSelectedAddress('');
      setManualAddress(false);
    }
  }, [orderType]);

  // Update default prep time whenever cart items change (e.g. user adds fish)
  useEffect(() => {
    setForm(prev => {
      const smart = getSmartDefaultTime(items);
      // Only auto-adjust if the user hasn't manually changed it away from a smart default
      const autoDefaults = ['20', '30'];
      if (autoDefaults.includes(prev.prepTime)) {
        // For delivery, never drop below 30
        const resolved = orderType === 'delivery' ? '30' : smart;
        return prev.prepTime !== resolved ? { ...prev, prepTime: resolved } : prev;
      }
      return prev;
    });
  }, [items, orderType, getSmartDefaultTime]);

  useEffect(() => {
    const profile = getSavedProfile();
    if (profile) {
      setSavedProfile(profile);
      setForm(prev => ({ ...prev, name: profile.name, phone: profile.phone, email: profile.email || '' }));
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) { toast.error('Your order is empty'); return; }

    // Live emergency-stop check — re-fetch from DB so this works even if
    // the customer already had the page open when staff activated the override.
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: vcRow } = await supabase
        .from('venue_config')
        .select('emergency_stop')
        .eq('id', 'default')
        .single();
      if ((vcRow as { emergency_stop?: boolean } | null)?.emergency_stop) {
        toast.error('Sorry, online ordering is temporarily unavailable. Please try again later or call us.', { duration: 6000 });
        return;
      }
    } catch { /* network error — allow through, kitchen can reject */ }
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error('Please enter your name and phone number');
      return;
    }
    if (orderType === 'delivery' && !deliveryPostcode.trim()) {
      toast.error('Please enter your delivery postcode');
      return;
    }
    if (orderType === 'delivery' && postcodeStatus !== 'ok') {
      toast.error('Please wait for postcode check or enter a valid postcode');
      return;
    }
    const resolvedAddress = manualAddress
      ? deliveryAddress.trim()
      : selectedAddress.trim();
    if (orderType === 'delivery' && !resolvedAddress) {
      toast.error('Please select or enter your delivery address');
      return;
    }
    if (belowMinOrder) {
      toast.error(`Minimum order for delivery is £${(venue.deliveryMinOrder ?? 0).toFixed(2)}`);
      return;
    }

    setSubmitting(true);
    try {
      const resolvedPrepTime = form.prepTime === 'custom'
        ? (customTime ? `time:${customTime}` : '15')
        : form.prepTime;

      const normalisedPC = normalisePostcode(deliveryPostcode);
      const finalAddress = manualAddress ? deliveryAddress.trim() : selectedAddress.trim();

      const deliveryNote = orderType === 'delivery'
        ? `DELIVERY TO: ${normalisedPC} — ${finalAddress}` +
          (detectedZone ? ` [${detectedZone.name} zone, ${detectedZone.maxMiles}mi]` : '') +
          (form.notes.trim() ? ` | ${form.notes.trim()}` : '')
        : form.notes.trim() || undefined;

      const order = await placeOrder(
        {
          items,
          subtotal,
          total: orderTotal,
          customerName: form.name.trim(),
          customerPhone: form.phone.trim(),
          customerEmail: form.email.trim() || undefined,
          notes: deliveryNote,
          prepTime: resolvedPrepTime,
          deliveryAddress: orderType === 'delivery' ? `${normalisedPC} — ${finalAddress}` : undefined,
        },
        isScheduled ? 'scheduled' : 'new'
      );
      if (isScheduled) sessionStorage.removeItem('mead_schedule_mode');
      clearCart();
      navigate(`/order-confirmation/${order.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to place order';
      toast.error(msg);
      setSubmitting(false);
    }
  };

  if (items.length === 0 && !submitting) {
    return (
      <div className="min-h-screen bg-[#f8f8f5] flex flex-col items-center justify-center text-center px-4">
        <div className="text-6xl mb-4">🐟</div>
        <h2 className="text-xl font-bold text-[var(--brand-accent)]">Your order is empty</h2>
        <button onClick={() => navigate('/')} className="mt-4 bg-[var(--brand-primary)] text-[var(--brand-accent)] font-bold px-6 py-3 rounded-xl">
          Back to Menu
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f8f5]">
      {/* Header */}
      <div className="bg-[var(--brand-accent)] text-white px-4 py-4 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-lg">Checkout</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {savedProfile && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-green-600 flex-shrink-0" />
              <p className="text-green-800 text-sm font-semibold">Signed in as {savedProfile.name}</p>
            </div>
            <button
              onClick={async () => { await signOut(); setSavedProfile(null); setForm(prev => ({ ...prev, name: '', phone: '' })); }}
              className="text-xs text-green-600 hover:text-green-800 font-medium transition-colors"
            >
              Sign out
            </button>
          </div>
        )}

        {isScheduled && (
          <div className="bg-indigo-600 rounded-2xl p-4 text-white flex items-start gap-3">
            <Clock className="w-5 h-5 text-indigo-200 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-black">You're placing a scheduled pre-order</p>
              <p className="text-indigo-200 text-sm mt-0.5">The store is currently closed. Your order will be held and confirmed by the kitchen once they open. No payment is taken now — pay in cash when you collect.</p>
            </div>
          </div>
        )}

        {/* ── Delivery / Collection Toggle ── */}
        {venue.deliveryEnabled && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="font-bold text-[var(--brand-accent)] text-sm">How would you like your order?</h2>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSetOrderType('collection')}
                className={`flex flex-col items-center gap-2 py-4 rounded-xl font-semibold text-sm border-2 transition-all ${
                  orderType === 'collection'
                    ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-accent)]'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <Store className="w-5 h-5" />
                Collection
                <span className="text-[10px] font-normal text-gray-400">Pick up in store</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetOrderType('delivery')}
                className={`flex flex-col items-center gap-2 py-4 rounded-xl font-semibold text-sm border-2 transition-all ${
                  orderType === 'delivery'
                    ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-accent)]'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <Truck className="w-5 h-5" />
                Delivery
                <span className="text-[10px] font-normal text-gray-400">
                  {hasZones
                    ? `${(venue.deliveryZones ?? []).length} zones`
                    : ((venue.deliveryCharge ?? 0) > 0 ? `+£${(venue.deliveryCharge ?? 0).toFixed(2)}` : 'Free delivery')}
                </span>
              </button>
            </div>

            {orderType === 'delivery' && (
              <div className="px-4 pb-4 pt-2 space-y-3 border-t border-gray-100">
                <p className="text-xs font-bold text-[var(--brand-accent)] flex items-center gap-1.5 pt-1">
                  <MapPin className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                  Enter your delivery postcode to see charges
                </p>

                <div>
                  <label htmlFor="topPostcode" className="block text-xs font-semibold text-gray-600 mb-1">
                    Postcode <span className="text-red-500">*</span>
                    <span className="font-normal text-gray-400 ml-1">— e.g. SG18 8JR or SG188JR</span>
                  </label>
                  <div className="relative">
                    <input
                      id="topPostcode"
                      type="text"
                      value={deliveryPostcode}
                      onChange={e => setDeliveryPostcode(e.target.value)}
                      onBlur={e => setDeliveryPostcode(normalisePostcode(e.target.value))}
                      placeholder="e.g. SG18 8JR"
                      maxLength={8}
                      autoFocus
                      className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 pr-10 font-mono tracking-widest uppercase ${
                        postcodeStatus === 'ok'      ? 'border-green-400 focus:ring-green-300 bg-green-50' :
                        postcodeStatus === 'outside' ? 'border-red-400   focus:ring-red-300   bg-red-50'   :
                        postcodeStatus === 'error'   ? 'border-orange-400 focus:ring-orange-300'            :
                        'border-gray-200 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)]'
                      }`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {postcodeStatus === 'checking' && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
                      {postcodeStatus === 'ok'       && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      {postcodeStatus === 'outside'  && <AlertCircle  className="w-4 h-4 text-red-500"   />}
                      {postcodeStatus === 'error'    && <AlertCircle  className="w-4 h-4 text-orange-500" />}
                    </div>
                  </div>
                  {postcodeStatus === 'ok' && detectedZone && (
                    <p className="text-xs text-green-700 font-semibold mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {detectedZone.name} zone — delivery charge: {detectedZone.charge === 0 ? 'Free' : `£${detectedZone.charge.toFixed(2)}`}
                    </p>
                  )}
                  {postcodeStatus === 'ok' && !detectedZone && (
                    <p className="text-xs text-green-700 font-semibold mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Postcode confirmed
                      {(venue.deliveryCharge ?? 0) > 0 ? ` — delivery charge: £${(venue.deliveryCharge ?? 0).toFixed(2)}` : ' — free delivery'}
                    </p>
                  )}
                  {postcodeStatus === 'outside' && (
                    <div className="text-xs text-orange-700 font-semibold mt-1 bg-orange-50 border border-orange-200 rounded-lg px-2.5 py-2.5 space-y-1">
                      <p className="flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        Currently out of our delivery range, we are working hard to look for drivers.
                      </p>
                      <p className="text-orange-600 pl-5">
                        Sorry — for now you will need to collect. Call the store to see if they can make an exception:{' '}
                        <a href="tel:01767448081" className="font-bold underline hover:text-orange-800">01767 448081</a>
                      </p>
                    </div>
                  )}
                  {postcodeStatus === 'error' && (
                    <p className="text-xs text-orange-600 mt-1">Couldn't verify postcode — please double-check it's correct.</p>
                  )}
                </div>

                {postcodeStatus === 'ok' && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-[var(--brand-accent)] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                      Select your delivery address
                    </p>

                    {!manualAddress ? (
                      <>
                        {addressSuggestions.length > 0 ? (
                          <>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">
                                Your address <span className="text-red-500">*</span>
                                <span className="font-normal text-gray-400 ml-1">— {addressSuggestions.length} addresses found</span>
                              </label>
                              <select
                                value={selectedAddress}
                                onChange={e => setSelectedAddress(e.target.value)}
                                autoFocus
                                className={`w-full border rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)] transition-all ${
                                  selectedAddress ? 'border-green-400 bg-green-50' : 'border-gray-200'
                                }`}
                              >
                                <option value="">— Select your address —</option>
                                {addressSuggestions.map((addr, i) => (
                                  <option key={i} value={addr}>{addr}, {normalisePostcode(deliveryPostcode)}</option>
                                ))}
                              </select>
                            </div>

                            {selectedAddress && (
                              <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                                <p className="text-[10px] text-green-600 font-bold uppercase tracking-wide mb-0.5">Delivering to:</p>
                                <p className="text-sm text-green-800 font-semibold">
                                  {selectedAddress}, {normalisePostcode(deliveryPostcode)}
                                </p>
                              </div>
                            )}
                          </>
                        ) : (
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                              House number &amp; street <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={selectedAddress}
                              onChange={e => setSelectedAddress(e.target.value)}
                              placeholder="e.g. 12 High Street"
                              autoFocus
                              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)]"
                            />
                            <p className="text-[11px] text-gray-400 mt-1">Type your house number and street name</p>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => setManualAddress(true)}
                          className="text-xs text-gray-400 hover:text-[var(--brand-primary)] transition-colors underline-offset-2 hover:underline"
                        >
                          Can't find your address? Enter manually
                        </button>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Full address <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={deliveryAddress}
                            onChange={e => setDeliveryAddress(e.target.value)}
                            placeholder={`e.g. 12 High Street, ${venue.city || 'Town'}, ${normalisePostcode(deliveryPostcode)}`}
                            rows={3}
                            autoFocus
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)] resize-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => { setManualAddress(false); setDeliveryAddress(''); }}
                          className="text-xs text-gray-400 hover:text-[var(--brand-primary)] transition-colors underline-offset-2 hover:underline"
                        >
                          ← Back to address list
                        </button>
                      </>
                    )}
                  </div>
                )}

                {belowMinOrder && (
                  <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                    Minimum order for delivery is £{(venue.deliveryMinOrder ?? 0).toFixed(2)}. Add £{((venue.deliveryMinOrder ?? 0) - subtotal).toFixed(2)} more.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Collection / Delivery Info banner */}
        <div className="bg-[var(--brand-accent)] rounded-2xl p-4 text-white flex flex-col sm:flex-row gap-3">
          <div className="flex items-start gap-3 flex-1">
            {orderType === 'delivery'
              ? <Truck className="w-5 h-5 text-[var(--brand-primary)] mt-0.5 flex-shrink-0" />
              : <MapPin className="w-5 h-5 text-[var(--brand-primary)] mt-0.5 flex-shrink-0" />
            }
            <div>
              <p className="font-bold">{orderType === 'delivery' ? 'Delivery to your address' : 'Collection from store'}</p>
              <p className="text-white/70 text-sm">{venue.businessName}{venue.city ? `, ${venue.city}` : ''}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 flex-1">
            <Clock className="w-5 h-5 text-[var(--brand-primary)] mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold">Freshly prepared to order</p>
              <p className="text-white/70 text-sm">{orderType === 'delivery' ? "We'll get it out to you as soon as possible!" : "We'll call you when it's ready!"}</p>
            </div>
          </div>
        </div>

        {/* Cash Payment Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <Banknote className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-amber-800">{venue.paymentInfo || 'Cash payment'}</p>
            <p className="text-amber-700 text-sm">
              {orderType === 'delivery'
                ? 'No online payment required. Pay the driver on delivery.'
                : 'No online payment required. Just pay at the counter when you collect your order.'}
            </p>
            {/* Online payment link — shown when configured in venue settings */}
            {venue.paymentLinkEnabled && venue.paymentLinkUrl && (
              <a
                href={venue.paymentLinkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-2 w-full font-bold py-3 rounded-xl text-sm transition-all active:scale-95 hover:opacity-90"
                style={{ background: 'var(--brand-primary)', color: 'var(--brand-accent)' }}
              >
                💳 Pay Online
              </a>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-bold text-[var(--brand-accent)]">Your Order</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {items.map(item => (
              <div key={item.id} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">{formatPrice(item.price)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                    >
                      {item.quantity === 1 ? <Trash2 className="w-3 h-3 text-red-400" /> : <Minus className="w-3 h-3" />}
                    </button>
                    <span className="w-5 text-center font-bold text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-full bg-[var(--brand-primary)] flex items-center justify-center"
                    >
                      <Plus className="w-3 h-3 text-[var(--brand-accent)]" />
                    </button>
                  </div>
                  <span className="font-bold text-[var(--brand-accent)] text-sm w-14 text-right">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
                {expandedNotes[item.id] ? (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={item.notes ?? ''}
                      onChange={e => updateItemNote(item.id, e.target.value)}
                      placeholder={`Note for ${item.name}…`}
                      className="w-full border border-[var(--brand-primary)]/60 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 text-gray-800 placeholder-gray-400"
                      autoFocus
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setExpandedNotes(prev => ({ ...prev, [item.id]: true }))}
                    className="mt-1.5 flex items-center gap-1 text-[10px] text-gray-400 hover:text-[var(--brand-primary)] transition-colors"
                  >
                    <MessageSquare className="w-3 h-3" />
                    {item.notes ? <span className="text-amber-700 font-medium">📝 {item.notes}</span> : 'Add item note'}
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 space-y-1">
            {orderType === 'delivery' && postcodeStatus === 'ok' && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
              </div>
            )}
            {orderType === 'delivery' && postcodeStatus === 'ok' && (
              <div className="flex justify-between text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  Delivery charge
                  {detectedZone && <span className="text-[10px] text-gray-400">({detectedZone.name})</span>}
                </span>
                <span>{activeDeliveryCharge > 0 ? formatPrice(activeDeliveryCharge) : 'Free'}</span>
              </div>
            )}
            {orderType === 'delivery' && postcodeStatus !== 'ok' && (
              <div className="flex justify-between text-sm text-gray-400 italic">
                <span>Delivery charge</span>
                <span className="text-xs">Enter postcode above ↑</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1">
              <span className="font-bold text-gray-700">Total to Pay</span>
              <span className="font-black text-xl text-[var(--brand-accent)]">{formatPrice(orderTotal)}</span>
            </div>
          </div>
        </div>

        {/* Customer Details Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-bold text-[var(--brand-accent)]">Your Details</h2>
          </div>
          <div className="px-4 py-4 space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. John Smith"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)]"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                value={form.phone}
                onChange={handleChange}
                placeholder="e.g. 07700 900000"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)]"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Email Address <span className="text-gray-400 font-normal">(for order confirmation)</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="e.g. you@example.com"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)]"
              />
              <p className="text-xs text-gray-400 mt-1">We'll send you a confirmation when your order is accepted.</p>
            </div>

            <div>
              <label htmlFor="prepTime" className="block text-sm font-semibold text-gray-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[var(--brand-primary)]" />
                  {orderType === 'delivery' ? 'Preferred Delivery Time' : 'Preferred Collection Time'}
                </span>
              </label>
              {orderType === 'delivery' && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2">
                  🚚 Minimum 30 minutes for delivery orders.
                </p>
              )}

              <select
                id="prepTime"
                name="prepTime"
                value={form.prepTime}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)] bg-white"
              >
                {[...(venue.prepTimeOptions ?? []), CUSTOM_TIME_OPTION]
                  .filter(opt => orderType !== 'delivery' || opt.value === 'custom' || parseInt(opt.value) >= 30)
                  .map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
              </select>

              {form.prepTime === 'custom' && (
                <div className="mt-2">
                  <label className="text-xs font-semibold text-gray-600 block mb-1">
                    Select your preferred {orderType === 'delivery' ? 'delivery' : 'collection'} time
                  </label>
                  <input
                    type="time"
                    value={customTime}
                    onChange={e => setCustomTime(e.target.value)}
                    className="w-full border border-[var(--brand-primary)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)] bg-white font-mono text-[var(--brand-accent)] font-bold"
                  />
                  {customTime && (
                    <p className="text-xs text-[var(--brand-accent)] font-semibold mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[var(--brand-primary)]" />
                      {orderType === 'delivery' ? 'Delivery' : 'Collection'} at {new Date(`2000-01-01T${customTime}`).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">{venue.prepTimeNote || "We'll do our best to have your order ready at your preferred time."}</p>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Special Instructions <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="notes"
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="e.g. extra salt & vinegar, ring doorbell on arrival..."
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)] resize-none"
              />
            </div>
          </div>

          <div className="px-4 pb-4">
            <button
              type="submit"
              disabled={submitting || belowMinOrder || postcodeBlocking}
              className="w-full bg-[var(--brand-primary)] hover:opacity-90 disabled:opacity-70 text-[var(--brand-accent)] font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-base"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-[var(--brand-accent)]/30 border-t-[var(--brand-accent)] rounded-full animate-spin" />
                  Placing Order...
                </span>
              ) : (
                <>
                  {orderType === 'delivery' ? <Truck className="w-5 h-5" /> : <Store className="w-5 h-5" />}
                  {orderType === 'delivery' ? 'Order Delivery' : 'Place Order'} — {formatPrice(orderTotal)}
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
            <p className="text-center text-xs text-gray-400 mt-2">By placing your order, you agree to pay the total amount in cash {orderType === 'delivery' ? 'on delivery' : 'at collection'}.</p>
          </div>
        </form>
      </div>
    </div>
  );
}
