import Link from "next/link";
import { ChevronRight, FolderOpen, Layers, LogOut } from "lucide-react";
import { PageHeader } from "@/components/navigation/page-header";
import { signOut } from "@/lib/auth/actions";

export const metadata = { title: "Mais" };

const LINKS = [
  { href: "/projetos", label: "Projetos", icon: FolderOpen },
  { href: "/areas", label: "Áreas", icon: Layers },
] as const;

export default function MaisPage() {
  return (
    <>
      <PageHeader title="Mais" />
      <ul className="divide-y divide-border">
        {LINKS.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="-mx-4 flex min-h-14 items-center gap-4 px-4 transition-colors duration-(--duration-fast) active:bg-surface"
            >
              <Icon aria-hidden className="size-5 text-foreground-subtle" strokeWidth={1.75} />
              <span className="flex-1 text-body">{label}</span>
              <ChevronRight aria-hidden className="size-5 text-muted-ui" />
            </Link>
          </li>
        ))}
      </ul>

      <form action={signOut} className="mt-10 border-t border-border pt-2">
        <button
          type="submit"
          className="-mx-4 flex min-h-14 w-[calc(100%+2rem)] items-center gap-4 px-4 text-left transition-colors duration-(--duration-fast) active:bg-surface"
        >
          <LogOut aria-hidden className="size-5 text-foreground-subtle" strokeWidth={1.75} />
          <span className="text-body text-foreground-secondary">Sair</span>
        </button>
      </form>
    </>
  );
}
