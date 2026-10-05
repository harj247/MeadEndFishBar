/**
 * Condition that gates whether a linked CustomisationGroup is shown.
 * Evaluated against the live cart at the time the item is customised.
 *
 * type 'cart_has_category' — show only when at least one cart item belongs to
 *   the category whose id is stored in `value`.
 * type 'cart_has_item'     — show only when the cart contains the specific
 *   menu item whose id is stored in `value` (reserved for future use).
 *
 * If no condition is stored for a group the group always shows (existing behaviour).
 */
export interface GroupCondition {
  type: 'cart_has_category' | 'cart_has_item';
  value: string; // category id or menu item id
}

export interface SuggestedAddon {
  enabled: boolean;
  question: string;       // e.g. "Would you like anything with your fish?"
  targetItemIds: string[]; // ids of existing MenuItems shown as suggestions
  yesText: string;        // e.g. "Add selected items"
  noText: string;         // e.g. "No thanks"
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  popular?: boolean;
  featured?: boolean;
  available?: boolean;
  suggestedAddon?: SuggestedAddon;
  sortOrder?: number;
  showCondiments?: boolean;  // ask salt & vinegar
  customGroupIds?: string[]; // linked customisation group IDs
  /** Per-group display conditions keyed by group id. Missing key = always show. */
  customGroupConditions?: Record<string, GroupCondition>;
  categories?: string[];      // additional categories this item appears in
  options?: MenuOption[];
}

export interface MenuOption {
  name: string;
  choices: OptionChoice[];
}

export interface OptionChoice {
  label: string;
  priceAdd: number;
}

export interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  selectedOptions?: Record<string, string>;
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  items: CartItem[];
  subtotal: number;
  total: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  notes?: string;
  prepTime?: string;
  status: 'scheduled' | 'new' | 'accepted' | 'preparing' | 'ready' | 'collected' | 'cancelled';
  createdAt: string;
  estimatedReady?: string;
  deliveryAddress?: string;
}

export interface CustomisationOption {
  label: string;
}

export interface CustomisationGroup {
  id: string;
  name: string;
  type: 'single' | 'multi';
  maxSelect: number;
  required: boolean;
  options: string[];  // simple string labels
  sortOrder?: number;
  global?: boolean;   // if true, shown on every item automatically
}

export type MenuCategory = {
  id: string;
  name: string;
  icon: string;
  available?: boolean;
  sortOrder?: number;
  modifierOnly?: boolean; // hidden from main menu; used only as condiment/salad/sauce picker options
  printCopies?: number;  // number of kitchen receipt copies to print for items in this category (default 1)
};
