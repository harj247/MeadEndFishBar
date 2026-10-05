import { Link } from 'react-router-dom';
import { SiteBlock, SitePage, CmsLink, HeadingContent, ParagraphContent, ImageContent, ImageTextContent, ButtonContent, DividerContent, SpacerContent } from '@/types/cms';

// ── Internal link resolver ─────────────────────────────────────────────────
// Given a CmsLink and the list of published pages, resolves the correct href.
// Internal links are resolved via page_id to survive slug renames.
export function resolveLink(link: CmsLink, pages: SitePage[]): string {
  if (link.link_type === 'internal' && link.page_id) {
    const page = pages.find(p => p.id === link.page_id);
    if (page) return `/p/${page.slug}`;
  }
  return link.href || '#';
}

// ── CmsLinkButton ─────────────────────────────────────────────────────────
function CmsLinkButton({ link, pages }: { link: CmsLink; pages: SitePage[] }) {
  const href = resolveLink(link, pages);
  const isExternal = link.link_type === 'external';
  const base = 'inline-flex items-center justify-center gap-2 font-bold rounded-xl px-6 py-3 text-base transition-all active:scale-95';
  const variant = link.variant ?? 'primary';
  const variantClass =
    variant === 'primary'   ? 'bg-[var(--brand-primary)] text-[var(--brand-accent)] hover:opacity-90 shadow-sm' :
    variant === 'secondary' ? 'bg-[var(--brand-accent)] text-white hover:opacity-90 shadow-sm' :
    /* outline */              'border-2 border-[var(--brand-accent)] text-[var(--brand-accent)] hover:bg-[var(--brand-accent)]/5';

  if (isExternal) {
    return (
      <a href={href} target={link.new_tab ? '_blank' : undefined} rel={link.new_tab ? 'noopener noreferrer' : undefined}
        className={`${base} ${variantClass}`}>
        {link.label}
      </a>
    );
  }
  return <Link to={href} className={`${base} ${variantClass}`}>{link.label}</Link>;
}

// ── Individual block renderers ─────────────────────────────────────────────

function HeadingBlock({ content }: { content: HeadingContent }) {
  const align = content.align === 'center' ? 'text-center' : content.align === 'right' ? 'text-right' : 'text-left';
  if (content.level === 1) return <h1 className={`text-3xl sm:text-4xl font-black text-[var(--brand-accent)] leading-tight ${align}`}>{content.text}</h1>;
  if (content.level === 2) return <h2 className={`text-2xl sm:text-3xl font-black text-[var(--brand-accent)] leading-tight ${align}`}>{content.text}</h2>;
  return <h3 className={`text-xl sm:text-2xl font-bold text-[var(--brand-accent)] leading-tight ${align}`}>{content.text}</h3>;
}

function ParagraphBlock({ content }: { content: ParagraphContent }) {
  const align = content.align === 'center' ? 'text-center' : content.align === 'right' ? 'text-right' : 'text-left';
  return (
    <p className={`text-gray-700 text-base sm:text-lg leading-relaxed whitespace-pre-wrap ${align}`}>
      {content.text}
    </p>
  );
}

function ImageBlock({ content }: { content: ImageContent }) {
  if (!content.url) return null;
  return (
    <figure className={content.contained ? 'mx-auto max-w-2xl' : 'w-full'}>
      <img src={content.url} alt={content.alt || ''} className="w-full rounded-2xl object-cover shadow-md" loading="lazy" />
      {content.caption && <figcaption className="text-center text-sm text-gray-500 mt-2">{content.caption}</figcaption>}
    </figure>
  );
}

function ImageTextBlock({ content }: { content: ImageTextContent }) {
  const imgLeft = content.image_side !== 'right';
  return (
    <div className={`flex flex-col ${imgLeft ? 'md:flex-row' : 'md:flex-row-reverse'} gap-6 md:gap-10 items-center`}>
      <div className="w-full md:w-1/2 flex-shrink-0">
        {content.image_url
          ? <img src={content.image_url} alt={content.image_alt || ''} className="w-full rounded-2xl object-cover shadow-md" loading="lazy" />
          : <div className="w-full h-48 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 text-sm">No image</div>
        }
      </div>
      <div className="flex-1 space-y-3">
        {content.heading && <h3 className="text-xl sm:text-2xl font-bold text-[var(--brand-accent)]">{content.heading}</h3>}
        <p className="text-gray-700 text-base leading-relaxed whitespace-pre-wrap">{content.text}</p>
      </div>
    </div>
  );
}

function ButtonBlock({ content, pages }: { content: ButtonContent; pages: SitePage[] }) {
  if (!content.link?.label) return null;
  return (
    <div className="flex justify-center">
      <CmsLinkButton link={content.link} pages={pages} />
    </div>
  );
}

function DividerBlock({ content }: { content: DividerContent }) {
  if (content.style === 'space') return <div className="h-4" />;
  if (content.style === 'dots') return <div className="flex justify-center gap-2 py-2"><span className="w-1.5 h-1.5 rounded-full bg-gray-300" /><span className="w-1.5 h-1.5 rounded-full bg-gray-300" /><span className="w-1.5 h-1.5 rounded-full bg-gray-300" /></div>;
  return <hr className="border-gray-200" />;
}

function SpacerBlock({ content }: { content: SpacerContent }) {
  const h = content.size === 'large' ? 'h-16' : content.size === 'medium' ? 'h-10' : 'h-5';
  return <div className={h} />;
}

// ── Main renderer ──────────────────────────────────────────────────────────

interface BlockRendererProps {
  block: SiteBlock;
  pages: SitePage[];
}

export function BlockRenderer({ block, pages }: BlockRendererProps) {
  switch (block.blockType) {
    case 'heading':    return <HeadingBlock   content={block.content as HeadingContent}   />;
    case 'paragraph':  return <ParagraphBlock content={block.content as ParagraphContent} />;
    case 'image':      return <ImageBlock     content={block.content as ImageContent}     />;
    case 'image_text': return <ImageTextBlock content={block.content as ImageTextContent} />;
    case 'button':     return <ButtonBlock    content={block.content as ButtonContent}    pages={pages} />;
    case 'divider':    return <DividerBlock   content={block.content as DividerContent}   />;
    case 'spacer':     return <SpacerBlock    content={block.content as SpacerContent}    />;
    default:           return null;
  }
}
