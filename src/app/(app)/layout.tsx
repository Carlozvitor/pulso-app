import { BottomNavigation } from "@/components/navigation/bottom-navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Faixa sob a status bar translúcida do iOS: o conteúdo rolado não passa por baixo do relógio. */}
      <div aria-hidden className="fixed inset-x-0 top-0 z-40 h-(--safe-top) bg-background" />

      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pt-(--safe-top) pb-[calc(var(--safe-bottom)+var(--bottom-nav-height)+1.5rem)]">
        <main className="flex-1">{children}</main>
      </div>

      <BottomNavigation />
    </>
  );
}
