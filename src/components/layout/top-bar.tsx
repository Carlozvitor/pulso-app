import Link from "next/link";
import { LogOut, Timer } from "lucide-react";
import { signOut } from "@/lib/auth/actions";
import { countOpenTasks } from "@/lib/tasks/queries";
import { greetingFor } from "@/lib/dates";
import { CaptureButton } from "./capture-button";

function openLabel(count: number): string {
  if (count === 0) return "nada pendente";
  return count === 1 ? "1 pendência" : `${count} pendências`;
}

const buttonClass =
  "inline-flex h-9 items-center gap-2 rounded-lg border border-border-strong bg-elevated px-3 text-[0.8125rem] font-medium text-foreground transition-colors duration-(--duration-fast) hover:bg-[#1d1d22]";

/** Topo no PC: marca, saudação com o resumo, e as ações de sempre. */
export async function TopBar() {
  const open = await countOpenTasks();
  return <TopBarView open={open} greeting={greetingFor(new Date()).replace(/\.$/, "")} />;
}

export function TopBarView({ open, greeting }: { open: number; greeting: string }) {
  return (
    <header className="sticky top-0 z-30 hidden h-topbar grid-cols-[1fr_auto_1fr] items-center bg-background px-4 lg:grid">
      <Link href="/agora" className="flex items-center gap-2.5 justify-self-start text-[1.1875rem] font-semibold tracking-tight">
        <span aria-hidden className="flex size-[26px] items-center justify-center rounded-full border-2 border-primary-soft/45">
          <span className="size-2.5 rounded-full bg-primary" />
        </span>
        pulso
      </Link>

      <p className="flex items-baseline gap-2">
        <span className="font-semibold">{greeting}</span>
        <span className="tabular text-caption text-foreground-subtle">· {openLabel(open)}</span>
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
