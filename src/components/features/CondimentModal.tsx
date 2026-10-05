import { useState, useRef, useEffect } from 'react';
import { X, Plus, Minus, MessageSquare, ChevronDown } from 'lucide-react';
import { MenuItem, CustomisationGroup } from '@/types';
import { formatPrice } from '@/lib/utils';
import { getVenueConfig } from '@/lib/venueConfig';

// Emoji map for known condiment values — falls back to 🧂 for custom options
const CONDIMENT_EMOJI: Record<string, string> = {
  'Salt & Vinegar':     '🧂🍶',
  'Salt only':          '🧂',
  'Vinegar only':       '🍶',
  'No salt or vinegar': '🚫',
  'No seasoning':       '🚫',
};

function getCondimentOptions() {
  const cfg = getVenueConfig();
  const opts = cfg.condimentOptions ?? [];
  return opts.length > 0 ? opts : ['Salt & Vinegar', 'Salt only', 'Vinegar only', 'No salt or vinegar', 'No seasoning'];
}

export function needsCondimentPrompt(item: MenuItem): boolean {
  if (item.showCondiments !== undefined) return Boolean(item.showCondiments);
  const name = item.name.toLowerCase();
  const cat  = item.category.toLowerCase();
  if (cat === 'salad' || cat === 'sauces') return false;
  return (
    name.includes('chip') || name.includes('fish') ||
    name.includes('sausage') || name.includes('saveloy') ||
    cat === 'chips' || cat === 'fish' || cat === 'sausages'
  );
}

export function isFreeAddon(item: MenuItem): boolean {
  return item.category === 'salad' || item.category === 'sauces';
}

interface CondimentModalProps {
  item: MenuItem;
  customGroups?: CustomisationGroup[];
  /** Items from modifier-only categories (e.g. Extras) shown as add-ons */
  extrasItems?: MenuItem[];
  /** Cart items — used to conditionally show chip-dependent options */
  cartItemNames?: string[];
  onConfirm: (item: MenuItem, condiment: string, note: string, extras: { item: MenuItem; quantity: number }[]) => void;
  onClose: () => void;
}

export default function CondimentModal({
  item,
  customGroups = [],
  extrasItems = [],
  cartItemNames = [],
  onConfirm,
  onClose,
}: CondimentModalProps) {
  const showCondiment = needsCondimentPrompt(item);

  // All linked groups — ordered as configured on the item
  const linkedGroups = customGroups.filter(g => (item.customGroupIds ?? []).includes(g.id));

  const condimentOptions = getCondimentOptions();
  const [selected, setSelected] = useState(condimentOptions[0] ?? 'Salt & Vinegar');
  // Dynamic group selections: groupId → selected option(s)
  const [groupSelections, setGroupSelections] = useState<Record<string, string[]>>({});
  // Extras: itemId → quantity
  const [extraQtys, setExtraQtys]           = useState<Record<string, number>>({});
  const [extrasOpen, setExtrasOpen]         = useState(false);
  const [note, setNote]                     = useState('');
  const [showNote, setShowNote]             = useState(false);

  const toggleGroupOption = (group: CustomisationGroup, option: string) => {
    setGroupSelections(prev => {
      const current = prev[group.id] ?? [];
      if (group.type === 'single') {
        return { ...prev, [group.id]: [option] };
      }
      // multi — each tap adds one more (duplicates allowed up to maxSelect)
      if (current.length >= group.maxSelect) return prev;
      return { ...prev, [group.id]: [...current, option] };
    });
  };

  // Remove ONE instance of an option (last occurrence)
  const decrementGroupOption = (group: CustomisationGroup, option: string) => {
    setGroupSelections(prev => {
      const current = prev[group.id] ?? [];
      const idx = current.lastIndexOf(option);
      if (idx === -1) return prev;
      return { ...prev, [group.id]: [...current.slice(0, idx), ...current.slice(idx + 1)] };
    });
  };

  const handleAdd = () => {
    const parts: string[] = [];
    if (showCondiment) parts.push(selected);
    for (const group of linkedGroups) {
      const sel = groupSelections[group.id] ?? [];
      if (sel.length > 0) parts.push(`${group.name}: ${sel.join(', ')}`);
    }
    if (note.trim()) parts.push(note.trim());
    const extras = Object.entries(extraQtys)
      .filter(([, qty]) => qty > 0)
      .map(([id, quantity]) => ({ item: extrasItems.find(e => e.id === id)!, quantity }))
      .filter(e => e.item);
    onConfirm(item, '', parts.join(' · '), extras);
  };

  const adjustExtra = (extraItem: MenuItem, delta: number) => {
    setExtraQtys(prev => {
      const next = Math.max(0, (prev[extraItem.id] ?? 0) + delta);
      return { ...prev, [extraItem.id]: next };
    });
  };

  // Total price including selected extras
  const extrasTotal = Object.entries(extraQtys).reduce((sum, [id, qty]) => {
    const extra = extrasItems.find(e => e.id === id);
    return sum + (extra ? extra.price * qty : 0);
  }, 0);
  const totalPrice = item.price + extrasTotal;

  // Check if all required groups have a selection (use the filtered fish group for validation)
  const missingRequired = linkedGroups.some(
    g => g.required && (groupSelections[g.id] ?? []).length === 0
  );

  // Scroll hint
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => setShowScrollHint(el.scrollHeight > el.clientHeight + 10 && el.scrollTop < 20);
    check();
    el.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => { el.removeEventListener('scroll', check); window.removeEventListener('resize', check); };
  }, [linkedGroups, showCondiment]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle (mobile visual cue) */}
        <div className="flex justify-center pt-2.5 pb-0 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="bg-[#0f1f3d] px-5 py-4 flex items-start justify-between gap-3 flex-shrink-0">
          <div>
            <h2 className="text-white font-bold text-base leading-tight">{item.name}</h2>
            <p className="text-[#f5a623] font-bold text-sm mt-0.5">{formatPrice(item.price)}</p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white p-1 flex-shrink-0 -mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div ref={scrollRef} className="px-5 pt-4 pb-2 space-y-4 overflow-y-auto flex-1 overscroll-contain">
          {/* Condiment question */}
          {showCondiment && (
            <div>
              <p className="font-bold text-[#0f1f3d] text-sm flex items-center gap-1.5 mb-3">
                🧂 Salt &amp; Vinegar?
              </p>
              <div className="grid grid-cols-2 gap-2">
                {condimentOptions.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setSelected(opt)}
                    className={`py-3 px-3 rounded-2xl text-sm font-semibold border-2 transition-all text-left flex flex-col gap-0.5 ${
                      selected === opt
                        ? 'border-[#f5a623] bg-amber-50 text-[#0f1f3d] shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-base">{CONDIMENT_EMOJI[opt] ?? '🧂'}</span>
                    <span className={`text-xs font-bold leading-tight ${selected === opt ? 'text-[#0f1f3d]' : 'text-gray-700'}`}>
                      {opt}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dynamic custom groups */}
          {linkedGroups.map(group => {
            const current = groupSelections[group.id] ?? [];
            const isMulti = group.type === 'multi';
            const maxed   = isMulti && current.length >= group.maxSelect;
            const hasSelection = current.length > 0;
            return (
              <div key={group.id}>
                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                  <p className="font-bold text-[#0f1f3d] text-sm">
                    {group.name}
                  </p>
                  {group.required && (
                    <span className="text-[10px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full">Required</span>
                  )}
                  {isMulti && (
                    <span className={`text-[10px] font-normal ml-auto ${maxed ? 'text-amber-600 font-semibold' : 'text-gray-400'}`}>
                      max {group.maxSelect} — {current.length}/{group.maxSelect}
                    </span>
                  )}
                  {/* Show clear button for single-choice when something selected */}
                  {!isMulti && hasSelection && (
                    <button
                      type="button"
                      onClick={() => setGroupSelections(prev => ({ ...prev, [group.id]: [] }))}
                      className="ml-auto flex items-center gap-1 text-[10px] text-gray-400 hover:text-red-500 transition-colors px-2 py-0.5 rounded-full border border-gray-200 hover:border-red-300 hover:bg-red-50"
                    >
                      <X className="w-2.5 h-2.5" /> Clear
                    </button>
                  )}
                </div>
                {isMulti ? (
                  <div className="flex flex-wrap gap-2">
                    {group.options.map(opt => {
                      const count   = current.filter(o => o === opt).length;
                      const active  = count > 0;
                      const isMaxed = maxed && !active;
                      return (
                        <div key={opt} className="flex items-center">
                          {/* Main button — tap to add */}
                          <button
                            type="button"
                            onClick={() => toggleGroupOption(group, opt)}
                            disabled={isMaxed}
                            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-2 transition-all active:scale-95 ${
                              active
                                ? 'rounded-l-xl border-r-0 border-[#0f1f3d] bg-[#0f1f3d] text-white'
                                : isMaxed
                                  ? 'rounded-xl border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                                  : 'rounded-xl border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            {active && (
                              <span className="bg-white text-[#0f1f3d] font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0">
                                {count}
                              </span>
                            )}
                            {opt}
                          </button>
                          {/* − button: remove one */}
                          {active && (
                            <button
                              type="button"
                              onClick={() => decrementGroupOption(group, opt)}
                              className="px-2 py-2 rounded-r-xl border-2 border-[#0f1f3d] bg-[#0f1f3d] text-white/60 hover:text-white hover:bg-[#1a2f5a] transition-all active:scale-95"
                              title="Remove one"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {group.options.map(opt => {
                      const active = current[0] === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleGroupOption(group, opt)}
                          className={`py-3 px-3 rounded-xl text-xs font-semibold border-2 transition-all text-left active:scale-95 ${
                            active
                              ? 'border-[#f5a623] bg-amber-50 text-[#0f1f3d] shadow-sm ring-1 ring-[#f5a623]/30'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <span className={`flex items-center gap-1.5 ${active ? '' : ''}`}>
                            <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                              active ? 'border-[#f5a623] bg-[#f5a623]' : 'border-gray-300'
                            }`}>
                              {active && <span className="w-2 h-2 rounded-full bg-white block" />}
                            </span>
                            {opt}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Extras — collapsible upsell section */}
          {extrasItems.length > 0 && (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 overflow-hidden transition-all">
              {/* Toggle header */}
              <button
                type="button"
                onClick={() => setExtrasOpen(v => !v)}
                className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${
                  extrasOpen ? 'bg-amber-50 border-b-2 border-dashed border-amber-200' : 'bg-white hover:bg-gray-50'
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-bold text-[#0f1f3d]">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                    extrasOpen ? 'bg-[#f5a623] text-[#0f1f3d]' : 'bg-gray-200 text-gray-500'
                  }`}>
                    <Plus className="w-3 h-3" strokeWidth={3} />
                  </span>
                  Add Extras
                  {Object.values(extraQtys).reduce((s, q) => s + q, 0) > 0 && (
                    <span className="bg-[#f5a623] text-[#0f1f3d] text-[10px] font-black px-1.5 py-0.5 rounded-full">
                      {Object.values(extraQtys).reduce((s, q) => s + q, 0)} added
                    </span>
                  )}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                  extrasOpen ? 'rotate-180' : ''
                }`} />
              </button>

              {/* Expanded items list */}
              {extrasOpen && (
                <div className="bg-white divide-y divide-gray-100">
                  {extrasItems.map(extra => {
                    const qty = extraQtys[extra.id] ?? 0;
                    return (
                      <div key={extra.id} className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                        qty > 0 ? 'bg-amber-50/60' : 'hover:bg-gray-50'
                      }`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800">{extra.name}</p>
                          {extra.description && (
                            <p className="text-[11px] text-gray-400 mt-0.5">{extra.description}</p>
                          )}
                          <p className="text-xs font-bold text-[#0f1f3d] mt-0.5">+{formatPrice(extra.price)}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {qty > 0 ? (
                            <>
                              <button
                                type="button"
                                onClick={() => adjustExtra(extra, -1)}
                                className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-all active:scale-90"
                              >
                                <Minus className="w-3.5 h-3.5 text-gray-700" />
                              </button>
                              <span className="w-5 text-center font-black text-[#0f1f3d] text-sm">{qty}</span>
                              <button
                                type="button"
                                onClick={() => adjustExtra(extra, 1)}
                                className="w-8 h-8 rounded-full bg-[#f5a623] hover:bg-[#e09615] flex items-center justify-center transition-all active:scale-90"
                              >
                                <Plus className="w-3.5 h-3.5 text-[#0f1f3d]" strokeWidth={3} />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => adjustExtra(extra, 1)}
                              className="w-9 h-9 rounded-full border-2 border-gray-300 hover:border-[#f5a623] hover:bg-[#f5a623]/10 flex items-center justify-center transition-all active:scale-90"
                            >
                              <Plus className="w-4 h-4 text-gray-500 hover:text-[#0f1f3d]" strokeWidth={2.5} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Per-item note */}
          {showNote ? (
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1.5">
                <MessageSquare className="w-3.5 h-3.5 inline mr-1 text-[#f5a623]" />
                Special note for this item
              </label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="e.g. well done, extra crispy…"
                autoFocus
                className="w-full border border-[#f5a623]/60 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/40 focus:border-[#f5a623] bg-amber-50 text-gray-800 placeholder-gray-400"
              />
            </div>
          ) : (
            <button
              onClick={() => setShowNote(true)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#f5a623] transition-colors py-1"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Add a special note for this item
            </button>
          )}
        </div>

        {/* Scroll hint */}
        {showScrollHint && (
          <div className="flex justify-center py-1.5 pointer-events-none flex-shrink-0">
            <div className="flex items-center gap-1 text-[10px] text-gray-400 animate-bounce">
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Scroll for more options</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>
        )}

        {/* Add to order button */}
        <div className="px-5 pb-6 pt-3 flex-shrink-0">
          {missingRequired && (
            <p className="text-center text-xs text-red-500 font-semibold mb-2">
              Please make a selection for all required options above
            </p>
          )}
          <button
            onClick={handleAdd}
            disabled={missingRequired}
            className="w-full bg-[#f5a623] hover:bg-[#e09615] disabled:opacity-50 disabled:cursor-not-allowed text-[#0f1f3d] font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-base"
          >
            <Plus className="w-5 h-5" strokeWidth={3} />
            Add to Order — {formatPrice(totalPrice)}
          </button>
        </div>
      </div>
    </div>
  );
}
