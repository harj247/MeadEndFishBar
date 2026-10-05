import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { VenueConfig, cacheVenueConfig, getVenueConfig, rowToVenueConfig, applyBrandColors } from '@/lib/venueConfig';
import { toast } from 'sonner';

export function useVenueConfig() {
  const [config, setConfig]   = useState<VenueConfig>(getVenueConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  const fetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('venue_config')
      .select('*')
      .eq('id', 'default')
      .single();

    if (error || !data) {
      console.error('[useVenueConfig] fetch error:', error);
      setLoading(false);
      return;
    }

    const cfg = rowToVenueConfig(data as Record<string, unknown>);
    cacheVenueConfig(cfg);
    applyBrandColors(cfg);
    setConfig(cfg);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const save = useCallback(async (updates: Partial<VenueConfig>): Promise<boolean> => {
    setSaving(true);

    const merged = { ...config, ...updates };
    cacheVenueConfig(merged);
    applyBrandColors(merged);
    setConfig(merged);

    const dbRow: Record<string, unknown> = {
      id:              'default',
      business_name:   merged.businessName,
      tagline:         merged.tagline,
      phone:           merged.phone,
      address:         merged.address,
      city:            merged.city,
      postcode:        merged.postcode,
      payment_info:    merged.paymentInfo,
      collection_only: merged.collectionOnly,
      hero_image_url:  merged.heroImageUrl || null,
      logo_url:        merged.logoUrl || null,
      primary_color:    merged.primaryColor || '#f5a623',
      accent_color:     merged.accentColor  || '#0f1f3d',
      delivery_enabled:  merged.deliveryEnabled ?? false,
      delivery_charge:   merged.deliveryCharge  ?? 0,
      delivery_min_order: merged.deliveryMinOrder ?? 0,
      delivery_zones:    merged.deliveryZones ?? [],
      collection_slots: merged.collectionSlots ?? [],
      prep_time_options:    merged.prepTimeOptions ?? [],
      prep_time_note:        merged.prepTimeNote ?? '',
      payment_link_enabled:  merged.paymentLinkEnabled ?? false,
      payment_link_url:      merged.paymentLinkUrl ?? '',
      condiment_options:     merged.condimentOptions ?? [],
      long_cook_keywords:    merged.longCookKeywords ?? [],
      long_cook_minutes:     merged.longCookMinutes ?? 30,
      hero_text_placement:   merged.heroTextPlacement ?? 'bottom-left',
      hero_font_style:       merged.heroFontStyle ?? 'sans',
      hero_bold:             merged.heroBold ?? true,
      hero_show_stars:       merged.heroShowStars ?? true,
      hero_star_count:       merged.heroStarCount ?? 5,
      allergen_message:      merged.allergenMessage ?? 'For allergen information please call the store.',
      emergency_stop:        merged.emergencyStop      ?? false,
      emergency_stop_style:  merged.emergencyStopStyle ?? 'large-clear',
      receipt_fields: {
        // Legacy flat fields (kept for backward-compat reads)
        ...(merged.receiptFields ?? {
          customerName: true, orderNumber: true, orderType: true,
          phone: true, deliveryAddress: true, orderDate: true,
          orderTime: true,
        }),
        fieldOrder: (merged.receiptFieldOrder ?? [
          'orderType','orderNumber','orderDate','orderTime','customerName','phone','deliveryAddress'
        ]).filter(k => k !== 'timeRequired'),
        // Receipt Builder config — this is the source of truth for print output
        receiptConfig: merged.receiptConfig ?? null,
      },
      opening_hours:         merged.openingHours,
      updated_at:      new Date().toISOString(),
    };

    const { error } = await supabase
      .from('venue_config')
      .upsert(dbRow, { onConflict: 'id' });

    setSaving(false);
    if (error) {
      toast.error('Failed to save settings: ' + error.message);
      return false;
    }
    toast.success('Venue settings saved!');
    return true;
  }, [config]);

  return { config, loading, saving, save, refresh: fetch };
}
