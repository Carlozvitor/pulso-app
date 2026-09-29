import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { loginHref, safeReturnPath } from "@/lib/auth/return-path";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

const PUBLIC_PATHS = ["/login"];

/** Renova a sessão a cada requisição e manda quem não está logado para /login. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Não colocar código entre a criação do client e getClaims: é aqui que a sessão é renovada.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!signedIn && !isPublic) {
    // Server Action: quem redireciona é o requireUser da própria action. Um redirect aqui
    // devolveria HTML no lugar da resposta da action e a tela quebraria.
    if (request.headers.has("next-action")) return response;
    return redirectKeepingCookies(request, response, loginHref(pathname + request.nextUrl.search));
  }
  if (signedIn && isPublic) {
    return redirectKeepingCookies(request, response, safeReturnPath(request.nextUrl.searchParams.get("volta")));
  }

  return response;
}

function redirectKeepingCookies(request: NextRequest, from: NextResponse, target: string) {
  const url = new URL(target, request.url);
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
