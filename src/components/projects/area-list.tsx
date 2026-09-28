"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Area } from "@/types/project";
import { Button } from "@/components/ui/button";
import { ConfirmSheet } from "@/components/feedback/confirm-sheet";
import { createArea, deleteArea, renameArea } from "@/lib/projects/actions";

const inputClass =
  "h-12 w-full min-w-0 rounded-md border border-transparent bg-transparent px-0 text-body text-foreground placeholder:text-foreground-subtle focus-visible:border-border focus-visible:bg-surface focus-visible:px-3 focus-visible:outline-none";

/** Criar, renomear (toque no nome e edite) e apagar áreas. */
export function AreaList({ areas }: { areas: Area[] }) {
  const [deleting, setDeleting] = useState<Area | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  function add(event: React.FormEvent) {
    event.preventDefault();
    const name = draft.trim();
    if (!name) return;
    startTransition(async () => {
      const result = await createArea(name);
      if (!result.ok) return void toast.error(result.error);
      setDraft("");
    });
  }

  function remove(area: Area) {
    startTransition(async () => {
      const result = await deleteArea(area.id);
      setDeleting(null);
      if (!result.ok) return void toast.error(result.error);
      toast("Área apagada.");
    });
  }

  return (
    <>
      {areas.length > 0 && (
        <ul className="divide-y divide-border">
          {areas.map((area) => (
            <li key={area.id} className="flex items-center gap-2">
              <AreaName area={area} />
              <button
                type="button"
                onClick={() => setDeleting(area)}
                aria-label={`Apagar área ${area.name}`}
                className="-mr-2.5 flex size-11 shrink-0 items-center justify-center text-foreground-subtle active:text-foreground"
              >
                <Trash2 aria-hidden className="size-5" strokeWidth={1.75} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="mt-6 flex gap-3">
        <label htmlFor="new-area" className="sr-only">
          Nova área
        </label>
        <input
          id="new-area"
          autoComplete="off"
          enterKeyHint="done"
          maxLength={80}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Nova área (ex.: Faculdade)"
          className="h-12 min-w-0 flex-1 rounded-md border border-border bg-surface px-4 text-body text-foreground placeholder:text-foreground-subtle focus-visible:border-primary-soft focus-visible:outline-none"
        />
        <Button type="submit" size="touch" disabled={!draft.trim() || pending}>
          Criar
        </Button>
      </form>

      <ConfirmSheet
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={deleting ? `Apagar “${deleting.name}”?` : ""}
        description="Os projetos e tarefas dela ficam sem área. Nada mais é apagado."
        confirmLabel="Apagar área"
        onConfirm={() => deleting && remove(deleting)}
        pending={pending}
      />
    </>
  );
}

/** Nome editável no lugar: salva ao sair do campo. */
function AreaName({ area }: { area: Area }) {
  const [name, setName] = useState(area.name);
  const [saved, setSaved] = useState(area.name);

  async function save() {
    const next = name.trim();
    if (!next || next === saved) return setName(saved);
    const result = await renameArea(area.id, next);
    if (!result.ok) {
      toast.error(result.error);
      return setName(saved);
    }
    setSaved(next);
  }

  return (
    <input
      aria-label={`Nome da área ${saved}`}
      autoComplete="off"
      enterKeyHint="done"
      maxLength={80}
      value={name}
      onChange={(e) => setName(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      className={inputClass}
    />
  );
}
