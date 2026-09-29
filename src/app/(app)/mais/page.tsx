import Link from "next/link";
import { ChevronRight, CircleCheck, Ellipsis, FolderOpen, Inbox, Layers, LogOut, Search } from "lucide-react";
import { ListPanel, Page } from "@/components/layout/page";
import { signOut } from "@/lib/auth/actions";

export const metadata = { title: "Mais" };

const LINKS = [
  { href: "/feitas", label: "Feitas", icon: CircleCheck },
  { href: "/projetos", label: "Projetos", icon: FolderOpen },
  { href: "/areas", label: "Áreas", icon: Layers },
  { href: "/busca", label: "Buscar", icon: Search },
  { href: "/inbox", label: "Inbox", icon: Inbox },
] as const;

export default function MaisPage() {
  return (
    <Page icon={Ellipsis} title="Mais">
      <ListPanel>
        <ul className="divide-y divide-border">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="-mx-4 flex min-h-14 items-center gap-4 px-4 transition-colors duration-(--duration-fast) active:bg-elevated"
              >
                <Icon aria-hidden className="size-5 text-foreground-subtle" strokeWidth={1.75} />
                <span className="flex-1 text-body">{label}</span>
                <ChevronRight aria-hidden className="size-5 text-muted-ui" />
              </Link>
            </li>
          ))}
        </ul>
      </ListPanel>

      <form action={signOut} className="mt-6">
        <button
          type="submit"
          className="panel flex min-h-14 w-full items-center gap-4 px-4 text-left transition-colors duration-(--duration-fast) active:bg-elevated"
        >
          <LogOut aria-hidden className="size-5 text-foreground-subtle" strokeWidth={1.75} />
          <span className="text-body text-foreground-secondary">Sair</span>
        </button>
      </form>
    </Page>
  );
}
