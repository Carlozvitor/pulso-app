"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CornerDownRight, FolderInput, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Area } from "@/types/project";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { ConfirmSheet } from "@/components/feedback/confirm-sheet";
import { createOrigin, deleteOrigin, moveOrigin, renameOrigin } from "@/lib/actions/client";
import { cn } from "@/lib/utils";
import { OriginPicker } from "./origin-picker";

type Child = { id: string; name: string; open: number; href: string | null };

/** Subitens em pílulas, com "+ Subitem" que vira campo no lugar. */
export function OriginChildren({
  parent,
  items,
  addLabel = "Subitem",
}: {
  parent: { id: string; name: string };
  items: Child[];
  addLabel?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  function add(event: React.FormEvent) {
    event.preventDefault();
    const name = draft.trim();
    if (!name) return setAdding(false);
    startTransition(async () => {
      const result = await createOrigin(parent.id, name);
      if (!result.ok) return void toast.error(result.error);
      setDraft("");
      setAdding(false);
    });
  }

  const pill =
    "inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-[filter] duration-(--duration-fast)";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((child) => {
        const content = (
          <>
            <CornerDownRight aria-hidden className="size-3.5 text-blue-ink/80" strokeWidth={1.75} />
            {child.name}
            <span className="tabular font-mono text-[0.6875rem] font-semibold text-blue-ink">{child.open > 0 ? child.open : "–"}</span>
          </>
        );
        const className = cn(pill, "border-[#1f4b78] bg-blue-tile text-[#dbeafe] hover:brightness-125");
        return child.href ? (
          <Link key={child.id} href={child.href} className={className}>
            {content}
          </Link>
        ) : (
          <span key={child.id} className={className}>
            {content}
          </span>
        );
      })}

      {adding ? (
        <form onSubmit={add} className="flex items-center gap-2">
          <label htmlFor={`subitem-${parent.id}`} className="sr-only">
            Nome do subitem em {parent.name}
          </label>
          <input
            id={`subitem-${parent.id}`}
            autoFocus
            autoComplete="off"
            enterKeyHint="done"
            maxLength={80}
            value={draft}
            disabled={pending}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => !draft.trim() && setAdding(false)}
            onKeyDown={(e) => e.key === "Escape" && setAdding(false)}
            placeholder={`Nome (${addLabel.toLowerCase()})`}
            className="h-9 w-48 rounded-full border border-primary-soft/60 bg-surface px-3.5 text-sm text-foreground placeholder:text-foreground-subtle focus-visible:outline-none"
          />
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className={cn(pill, "border-dashed border-border-strong text-foreground-subtle hover:text-foreground")}
        >
          <Plus aria-hidden className="size-3.5" strokeWidth={1.75} />
          {addLabel}
        </button>
      )}
    </div>
  );
}

const actionClass =
  "inline-flex h-9 items-center gap-2 rounded-lg border border-border-strong bg-elevated px-3 text-sm font-medium text-foreground transition-colors duration-(--duration-fast) hover:bg-[#1d1d22] disabled:opacity-50 lg:h-10 lg:px-3.5";

/** Renomear, mover (dentro do módulo) e apagar (só vazio de subitens). */
export function OriginManage({
  node,
  parentHref,
  movable,
  canMove,
  canDelete,
}: {
  node: Area;
  /** Para onde ir depois de apagar. */
  parentHref: string;
  movable: Area[];
  canMove: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"rename" | "move" | "delete" | null>(null);
  const [name, setName] = useState(node.name);
  const [pending, startTransition] = useTransition();
  const close = () => setDialog(null);

  function rename(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await renameOrigin(node.id, name);
      if (!result.ok) return void toast.error(result.error);
      close();
    });
  }

  function move(parentId: string | null) {
    close();
    if (!parentId || parentId === node.parentId) return;
    startTransition(async () => {
      const result = await moveOrigin(node.id, parentId);
      if (!result.ok) return void toast.error(result.error);
      toast("Movido.");
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteOrigin(node.id);
      close();
      if (!result.ok) return void toast.error(result.error);
      toast(`“${node.name}” apagado.`);
      router.push(parentHref);
    });
  }

  return (
    <>
      <button type="button" className={actionClass} onClick={() => { setName(node.name); setDialog("rename"); }}>
        <Pencil aria-hidden className="size-4 text-foreground-secondary" strokeWidth={1.75} />
        Renomear
      </button>
      {canMove && (
        <button type="button" className={actionClass} onClick={() => setDialog("move")}>
          <FolderInput aria-hidden className="size-4 text-foreground-secondary" strokeWidth={1.75} />
          Mover
        </button>
      )}
      <button
        type="button"
        className={cn(actionClass, "w-9 justify-center px-0 lg:w-10 lg:px-0")}
        onClick={() => (canDelete ? setDialog("delete") : toast("Esvazie os subitens antes de apagar."))}
        aria-label={`Apagar ${node.name}`}
        title={canDelete ? "Apagar" : "Esvazie os subitens antes de apagar"}
      >
        <Trash2 aria-hidden className="size-4 text-foreground-secondary" strokeWidth={1.75} />
      </button>

      <Drawer open={dialog === "rename"} onOpenChange={(open) => !open && close()}>
        <DrawerContent className="mx-auto max-w-lg rounded-t-xl border-border bg-elevated">
          <form onSubmit={rename} className="flex flex-col gap-4 px-4 pt-3 pb-[calc(var(--safe-bottom)+1rem)]">
            <div aria-hidden className="mx-auto h-1 w-10 rounded-full bg-border" />
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
              className="h-12 w-full rounded-md border border-border bg-surface px-4 text-body text-foreground focus-visible:border-primary-soft focus-visible:outline-none"
            />
            <Button type="submit" size="touch" disabled={pending || !name.trim() || name.trim() === node.name} className="w-full">
              Salvar
            </Button>
          </form>
        </DrawerContent>
      </Drawer>

      <OriginPicker
        open={dialog === "move"}
        onOpenChange={(open) => !open && close()}
        areas={movable}
        selectedId={node.parentId}
        onChoose={move}
        allowNone={false}
        title={`Mover “${node.name}” para onde?`}
        description="Os subitens e as ações vão junto."
      />

      <ConfirmSheet
        open={dialog === "delete"}
        onOpenChange={(open) => !open && close()}
        title={`Apagar “${node.name}”?`}
        description="As ações e projetos daqui ficam sem origem, e os links são apagados. As tarefas continuam no PULSO."
        confirmLabel="Apagar"
        onConfirm={remove}
        pending={pending}
      />
    </>
  );
}
