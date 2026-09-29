export const HOME_PATH = "/agora";

/**
 * Para onde voltar depois do login. Só aceita caminho interno do app —
 * nada de URL externa (open redirect), "//host" ou a própria tela de login.
 */
export function safeReturnPath(value: string | null | undefined): string {
  if (!value) return HOME_PATH;
  let path = value;
  // Referer chega como URL completa: fica só com caminho + query.
  if (/^https?:\/\//i.test(path)) {
    try {
      const url = new URL(path);
      path = url.pathname + url.search;
    } catch {
      return HOME_PATH;
    }
  }
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return HOME_PATH;
  if (path === "/" || path === "/login" || path.startsWith("/login?") || path.startsWith("/login/")) return HOME_PATH;
  return path;
}

/** "/login", ou "/login?volta=…" quando há lugar melhor que a Agora para voltar. */
export function loginHref(from: string | null | undefined): string {
  const path = safeReturnPath(from);
  return path === HOME_PATH ? "/login" : `/login?volta=${encodeURIComponent(path)}`;
}
