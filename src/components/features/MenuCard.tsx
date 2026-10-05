import { useState, useRef, useLayoutEffect } from 'react';
import { Plus, Flame, Crown, ChevronDown, ChevronUp } from 'lucide-react';
import { MenuItem } from '@/types';
import { formatPrice, getOptimizedImageUrl } from '@/lib/utils';

interface MenuCardProps {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
  featured?: boolean;
  /** Zero-based render index across all visible cards — used to prioritise above-the-fold images */
  renderIndex?: number;
}

// Above-the-fold threshold: cards with renderIndex below this load eagerly with high priority.
// 8 covers a typical 2-col mobile viewport (4 rows × 2 cols) and 3-col tablet (3 rows × 3 cols).
const EAGER_THRESHOLD = 8;

// Reusable image with priority-aware loading.
// Cards in the initial viewport skip lazy-loading entirely so the browser
// starts fetching them as soon as the HTML is parsed, not after layout.
function MenuImage({
  src,
  alt,
  className,
  eager,
}: {
  src: string;
  alt: string;
  className: string;
  eager: boolean;
}) {
  const [loaded, setLoaded] = useState(eager); // eager images skip the skeleton
  return (
    <div className="relative w-full h-full">
      {!loaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} transition-opacity duration-200 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
        // Eager: load immediately, high fetch priority, no lazy-loading
        // Lazy: defer until near viewport, normal priority
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : 'auto'}
        decoding={eager ? 'sync' : 'async'}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}

// ── Expandable description ────────────────────────────────────────────────
// Renders clamped text with a chevron toggle. The toggle fires only on explicit
// tap/click — it does NOT intercept scroll events.
function ExpandableDesc({
  text,
  clampLines,
  textClass,
}: {
  text: string;
  clampLines: number;  // how many lines to show when collapsed
  textClass: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const measureRef = useRef<HTMLSpanElement>(null);

  // Detect whether the text actually overflows the clamped height
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    setIsTruncated(el.scrollHeight > el.clientHeight + 2);
  }, [text]);

  const toggle = (e: React.MouseEvent | React.TouchEvent) => {
    // Prevent the tap from also triggering any parent click handlers,
    // but do NOT call e.preventDefault() so native scroll is unaffected.
    e.stopPropagation();
    setExpanded(v => !v);
  };

  if (!text) return null;

  return (
    <div className="relative">
      {/* Hidden measurement element — always clamped so we know if it overflows */}
      <span
        ref={measureRef}
        aria-hidden="true"
        className={`${textClass} pointer-events-none absolute opacity-0 top-0 left-0 right-0`}
        style={{
          display: '-webkit-box',
          WebkitLineClamp: clampLines,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {text}
      </span>

      {/* Visible text */}
      <span
        className={`${textClass} block`}
        style={
          !expanded
            ? {
                display: '-webkit-box',
                WebkitLineClamp: clampLines,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }
            : undefined
        }
      >
        {text}
      </span>

      {/* Chevron — only rendered when content is actually truncated */}
      {isTruncated && (
        <button
          type="button"
          aria-label={expanded ? 'Collapse description' : 'Expand description'}
          onMouseDown={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
          onClick={toggle}
          className="flex items-center gap-0.5 mt-0.5 text-gray-400 hover:text-gray-600 active:text-gray-700 transition-colors focus:outline-none"
          style={{ touchAction: 'manipulation', minHeight: '28px', minWidth: '28px' }}
        >
          {expanded
            ? <ChevronUp  className="w-3.5 h-3.5" strokeWidth={2.5} />
            : <ChevronDown className="w-3.5 h-3.5" strokeWidth={2.5} />
          }
        </button>
      )}
    </div>
  );
}

export default function MenuCard({ item, onAdd, renderIndex = 99 }: MenuCardProps) {
  const eager = renderIndex < EAGER_THRESHOLD;

  // ── Featured: large hero card ───────────────────────────────────────────
  if (item.featured) {
    return (
      <div className="bg-white rounded-2xl overflow-hidden shadow-lg border-2 border-[var(--brand-primary)] col-span-2 flex flex-col hover:shadow-xl transition-all">
        {/* Hero photo */}
        <div className="relative h-40 sm:h-48 bg-gray-100 overflow-hidden flex-shrink-0">
          {item.image ? (
            <MenuImage
              src={getOptimizedImageUrl(item.image, 800, 80)}
              alt={item.name}
              className="w-full h-full object-cover"
              eager={eager}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: 'var(--brand-accent)' }}
            >
              <span className="text-5xl opacity-30">🍽️</span>
            </div>
          )}
          {/* Badges */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <span className="flex items-center gap-1 bg-[var(--brand-primary)] text-[var(--brand-accent)] text-[10px] font-black px-2.5 py-1 rounded-full shadow-md uppercase tracking-wide">
              <Crown className="w-3 h-3" fill="currentColor" /> Featured
            </span>
            {item.popular && (
              <span className="flex items-center gap-1 bg-white/90 text-[var(--brand-accent)] text-[10px] font-black px-2 py-1 rounded-full shadow-sm uppercase tracking-wide">
                <Flame className="w-3 h-3 text-orange-500" fill="currentColor" /> Popular
              </span>
            )}
          </div>
          {/* Price pill */}
          <div className="absolute bottom-3 right-3 bg-[var(--brand-accent)] text-white font-black text-base px-3 py-1 rounded-xl shadow-md">
            {item.price === 0 ? 'Free' : formatPrice(item.price)}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-black text-[var(--brand-accent)] text-base leading-tight mb-1">
            {item.name}
          </h3>
          {item.description && (
            <div className="flex-1 mb-3">
              <ExpandableDesc
                text={item.description}
                clampLines={2}
                textClass="text-gray-500 text-sm leading-relaxed"
              />
            </div>
          )}
          <button
            onClick={() => onAdd(item)}
            className="w-full h-11 bg-[var(--brand-primary)] hover:opacity-90 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm text-[var(--brand-accent)] font-bold text-sm"
            aria-label={`Add ${item.name} to order`}
          >
            <Plus className="w-4 h-4" strokeWidth={3} /> Add to Order
          </button>
        </div>
      </div>
    );
  }

  // ── Popular badge variant ───────────────────────────────────────────────
  if (item.popular) {
    return (
      <div className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all border-2 border-[var(--brand-primary)] flex flex-col">
        <div className="h-28 bg-gray-100 overflow-hidden flex-shrink-0">
          {item.image ? (
            <MenuImage src={getOptimizedImageUrl(item.image, 320, 75)} alt={item.name} className="w-full h-full object-cover" eager={eager} />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--brand-accent)' }}>
              <span className="text-4xl opacity-20">🍽️</span>
            </div>
          )}
        </div>
        <div className="p-3 flex flex-col flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="bg-[var(--brand-primary)] text-[var(--brand-accent)] text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 whitespace-nowrap uppercase tracking-wide">
              <Flame className="w-2.5 h-2.5" fill="currentColor" /> Popular
            </span>
          </div>
          <h3 className="font-black text-[var(--brand-accent)] text-sm leading-tight mb-0.5">{item.name}</h3>
          <div className="flex-1">
            <ExpandableDesc
              text={item.description ?? ''}
              clampLines={2}
              textClass="text-gray-500 text-xs leading-relaxed"
            />
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="font-black text-[var(--brand-accent)] text-base">
              {item.price === 0 ? 'Free' : formatPrice(item.price)}
            </span>
            <button
              onClick={() => onAdd(item)}
              className="h-9 px-4 bg-[var(--brand-primary)] hover:opacity-90 rounded-full flex items-center gap-1.5 transition-all active:scale-95 shadow-sm text-[var(--brand-accent)] font-bold text-xs"
              aria-label={`Add ${item.name} to order`}
            >
              <Plus className="w-4 h-4" strokeWidth={3} /> Add
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Standard card ───────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col">
      <div className="h-24 bg-gray-100 overflow-hidden flex-shrink-0">
        {item.image ? (
          <MenuImage src={getOptimizedImageUrl(item.image, 240, 70)} alt={item.name} className="w-full h-full object-cover" eager={eager} />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--brand-accent)' }}>
            <span className="text-4xl opacity-20">🍽️</span>
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-bold text-[var(--brand-accent)] text-sm leading-tight flex-1">{item.name}</h3>
          {item.price === 0 && (
            <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">FREE</span>
          )}
        </div>
        <div className="flex-1">
          <ExpandableDesc
            text={item.description ?? ''}
            clampLines={2}
            textClass="text-gray-500 text-xs leading-relaxed"
          />
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="font-bold text-[var(--brand-accent)] text-base">
            {item.price === 0 ? 'Free' : formatPrice(item.price)}
          </span>
          <button
            onClick={() => onAdd(item)}
            className="h-9 px-4 bg-[var(--brand-primary)] hover:opacity-90 rounded-full flex items-center gap-1.5 transition-all active:scale-95 shadow-sm text-[var(--brand-accent)] font-bold text-xs"
            aria-label={`Add ${item.name} to order`}
          >
            <Plus className="w-4 h-4" strokeWidth={3} /> Add
          </button>
        </div>
      </div>
    </div>
  );
}
