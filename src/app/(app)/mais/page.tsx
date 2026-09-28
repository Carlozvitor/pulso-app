import Link from "next/link";
import { ChevronRight, FolderOpen } from "lucide-react";
import { PageHeader } from "@/components/navigation/page-header";

export const metadata = { title: "Mais" };

const LINKS = [{ href: "/projetos", label: "Projetos", icon: FolderOpen }];

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
    </>
  );
}
