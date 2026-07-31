import { useSupabaseAuth } from "@/contexts/AuthContext";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

/**
 * Unified auth hook backed by Supabase Auth.
 * Compatible with the existing usage pattern across the app.
 */
export function useAuth(_options?: UseAuthOptions) {
  const { user, loading, signOut } = useSupabaseAuth();

  return {
    user: user
      ? {
          id: 0, // local DB id (not needed for most UI purposes)
          openId: user.id,
          email: user.email ?? null,
          name: (user.user_metadata?.name as string) ?? user.email ?? "User",
          loginMethod: "supabase",
          role: "user" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        }
      : null,
    loading,
    error: null,
    isAuthenticated: Boolean(user),
    refresh: () => {},
    logout: signOut,
  };
}
