/**
 * Supabase Auth integration
 * Replaces the Manus OAuth flow with Supabase email/password auth.
 * The Supabase JWT is verified server-side using the JWT_SECRET (which must
 * match the Supabase project's JWT secret, available as SUPABASE_JWT_SECRET).
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "";

/** Admin client (service role) — used server-side only */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Public client (anon key) — used for verifying user tokens */
export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Verify a Supabase access token and return the user's UUID.
 * Returns null if the token is invalid or expired.
 */
export async function verifySupabaseToken(accessToken: string): Promise<{ id: string; email?: string } | null> {
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email };
  } catch {
    return null;
  }
}
