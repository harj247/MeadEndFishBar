import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { SitePage, SiteBlock, BlockType, BlockContent } from '@/types/cms';
import { toast } from 'sonner';

// ── Row mappers ───────────────────────────────────────────────────────────

function rowToPage(r: Record<string, unknown>): SitePage {
  return {
    id:         r.id as string,
    title:      r.title as string,
    navLabel:   (r.nav_label as string) || (r.title as string),
    slug:       r.slug as string,
    published:  Boolean(r.published),
    showInNav:  Boolean(r.show_in_nav),
    navOrder:   Number(r.nav_order ?? 0),
    createdAt:  r.created_at as string,
    updatedAt:  r.updated_at as string,
  };
}

function rowToBlock(r: Record<string, unknown>): SiteBlock {
  return {
    id:         r.id as string,
    pageId:     r.page_id as string,
    blockType:  r.block_type as BlockType,
    content:    (r.content ?? {}) as BlockContent,
    sortOrder:  Number(r.sort_order ?? 0),
    createdAt:  r.created_at as string,
  };
}

// ── Customer-facing: published pages (for navigation) ─────────────────────

export function usePublishedPages() {
  const [pages, setPages] = useState<SitePage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('site_pages')
      .select('*')
      .eq('published', true)
      .order('nav_order')
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error('[usePublishedPages]', error);
        setPages((data ?? []).map(r => rowToPage(r as Record<string, unknown>)));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { pages, loading };
}

// ── Customer-facing: single page + its blocks by slug ─────────────────────

export function usePageBySlug(slug: string) {
  const [page, setPage]     = useState<SitePage | null>(null);
  const [blocks, setBlocks] = useState<SiteBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    supabase
      .from('site_pages')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .single()
      .then(async ({ data: pageData, error: pageErr }) => {
        if (cancelled) return;
        if (pageErr || !pageData) { setNotFound(true); setLoading(false); return; }
        const p = rowToPage(pageData as Record<string, unknown>);
        setPage(p);

        const { data: blockData, error: blockErr } = await supabase
          .from('site_blocks')
          .select('*')
          .eq('page_id', p.id)
          .order('sort_order');

        if (!cancelled) {
          if (blockErr) console.error('[usePageBySlug blocks]', blockErr);
          setBlocks((blockData ?? []).map(r => rowToBlock(r as Record<string, unknown>)));
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [slug]);

  return { page, blocks, loading, notFound };
}

// ── Admin: full CRUD ───────────────────────────────────────────────────────

export function usePagesAdmin() {
  const [pages, setPages]   = useState<SitePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  const fetchPages = useCallback(async () => {
    const { data, error } = await supabase
      .from('site_pages')
      .select('*')
      .order('nav_order');
    if (error) { console.error('[usePagesAdmin]', error); toast.error('Failed to load pages'); }
    setPages((data ?? []).map(r => rowToPage(r as Record<string, unknown>)));
    setLoading(false);
  }, []);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  // ── Create ──────────────────────────────────────────────────────────────
  const createPage = useCallback(async (input: {
    title: string; navLabel: string; slug: string;
    showInNav: boolean; navOrder: number;
  }): Promise<SitePage | null> => {
    setSaving(true);
    const id = input.slug.replace(/[^a-z0-9-]/g, '-');
    const { data, error } = await supabase
      .from('site_pages')
      .insert({
        id,
        title:       input.title,
        nav_label:   input.navLabel || input.title,
        slug:        input.slug,
        published:   false,
        show_in_nav: input.showInNav,
        nav_order:   input.navOrder,
        updated_at:  new Date().toISOString(),
      })
      .select()
      .single();
    setSaving(false);
    if (error) {
      const msg = error.code === '23505' ? 'A page with that slug already exists.' : error.message;
      toast.error('Failed to create page: ' + msg);
      return null;
    }
    const page = rowToPage(data as Record<string, unknown>);
    setPages(prev => [...prev, page].sort((a, b) => a.navOrder - b.navOrder));
    toast.success('Page created');
    return page;
  }, []);

  // ── Update page metadata ─────────────────────────────────────────────────
  const updatePage = useCallback(async (id: string, updates: Partial<{
    title: string; navLabel: string; slug: string;
    published: boolean; showInNav: boolean; navOrder: number;
  }>): Promise<boolean> => {
    setSaving(true);
    const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.title      !== undefined) dbUpdates.title       = updates.title;
    if (updates.navLabel   !== undefined) dbUpdates.nav_label   = updates.navLabel;
    if (updates.slug       !== undefined) dbUpdates.slug        = updates.slug;
    if (updates.published  !== undefined) dbUpdates.published   = updates.published;
    if (updates.showInNav  !== undefined) dbUpdates.show_in_nav = updates.showInNav;
    if (updates.navOrder   !== undefined) dbUpdates.nav_order   = updates.navOrder;

    const { error } = await supabase.from('site_pages').update(dbUpdates).eq('id', id);
    setSaving(false);
    if (error) {
      const msg = error.code === '23505' ? 'That slug is already in use.' : error.message;
      toast.error('Failed to save: ' + msg);
      return false;
    }
    setPages(prev => prev
      .map(p => p.id === id ? { ...p, ...updates } : p)
      .sort((a, b) => a.navOrder - b.navOrder));
    return true;
  }, []);

  // ── Delete page (cascades blocks) ────────────────────────────────────────
  const deletePage = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('site_pages').delete().eq('id', id);
    if (error) { toast.error('Failed to delete page'); return false; }
    setPages(prev => prev.filter(p => p.id !== id));
    toast.success('Page deleted');
    return true;
  }, []);

  // ── Load blocks for a page ───────────────────────────────────────────────
  const loadBlocks = useCallback(async (pageId: string): Promise<SiteBlock[]> => {
    const { data, error } = await supabase
      .from('site_blocks')
      .select('*')
      .eq('page_id', pageId)
      .order('sort_order');
    if (error) { toast.error('Failed to load blocks'); return []; }
    return (data ?? []).map(r => rowToBlock(r as Record<string, unknown>));
  }, []);

  // ── Save the full block list for a page (replace all) ────────────────────
  const saveBlocks = useCallback(async (pageId: string, blocks: Omit<SiteBlock, 'id' | 'createdAt'>[]): Promise<boolean> => {
    setSaving(true);
    // Delete existing blocks then insert new ordered set
    const { error: delErr } = await supabase.from('site_blocks').delete().eq('page_id', pageId);
    if (delErr) { toast.error('Failed to save blocks'); setSaving(false); return false; }

    if (blocks.length > 0) {
      const rows = blocks.map((b, i) => ({
        page_id:    pageId,
        block_type: b.blockType,
        content:    b.content,
        sort_order: i,
      }));
      const { error: insErr } = await supabase.from('site_blocks').insert(rows);
      if (insErr) { toast.error('Failed to save blocks: ' + insErr.message); setSaving(false); return false; }
    }

    setSaving(false);
    toast.success('Page saved');
    return true;
  }, []);

  return {
    pages, loading, saving,
    createPage, updatePage, deletePage,
    loadBlocks, saveBlocks,
    refresh: fetchPages,
  };
}
