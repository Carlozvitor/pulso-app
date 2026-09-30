"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Ellipsis, Pencil, Plus, Trash2, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import type { Area } from "@/types/project";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { createOrigin, deleteOrigin, renameOrigin, setSubjectArchived } from "@/lib/actions/client";
import { cn } from "@/lib/utils";

const headerButton =
  "inline-flex h-9 items-center gap-2 rounded-lg border border-border-strong bg-elevated px-3 text-sm font-medium text-foreground transition-colors duration-(--duration-fast) hover:bg-[#1d1d22] disabled:opacity-50 lg:h-10 lg:px-3.5";

const inputClass =
  "h-12 w-full rounded-md border border-border bg-surface px-4 text-body text-foreground placeholder:text-foreground-subtle focus-visible:border-primary-soft focus-visible:outline-none";

function Grab() {
  return <div aria-hidden className="mx-auto h-1 w-10 shrink-0 rounded-full bg-border" />;
}

/** "Nova disciplina": pede o nome e cria dentro de Faculdade. */
export function NewSubjectButton({ rootId }: { rootId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createOrigin(rootId, name);
      if (!result.ok) return void toast.error(result.error);
      toast(`“${name.trim()}” criada.`);
      setName("");
      setOpen(false);
    });
  }

  return (
    <>
      <button type="button" className={headerButton} onClick={() => setOpen(true)}>
        <Plus aria-hidden className="size-4 text-foreground-secondary" strokeWidth={1.75} />
        Nova disciplina
      </button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="mx-auto max-w-lg rounded-t-xl border-border bg-elevated">
          <form onSubmit={submit} className="flex flex-col gap-4 px-4 pt-3 pb-[calc(var(--safe-bottom)+1rem)]">
            <Grab />
            <div>
              <DrawerTitle className="text-left text-title font-semibold">Nova disciplina</DrawerTitle>
              <DrawerDescription className="mt-1 text-left text-sm text-foreground-secondary">
                Depois dá para anotar as aulas, as avaliações e os materiais dela.
              </DrawerDescription>
            </div>
            <input
              aria-label="Nome da disciplina"
              autoFocus
              autoComplete="off"
              enterKeyHint="done"
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Marketing Digital"
              className={inputClass}
            />
            <Button type="submit" size="touch" disabled={pending || !name.trim()} className="w-full">
              Criar disciplina
            </Button>
          </form>
        </DrawerContent>
      </Drawer>
    </>
  );
}

type Step = "menu" | "rename" | "archive" | "delete";

/** "…" da disciplina: renomear, encerrar/reabrir e apagar (só sem avaliações e sem subitens). */
export function SubjectManage({
  node,
  archived,
  canDelete,
  deleteBlocked,
}: {
  node: Area;
  /** Encerrada (ela ou algo acima). */
  archived: boolean;
  canDelete: boolean;
  /** Por que não apaga, quando não apaga. */
  deleteBlocked: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step | null>(null);
  const [name, setName] = useState(node.name);
  const [pending, startTransition] = useTransition();
  const close = () => setStep(null);
  // Só a própria disciplina encerra/reabre (um item abaixo segue a dela).
  const ownArchive = node.archivedAt !== null || !archived;

  function rename(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await renameOrigin(node.id, name);
      if (!result.ok) return void toast.error(result.error);
      close();
    });
  }

  function toggleArchive() {
    startTransition(async () => {
      const result = await setSubjectArchived(node.id, !archived);
      close();
      if (!result.ok) return void toast.error(result.error);
      toast(archived ? `“${node.name}” reaberta.` : `“${node.name}” encerrada. Fica guardada em “Disciplinas encerradas”.`);
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteOrigin(node.id);
      close();
      if (!result.ok) return void toast.error(result.error);
      toast(`“${node.name}” apagada.`);
      router.push("/faculdade");
    });
  }

  return (
    <>
      <button
        type="button"
        className={cn(headerButton, "w-9 justify-center px-0 lg:w-10 lg:px-0")}
        onClick={() => setStep("menu")}
        aria-label={`Mais opções de ${node.name}`}
        title="Mais opções"
      >
        <Ellipsis aria-hidden className="size-4 text-foreground-secondary" strokeWidth={1.75} />
      </button>

      <Drawer open={step !== null} onOpenChange={(open) => !open && close()}>
        <DrawerContent className="mx-auto max-w-lg rounded-t-xl border-border bg-elevated">
          {step === "menu" && (
            <div className="flex flex-col px-2 pt-3 pb-[calc(var(--safe-bottom)+0.75rem)]">
              <Grab />
              <DrawerTitle className="mt-3 px-2 text-left text-title font-semibold">{node.name}</DrawerTitle>
              <DrawerDescription className="sr-only">Renomear, encerrar ou apagar.</DrawerDescription>
              <div className="mt-2 grid">
                <MenuItem icon={Pencil} label="Renomear" onClick={() => { setName(node.name); setStep("rename"); }} />
                {ownArchive && (
                  <MenuItem
                    icon={archived ? ArchiveRestore : Archive}
                    label={archived ? "Reabrir disciplina" : "Encerrar disciplina"}
                    hint={archived ? "Volta para a Faculdade, a Central e o seletor de origem." : "Fica guardada em “Encerradas”, com as notas."}
                    onClick={() => setStep("archive")}
                  />
                )}
                <div className="mx-2 my-1 border-t border-border" />
                <MenuItem
                  icon={Trash2}
                  label="Apagar"
                  hint={canDelete ? undefined : deleteBlocked}
                  danger={canDelete}
                  disabled={!canDelete}
                  onClick={() => setStep("delete")}
                />
              </div>
            </div>
          )}

          {step === "rename" && (
            <form onSubmit={rename} className="flex flex-col gap-4 px-4 pt-3 pb-[calc(var(--safe-bottom)+1rem)]">
              <Grab />
              <DrawerTitle className="text-left text-title font-semibold">Renomear</DrawerTitle>
              <DrawerDescription className="sr-only">Novo nome para {node.name}.</DrawerDescription>
              <input
                aria-label="Nome"
                autoFocus
                autoComplete="off"
                enterKeyHint="done"
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
              <Button type="submit" size="touch" disabled={pending || !name.trim() || name.trim() === node.name} className="w-full">
                Salvar
              </Button>
            </form>
          )}

          {(step === "archive" || step === "delete") && (
            <div className="flex flex-col gap-4 px-4 pt-3 pb-[calc(var(--safe-bottom)+1rem)]">
              <Grab />
              <div>
                <DrawerTitle className="text-left text-title font-semibold">
                  {step === "delete" ? `Apagar “${node.name}”?` : archived ? `Reabrir “${node.name}”?` : `Encerrar “${node.name}”?`}
                </DrawerTitle>
                <DrawerDescription className="mt-1 text-left text-sm text-foreground-secondary">
                  {step === "delete"
                    ? "A anotação e os materiais são apagados. As ações daqui ficam sem origem e continuam no PULSO."
                    : archived
                      ? "Ela volta para a Faculdade, a Central e o seletor de origem."
                      : "Sai da Faculdade, da Central e do seletor de origem, mas fica guardada com as avaliações e as notas. As ações abertas continuam no PULSO."}
                </DrawerDescription>
              </div>
              <Button size="touch" disabled={pending} onClick={step === "delete" ? remove : toggleArchive} className="w-full">
                {step === "delete" ? "Apagar" : archived ? "Reabrir" : "Encerrar"}
              </Button>
              <Button variant="secondary" size="touch" onClick={close} className="w-full">
                Cancelar
              </Button>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}

function MenuItem({
  icon: Icon,
  label,
  hint,
  danger,
  disabled,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-12 items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-(--duration-fast) hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Icon aria-hidden className={cn("size-[1.125rem] shrink-0", danger ? "text-[#fca5a5]" : "text-foreground-secondary")} strokeWidth={1.75} />
      <span className="min-w-0">
        <span className={cn("block text-body", danger && "text-[#fca5a5]")}>{label}</span>
        {hint && <span className="block text-caption text-foreground-subtle">{hint}</span>}
      </span>
    </button>
  );
}
