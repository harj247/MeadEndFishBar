// ── Receipt Builder configuration ─────────────────────────────────────────
// Single source of truth for all receipt settings.
// Both browser/iframe printing and ESC/POS thermal printing read from this.

// Per-field render options — controlled to safe values for 80mm thermal
export type FieldFontSize   = 'small' | 'normal' | 'large' | 'xlarge';
export type FieldFontWeight = 'normal' | 'medium' | 'bold';
export type FieldAlign      = 'left' | 'center' | 'right';
export type FieldSpacing    = 'compact' | 'normal' | 'large';

/** @deprecated Use per-field FieldFontSize/FieldFontWeight instead */
export type ReceiptFieldStyle = 'normal' | 'bold' | 'large' | 'large-bold';

export interface ReceiptField {
  key:      string;
  enabled:  boolean;
  // Legacy style — kept for old saved configs
  style?:   ReceiptFieldStyle;
  // New per-field render options
  fontSize?:   FieldFontSize;
  fontWeight?: FieldFontWeight;
  align?:      FieldAlign;
  uppercase?:  boolean;
  spacing?:    FieldSpacing;
}

export interface ReceiptConfig {
  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    enabled:          boolean;
    showBusinessName: boolean;
    showAddress:      boolean;
    showPhone:        boolean;
    showWebsite:      boolean;
    customHeaderText: string;
    websiteUrl:       string;
    // Per-field render overrides
    businessNameField: ReceiptField;
    addressField:      ReceiptField;
    phoneField:        ReceiptField;
    websiteField:      ReceiptField;
    customTextField:   ReceiptField;
  };
  // ── Order Information ────────────────────────────────────────────────────
  orderInfo: {
    enabled: boolean;
    fields:  ReceiptField[];
  };
  // ── Customer Information ─────────────────────────────────────────────────
  customerInfo: {
    enabled: boolean;
    fields:  ReceiptField[];
  };
  // ── Order Items ──────────────────────────────────────────────────────────
  orderItems: {
    enabled:                 boolean;
    showQuantity:            boolean;
    showPrice:               boolean;
    showModifiers:           boolean;
    showSpecialInstructions: boolean;
    // Item line render
    itemField:        ReceiptField;
    modifierField:    ReceiptField;
    instructionField: ReceiptField;
  };
  // ── Totals & Payment ─────────────────────────────────────────────────────
  totals: {
    enabled:            boolean;
    showSubtotal:       boolean;
    showDeliveryCharge: boolean;
    showTotal:          boolean;
    showPaymentMethod:  boolean;
    // Individual field controls
    subtotalField:       ReceiptField;
    deliveryField:       ReceiptField;
    totalLabelField:     ReceiptField; // "TOTAL TO PAY"
    totalAmountField:    ReceiptField; // "£16.00"
    paymentMethodField:  ReceiptField;
    /** @deprecated */ totalStyle?: ReceiptFieldStyle;
  };
  // ── Footer ───────────────────────────────────────────────────────────────
  footer: {
    enabled:            boolean;
    showThankYou:       boolean;
    thankYouMessage:    string;
    showWebsite:        boolean;
    customPromoMessage: string;
    loyaltyMessage:     string;
    websiteUrl:         string;
    // Per-field render
    thankYouField:    ReceiptField;
    promoField:       ReceiptField;
    loyaltyField:     ReceiptField;
    footerWebField:   ReceiptField;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

export function mkField(key: string, enabled: boolean, opts: Partial<Omit<ReceiptField,'key'|'enabled'>> = {}): ReceiptField {
  return {
    key, enabled,
    fontSize:   'normal',
    fontWeight: 'normal',
    align:      'left',
    uppercase:  false,
    spacing:    'normal',
    ...opts,
  };
}

// ── Defaults ──────────────────────────────────────────────────────────────

export const DEFAULT_ORDER_INFO_FIELDS: ReceiptField[] = [
  mkField('orderType',      true,  { fontWeight: 'bold',   align: 'center', uppercase: true }),
  mkField('orderNumber',    true,  { fontWeight: 'normal', align: 'left'   }),
  mkField('orderDate',      true,  { fontWeight: 'normal', align: 'left'   }),
  mkField('orderTime',      true,  { fontWeight: 'normal', align: 'left'   }),
  mkField('collectionTime', true,  { fontSize: 'large', fontWeight: 'bold', align: 'left', uppercase: true }),
  mkField('deliveryTime',   false, { fontSize: 'large', fontWeight: 'bold', align: 'left', uppercase: true }),
];

export const DEFAULT_CUSTOMER_INFO_FIELDS: ReceiptField[] = [
  mkField('customerName',    true, { fontWeight: 'medium' }),
  mkField('phone',           true),
  mkField('deliveryAddress', true),
];

export const DEFAULT_RECEIPT_CONFIG: ReceiptConfig = {
  header: {
    enabled:          true,
    showBusinessName: true,
    showAddress:      true,
    showPhone:        true,
    showWebsite:      false,
    customHeaderText: '',
    websiteUrl:       '',
    businessNameField: mkField('businessName', true,  { fontSize: 'large', fontWeight: 'bold', align: 'center', uppercase: true }),
    addressField:      mkField('address',      true,  { align: 'center' }),
    phoneField:        mkField('phone',        true,  { align: 'center' }),
    websiteField:      mkField('website',      false, { align: 'center' }),
    customTextField:   mkField('customText',   true,  { align: 'center' }),
  },
  orderInfo: {
    enabled: true,
    fields:  DEFAULT_ORDER_INFO_FIELDS,
  },
  customerInfo: {
    enabled: true,
    fields:  DEFAULT_CUSTOMER_INFO_FIELDS,
  },
  orderItems: {
    enabled:                 true,
    showQuantity:            true,
    showPrice:               true,
    showModifiers:           true,
    showSpecialInstructions: true,
    itemField:        mkField('item',        true, { fontWeight: 'medium' }),
    modifierField:    mkField('modifier',    true),
    instructionField: mkField('instruction', true, { fontWeight: 'bold' }),
  },
  totals: {
    enabled:            true,
    showSubtotal:       false,
    showDeliveryCharge: true,
    showTotal:          true,
    showPaymentMethod:  true,
    subtotalField:      mkField('subtotal',      true),
    deliveryField:      mkField('delivery',      true),
    totalLabelField:    mkField('totalLabel',    true,  { fontSize: 'normal', fontWeight: 'bold',   align: 'center', uppercase: true }),
    totalAmountField:   mkField('totalAmount',   true,  { fontSize: 'xlarge', fontWeight: 'bold',   align: 'center' }),
    paymentMethodField: mkField('paymentMethod', true,  { align: 'center', uppercase: true }),
  },
  footer: {
    enabled:            true,
    showThankYou:       true,
    thankYouMessage:    'Thank you for your order!',
    showWebsite:        false,
    customPromoMessage: '',
    loyaltyMessage:     '',
    websiteUrl:         '',
    thankYouField:  mkField('thankYou',  true,  { align: 'center' }),
    promoField:     mkField('promo',     true,  { align: 'center' }),
    loyaltyField:   mkField('loyalty',   true,  { align: 'center' }),
    footerWebField: mkField('footerWeb', false, { align: 'center' }),
  },
};

// ── Field definitions for UI ───────────────────────────────────────────────

export const ORDER_INFO_FIELD_DEFS: {
  key: string; label: string; hint: string;
}[] = [
  { key: 'orderType',      label: 'Order Type',      hint: '** COLLECTION ORDER ** / ** DELIVERY ORDER **' },
  { key: 'orderNumber',    label: 'Order Number',    hint: 'e.g.  ORDER:  142' },
  { key: 'orderDate',      label: 'Order Date',      hint: 'Date the order was placed' },
  { key: 'orderTime',      label: 'Time Ordered',    hint: 'Time customer submitted the order' },
  { key: 'collectionTime', label: 'Collection Time', hint: 'order time + kitchen prep time' },
  { key: 'deliveryTime',   label: 'Delivery Time',   hint: 'Same calculation for delivery orders' },
];

export const CUSTOMER_INFO_FIELD_DEFS: {
  key: string; label: string; hint: string;
}[] = [
  { key: 'customerName',    label: 'Customer Name',    hint: 'Name entered at checkout' },
  { key: 'phone',           label: 'Phone Number',     hint: 'Customer phone number' },
  { key: 'deliveryAddress', label: 'Delivery Address', hint: 'Only shown on delivery orders' },
];

// ── Merge/validate loaded config ──────────────────────────────────────────

function ensureField(saved: ReceiptField | undefined, def: ReceiptField): ReceiptField {
  if (!saved) return { ...def };
  return {
    ...def,
    ...saved,
    key: def.key,
    fontSize:   saved.fontSize   ?? def.fontSize   ?? 'normal',
    fontWeight: saved.fontWeight ?? def.fontWeight ?? 'normal',
    align:      saved.align      ?? def.align      ?? 'left',
    uppercase:  saved.uppercase  ?? def.uppercase  ?? false,
    spacing:    saved.spacing    ?? def.spacing    ?? 'normal',
  };
}

export function mergeReceiptConfig(saved: Partial<ReceiptConfig> | null | undefined): ReceiptConfig {
  if (!saved) return deepCloneDefault();

  const d = DEFAULT_RECEIPT_CONFIG;
  const s = saved;

  return {
    header: {
      ...d.header,
      ...(s.header ?? {}),
      businessNameField: ensureField(s.header?.businessNameField, d.header.businessNameField),
      addressField:      ensureField(s.header?.addressField,      d.header.addressField),
      phoneField:        ensureField(s.header?.phoneField,        d.header.phoneField),
      websiteField:      ensureField(s.header?.websiteField,      d.header.websiteField),
      customTextField:   ensureField(s.header?.customTextField,   d.header.customTextField),
    },
    orderInfo: {
      ...d.orderInfo,
      ...(s.orderInfo ?? {}),
      fields: mergeFields(DEFAULT_ORDER_INFO_FIELDS, s.orderInfo?.fields),
    },
    customerInfo: {
      ...d.customerInfo,
      ...(s.customerInfo ?? {}),
      fields: mergeFields(DEFAULT_CUSTOMER_INFO_FIELDS, s.customerInfo?.fields),
    },
    orderItems: {
      ...d.orderItems,
      ...(s.orderItems ?? {}),
      itemField:        ensureField(s.orderItems?.itemField,        d.orderItems.itemField),
      modifierField:    ensureField(s.orderItems?.modifierField,    d.orderItems.modifierField),
      instructionField: ensureField(s.orderItems?.instructionField, d.orderItems.instructionField),
    },
    totals: {
      ...d.totals,
      ...(s.totals ?? {}),
      subtotalField:      ensureField(s.totals?.subtotalField,      d.totals.subtotalField),
      deliveryField:      ensureField(s.totals?.deliveryField,      d.totals.deliveryField),
      totalLabelField:    ensureField(s.totals?.totalLabelField,    d.totals.totalLabelField),
      totalAmountField:   ensureField(s.totals?.totalAmountField,   d.totals.totalAmountField),
      paymentMethodField: ensureField(s.totals?.paymentMethodField, d.totals.paymentMethodField),
    },
    footer: {
      ...d.footer,
      ...(s.footer ?? {}),
      thankYouField:  ensureField(s.footer?.thankYouField,  d.footer.thankYouField),
      promoField:     ensureField(s.footer?.promoField,     d.footer.promoField),
      loyaltyField:   ensureField(s.footer?.loyaltyField,   d.footer.loyaltyField),
      footerWebField: ensureField(s.footer?.footerWebField, d.footer.footerWebField),
    },
  };
}

function mergeFields(defaults: ReceiptField[], saved: ReceiptField[] | undefined): ReceiptField[] {
  if (!saved || saved.length === 0) return defaults.map(f => ({ ...f }));
  const result: ReceiptField[] = saved.map(s => {
    const def = defaults.find(d => d.key === s.key);
    if (!def) return s;
    return ensureField(s, def);
  });
  for (const def of defaults) {
    if (!result.find(r => r.key === def.key)) result.push({ ...def });
  }
  return result;
}

function deepCloneDefault(): ReceiptConfig {
  return JSON.parse(JSON.stringify(DEFAULT_RECEIPT_CONFIG)) as ReceiptConfig;
}
