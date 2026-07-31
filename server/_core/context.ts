import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { verifySupabaseToken } from "../supabaseAuth";
import { getUserByOpenId, upsertUser } from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

/**
 * Extract the Bearer token from the Authorization header or the
 * `sb-access-token` cookie set by the frontend after Supabase sign-in.
 */
function extractToken(req: CreateExpressContextOptions["req"]): string | null {
  // 1. Authorization: Bearer <token>
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  // 2. Cookie: sb-access-token=<token>
  const cookieHeader = req.headers["cookie"] ?? "";
  const match = cookieHeader.match(/(?:^|;\s*)sb-access-token=([^;]+)/);
  if (match) return decodeURIComponent(match[1]);
  return null;
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const token = extractToken(opts.req);
    if (token) {
      const supabaseUser = await verifySupabaseToken(token);
      if (supabaseUser) {
        // Sync the Supabase user into our local users table using their UUID as openId
        await upsertUser({
          openId: supabaseUser.id,
          email: supabaseUser.email ?? null,
          loginMethod: "supabase",
          lastSignedIn: new Date(),
        });
        const dbUser = await getUserByOpenId(supabaseUser.id);
        user = dbUser ?? null;
      }
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
