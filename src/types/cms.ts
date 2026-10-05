// ── CMS Types ─────────────────────────────────────────────────────────────

export type BlockType =
  | 'heading'
  | 'paragraph'
  | 'image'
  | 'image_text'
  | 'button'
  | 'divider'
  | 'spacer';

/** Link stored inside a block's content field */
export interface CmsLink {
  link_type: 'internal' | 'external';
  /** Stable page id — used for internal links to survive slug renames */
  page_id?: string;
  /** Resolved/current href — for external links this is the full URL */
  href: string;
  label: string;
  /** Optional visual style */
  variant?: 'primary' | 'secondary' | 'outline';
  /** Open in new tab (external links) */
  new_tab?: boolean;
}

// ── Block content shapes ───────────────────────────────────────────────────

export interface HeadingContent {
  text: string;
  level: 1 | 2 | 3;
  align: 'left' | 'center' | 'right';
}

export interface ParagraphContent {
  text: string;
  align: 'left' | 'center' | 'right';
}

export interface ImageContent {
  url: string;
  alt: string;
  caption?: string;
  /** fit within a max-width container rather than full-bleed */
  contained?: boolean;
}

export interface ImageTextContent {
  image_url: string;
  image_alt: string;
  /** 'left' = image on left, 'right' = image on right */
  image_side: 'left' | 'right';
  heading?: string;
  text: string;
}

export interface ButtonContent {
  link: CmsLink;
}

export interface DividerContent {
  style: 'line' | 'dots' | 'space';
}

export interface SpacerContent {
  size: 'small' | 'medium' | 'large';
}

// Union of all content shapes
export type BlockContent =
  | HeadingContent
  | ParagraphContent
  | ImageContent
  | ImageTextContent
  | ButtonContent
  | DividerContent
  | SpacerContent;

// ── Core entities ──────────────────────────────────────────────────────────

export interface SitePage {
  id: string;
  title: string;
  navLabel: string;
  slug: string;
  published: boolean;
  showInNav: boolean;
  navOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface SiteBlock {
  id: string;
  pageId: string;
  blockType: BlockType;
  content: BlockContent;
  sortOrder: number;
  createdAt: string;
}
