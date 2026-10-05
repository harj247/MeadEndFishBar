// ── White-label venue configuration ──────────────────────────────────────────
// Config is fetched from the DB once on app load, cached in localStorage so
// synchronous callers (openingHours.ts, printer.ts) can read it without awaiting.

import { ReceiptConfig, mergeReceiptConfig, DEFAULT_RECEIPT_CONFIG } from '@/lib/receiptConfig';
export type { ReceiptConfig } from '@/lib/receiptConfig';

export interface DaySlot {
  open:  string; // "HH:MM"
  close: string; // "HH:MM"
}

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface DeliveryZone {
  name:     string;   // e.g. "Local", "Standard"
  maxMiles: number;   // outer edge of this zone in miles
  charge:   number;   // delivery fee in £ for this zone
}

/** @deprecated Use receiptConfig instead — kept for backward-compat migration only */
export interface ReceiptFields {
  customerName:    boolean;
  orderNumber:     boolean;
  orderType:       boolean;
  phone:           boolean;
  deliveryAddress: boolean;
  orderDate:       boolean;
  orderTime:       boolean;
  fieldOrder?:     string[];
}

export interface VenueConfig {
  emergencyStop:      boolean;  // manual override — blocks NEW online orders regardless of opening hours
  emergencyStopStyle: string;   // 'standard' | 'large-clear' | 'high-contrast'
  businessName:    string;
  tagline:         string;
  phone:           string;
  address:         string;
  city:            string;
  postcode:        string;
  paymentInfo:     string;
  collectionOnly:  boolean;
  openingHours:    Record<DayKey, DaySlot[]>;
  heroImageUrl:    string;
  logoUrl:         string;  // URL for logo shown in header navbar
  primaryColor:    string;  // e.g. '#f5a623' — buttons, highlights
  accentColor:     string;  // e.g. '#0f1f3d' — header, dark backgrounds
  deliveryEnabled:  boolean;        // true = offer delivery option at checkout
  deliveryCharge:   number;         // legacy flat fee — superseded by deliveryZones when zones exist
  deliveryMinOrder: number;         // minimum order value for delivery
  deliveryZones:    DeliveryZone[]; // radius-based zone pricing (sorted by maxMiles asc)
  collectionSlots:  string[];        // e.g. ['12:00','12:30','13:00'] — shown as dropdown on checkout
  prepTimeOptions:  { value: string; label: string }[]; // editable dropdown options for collection/delivery time
  prepTimeNote:     string;           // helper text shown below the time dropdown
  paymentLinkEnabled: boolean;         // show a payment link button on checkout
  paymentLinkUrl:     string;          // URL of the online payment page
  condimentOptions:   string[];        // editable salt & vinegar condiment choices
  longCookKeywords:    string[];        // keywords in item names that trigger a longer default prep time
  longCookMinutes:     number;          // the longer default prep time in minutes (e.g. 30)
  // Hero banner text styling
  heroTextPlacement:  string;  // e.g. 'bottom-left' | 'bottom-center' | 'bottom-right' | 'center-left' | 'center' | 'center-right' | 'top-left' | 'top-center' | 'top-right'
  heroFontStyle:      string;  // 'sans' | 'serif' | 'mono' | 'slab'
  heroBold:           boolean; // whether business name is font-black or font-normal
  heroShowStars:      boolean; // show star rating row on hero
  heroStarCount:      number;  // 1–5
  allergenMessage:    string;  // shown in the menu footer allergen section
  receiptFields:      ReceiptFields; // legacy — kept for DB round-trip; use receiptConfig in printer
  receiptFieldOrder:  string[];     // legacy — kept for DB round-trip
  receiptConfig:      ReceiptConfig; // Receipt Builder config — single source of truth for print output
}

const STORAGE_KEY = 'venue_config_cache';

export const DEFAULT_CONFIG: VenueConfig = {
  businessName:   'My Takeaway',
  tagline:        'Order Online',
  phone:          '',
  address:        '',
  city:           '',
  postcode:       '',
  paymentInfo:    'Cash in store only',
  collectionOnly: true,
  heroImageUrl:   '',
  logoUrl:        '',
  primaryColor:   '#f5a623',
  accentColor:    '#0f1f3d',
  deliveryEnabled:  false,
  deliveryCharge:   0,
  deliveryMinOrder: 0,
  deliveryZones:    [],
  collectionSlots:  [],
  prepTimeOptions: [
    { value: '20', label: 'Around 20 minutes' },
    { value: '30', label: 'Around 30 minutes' },
    { value: '45', label: 'Around 45 minutes' },
    { value: '60', label: 'Around 1 hour' },
  ],
  prepTimeNote: 'The kitchen will reply back with an estimated time to collect.',
  paymentLinkEnabled: false,
  paymentLinkUrl:     '',
  condimentOptions:   ['Salt & Vinegar', 'Salt only', 'Vinegar only', 'No salt or vinegar', 'No seasoning'],
  longCookKeywords:    ['fish', 'cod', 'haddock', 'plaice', 'burger', 'chicken', 'scampi', 'sausage'],
  longCookMinutes:     30,
  heroTextPlacement:  'bottom-left',
  heroFontStyle:      'sans',
  heroBold:           true,
  heroShowStars:      true,
  heroStarCount:      5,
  allergenMessage:    'For allergen information please call the store.',
  emergencyStop:      false,
  emergencyStopStyle:  'large-clear',
  receiptFieldOrder: ['orderType','orderNumber','orderDate','orderTime','customerName','phone','deliveryAddress'],
  receiptFields: {
    customerName:    true,
    orderNumber:     true,
    orderType:       true,
    phone:           true,
    deliveryAddress: true,
    orderDate:       true,
    orderTime:       true,
  },
  receiptConfig: DEFAULT_RECEIPT_CONFIG,

  openingHours: {
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
    sun: [],
  },
};

/** Synchronous read — falls back to DEFAULT_CONFIG if cache is empty. */
export function getVenueConfig(): VenueConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as VenueConfig;
  } catch { /* ignore */ }
  return DEFAULT_CONFIG;
}

/** Apply brand colors immediately on page load from cache */
(function initBrandColors() {
  try {
    const cfg = getVenueConfig();
    applyBrandColors(cfg);
  } catch { /* ignore */ }
})();

/** Write to localStorage (called after a successful DB fetch or save). */
export function cacheVenueConfig(cfg: VenueConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

/** Inject brand colours as CSS custom properties on :root */
export function applyBrandColors(cfg: VenueConfig) {
  const root = document.documentElement;
  root.style.setProperty('--brand-primary', cfg.primaryColor || '#f5a623');
  root.style.setProperty('--brand-accent',  cfg.accentColor  || '#0f1f3d');
}

/** Map DB row → VenueConfig */
export function rowToVenueConfig(row: Record<string, unknown>): VenueConfig {
  const rawHours = row.opening_hours as Record<string, unknown> ?? {};
  const openingHours: Record<DayKey, DaySlot[]> = {} as Record<DayKey, DaySlot[]>;
  const days: DayKey[] = ['mon','tue','wed','thu','fri','sat','sun'];
  for (const d of days) {
    const slots = rawHours[d];
    if (Array.isArray(slots)) {
      openingHours[d] = slots as DaySlot[];
    } else {
      openingHours[d] = DEFAULT_CONFIG.openingHours[d];
    }
  }
  return {
    businessName:   (row.business_name   as string)  ?? DEFAULT_CONFIG.businessName,
    tagline:        (row.tagline         as string)  ?? DEFAULT_CONFIG.tagline,
    phone:          (row.phone           as string)  ?? DEFAULT_CONFIG.phone,
    address:        (row.address         as string)  ?? DEFAULT_CONFIG.address,
    city:           (row.city            as string)  ?? DEFAULT_CONFIG.city,
    postcode:       (row.postcode        as string)  ?? DEFAULT_CONFIG.postcode,
    paymentInfo:    (row.payment_info    as string)  ?? DEFAULT_CONFIG.paymentInfo,
    collectionOnly: (row.collection_only as boolean) ?? DEFAULT_CONFIG.collectionOnly,
    heroImageUrl:   (row.hero_image_url  as string | null) ?? '',
    logoUrl:        (row.logo_url        as string | null) ?? '',
    primaryColor:    (row.primary_color    as string | null)  ?? '#f5a623',
    accentColor:     (row.accent_color     as string | null)  ?? '#0f1f3d',
    deliveryEnabled:  (row.delivery_enabled as boolean | null) ?? false,
    deliveryCharge:   Number(row.delivery_charge  ?? 0),
    deliveryMinOrder: Number(row.delivery_min_order ?? 0),
    deliveryZones:    Array.isArray(row.delivery_zones) ? (row.delivery_zones as DeliveryZone[]) : [],
    collectionSlots:  Array.isArray(row.collection_slots) ? (row.collection_slots as string[]) : [],
    prepTimeOptions:  Array.isArray(row.prep_time_options) ? (row.prep_time_options as { value: string; label: string }[]) : DEFAULT_CONFIG.prepTimeOptions,
    prepTimeNote:     (row.prep_time_note as string | null) ?? DEFAULT_CONFIG.prepTimeNote,
    paymentLinkEnabled: (row.payment_link_enabled as boolean | null) ?? false,
    paymentLinkUrl:     (row.payment_link_url as string | null) ?? '',
    condimentOptions:   Array.isArray(row.condiment_options) ? (row.condiment_options as string[]) : DEFAULT_CONFIG.condimentOptions,
    longCookKeywords:    Array.isArray(row.long_cook_keywords) ? (row.long_cook_keywords as string[]) : DEFAULT_CONFIG.longCookKeywords,
    longCookMinutes:     typeof row.long_cook_minutes === 'number' ? row.long_cook_minutes : DEFAULT_CONFIG.longCookMinutes,
    heroTextPlacement:  (row.hero_text_placement as string | null) ?? DEFAULT_CONFIG.heroTextPlacement,
    heroFontStyle:      (row.hero_font_style      as string | null) ?? DEFAULT_CONFIG.heroFontStyle,
    heroBold:           typeof row.hero_bold === 'boolean' ? row.hero_bold : DEFAULT_CONFIG.heroBold,
    heroShowStars:      typeof row.hero_show_stars === 'boolean' ? row.hero_show_stars : DEFAULT_CONFIG.heroShowStars,
    heroStarCount:      typeof row.hero_star_count === 'number' ? row.hero_star_count : DEFAULT_CONFIG.heroStarCount,
    allergenMessage:    (row.allergen_message as string | null) ?? DEFAULT_CONFIG.allergenMessage,
    emergencyStop:      (row.emergency_stop       as boolean | null) ?? false,
    emergencyStopStyle:  (row.emergency_stop_style as string  | null) ?? 'large-clear',
    receiptFieldOrder: (() => {
      const rf = row.receipt_fields as Record<string, unknown> | null;
      const fo = rf?.fieldOrder;
      const validKeys = ['orderType','orderNumber','orderDate','orderTime','customerName','phone','deliveryAddress'];
      if (Array.isArray(fo) && fo.length > 0) {
        const saved = (fo as string[]).filter(k => validKeys.includes(k));
        const merged = [...saved];
        for (const k of validKeys) { if (!merged.includes(k)) merged.push(k); }
        return merged;
      }
      return [...validKeys];
    })(),
    receiptFields: (() => {
      const rf = row.receipt_fields as Partial<ReceiptFields> | null;
      return {
        customerName:    rf?.customerName    ?? true,
        orderNumber:     rf?.orderNumber     ?? true,
        orderType:       rf?.orderType       ?? true,
        phone:           rf?.phone           ?? true,
        deliveryAddress: rf?.deliveryAddress ?? true,
        orderDate:       rf?.orderDate       ?? true,
        orderTime:       rf?.orderTime       ?? true,
      };
    })(),
    receiptConfig: mergeReceiptConfig(
      (row.receipt_fields as Record<string, unknown> | null)?.receiptConfig as Partial<ReceiptConfig> | null
    ),
    openingHours,
  };
}
