import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Plus, Pencil, Trash2, Eye, EyeOff, Save, X, ChevronUp, ChevronDown,
  Loader2, Globe, EyeIcon, Type, AlignLeft, ImageIcon, Layout, Link2,
  Minus, MoveVertical, ExternalLink, Check, Copy, ArrowUpRight,
} from 'lucide-react';
import { usePagesAdmin, usePublishedPages } from '@/hooks/useSitePages';
import { SitePage, SiteBlock, BlockType, BlockContent, HeadingContent, ParagraphContent, ImageContent, ImageTextContent, ButtonContent, DividerContent, SpacerContent, CmsLink } from '@/types/cms';
import { resolveLink } from '@/components/features/BlockRenderer';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// ── Helpers ────────────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const BLOCK_LABELS: Record<BlockType, string> = {
  heading:    'Heading',
  paragraph:  'Text / Paragraph',
  image:      'Image',
  image_text: 'Image + Text',
  button:     'Button / Link',
  divider:    'Divider',
  spacer:     'Spacer',
};

const BLOCK_ICONS: Record<BlockType, React.ReactNode> = {
  heading:    <Type className="w-4 h-4" />,
  paragraph:  <AlignLeft className="w-4 h-4" />,
  image:      <ImageIcon className="w-4 h-4" />,
  image_text: <Layout className="w-4 h-4" />,
  button:     <Link2 className="w-4 h-4" />,
  divider:    <Minus className="w-4 h-4" />,
  spacer:     <MoveVertical className="w-4 h-4" />,
};

function defaultContent(type: BlockType): BlockContent {
  switch (type) {
    case 'heading':    return { text: 'New Heading', level: 2, align: 'left' } as HeadingContent;
    case 'paragraph':  return { text: 'Enter your text here.', align: 'left' } as ParagraphContent;
    case 'image':      return { url: '', alt: '', caption: '', contained: false } as ImageContent;
    case 'image_text': return { image_url: '', image_alt: '', image_side: 'left', heading: '', text: '' } as ImageTextContent;
    case 'button':     return { link: { link_type: 'external', href: '', label: 'Learn More', variant: 'primary', new_tab: false } } as ButtonContent;
    case 'divider':    return { style: 'line' } as DividerContent;
    case 'spacer':     return { size: 'medium' } as SpacerContent;
  }
}

// ── Link editor ─────────────────────────────────────────────────────────────
function LinkEditor({ value, onChange, pages }: {
  value: CmsLink;
  onChange: (l: CmsLink) => void;
  pages: SitePage[];
}) {
  const isInternal = value.link_type === 'internal';
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => onChange({ ...value, link_type: 'internal', href: '' })}
          className={`py-2 rounded-xl border-2 text-xs font-bold transition-all ${isInternal ? 'border-[#f5a623] bg-amber-50 text-[#0f1f3d]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
          🔗 Internal page
        </button>
        <button type="button" onClick={() => onChange({ ...value, link_type: 'external', page_id: undefined })}
          className={`py-2 rounded-xl border-2 text-xs font-bold transition-all ${!isInternal ? 'border-[#f5a623] bg-amber-50 text-[#0f1f3d]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
          <ExternalLink className="w-3 h-3 inline mr-1" />External URL
        </button>
      </div>
      <div>
        <label className="text-xs font-bold text-gray-600 block mb-1">Button label</label>
        <input type="text" value={value.label} onChange={e => onChange({ ...value, label: e.target.value })}
          placeholder="e.g. Learn More, Book Now…"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50" />
      </div>
      {isInternal ? (
        <div>
          <label className="text-xs font-bold text-gray-600 block mb-1">Link to page</label>
          <select value={value.page_id ?? ''}
            onChange={e => {
              const page = pages.find(p => p.id === e.target.value);
              onChange({ ...value, page_id: e.target.value, href: page ? `/p/${page.slug}` : '' });
            }}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50">
            <option value="">— select a page —</option>
            {pages.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          {value.page_id && !pages.find(p => p.id === value.page_id) && (
            <p className="text-xs text-amber-600 mt-1">⚠️ This page no longer exists.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">External URL</label>
            <input type="url" value={value.href} onChange={e => onChange({ ...value, href: e.target.value })}
              placeholder="https://example.com"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-600">
            <input type="checkbox" checked={value.new_tab ?? false} onChange={e => onChange({ ...value, new_tab: e.target.checked })}
              className="w-4 h-4 rounded accent-[#f5a623]" />
            Open in new tab
          </label>
        </div>
      )}
      <div>
        <label className="text-xs font-bold text-gray-600 block mb-1">Button style</label>
        <div className="grid grid-cols-3 gap-1.5">
          {(['primary', 'secondary', 'outline'] as const).map(v => (
            <button key={v} type="button" onClick={() => onChange({ ...value, variant: v })}
              className={`py-2 rounded-xl border-2 text-xs font-bold transition-all capitalize ${(value.variant ?? 'primary') === v ? 'border-[#f5a623] bg-amber-50 text-[#0f1f3d]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
              {v}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Block editor ────────────────────────────────────────────────────────────
function BlockEditor({ block, pages, allPages, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: {
  block: SiteBlock;
  pages: SitePage[];
  allPages: SitePage[];
  onChange: (content: BlockContent) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [imgUploadTarget, setImgUploadTarget] = useState<'url' | 'image_url'>('url');

  const uploadImage = async (file: File, field: 'url' | 'image_url') => {
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return; }
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `pages/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('menu-images').upload(path, file, { upsert: true });
    if (error) { toast.error('Upload failed'); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('menu-images').getPublicUrl(path);
    if (field === 'url') onChange({ ...block.content as ImageContent, url: urlData.publicUrl });
    else onChange({ ...block.content as ImageTextContent, image_url: urlData.publicUrl });
    setUploading(false);
  };

  const renderFields = () => {
    switch (block.blockType) {
      case 'heading': {
        const c = block.content as HeadingContent;
        return (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Text</label>
              <input type="text" value={c.text} onChange={e => onChange({ ...c, text: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Level</label>
                <div className="flex gap-1.5">
                  {([1,2,3] as const).map(l => (
                    <button key={l} type="button" onClick={() => onChange({ ...c, level: l })}
                      className={`flex-1 py-2 rounded-xl border-2 text-xs font-bold ${c.level === l ? 'border-[#f5a623] bg-amber-50' : 'border-gray-200 text-gray-500'}`}>
                      H{l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Alignment</label>
                <div className="flex gap-1.5">
                  {(['left','center','right'] as const).map(a => (
                    <button key={a} type="button" onClick={() => onChange({ ...c, align: a })}
                      className={`flex-1 py-2 rounded-xl border-2 text-[10px] font-bold capitalize ${c.align === a ? 'border-[#f5a623] bg-amber-50' : 'border-gray-200 text-gray-500'}`}>
                      {a[0].toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 'paragraph': {
        const c = block.content as ParagraphContent;
        return (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Text</label>
              <textarea value={c.text} onChange={e => onChange({ ...c, text: e.target.value })}
                rows={4} placeholder="Enter paragraph text…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Alignment</label>
              <div className="flex gap-1.5">
                {(['left','center','right'] as const).map(a => (
                  <button key={a} type="button" onClick={() => onChange({ ...c, align: a })}
                    className={`px-3 py-1.5 rounded-xl border-2 text-xs font-bold capitalize ${c.align === a ? 'border-[#f5a623] bg-amber-50' : 'border-gray-200 text-gray-500'}`}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      }

      case 'image': {
        const c = block.content as ImageContent;
        return (
          <div className="space-y-3">
            {c.url && <img src={c.url} alt={c.alt || ''} className="w-full max-h-40 object-cover rounded-xl" />}
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) { setImgUploadTarget('url'); uploadImage(f, 'url'); } }} />
            <div className="flex gap-2">
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="flex-1 border-2 border-dashed border-gray-300 hover:border-[#f5a623] rounded-xl py-2.5 text-xs text-gray-500 hover:text-[#f5a623] transition-all flex items-center justify-center gap-1.5 disabled:opacity-60">
                {uploading && imgUploadTarget === 'url' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                Upload photo
              </button>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Or paste image URL</label>
              <input type="url" value={c.url} onChange={e => onChange({ ...c, url: e.target.value })}
                placeholder="https://…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Alt text</label>
              <input type="text" value={c.alt} onChange={e => onChange({ ...c, alt: e.target.value })}
                placeholder="Describe the image…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Caption (optional)</label>
              <input type="text" value={c.caption ?? ''} onChange={e => onChange({ ...c, caption: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50" />
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
              <input type="checkbox" checked={c.contained ?? false} onChange={e => onChange({ ...c, contained: e.target.checked })}
                className="w-4 h-4 rounded accent-[#f5a623]" />
              Contained width (max ~640px)
            </label>
          </div>
        );
      }

      case 'image_text': {
        const c = block.content as ImageTextContent;
        const imgRef2 = useRef<HTMLInputElement>(null);
        return (
          <div className="space-y-3">
            {c.image_url && <img src={c.image_url} alt={c.image_alt || ''} className="w-full max-h-32 object-cover rounded-xl" />}
            <input ref={imgRef2} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) { setImgUploadTarget('image_url'); uploadImage(f, 'image_url'); } }} />
            <div className="flex gap-2">
              <button type="button" onClick={() => imgRef2.current?.click()} disabled={uploading}
                className="flex-1 border-2 border-dashed border-gray-300 hover:border-[#f5a623] rounded-xl py-2.5 text-xs text-gray-500 hover:text-[#f5a623] flex items-center justify-center gap-1.5 disabled:opacity-60">
                {uploading && imgUploadTarget === 'image_url' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                Upload image
              </button>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Or image URL</label>
              <input type="url" value={c.image_url} onChange={e => onChange({ ...c, image_url: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Image side</label>
              <div className="flex gap-2">
                {(['left','right'] as const).map(s => (
                  <button key={s} type="button" onClick={() => onChange({ ...c, image_side: s })}
                    className={`flex-1 py-2 rounded-xl border-2 text-xs font-bold capitalize ${c.image_side === s ? 'border-[#f5a623] bg-amber-50' : 'border-gray-200 text-gray-500'}`}>
                    Image {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Heading (optional)</label>
              <input type="text" value={c.heading ?? ''} onChange={e => onChange({ ...c, heading: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Text</label>
              <textarea value={c.text} onChange={e => onChange({ ...c, text: e.target.value })}
                rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50" />
            </div>
          </div>
        );
      }

      case 'button': {
        const c = block.content as ButtonContent;
        return <LinkEditor value={c.link ?? { link_type: 'external', href: '', label: 'Learn More', variant: 'primary' }}
          onChange={link => onChange({ ...c, link })} pages={allPages} />;
      }

      case 'divider': {
        const c = block.content as DividerContent;
        return (
          <div className="flex gap-2">
            {(['line','dots','space'] as const).map(s => (
              <button key={s} type="button" onClick={() => onChange({ ...c, style: s })}
                className={`flex-1 py-2 rounded-xl border-2 text-xs font-bold capitalize ${c.style === s ? 'border-[#f5a623] bg-amber-50' : 'border-gray-200 text-gray-500'}`}>
                {s}
              </button>
            ))}
          </div>
        );
      }

      case 'spacer': {
        const c = block.content as SpacerContent;
        return (
          <div className="flex gap-2">
            {(['small','medium','large'] as const).map(s => (
              <button key={s} type="button" onClick={() => onChange({ ...c, size: s })}
                className={`flex-1 py-2 rounded-xl border-2 text-xs font-bold capitalize ${c.size === s ? 'border-[#f5a623] bg-amber-50' : 'border-gray-200 text-gray-500'}`}>
                {s}
              </button>
            ))}
          </div>
        );
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Block header */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center gap-2">
        <span className="text-gray-400">{BLOCK_ICONS[block.blockType]}</span>
        <span className="text-sm font-bold text-gray-700 flex-1">{BLOCK_LABELS[block.blockType]}</span>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onMoveUp} disabled={isFirst}
            className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-20 disabled:cursor-not-allowed rounded-lg hover:bg-gray-100 transition-all">
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button onClick={onMoveDown} disabled={isLast}
            className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-20 disabled:cursor-not-allowed rounded-lg hover:bg-gray-100 transition-all">
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete}
            className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="p-4">{renderFields()}</div>
    </div>
  );
}

// ── Page metadata editor modal ──────────────────────────────────────────────
function PageMetaModal({ page, existingSlugs, onSave, onClose }: {
  page: Partial<SitePage> | null;
  existingSlugs: string[];
  onSave: (data: { title: string; navLabel: string; slug: string; showInNav: boolean; navOrder: number }) => void;
  onClose: () => void;
}) {
  const isNew = !page?.id;
  const [title, setTitle]         = useState(page?.title ?? '');
  const [navLabel, setNavLabel]   = useState(page?.navLabel ?? '');
  const [slug, setSlug]           = useState(page?.slug ?? '');
  const [showInNav, setShowInNav] = useState(page?.showInNav ?? false);
  const [navOrder, setNavOrder]   = useState(page?.navOrder ?? 0);
  const [slugManual, setSlugManual] = useState(!isNew);

  const handleTitleChange = (v: string) => {
    setTitle(v);
    if (!slugManual) setSlug(slugify(v));
  };

  const slugError = slug && existingSlugs.includes(slug) && slug !== page?.slug;

  const handleSave = () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (!slug.trim()) { toast.error('Slug is required'); return; }
    if (slugError) { toast.error('That slug is already in use'); return; }
    onSave({ title: title.trim(), navLabel: navLabel.trim() || title.trim(), slug: slugify(slug), showInNav, navOrder });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="bg-[#0f1f3d] px-5 py-4 flex items-center justify-between">
          <h2 className="text-white font-bold">{isNew ? 'Create New Page' : 'Page Settings'}</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white p-1"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Page Title *</label>
            <input type="text" value={title} onChange={e => handleTitleChange(e.target.value)}
              placeholder="e.g. About Us, Our Story…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50 focus:border-[#f5a623]" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Navigation Label
              <span className="font-normal text-gray-400 ml-1">(what appears in the menu)</span>
            </label>
            <input type="text" value={navLabel} onChange={e => setNavLabel(e.target.value)}
              placeholder={title || 'e.g. About'}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50 focus:border-[#f5a623]" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">URL Slug *</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-[#f5a623]/50 focus-within:border-[#f5a623]">
              <span className="text-xs text-gray-400 whitespace-nowrap">/p/</span>
              <input type="text" value={slug}
                onChange={e => { setSlugManual(true); setSlug(slugify(e.target.value)); }}
                placeholder="about-us"
                className="flex-1 text-sm bg-transparent focus:outline-none font-mono" />
            </div>
            {slugError && <p className="text-xs text-red-500 mt-1">This slug is already in use.</p>}
            <p className="text-[11px] text-gray-400 mt-1">Public URL: <strong>/p/{slug || 'your-slug'}</strong></p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-semibold text-gray-700">Show in navigation</p>
                <p className="text-xs text-gray-400">Appears in the site's header nav</p>
              </div>
              <div onClick={() => setShowInNav(v => !v)}
                className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${showInNav ? 'bg-[#f5a623]' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${showInNav ? 'left-5' : 'left-0.5'}`} />
              </div>
            </label>
            {showInNav && (
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Navigation order</label>
                <input type="number" min={0} value={navOrder} onChange={e => setNavOrder(parseInt(e.target.value) || 0)}
                  className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50" />
                <p className="text-[11px] text-gray-400 mt-1">Lower = appears earlier in nav</p>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50 text-sm">Cancel</button>
            <button onClick={handleSave}
              className="flex-1 bg-[#f5a623] hover:bg-[#e09615] text-[#0f1f3d] font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
              <Check className="w-4 h-4" /> {isNew ? 'Create Page' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Block picker ────────────────────────────────────────────────────────────
const BLOCK_ORDER: BlockType[] = ['heading', 'paragraph', 'image', 'image_text', 'button', 'divider', 'spacer'];

function BlockPicker({ onAdd, onClose }: { onAdd: (type: BlockType) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-[#0f1f3d] px-5 py-4 flex items-center justify-between">
          <h2 className="text-white font-bold text-sm">Add Block</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white p-1"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 grid grid-cols-2 gap-2">
          {BLOCK_ORDER.map(type => (
            <button key={type} onClick={() => onAdd(type)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-[#f5a623] hover:bg-amber-50 transition-all text-left text-sm font-semibold text-gray-700 hover:text-[#0f1f3d]">
              <span className="text-[#f5a623]">{BLOCK_ICONS[type]}</span>
              {BLOCK_LABELS[type]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Website Pages admin ────────────────────────────────────────────────

type View = 'list' | 'editor';

export default function WebsitePages() {
  const { pages, loading, saving, createPage, updatePage, deletePage, loadBlocks, saveBlocks } = usePagesAdmin();
  const { pages: publishedPages } = usePublishedPages();
  const [view, setView]           = useState<View>('list');
  const [editingPage, setEditingPage] = useState<SitePage | null>(null);
  const [blocks, setBlocks]       = useState<Omit<SiteBlock, 'createdAt'>[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [showBlockPicker, setShowBlockPicker] = useState(false);
  const [showMetaModal, setShowMetaModal] = useState<Partial<SitePage> | null | false>(false);
  const [confirmDelete, setConfirmDelete] = useState<SitePage | null>(null);
  const [dirty, setDirty] = useState(false);

  const openEditor = useCallback(async (page: SitePage) => {
    setEditingPage(page);
    setBlocksLoading(true);
    setView('editor');
    const loaded = await loadBlocks(page.id);
    setBlocks(loaded.map(b => ({ id: b.id, pageId: b.pageId, blockType: b.blockType, content: b.content, sortOrder: b.sortOrder })));
    setBlocksLoading(false);
    setDirty(false);
  }, [loadBlocks]);

  const handleAddBlock = (type: BlockType) => {
    const newBlock: Omit<SiteBlock, 'createdAt'> = {
      id: `new-${Date.now()}`,
      pageId: editingPage!.id,
      blockType: type,
      content: defaultContent(type),
      sortOrder: blocks.length,
    };
    setBlocks(prev => [...prev, newBlock]);
    setShowBlockPicker(false);
    setDirty(true);
  };

  const handleBlockChange = (idx: number, content: BlockContent) => {
    setBlocks(prev => prev.map((b, i) => i === idx ? { ...b, content } : b));
    setDirty(true);
  };

  const handleDeleteBlock = (idx: number) => {
    setBlocks(prev => prev.filter((_, i) => i !== idx));
    setDirty(true);
  };

  const handleMoveBlock = (idx: number, dir: 'up' | 'down') => {
    setBlocks(prev => {
      const next = [...prev];
      const swap = dir === 'up' ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
    setDirty(true);
  };

  const handleSaveBlocks = async () => {
    if (!editingPage) return;
    await saveBlocks(editingPage.id, blocks.map((b, i) => ({ ...b, sortOrder: i })));
    setDirty(false);
  };

  const handleCreatePage = async (data: { title: string; navLabel: string; slug: string; showInNav: boolean; navOrder: number }) => {
    const page = await createPage(data);
    if (page) { setShowMetaModal(false); openEditor(page); }
  };

  const handleUpdatePageMeta = async (data: { title: string; navLabel: string; slug: string; showInNav: boolean; navOrder: number }) => {
    if (!editingPage) return;
    const ok = await updatePage(editingPage.id, data);
    if (ok) {
      setEditingPage(prev => prev ? { ...prev, ...data } : prev);
      setShowMetaModal(false);
    }
  };

  const navPages = pages.filter(p => p.showInNav && p.published).sort((a, b) => a.navOrder - b.navOrder);

  // ── Page list view ──────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div className="space-y-4">
        {showMetaModal !== false && (
          <PageMetaModal
            page={showMetaModal}
            existingSlugs={pages.map(p => p.slug)}
            onSave={handleCreatePage}
            onClose={() => setShowMetaModal(false)}
          />
        )}
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 space-y-4">
              <h3 className="font-bold text-gray-900">Delete "{confirmDelete.title}"?</h3>
              <p className="text-sm text-gray-500">All content blocks will be permanently deleted.</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 border border-gray-200 text-gray-600 font-bold py-3 rounded-xl text-sm">Cancel</button>
                <button onClick={async () => { await deletePage(confirmDelete.id); setConfirmDelete(null); }}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl text-sm">Delete</button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-black text-[#0f1f3d]">Website Pages</h2>
            <p className="text-xs text-gray-500 mt-0.5">Create and manage public-facing pages for your website.</p>
          </div>
          <button onClick={() => setShowMetaModal(null)}
            className="flex items-center gap-2 bg-[#f5a623] hover:bg-[#e09615] text-[#0f1f3d] font-bold px-4 py-2.5 rounded-xl text-sm transition-all flex-shrink-0">
            <Plus className="w-4 h-4" /> New Page
          </button>
        </div>

        {/* Nav preview */}
        {navPages.length > 0 && (
          <div className="bg-[#0f1f3d] rounded-2xl px-5 py-3">
            <p className="text-[11px] font-bold text-white/40 mb-2 uppercase tracking-wide">Live navigation preview</p>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-white/40 text-xs">Menu</span>
              <span className="text-white/20 text-xs">|</span>
              {navPages.map(p => (
                <span key={p.id} className="text-[#f5a623] text-xs font-semibold">{p.navLabel || p.title}</span>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 text-[#f5a623] animate-spin" /></div>
        ) : pages.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-16 text-center">
            <Globe className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="font-bold text-gray-500 mb-1">No pages yet</p>
            <p className="text-xs text-gray-400 mb-4">Create your first page to get started.</p>
            <button onClick={() => setShowMetaModal(null)}
              className="bg-[#f5a623] hover:bg-[#e09615] text-[#0f1f3d] font-bold px-6 py-2.5 rounded-xl text-sm">
              Create First Page
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {pages.map(page => {
              const url = `/p/${page.slug}`;
              return (
                <div key={page.id} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-gray-900">{page.title}</span>
                      {page.published
                        ? <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Published</span>
                        : <span className="text-[10px] bg-gray-100 text-gray-500 font-bold px-2 py-0.5 rounded-full">Draft</span>
                      }
                      {page.showInNav && <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">In nav</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">{url}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Publish toggle */}
                    <button onClick={() => updatePage(page.id, { published: !page.published })}
                      title={page.published ? 'Unpublish' : 'Publish'}
                      className={`p-2 rounded-xl transition-all ${page.published ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                      {page.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    {/* Copy link */}
                    {page.published && (
                      <button onClick={() => { navigator.clipboard.writeText(window.location.origin + url); toast.success('URL copied!'); }}
                        className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-all" title="Copy URL">
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                    {/* Preview */}
                    {page.published && (
                      <a href={url} target="_blank" rel="noopener noreferrer"
                        className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-all" title="Open page">
                        <ArrowUpRight className="w-4 h-4" />
                      </a>
                    )}
                    {/* Edit */}
                    <button onClick={() => openEditor(page)}
                      className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-xl transition-all" title="Edit content">
                      <Pencil className="w-4 h-4" />
                    </button>
                    {/* Settings */}
                    <button onClick={() => setShowMetaModal(page)}
                      className="p-2 bg-gray-50 text-gray-500 hover:bg-gray-100 rounded-xl transition-all" title="Page settings">
                      <Globe className="w-4 h-4" />
                    </button>
                    {/* Delete */}
                    <button onClick={() => setConfirmDelete(page)}
                      className="p-2 bg-red-50 text-red-400 hover:bg-red-100 rounded-xl transition-all" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Editor view ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {showBlockPicker && <BlockPicker onAdd={handleAddBlock} onClose={() => setShowBlockPicker(false)} />}
      {showMetaModal !== false && editingPage && (
        <PageMetaModal
          page={editingPage}
          existingSlugs={pages.filter(p => p.id !== editingPage.id).map(p => p.slug)}
          onSave={handleUpdatePageMeta}
          onClose={() => setShowMetaModal(false)}
        />
      )}

      {/* Editor header */}
      <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center gap-3 flex-wrap">
        <button onClick={() => { if (dirty && !confirm('You have unsaved changes. Discard?')) return; setView('list'); setEditingPage(null); setBlocks([]); }}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 font-semibold transition-colors flex-shrink-0">
          <ChevronDown className="w-4 h-4 rotate-90" /> All pages
        </button>
        <span className="text-gray-300 text-sm">/</span>
        <span className="font-bold text-[#0f1f3d] text-sm flex-1 truncate">{editingPage?.title}</span>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          {/* Published toggle */}
          {editingPage && (
            <button
              onClick={() => updatePage(editingPage.id, { published: !editingPage.published })
                .then(ok => ok && setEditingPage(prev => prev ? { ...prev, published: !prev.published } : prev))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 text-xs font-bold transition-all ${
                editingPage.published ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
              }`}>
              {editingPage.published ? <><Eye className="w-3.5 h-3.5" /> Published</> : <><EyeOff className="w-3.5 h-3.5" /> Draft</>}
            </button>
          )}
          {/* Settings */}
          {editingPage && (
            <button onClick={() => setShowMetaModal(editingPage)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-gray-200 text-xs font-bold text-gray-500 hover:border-gray-300 transition-all">
              <Globe className="w-3.5 h-3.5" /> Settings
            </button>
          )}
          {/* Preview */}
          {editingPage?.published && (
            <a href={`/p/${editingPage.slug}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-indigo-200 bg-indigo-50 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-all">
              <EyeIcon className="w-3.5 h-3.5" /> Preview
            </a>
          )}
          {/* Save */}
          <button onClick={handleSaveBlocks} disabled={saving || !dirty}
            className="flex items-center gap-1.5 bg-[#f5a623] hover:bg-[#e09615] disabled:opacity-50 text-[#0f1f3d] font-bold px-4 py-2 rounded-xl text-sm transition-all">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>

      {blocksLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 text-[#f5a623] animate-spin" /></div>
      ) : (
        <>
          {blocks.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-12 text-center text-gray-400">
              <Layout className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">No blocks yet</p>
              <p className="text-xs mt-1">Add your first content block below.</p>
            </div>
          )}
          <div className="space-y-3">
            {blocks.map((block, idx) => (
              <BlockEditor
                key={block.id}
                block={block as SiteBlock}
                pages={pages}
                allPages={publishedPages}
                onChange={content => handleBlockChange(idx, content)}
                onDelete={() => handleDeleteBlock(idx)}
                onMoveUp={() => handleMoveBlock(idx, 'up')}
                onMoveDown={() => handleMoveBlock(idx, 'down')}
                isFirst={idx === 0}
                isLast={idx === blocks.length - 1}
              />
            ))}
          </div>
          <button onClick={() => setShowBlockPicker(true)}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 hover:border-[#f5a623] hover:bg-amber-50 text-gray-500 hover:text-[#f5a623] font-bold py-4 rounded-2xl transition-all text-sm">
            <Plus className="w-4 h-4" /> Add Block
          </button>
        </>
      )}
    </div>
  );
}
