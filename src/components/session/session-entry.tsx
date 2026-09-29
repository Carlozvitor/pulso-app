import Link from "next/link";
import { ChevronRight, Timer } from "lucide-react";
import { timeLabel } from "@/lib/dates";

/** Entrada discreta na Agora. Com sessão aberta, leva de volta a ela. */
export function SessionEntry({ activeEndsAt }: { activeEndsAt: string | null }) {
  return (
    <Link
      href="/sessao"
      className="-mx-4 mt-3 flex min-h-12 items-center gap-3 px-4 text-sm text-foreground-secondary transition-colors duration-(--duration-fast) active:bg-surface"
    >
      <Timer aria-hidden className="size-5 text-foreground-subtle" strokeWidth={1.75} />
      <span className="tabular flex-1">
        {activeEndsAt
          ? `Sessão em andamento · até ${timeLabel(new Date(activeEndsAt))}`
          : "Tenho alguns minutos"}
      </span>
      <ChevronRight aria-hidden className="size-5 text-muted-ui" />
    </Link>
  );
}
