import { trpc, superjson } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import "./analytics";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./contexts/AuthContext";
import { supabase } from "./lib/supabaseClient";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

const trpcClient = trpc.createClient({
  transformer: superjson,
  links: [
    httpBatchLink({
      url: "/api/trpc",
      async headers() {
        // Attach the Supabase access token so the server can authenticate the user
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            return { Authorization: `Bearer ${session.access_token}` };
          }
        } catch {
          // ignore
        }
        return {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  </AuthProvider>
);
