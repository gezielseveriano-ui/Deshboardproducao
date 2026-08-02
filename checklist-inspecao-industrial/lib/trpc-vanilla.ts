import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/routers";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";

/**
 * Cliente tRPC "puro" (sem React Query) - usado fora de componentes, em
 * lib/reports-context.tsx, pra tentar de novo a geração do PDF em segundo
 * plano quando a conexão volta. Mesma configuração de lib/trpc.ts.
 */
export const trpcVanilla = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${getApiBaseUrl()}/api/trpc`,
      transformer: superjson,
      async headers() {
        const token = await Auth.getSessionToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
      methodOverride: "POST",
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: "include",
        });
      },
    }),
  ],
});
