import { supabase } from '@/lib/supabase';

export interface SavedProfile {
  name: string;
  phone: string;
  email: string;
}

const PROFILE_KEY = 'mead_saved_profile';

export function getSavedProfile(): SavedProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveProfileLocally(profile: SavedProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function clearSavedProfile() {
  localStorage.removeItem(PROFILE_KEY);
}

/** Send OTP to email for registration */
export async function sendOtp(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

/** Verify OTP, set password + metadata, save profile to DB */
export async function verifyOtpAndRegister(
  email: string,
  token: string,
  password: string,
  name: string,
  phone: string
): Promise<void> {
  const { error: verifyError } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });
  if (verifyError) throw verifyError;

  const { data: updateData, error: updateError } = await supabase.auth.updateUser({
    password,
    data: { username: name, full_name: name },
  });
  if (updateError) throw updateError;

  const userId = updateData.user?.id;
  if (userId) {
    // Upsert profile row
    await supabase.from('user_profiles').upsert({
      id: userId,
      email,
      username: name,
      phone,
    });
  }

  // Save locally for checkout pre-fill
  saveProfileLocally({ name, phone, email });
}

/** Sign in with email + password, load profile */
export async function signIn(email: string, password: string): Promise<SavedProfile> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const userId = data.user?.id;
  let name = data.user?.user_metadata?.full_name || data.user?.user_metadata?.username || '';
  let phone = '';

  if (userId) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('username, phone')
      .eq('id', userId)
      .single();
    if (profile) {
      name = profile.username || name;
      phone = profile.phone || '';
    }
  }

  const saved: SavedProfile = { name, phone, email };
  saveProfileLocally(saved);
  return saved;
}

export async function signOut() {
  await supabase.auth.signOut();
  clearSavedProfile();
}

/** Get current session user */
export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
}
