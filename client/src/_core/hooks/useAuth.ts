import { useSupabaseAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useEffect } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

/**
 * Unified auth hook backed by Supabase Auth.
 * Fetches the server-side user record (including role) via tRPC.
 */
export function useAuth(options?: UseAuthOptions) {
  const { user: supabaseUser, loading: supabaseLoading, signOut } = useSupabaseAuth();
  const [, navigate] = useLocation();

  // Fetch the server-side user record to get the role
  const { data: serverUser, isLoading: serverLoading } = trpc.auth.me.useQuery(undefined, {
    enabled: !!supabaseUser,
    staleTime: 60_000,
  });

  const loading = supabaseLoading || (!!supabaseUser && serverLoading);

  // Build a unified user object
  const user = supabaseUser
    ? {
        id: (serverUser as any)?.id ?? 0,
        openId: supabaseUser.id,
        email: supabaseUser.email ?? null,
        name:
          (serverUser as any)?.name ??
          (supabaseUser.user_metadata?.name as string) ??
          supabaseUser.email ??
          "User",
        loginMethod: "supabase",
        role: ((serverUser as any)?.role ?? "user") as "user" | "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      }
    : null;

  useEffect(() => {
    if (!loading && options?.redirectOnUnauthenticated && !user) {
      navigate(options.redirectPath ?? "/");
    }
  }, [loading, user, options?.redirectOnUnauthenticated, options?.redirectPath, navigate]);

  return {
    user,
    loading,
    error: null,
    isAuthenticated: Boolean(supabaseUser),
    refresh: () => {},
    logout: signOut,
  };
}
