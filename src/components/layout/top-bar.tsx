import Link from "next/link";
import { LogOut, Timer } from "lucide-react";
import { signOut } from "@/lib/auth/actions";
import { countOpenTasks } from "@/lib/tasks/queries";
import { getTodaySummary } from "@/lib/events/queries";
import { greetingFor } from "@/lib/dates";
import { CaptureButton } from "./capture-button";

function openLabel(count: number): string {
  if (count === 0) return "nada pendente";
  return count === 1 ? "1 pendência" : `${count} pendências`;
}

const buttonClass =
  "inline-flex h-9 items-center gap-2 rounded-lg border border-border-strong bg-elevated px-3 text-[0.8125rem] font-medium text-foreground transition-colors duration-(--duration-fast) hover:bg-[#1d1d22]";

/** Topo no PC: marca do Hub (volta para a Central), saudação com o resumo, e as ações de sempre. */
export async function TopBar() {
  const [open, agenda] = await Promise.all([countOpenTasks(), getTodaySummary()]);
  return <TopBarView open={open} eventsToday={agenda.count} greeting={greetingFor(new Date()).replace(/\.$/, "")} />;
}

function eventsLabel(count: number): string | null {
  if (count === 0) return null;
  return count === 1 ? "1 compromisso hoje" : `${count} compromissos hoje`;
}

export function TopBarView({ open, eventsToday, greeting }: { open: number; eventsToday: number; greeting: string }) {
  return (
    <header className="sticky top-0 z-30 hidden h-topbar grid-cols-[1fr_auto_1fr] items-center bg-background px-4 lg:grid">
      <Link href="/central" className="flex items-center gap-2.5 justify-self-start">
        <span
          aria-hidden
          className="flex size-[30px] items-center justify-center rounded-[9px] bg-linear-150 from-[#5d6bff] to-[#3340d6] text-[0.9375rem] font-bold text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.18)]"
        >
          C
        </span>
        <span className="leading-tight">
          <span className="block text-[0.65625rem] font-semibold tracking-[0.12em] text-foreground-subtle">CARLOS</span>
          <span className="block text-base font-semibold tracking-tight">Hub do Carlos</span>
        </span>
      </Link>

      <p className="flex items-baseline gap-2">
        <span className="font-semibold">{greeting}</span>
        <span className="tabular text-caption text-foreground-subtle">
          · {[openLabel(open), eventsLabel(eventsToday)].filter(Boolean).join(" · ")}
        </span>
      </p>

      <div className="flex items-center gap-2 justify-self-end">
        <Link href="/sessao" className={buttonClass}>
          <Timer aria-hidden className="size-4" strokeWidth={1.75} />
          Tenho alguns minutos
        </Link>
        <CaptureButton />
        <form action={signOut}>
          <button type="submit" aria-label="Sair" title="Sair" className={`${buttonClass} w-9 justify-center px-0`}>
            <LogOut aria-hidden className="size-4 text-foreground-secondary" strokeWidth={1.75} />
          </button>
        </form>
      </div>
    </header>
  );
}
