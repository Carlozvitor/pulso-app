"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CircleDot, Ellipsis, Inbox, Plus, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { QuickCapture } from "@/components/tasks/quick-capture";
import { captureTask } from "@/lib/tasks/actions";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Outras rotas que também acendem este item. */
  match?: string[];
};

const LEFT: NavItem[] = [
  { href: "/agora", label: "Agora", icon: CircleDot },
  { href: "/inbox", label: "Inbox", icon: Inbox },
];

const RIGHT: NavItem[] = [
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/mais", label: "Mais", icon: Ellipsis, match: ["/projetos"] },
];

function isActive(pathname: string, item: NavItem) {
  return [item.href, ...(item.match ?? [])].some(
    (href) => pathname === href || pathname.startsWith(`${href}/`),
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-full flex-1 flex-col items-center justify-center gap-1 text-[0.6875rem] leading-none font-medium transition-colors duration-(--duration-fast)",
        active ? "text-primary-soft" : "text-foreground-subtle active:text-foreground",
      )}
    >
      <Icon aria-hidden className="size-6" strokeWidth={active ? 2 : 1.75} />
      {item.label}
    </Link>
  );
}

export function BottomNavigation() {
  const pathname = usePathname();
  const [captureOpen, setCaptureOpen] = useState(false);

  async function handleCapture(title: string) {
    const result = await captureTask(title);
    if (result.ok) {
      toast("Anotado na Inbox.");
    } else {
      toast.error(result.error, {
        action: { label: "Tentar de novo", onClick: () => void handleCapture(title) },
      });
    }
  }

  return (
    <>
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-(--safe-bottom)"
      >
        <div className="mx-auto flex h-(--bottom-nav-height) max-w-lg items-stretch px-2">
          {LEFT.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(pathname, item)} />
          ))}

          <div className="flex flex-1 items-center justify-center">
            <button
              type="button"
              aria-label="Capturar algo"
              aria-haspopup="dialog"
              aria-expanded={captureOpen}
              onClick={() => setCaptureOpen(true)}
              className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform duration-(--duration-fast) ease-out active:scale-95"
            >
              <Plus aria-hidden className="size-6" strokeWidth={2.25} />
            </button>
          </div>

          {RIGHT.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(pathname, item)} />
          ))}
        </div>
      </nav>

      <QuickCapture open={captureOpen} onOpenChange={setCaptureOpen} onCapture={handleCapture} />
    </>
  );
}
