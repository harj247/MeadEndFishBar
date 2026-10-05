// Opening hours — driven by VenueConfig (white-label).
// All functions are synchronous; they read from the localStorage cache
// that is populated by useVenueConfig on app load.

import { getVenueConfig, DayKey, DaySlot } from '@/lib/venueConfig';

const DAY_KEYS: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday',
  thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};

function timeToMins(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function nowMins(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function todayKey(): DayKey {
  return DAY_KEYS[new Date().getDay()];
}

function todaySlots(): DaySlot[] {
  const cfg = getVenueConfig();
  return cfg.openingHours[todayKey()] ?? [];
}

export function isOpen(): boolean {
  const now = nowMins();
  return todaySlots().some(s => now >= timeToMins(s.open) && now < timeToMins(s.close));
}

/** Returns a human-readable string like "Mon 16:00" for the next opening. */
export function nextOpenTime(): string {
  const cfg = getVenueConfig();
  const now = nowMins();
  const todayIdx = new Date().getDay(); // 0=Sun

  for (let offset = 0; offset < 7; offset++) {
    const idx = (todayIdx + offset) % 7;
    const key = DAY_KEYS[idx];
    const slots = cfg.openingHours[key] ?? [];
    for (const s of slots) {
      const openMins = timeToMins(s.open);
      if (offset > 0 || openMins > now) {
        const label = offset === 0 ? 'today' : offset === 1 ? 'tomorrow' : DAY_LABELS[key];
        return `${label} at ${s.open}`;
      }
    }
  }
  return 'soon';
}

/** E.g. "16:00 – 21:00" or "12:00–14:00 & 16:00–21:00" for today. */
export function todayHoursText(): string {
  const slots = todaySlots();
  if (slots.length === 0) return 'Closed today';
  return slots.map(s => `${s.open}–${s.close}`).join(' & ');
}

/**
 * Returns the number of minutes until the current open slot closes,
 * or null if the store is not currently open.
 */
export function minutesToClose(): number | null {
  const now = nowMins();
  for (const s of todaySlots()) {
    const open  = timeToMins(s.open);
    const close = timeToMins(s.close);
    if (now >= open && now < close) return close - now;
  }
  return null;
}

/** Full week array for display. */
export function weekHoursLines(): { day: string; hours: string }[] {
  const cfg = getVenueConfig();
  return DAY_KEYS.map(key => {
    const slots = cfg.openingHours[key] ?? [];
    return {
      day:   DAY_LABELS[key],
      hours: slots.length === 0 ? 'Closed' : slots.map(s => `${s.open}–${s.close}`).join(' & '),
    };
  });
}
