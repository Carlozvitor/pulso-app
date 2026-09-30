"use client";

import { useState } from "react";
import { Check, Search } from "lucide-react";
import type { Area } from "@/types/project";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { MODULES, buildOriginTree, filterOriginTree, type OriginNode } from "@/lib/origins/tree";
import { cn } from "@/lib/utils";

type OriginPickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  areas: Area[];
  selectedId: string | null;
  onChoose: (id: string | null) => void;
  title?: string;
  description?: string;
  /** Mostra "Sem origem" (desligado ao mover um item, que sempre precisa de um lugar). */
  allowNone?: boolean;
};

/**
 * "De onde vem?" — a árvore de origens com busca. Módulos com subitens viram um grupo
 * (com "geral" para o próprio módulo); os que ainda não têm subitens ficam juntos embaixo.
 */
export function OriginPicker({
  open,
  onOpenChange,
  areas,
  selectedId,
  onChoose,
  title = "De onde vem essa tarefa?",
  description = "Escolha o lugar mais específico que fizer sentido.",
  allowNone = true,
}: OriginPickerProps) {
  const [query, setQuery] = useState("");
  const tree = filterOriginTree(buildOriginTree(areas), query);
  const grouped = tree.filter((root) => root.children.length > 0);
  const loose = tree.filter((root) => root.children.length === 0);

  function choose(id: string | null) {
    onChoose(id);
    setQuery("");
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-lg rounded-t-xl border-border bg-elevated">
        <div className="flex min-h-0 flex-col px-4 pt-3 pb-[calc(var(--safe-bottom)+1rem)]">
          <div aria-hidden className="mx-auto h-1 w-10 shrink-0 rounded-full bg-border" />
          <DrawerTitle className="mt-4 text-left text-title font-semibold">{title}</DrawerTitle>
          <DrawerDescription className="text-caption text-foreground-subtle">{description}</DrawerDescription>

          <label className="mt-3 flex h-11 shrink-0 items-center gap-2.5 rounded-[10px] border border-border bg-surface px-3 focus-within:border-primary-soft">
            <Search aria-hidden className="size-4 text-foreground-subtle" strokeWidth={1.75} />
            <span className="sr-only">Buscar origem</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar origem…"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-body text-foreground placeholder:text-foreground-subtle focus-visible:outline-none"
            />
          </label>

          <div className="mt-2 min-h-0 overflow-y-auto">
            {tree.length === 0 && <p className="py-6 text-center text-sm text-foreground-subtle">Nada com esse nome.</p>}

            {grouped.map((root) => (
              <div key={root.id} className="mt-3">
                <GroupLabel>{MODULES[root.module].label}</GroupLabel>
                <Option label={`${MODULES[root.module].label} (geral)`} depth={0} selected={root.id === selectedId} onClick={() => choose(root.id)} />
                <Branch nodes={root.children} depth={0} selectedId={selectedId} onChoose={choose} />
              </div>
            ))}

            {loose.length > 0 && (
              <div className="mt-3">
                <GroupLabel>{grouped.length > 0 ? "Outros módulos" : "Módulos"}</GroupLabel>
                {loose.map((root) => (
                  <Option key={root.id} label={MODULES[root.module].label} depth={0} selected={root.id === selectedId} onClick={() => choose(root.id)} />
                ))}
              </div>
            )}

            {allowNone && !query.trim() && (
              <div className="mt-2 border-t border-border pt-1">
                <Option label="Sem origem" depth={0} muted selected={selectedId === null} onClick={() => choose(null)} />
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function Branch({ nodes, depth, selectedId, onChoose }: { nodes: OriginNode[]; depth: number; selectedId: string | null; onChoose: (id: string) => void }) {
  return nodes.map((node) => (
    <div key={node.id}>
      <Option label={node.name} depth={depth} selected={node.id === selectedId} onClick={() => onChoose(node.id)} />
      {node.children.length > 0 && <Branch nodes={node.children} depth={depth + 1} selectedId={selectedId} onChoose={onChoose} />}
    </div>
  ));
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <p className="pt-2 pb-1 text-caption font-semibold tracking-[0.08em] text-foreground-subtle uppercase">{children}</p>;
}

function Option({
  label,
  depth,
  selected,
  muted,
  onClick,
}: {
  label: string;
  depth: number;
  selected: boolean;
  muted?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      style={{ paddingLeft: `${1 + depth * 1.25}rem` }}
      className={cn(
        "-mx-4 flex min-h-12 w-[calc(100%+2rem)] items-center justify-between gap-4 pr-4 text-left text-body transition-colors duration-(--duration-fast) hover:bg-elevated/60 active:bg-elevated",
        selected && "bg-[#1b1c2e]",
        muted && "text-foreground-secondary",
      )}
    >
      <span className="truncate">{label}</span>
      {selected && <Check aria-hidden className="size-5 shrink-0 text-primary-soft" />}
    </button>
  );
}
