import { BottomNavigation } from "@/components/navigation/bottom-navigation";
import { CaptureDock } from "@/components/layout/capture-dock";
import { Shortcuts } from "@/components/layout/shortcuts";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { cookies } from "next/headers";
import { AppSync } from "@/components/sync/app-sync";
import { SIDEBAR_COMPACT, SIDEBAR_COOKIE } from "@/components/layout/sidebar-state";
import { SidebarShell } from "@/components/layout/sidebar-shell";

/**
 * Celular: uma coluna + navegação embaixo.
 * PC (≥ 1024px): topo + barra lateral fixa + painel principal com moldura.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const compact = (await cookies()).get(SIDEBAR_COOKIE)?.value === SIDEBAR_COMPACT;
  return (
    // Barra lateral aberta ou recolhida: o botão fica no topo; a largura vem do CSS.
    <SidebarShell initialCompact={compact}>
      {/* Faixa sob a status bar translúcida do iOS: o conteúdo rolado não passa por baixo do relógio. */}
      <div aria-hidden className="fixed inset-x-0 top-0 z-40 h-(--safe-top) bg-background lg:hidden" />

      <TopBar />

      <div className="lg:grid lg:grid-cols-[var(--sidebar-width)_minmax(0,1fr)] lg:items-start lg:gap-3 lg:px-2 lg:pb-3">
        <Sidebar />

        <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pt-(--safe-top) pb-[calc(var(--safe-bottom)+var(--bottom-nav-height)+1.5rem)] lg:panel lg:mx-0 lg:min-h-[calc(100dvh-var(--topbar-height)-0.75rem)] lg:max-w-none lg:p-0">
          <main className="flex-1">{children}</main>
        </div>
      </div>

      <BottomNavigation />
      <CaptureDock />
      <AppSync />
      <Shortcuts />
    </SidebarShell>
  );
}
