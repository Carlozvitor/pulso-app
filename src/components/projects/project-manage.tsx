"use client";

import { useState, useTransition } from "react";
import { Archive, Check, Ellipsis, Pause, Pencil, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { ProjectStatus } from "@/types/project";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { ConfirmSheet } from "@/components/feedback/confirm-sheet";
import { finishProject, pauseProject, reopenProject, resumeProject, updateProject } from "@/lib/actions/client";
import { cn } from "@/lib/utils";

const actionClass =
  "inline-flex h-9 items-center gap-2 rounded-lg border border-border-strong bg-elevated px-3 text-sm font-medium text-foreground transition-colors duration-(--duration-fast) hover:bg-[#1d1d22] disabled:opacity-50 lg:h-10 lg:px-3.5";
const iconClass = "size-4 text-foreground-secondary";
const sheetItemClass =
  "flex min-h-13 w-full items-center gap-3 rounded-lg px-3 text-left text-body text-foreground transition-colors duration-(--duration-fast) hover:bg-surface active:bg-surface disabled:opacity-50";

type Finish = { to: "DONE" | "ARCHIVED"; confirm: string; toast: string };

const FINISH: Record<Finish["to"], Finish> = {
  DONE: { to: "DONE", confirm: "Concluir projeto", toast: "Projeto concluído." },
  ARCHIVED: { to: "ARCHIVED", confirm: "Arquivar projeto", toast: "Projeto arquivado." },
};

function openTasksNote(count: number): string {
  return count === 1 ? "1 ação ainda aberta vai para o arquivo." : `${count} ações ainda abertas vão para o arquivo.`;
}

/** Retomar um projeto pausado (no cabeçalho e no aviso de pausado). */
export function useResume(projectId: string) {
  const [pending, startTransition] = useTransition();
  function resume() {
    startTransition(async () => {
      const result = await resumeProject(projectId);
      if (!result.ok) return void toast.error(result.error);
      toast("Projeto retomado. As ações voltaram para a Agora e o A fazer.");
    });
  }
  return { resume, pending };
}

/**
 * Ações do cabeçalho do projeto, conforme o status:
 * em andamento → Pausar · Concluir · "…" (Renomear, Arquivar);
 * pausado → Retomar · "…" (Renomear, Concluir, Arquivar);
 * concluído/arquivado → Reabrir · "…" (Renomear).
 */
export function ProjectManage({
  projectId,
  name,
  status,
  openCount,
}: {
  projectId: string;
  name: string;
  status: ProjectStatus;
  openCount: number;
}) {
  const [dialog, setDialog] = useState<"more" | "rename" | null>(null);
  const [confirming, setConfirming] = useState<Finish | null>(null);
  const [draft, setDraft] = useState(name);
  const [pending, startTransition] = useTransition();
  const { resume, pending: resuming } = useResume(projectId);
  const busy = pending || resuming;

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>, message: string, undo?: () => void) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) return void toast.error(result.error);
      toast(message, undo ? { action: { label: "Desfazer", onClick: undo } } : undefined);
    });
  }

  function pause() {
    run(() => pauseProject(projectId), "Projeto pausado. As ações ficam guardadas até retomar.", resume);
  }

  function finish(action: Finish) {
    startTransition(async () => {
      const result = await finishProject(projectId, action.to);
      setConfirming(null);
      if (!result.ok) return void toast.error(result.error);
      toast(action.toast);
    });
  }

  function request(action: Finish) {
    setDialog(null);
    if (openCount > 0) setConfirming(action);
    else finish(action);
  }

  function rename(event: React.FormEvent) {
    event.preventDefault();
    const next = draft.trim();
    if (!next || next === name) return setDialog(null);
    startTransition(async () => {
      const result = await updateProject(projectId, { name: next });
      if (!result.ok) return void toast.error(result.error);
      setDialog(null);
    });
  }

  const finished = status === "DONE" || status === "ARCHIVED";

  return (
    <>
      {status === "ACTIVE" && (
        <>
          <button type="button" className={actionClass} disabled={busy} onClick={pause}>
            <Pause aria-hidden className={iconClass} strokeWidth={1.75} />
            Pausar
          </button>
          <button type="button" className={actionClass} disabled={busy} onClick={() => request(FINISH.DONE)}>
            <Check aria-hidden className={iconClass} strokeWidth={1.75} />
            Concluir
          </button>
        </>
      )}
      {status === "PAUSED" && (
        <button type="button" className={cn(actionClass, "border-amber-line bg-amber-tile/60 hover:bg-amber-tile")} disabled={busy} onClick={resume}>
          <Play aria-hidden className="size-4 text-amber-ink" strokeWidth={1.75} />
          Retomar
        </button>
      )}
      {finished && (
        <button
          type="button"
          className={actionClass}
          disabled={busy}
          onClick={() => run(() => reopenProject(projectId), "Projeto reaberto.")}
        >
          <RotateCcw aria-hidden className={iconClass} strokeWidth={1.75} />
          Reabrir
        </button>
      )}
      <button
        type="button"
        className={cn(actionClass, "w-9 justify-center px-0 lg:w-10 lg:px-0")}
        onClick={() => setDialog("more")}
        aria-label={`Mais opções de ${name}`}
        title="Mais opções"
      >
        <Ellipsis aria-hidden className={iconClass} strokeWidth={1.75} />
      </button>

      <Drawer open={dialog === "more"} onOpenChange={(open) => !open && setDialog(null)}>
        <DrawerContent className="mx-auto max-w-lg rounded-t-xl border-border bg-elevated">
          <div className="flex flex-col gap-2 px-4 pt-3 pb-[calc(var(--safe-bottom)+1rem)]">
            <div aria-hidden className="mx-auto h-1 w-10 rounded-full bg-border" />
            <DrawerTitle className="mt-2 truncate text-left text-title font-semibold">{name}</DrawerTitle>
            <DrawerDescription className="sr-only">Opções do projeto.</DrawerDescription>
            <ul className="mt-1 grid gap-0.5">
              <li>
                <button
                  type="button"
                  className={sheetItemClass}
                  onClick={() => {
                    setDraft(name);
                    setDialog("rename");
                  }}
                >
                  <Pencil aria-hidden className={iconClass} strokeWidth={1.75} />
                  Renomear
                </button>
              </li>
              {status === "PAUSED" && (
                <li>
                  <button type="button" className={sheetItemClass} disabled={busy} onClick={() => request(FINISH.DONE)}>
                    <Check aria-hidden className={iconClass} strokeWidth={1.75} />
                    Concluir
                  </button>
                </li>
              )}
              {!finished && (
                <li>
                  <button type="button" className={sheetItemClass} disabled={busy} onClick={() => request(FINISH.ARCHIVED)}>
                    <Archive aria-hidden className={iconClass} strokeWidth={1.75} />
                    <span>
                      Arquivar
                      <span className="block text-caption text-foreground-subtle">Para projeto que não vai mais acontecer.</span>
                    </span>
                  </button>
                </li>
              )}
            </ul>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={dialog === "rename"} onOpenChange={(open) => !open && setDialog(null)}>
        <DrawerContent className="mx-auto max-w-lg rounded-t-xl border-border bg-elevated">
          <form onSubmit={rename} className="flex flex-col gap-4 px-4 pt-3 pb-[calc(var(--safe-bottom)+1rem)]">
            <div aria-hidden className="mx-auto h-1 w-10 rounded-full bg-border" />
            <DrawerTitle className="text-left text-title font-semibold">Renomear</DrawerTitle>
            <DrawerDescription className="sr-only">Novo nome para {name}.</DrawerDescription>
            <input
              aria-label="Nome do projeto"
              autoFocus
              autoComplete="off"
              enterKeyHint="done"
              maxLength={120}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="h-12 w-full rounded-md border border-border bg-surface px-4 text-body text-foreground focus-visible:border-primary-soft focus-visible:outline-none"
            />
            <Button type="submit" size="touch" disabled={pending || !draft.trim() || draft.trim() === name} className="w-full">
              Salvar
            </Button>
          </form>
        </DrawerContent>
      </Drawer>

      <ConfirmSheet
        open={confirming !== null}
        onOpenChange={(open) => !open && setConfirming(null)}
        title={confirming ? `${confirming.confirm}?` : ""}
        description={openTasksNote(openCount)}
        confirmLabel={confirming?.confirm ?? ""}
        onConfirm={() => confirming && finish(confirming)}
        pending={pending}
      />
    </>
  );
}

/** Aviso no topo de um projeto pausado: o que aconteceu com as ações e o botão de retomar. */
export function PausedNotice({ projectId, since, openCount }: { projectId: string; since: string; openCount: number }) {
  const { resume, pending } = useResume(projectId);
  const actions =
    openCount === 0
      ? "Nenhuma ação aberta neste projeto."
      : `${openCount === 1 ? "A ação aberta deste projeto está guardada" : `As ${openCount} ações abertas deste projeto estão guardadas`}: não aparecem na Agora, no A fazer nem na Central. Ao retomar, voltam do jeito que estavam.`;
  return (
    <section
      aria-label="Projeto pausado"
      className="mb-5 flex flex-col gap-3 rounded-(--radius) border border-amber-line bg-[linear-gradient(160deg,#2a1608,#120a04)] p-4 sm:flex-row sm:items-center sm:gap-5 lg:px-5"
    >
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-semibold text-amber-ink">
          <Pause aria-hidden className="size-4" strokeWidth={2} />
          {since}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-white/75">{actions}</p>
      </div>
      <Button
        size="touch"
        disabled={pending}
        onClick={resume}
        className="shrink-0 border border-amber-line bg-amber-tile text-foreground hover:bg-amber-tile hover:brightness-125 [&_svg]:text-amber-ink"
      >
        <Play aria-hidden />
        Retomar projeto
      </Button>
    </section>
  );
}
