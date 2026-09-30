import Link from "next/link";
import { Briefcase, CalendarClock, ChevronRight, CircleCheck, Ellipsis, GraduationCap, Inbox, Rocket, Search, Settings } from "lucide-react";
import { ListPanel, Page } from "@/components/layout/page";

export const metadata = { title: "Mais" };

const LINKS = [
  { href: "/trabalho", label: "Trabalho", icon: Briefcase },
  { href: "/faculdade", label: "Faculdade", icon: GraduationCap },
  { href: "/compromissos", label: "Compromissos", icon: CalendarClock },
  { href: "/projetos", label: "Projetos", icon: Rocket },
  { href: "/feitas", label: "Feitas", icon: CircleCheck },
  { href: "/busca", label: "Buscar", icon: Search },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
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
    </Page>
  );
}
