"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Area } from "@/types/project";
import { ConfirmSheet } from "@/components/feedback/confirm-sheet";
import { SectionHeading } from "@/components/cards/card-parts";
import { ListPanel } from "@/components/layout/page";
import { createOrigin, deleteOrigin, renameOrigin } from "@/lib/actions/client";
import { MODULES, buildOriginTree, originHref, type OriginNode } from "@/lib/origins/tree";

const nameClass =
  "h-12 w-full min-w-0 rounded-md border border-transparent bg-transparent px-0 text-body text-foreground placeholder:text-foreground-subtle focus-visible:border-border focus-visible:bg-elevated focus-visible:px-3 focus-visible:outline-none";
const iconButton =
  "flex size-11 shrink-0 items-center justify-center text-foreground-subtle transition-colors duration-(--duration-fast) hover:text-foreground disabled:opacity-40";

/**
 * Todas as origens, por módulo: renomear (toque no nome), criar subitem (+) e apagar.
 * Módulos são fixos; item com subitens só é apagado depois de esvaziado.
 */
export function OriginTreeEditor({ areas }: { areas: Area[] }) {
  const tree = buildOriginTree(areas);
  const [adding, setAdding] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<OriginNode | null>(null);
  const [pending, startTransition] = useTransition();

  function remove(node: OriginNode) {
    startTransition(async () => {
      const result = await deleteOrigin(node.id);
      setDeleting(null);
      if (!result.ok) return void toast.error(result.error);
      toast(`“${node.name}” apagado.`);
    });
  }

  const rowProps = { adding, setAdding, onDelete: setDeleting };

  return (
    <>
      {tree.map((root) => {
        const href = originHref(root);
        return (
          <section key={root.id} aria-labelledby={`modulo-${root.id}`} className="mt-8 first:mt-0">
            <SectionHeading
              id={`modulo-${root.id}`}
              title={MODULES[root.module].label}
              action={
                href && (
                  <Link href={href} className="text-caption text-foreground-subtle hover:text-foreground">
                    Abrir
                  </Link>
                )
              }
            />
            <ListPanel>
              {root.children.length > 0 && (
                <ul className="divide-y divide-border">
                  {root.children.map((node) => (
                    <Row key={node.id} node={node} depth={0} {...rowProps} />
                  ))}
                </ul>
              )}
              <AddRow parent={root} depth={0} open={adding === root.id} setAdding={setAdding} label={`Novo item em ${MODULES[root.module].label}`} />
            </ListPanel>
          </section>
        );
      })}

      <ConfirmSheet
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={deleting ? `Apagar “${deleting.name}”?` : ""}
        description="As ações e projetos daqui ficam sem origem, e os links são apagados. As tarefas continuam no PULSO."
        confirmLabel="Apagar"
        onConfirm={() => deleting && remove(deleting)}
        pending={pending}
      />
    </>
  );
}

type RowProps = {
  node: OriginNode;
  depth: number;
  adding: string | null;
  setAdding: (id: string | null) => void;
  onDelete: (node: OriginNode) => void;
};

function Row({ node, depth, adding, setAdding, onDelete }: RowProps) {
  const hasChildren = node.children.length > 0;
  return (
    <li>
      <div className="flex items-center gap-1" style={{ paddingLeft: `${depth * 1.25}rem` }}>
        <OriginName node={node} />
        <button type="button" onClick={() => setAdding(node.id)} aria-label={`Novo subitem em ${node.name}`} title="Novo subitem" className={iconButton}>
          <Plus aria-hidden className="size-5" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={() => (hasChildren ? toast("Esvazie os subitens antes de apagar.") : onDelete(node))}
          aria-label={`Apagar ${node.name}`}
          title={hasChildren ? "Esvazie os subitens antes de apagar" : "Apagar"}
          className={`${iconButton} -mr-2.5`}
        >
          <Trash2 aria-hidden className="size-5" strokeWidth={1.75} />
        </button>
      </div>
      {(hasChildren || adding === node.id) && (
        <ul className="divide-y divide-border border-t border-border">
          {node.children.map((child) => (
            <Row key={child.id} node={child} depth={depth + 1} adding={adding} setAdding={setAdding} onDelete={onDelete} />
          ))}
          {adding === node.id && (
            <li>
              <AddRow parent={node} depth={depth + 1} open setAdding={setAdding} label={`Novo subitem em ${node.name}`} />
            </li>
          )}
        </ul>
      )}
    </li>
  );
}

/** Nome editável no lugar: salva ao sair do campo. */
function OriginName({ node }: { node: OriginNode }) {
  const [name, setName] = useState(node.name);
  const [saved, setSaved] = useState(node.name);

  async function save() {
    const next = name.trim();
    if (!next || next === saved) return setName(saved);
    const result = await renameOrigin(node.id, next);
    // Se falhar, o nome digitado fica no campo; sair do campo de novo tenta outra vez.
    if (!result.ok) return void toast.error(result.error);
    setSaved(next);
  }

  return (
    <input
      aria-label={`Nome de ${saved}`}
      autoComplete="off"
      enterKeyHint="done"
      maxLength={80}
      value={name}
      onChange={(e) => setName(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      className={nameClass}
    />
  );
}

/** "+ Novo item": botão que vira campo; Enter cria e fecha. */
function AddRow({
  parent,
  depth,
  open,
  setAdding,
  label,
}: {
  parent: OriginNode;
  depth: number;
  open: boolean;
  setAdding: (id: string | null) => void;
  label: string;
}) {
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const name = draft.trim();
    if (!name) return setAdding(null);
    startTransition(async () => {
      const result = await createOrigin(parent.id, name);
      if (!result.ok) return void toast.error(result.error);
      setDraft("");
      setAdding(null);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setAdding(parent.id)}
        className="-mx-4 flex min-h-12 w-[calc(100%+2rem)] items-center gap-3 border-t border-border px-4 text-left text-sm text-foreground-subtle transition-colors duration-(--duration-fast) first:border-t-0 hover:bg-elevated/60 hover:text-foreground"
      >
        <Plus aria-hidden className="size-4" strokeWidth={1.75} />
        {label}
      </button>
    );
  }

  return (
    <form onSubmit={submit} style={{ paddingLeft: `${depth * 1.25}rem` }}>
      <label htmlFor={`novo-${parent.id}`} className="sr-only">
        {label}
      </label>
      <input
        id={`novo-${parent.id}`}
        autoFocus
        autoComplete="off"
        enterKeyHint="done"
        maxLength={80}
        value={draft}
        disabled={pending}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => !draft.trim() && setAdding(null)}
        onKeyDown={(e) => e.key === "Escape" && setAdding(null)}
        placeholder={label}
        className="my-1.5 h-11 w-full rounded-md border border-primary-soft/60 bg-surface px-3 text-body text-foreground placeholder:text-foreground-subtle focus-visible:outline-none"
      />
    </form>
  );
}
