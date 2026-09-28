import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Fora: arquivos do Next, ícones, manifest, service worker e imagens estáticas.
  matcher: [
    "/((?!_next/static|_next/image|icons/|icon.png|apple-icon.png|manifest.webmanifest|sw.js|.*\.(?:svg|png|jpg|jpeg|webp|ico)$).*)",
  ],
};
