import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { MenuItem, MenuCategory, CustomisationGroup, SuggestedAddon, GroupCondition } from '@/types';
import { toast } from 'sonner';

// ── Map DB row → CustomisationGroup ──────────────────────────────────────────
function rowToGroup(row: Record<string, unknown>): CustomisationGroup {
  const rawOptions = row.options;
  let options: string[] = [];
  if (Array.isArray(rawOptions)) {
    options = rawOptions as string[];
  } else if (typeof rawOptions === 'string') {
    try { options = JSON.parse(rawOptions); } catch { options = []; }
  }
  return {
    id:        row.id as string,
    name:      row.name as string,
    type:      (row.type as 'single' | 'multi') ?? 'single',
    maxSelect: Number(row.max_select ?? 1),
    required:  Boolean(row.required),
    options,
    sortOrder: Number(row.sort_order ?? 0),
    global:    Boolean(row.global),
  };
}

// ── Map DB row → MenuItem ──────────────────────────────────────────────────────
function rowToMenuItem(row: Record<string, unknown>): MenuItem {
  return {
    id:             row.id as string,
    name:           row.name as string,
    description:    (row.description as string) ?? '',
    price:          Number(row.price),
    category:       row.category as string,
    image:          (row.image as string | null) ?? undefined,
    popular:        Boolean(row.popular),
    available:      row.available !== false,
    sortOrder:      Number(row.sort_order ?? 0),
    showCondiments: Boolean(row.show_condiments),
    showSalad:      Boolean(row.show_salad),
    showSauces:     Boolean(row.show_sauces),
    customGroupIds:         Array.isArray(row.custom_group_ids) ? (row.custom_group_ids as string[]) : [],
    customGroupConditions:  row.custom_group_conditions
      ? (row.custom_group_conditions as Record<string, GroupCondition>)
      : undefined,
    categories:     Array.isArray(row.categories) ? (row.categories as string[]) : [],
    featured:       Boolean(row.featured),
    suggestedAddon: row.suggested_addon
      ? (row.suggested_addon as SuggestedAddon)
      : undefined,
  };
}

function rowToCategory(row: Record<string, unknown>): MenuCategory {
  return {
    id:           row.id as string,
    name:         row.name as string,
    icon:         row.icon as string,
    available:    row.available !== false,
    sortOrder:    Number(row.sort_order ?? 0),
    modifierOnly: Boolean(row.modifier_only),
    printCopies:  typeof row.print_copies === 'number' ? row.print_copies : 1,
  };
}

// ── Customer-facing: fetch available items only ───────────────────────────────
export function useMenuItems() {
  const [items, setItems]               = useState<MenuItem[]>([]);
  const [categories, setCategories]     = useState<MenuCategory[]>([]);
  const [customGroups, setCustomGroups] = useState<CustomisationGroup[]>([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Fire all three queries in parallel — but don't gate the menu render on
      // customisation_groups, which is only needed when a customer taps an item.
      const itemsPromise  = supabase.from('menu_items').select('*').eq('available', true).order('sort_order');
      const catsPromise   = supabase.from('menu_categories').select('*').eq('available', true).order('sort_order');
      const groupsPromise = supabase.from('customisation_groups').select('*').order('sort_order');

      // Unblock the menu render as soon as items + categories arrive
      const [itemsRes, catsRes] = await Promise.all([itemsPromise, catsPromise]);
      if (cancelled) return;

      if (itemsRes.error) { console.error('[useMenuItems] items error:', itemsRes.error); toast.error('Failed to load menu'); }
      if (catsRes.error)  { console.error('[useMenuItems] categories error:', catsRes.error); }

      setItems((itemsRes.data ?? []).map(r => rowToMenuItem(r as Record<string, unknown>)));
      setCategories((catsRes.data ?? []).map(r => rowToCategory(r as Record<string, unknown>)));
      setLoading(false); // ← menu renders here; image requests begin immediately

      // Customisation groups arrive asynchronously — ready well before the customer taps any item
      const groupsRes = await groupsPromise;
      if (cancelled) return;
      if (groupsRes.error) { console.error('[useMenuItems] groups error:', groupsRes.error); }
      setCustomGroups((groupsRes.data ?? []).map(r => rowToGroup(r as Record<string, unknown>)));
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { items, categories, customGroups, loading };
}

// ── Admin: fetch ALL items (including unavailable) ────────────────────────────
export function useMenuAdmin() {
  const [items, setItems]               = useState<MenuItem[]>([]);
  const [categories, setCategories]     = useState<MenuCategory[]>([]);
  const [customGroups, setCustomGroups] = useState<CustomisationGroup[]>([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);

  const fetchAll = useCallback(async () => {
    const [itemsRes, catsRes, groupsRes] = await Promise.all([
      supabase.from('menu_items').select('*').order('category').order('sort_order'),
      supabase.from('menu_categories').select('*').order('sort_order'),
      supabase.from('customisation_groups').select('*').order('sort_order'),
    ]);

    if (itemsRes.error)  { console.error('[useMenuAdmin] items:', itemsRes.error);  toast.error('Failed to load menu'); }
    if (catsRes.error)   { console.error('[useMenuAdmin] cats:',  catsRes.error); }
    if (groupsRes.error) { console.error('[useMenuAdmin] groups:', groupsRes.error); }

    setItems((itemsRes.data ?? []).map(r => rowToMenuItem(r as Record<string, unknown>)));
    setCategories((catsRes.data ?? []).map(r => rowToCategory(r as Record<string, unknown>)));
    setCustomGroups((groupsRes.data ?? []).map(r => rowToGroup(r as Record<string, unknown>)));
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Toggle item availability ───────────────────────────────────────────────
  const toggleItem = useCallback(async (id: string, available: boolean) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, available } : i));
    const { error } = await supabase.from('menu_items').update({ available }).eq('id', id);
    if (error) { toast.error('Failed to update item'); fetchAll(); }
    else toast.success(available ? 'Item enabled' : 'Item disabled');
  }, [fetchAll]);

  // ── Toggle category availability ──────────────────────────────────────────
  const toggleCategory = useCallback(async (id: string, available: boolean) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, available } : c));
    const { error } = await supabase.from('menu_categories').update({ available }).eq('id', id);
    if (error) { toast.error('Failed to update category'); fetchAll(); }
    else toast.success(available ? 'Category enabled' : 'Category hidden');
  }, [fetchAll]);

  // ── Reorder item within its category ──────────────────────────────────────
  const moveItem = useCallback(async (id: string, dir: 'up' | 'down') => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    // Get all items in the same primary category, sorted
    const siblings = [...items]
      .filter(i => i.category === item.category)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const idx = siblings.findIndex(i => i.id === id);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    const aOrder = siblings[idx].sortOrder ?? idx;
    const bOrder = siblings[swapIdx].sortOrder ?? swapIdx;
    // Optimistic update
    setItems(prev => prev.map(i => {
      if (i.id === siblings[idx].id)    return { ...i, sortOrder: bOrder };
      if (i.id === siblings[swapIdx].id) return { ...i, sortOrder: aOrder };
      return i;
    }));
    await Promise.all([
      supabase.from('menu_items').update({ sort_order: bOrder }).eq('id', siblings[idx].id),
      supabase.from('menu_items').update({ sort_order: aOrder }).eq('id', siblings[swapIdx].id),
    ]);
  }, [items]);

  // ── Update item fields ────────────────────────────────────────────────────
  const updateItem = useCallback(async (id: string, updates: Partial<MenuItem>) => {
    setSaving(true);
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name           !== undefined) dbUpdates.name             = updates.name;
    if (updates.description    !== undefined) dbUpdates.description      = updates.description;
    if (updates.price          !== undefined) dbUpdates.price            = updates.price;
    if (updates.category       !== undefined) dbUpdates.category         = updates.category;
    if (updates.popular        !== undefined) dbUpdates.popular          = updates.popular;
    if (updates.image          !== undefined) dbUpdates.image            = updates.image;
    if (updates.showCondiments !== undefined) dbUpdates.show_condiments  = updates.showCondiments;
    if (updates.showSalad      !== undefined) dbUpdates.show_salad       = updates.showSalad;
    if (updates.showSauces     !== undefined) dbUpdates.show_sauces      = updates.showSauces;
    if (updates.customGroupIds         !== undefined) dbUpdates.custom_group_ids         = updates.customGroupIds;
    if (updates.customGroupConditions  !== undefined) dbUpdates.custom_group_conditions  = updates.customGroupConditions;
    if (updates.categories             !== undefined) dbUpdates.categories               = updates.categories;
    if (updates.featured       !== undefined) dbUpdates.featured         = updates.featured;
    if (updates.sortOrder      !== undefined) dbUpdates.sort_order       = updates.sortOrder;
    if ('suggestedAddon' in updates) dbUpdates.suggested_addon = updates.suggestedAddon ?? null;

    const { error } = await supabase.from('menu_items').update(dbUpdates).eq('id', id);
    setSaving(false);
    if (error) { toast.error('Failed to save changes'); return false; }
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    toast.success('Item updated');
    return true;
  }, []);

  // ── Add new item ──────────────────────────────────────────────────────────
  const addItem = useCallback(async (item: Omit<MenuItem, 'available' | 'sortOrder'>) => {
    setSaving(true);
    const maxOrder = items.filter(i => i.category === item.category).reduce((m, i) => Math.max(m, i.sortOrder ?? 0), 0);
    const { data, error } = await supabase
      .from('menu_items')
      .insert({
        id:               item.id,
        name:             item.name,
        description:      item.description,
        price:            item.price,
        category:         item.category,
        image:            item.image ?? null,
        popular:          item.popular ?? false,
        featured:         item.featured ?? false,
        suggested_addon:  item.suggestedAddon ?? null,
        show_condiments:  item.showCondiments ?? false,
        show_salad:       item.showSalad ?? false,
        show_sauces:      item.showSauces ?? false,
        custom_group_ids:         item.customGroupIds ?? [],
        custom_group_conditions:  item.customGroupConditions ?? {},
        categories:               item.categories ?? [],
        available:        true,
        sort_order:       maxOrder + 1,
      })
      .select()
      .single();
    setSaving(false);
    if (error || !data) { toast.error('Failed to add item: ' + (error?.message ?? 'Unknown')); return false; }
    setItems(prev => [...prev, rowToMenuItem(data as Record<string, unknown>)]);
    toast.success('Item added!');
    return true;
  }, [items]);

  // ── Delete item ───────────────────────────────────────────────────────────
  const deleteItem = useCallback(async (id: string) => {
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (error) { toast.error('Failed to delete item'); return; }
    setItems(prev => prev.filter(i => i.id !== id));
    toast.success('Item deleted');
  }, []);

  // ── Customisation group CRUD ──────────────────────────────────────────────
  const addCustomGroup = useCallback(async (group: Omit<CustomisationGroup, 'sortOrder'>) => {
    setSaving(true);
    const maxOrder = customGroups.reduce((m, g) => Math.max(m, g.sortOrder ?? 0), 0);
    const { data, error } = await supabase
      .from('customisation_groups')
      .insert({
        id:         group.id,
        name:       group.name,
        type:       group.type,
        max_select: group.maxSelect,
        required:   group.required,
        options:    group.options,
        sort_order: maxOrder + 1,
        global:     group.global ?? false,
      })
      .select()
      .single();
    setSaving(false);
    if (error || !data) { toast.error('Failed to add group: ' + (error?.message ?? 'Unknown')); return false; }
    setCustomGroups(prev => [...prev, rowToGroup(data as Record<string, unknown>)]);
    toast.success('Customisation group added!');
    return true;
  }, [customGroups]);

  const updateCustomGroup = useCallback(async (id: string, updates: Partial<CustomisationGroup>) => {
    setSaving(true);
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name      !== undefined) dbUpdates.name       = updates.name;
    if (updates.type      !== undefined) dbUpdates.type       = updates.type;
    if (updates.maxSelect !== undefined) dbUpdates.max_select = updates.maxSelect;
    if (updates.required  !== undefined) dbUpdates.required   = updates.required;
    if (updates.options   !== undefined) dbUpdates.options    = updates.options;
    if (updates.global    !== undefined) dbUpdates.global     = updates.global;
    const { error } = await supabase.from('customisation_groups').update(dbUpdates).eq('id', id);
    setSaving(false);
    if (error) { toast.error('Failed to update group'); return false; }
    setCustomGroups(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
    toast.success('Group updated');
    return true;
  }, []);

  const deleteCustomGroup = useCallback(async (id: string) => {
    const { error } = await supabase.from('customisation_groups').delete().eq('id', id);
    if (error) { toast.error('Failed to delete group'); return false; }
    setCustomGroups(prev => prev.filter(g => g.id !== id));
    // Remove from any items referencing it
    setItems(prev => prev.map(i => ({
      ...i,
      customGroupIds: (i.customGroupIds ?? []).filter(gid => gid !== id),
    })));
    toast.success('Group deleted');
    return true;
  }, []);

  // ── Add new category ──────────────────────────────────────────────────────
  const addCategory = useCallback(async (cat: { id: string; name: string; icon: string; sortOrder?: number }) => {
    setSaving(true);
    const maxOrder = categories.reduce((m, c) => Math.max(m, c.sortOrder ?? 0), 0);
    const { data, error } = await supabase
      .from('menu_categories')
      .insert({
        id:         cat.id,
        name:       cat.name,
        icon:       cat.icon,
        sort_order: cat.sortOrder ?? maxOrder + 1,
        available:  true,
      })
      .select()
      .single();
    setSaving(false);
    if (error || !data) { toast.error('Failed to add category: ' + (error?.message ?? 'Unknown')); return false; }
    setCategories(prev => [...prev, rowToCategory(data as Record<string, unknown>)].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
    toast.success('Category added!');
    return true;
  }, [categories]);

  // ── Update category ────────────────────────────────────────────────────────
  const updateCategory = useCallback(async (id: string, updates: Partial<MenuCategory>) => {
    setSaving(true);
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name        !== undefined) dbUpdates.name         = updates.name;
    if (updates.icon        !== undefined) dbUpdates.icon         = updates.icon;
    if (updates.sortOrder   !== undefined) dbUpdates.sort_order   = updates.sortOrder;
    if (updates.printCopies !== undefined) dbUpdates.print_copies = updates.printCopies;
    const { error } = await supabase.from('menu_categories').update(dbUpdates).eq('id', id);
    setSaving(false);
    if (error) { toast.error('Failed to update category'); return false; }
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    if (updates.printCopies === undefined) toast.success('Category updated');
    return true;
  }, []);

  // ── Delete category ────────────────────────────────────────────────────────
  const deleteCategory = useCallback(async (id: string) => {
    const { error } = await supabase.from('menu_categories').delete().eq('id', id);
    if (error) { toast.error('Failed to delete category'); return false; }
    setCategories(prev => prev.filter(c => c.id !== id));
    toast.success('Category deleted');
    return true;
  }, []);

  return {
    items, categories, customGroups, loading, saving,
    toggleItem, toggleCategory, updateItem, addItem, deleteItem, moveItem,
    addCategory, updateCategory, deleteCategory,
    addCustomGroup, updateCustomGroup, deleteCustomGroup,
    refresh: fetchAll,
  };
}
