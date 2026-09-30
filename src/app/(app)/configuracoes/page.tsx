import Link from "next/link";
import { ChevronRight, GitFork, LogOut, Settings, UserRound } from "lucide-react";
import { SectionHeading } from "@/components/cards/card-parts";
import { ListPanel, Page } from "@/components/layout/page";
import { signOut } from "@/lib/auth/actions";
import { listAreas } from "@/lib/projects/queries";
import { MODULES } from "@/lib/origins/tree";
import { MODULE_KEYS } from "@/types/project";
import { requireUser } from "@/lib/supabase/server";

export const metadata = { title: "Configurações" };

const rowClass =
  "-mx-4 flex min-h-14 w-[calc(100%+2rem)] items-center gap-4 px-4 text-left transition-colors duration-(--duration-fast) hover:bg-elevated active:bg-elevated";

export default async function ConfiguracoesPage() {
  const { supabase } = await requireUser();
  const [{ data }, areas] = await Promise.all([supabase.auth.getClaims(), listAreas()]);
  const email = typeof data?.claims?.email === "string" ? data.claims.email : null;
  const itemCount = areas.filter((a) => a.parentId !== null).length;
  const originSummary = `${MODULE_KEYS.map((m) => MODULES[m].label).join(", ")}${itemCount > 0 ? ` · ${itemCount} ${itemCount === 1 ? "item" : "itens"}` : ""}`;

  return (
    <Page icon={Settings} title="Configurações" description="Como o Hub se organiza">
      <section aria-labelledby="config-organizacao">
        <SectionHeading id="config-organizacao" title="Organização" />
        <ListPanel>
          <Link href="/origens" className={rowClass}>
            <GitFork aria-hidden className="size-5 text-foreground-subtle" strokeWidth={1.75} />
            <span className="min-w-0 flex-1">
              <span className="block text-body">Origens</span>
              <span className="block truncate text-caption text-foreground-subtle">{originSummary}</span>
            </span>
            <ChevronRight aria-hidden className="size-5 text-muted-ui" />
          </Link>
        </ListPanel>
      </section>

      <section aria-labelledby="config-conta" className="mt-8">
        <SectionHeading id="config-conta" title="Conta" />
        <ListPanel>
          <ul className="divide-y divide-border">
            {email && (
              <li className="-mx-4 flex min-h-14 items-center gap-4 px-4">
                <UserRound aria-hidden className="size-5 text-foreground-subtle" strokeWidth={1.75} />
                <span className="min-w-0 flex-1 truncate text-body text-foreground-secondary">{email}</span>
              </li>
            )}
            <li>
              <form action={signOut}>
                <button type="submit" className={rowClass}>
                  <LogOut aria-hidden className="size-5 text-foreground-subtle" strokeWidth={1.75} />
                  <span className="text-body text-foreground-secondary">Sair</span>
                </button>
              </form>
            </li>
          </ul>
        </ListPanel>
      </section>
    </Page>
  );
}
