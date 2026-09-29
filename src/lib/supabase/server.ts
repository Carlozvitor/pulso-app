import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { loginHref } from "@/lib/auth/return-path";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

/** Cliente para Server Components e Server Actions. Um por requisição. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components não podem gravar cookies; o proxy já renova a sessão.
        }
      },
    },
  });
}

/**
 * Garante usuário autenticado (JWT verificado via getClaims).
 * Usar em TODA Server Action e página protegida — o proxy sozinho não basta.
 * `cache`: barra lateral e página pedem o usuário na mesma requisição — verifica uma vez só.
 */
export const requireUser = cache(async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) {
    // Numa Server Action, o referer é a tela onde a pessoa estava: depois do login ela volta para lá.
    const requestHeaders = await headers();
    const from = requestHeaders.has("next-action") ? requestHeaders.get("referer") : null;
    redirect(loginHref(from));
  }
  return { supabase, userId };
});
