'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type AuthState = {
  error?: string;
  success?: string;
};

export async function sendMagicLinkAction(
  _prevState: AuthState,
  formData: FormData
) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  if (!email) {
    return { error: 'Email is required.' };
  }

  const supabase = await createSupabaseServerClient();
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host');
  const proto = h.get('x-forwarded-proto') || 'https';

  if (!host) {
    return { error: 'Could not determine callback host.' };
  }

  const callback = `${proto}://${host}/auth/callback`;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callback }
  });

  if (error) {
    return { error: error.message };
  }

  return { success: 'Magic link sent. Check your inbox.' };
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/auth/sign-in');
}
