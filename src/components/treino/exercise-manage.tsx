"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { EXERCISE_KINDS, type ExerciseKind, type WorkoutExercise } from "@/types/workout";
import { createExercise, setExerciseArchived, updateExercise } from "@/lib/actions/client";
import { KIND_LABEL, KIND_UNIT, formatNumber, parseNumber } from "@/lib/treino/format";
import { NameSheet } from "./plan-manage";
import { limeChip, quietButton } from "./styles";

const GOAL_HINT: Record<ExerciseKind, string> = {
  LOAD: "A carga que você quer chegar.",
  BODYWEIGHT: "As repetições que você quer chegar (por série).",
  TIME: "Os minutos que você quer chegar.",
};

/** Meta, tipo, nome e guardar — o painel ao lado dos registros. */
export function ExerciseManage({ exercise }: { exercise: WorkoutExercise }) {
  const [goal, setGoal] = useState(exercise.goal === null ? "" : formatNumber(exercise.goal));
  const [savedGoal, setSavedGoal] = useState(exercise.goal);
  const [kind, setKind] = useState(exercise.kind);
  const [renaming, setRenaming] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function saveGoal() {
    const value = parseNumber(goal);
    if (value === undefined || value === 0) {
      toast.error("Use só números, como 60 ou 62,5.");
      return setGoal(savedGoal === null ? "" : formatNumber(savedGoal));
    }
    if (value === savedGoal) return setGoal(value === null ? "" : formatNumber(value));
    const previous = savedGoal;
    setSavedGoal(value);
    setGoal(value === null ? "" : formatNumber(value));
    startTransition(async () => {
      const result = await updateExercise(exercise.id, { goal: value });
      if (!result.ok) {
        toast.error(result.error);
        setSavedGoal(previous);
        setGoal(previous === null ? "" : formatNumber(previous));
      }
    });
  }

  function changeKind(next: ExerciseKind) {
    if (next === kind) return;
    const previous = kind;
    setKind(next);
    startTransition(async () => {
      const result = await updateExercise(exercise.id, { kind: next });
      if (!result.ok) {
        setKind(previous);
        return void toast.error(result.error);
      }
      toast(`Agora é ${KIND_LABEL[next].toLocaleLowerCase("pt-BR")}.`, {
        action: { label: "Desfazer", onClick: () => void updateExercise(exercise.id, { kind: previous }).then(() => setKind(previous)) },
      });
    });
  }

  function rename(name: string) {
    if (name === exercise.name) return setRenaming(false);
    startTransition(async () => {
      const result = await updateExercise(exercise.id, { name });
      if (!result.ok) return void toast.error(result.error);
      setRenaming(false);
    });
  }

  function archive(archived: boolean) {
    startTransition(async () => {
      const result = await setExerciseArchived(exercise.id, archived);
      if (!result.ok) return void toast.error(result.error);
      if (archived) {
        toast(`${exercise.name} foi guardado.`, { action: { label: "Desfazer", onClick: () => void setExerciseArchived(exercise.id, false) } });
        router.push("/treino/exercicios");
      } else toast(`${exercise.name} voltou para a lista.`);
    });
  }

  return (
    <div className="tint tint-neutral grid gap-5 p-4 lg:p-5">
      <div className="grid gap-2">
        <label htmlFor="exercicio-meta" className="text-sm font-medium text-foreground-secondary">
          Meta
        </label>
        <div className="flex items-center gap-2.5">
          <input
            id="exercicio-meta"
            inputMode={kind === "LOAD" ? "decimal" : "numeric"}
            autoComplete="off"
            enterKeyHint="done"
            maxLength={7}
            value={goal}
            placeholder="–"
            onChange={(e) => setGoal(e.target.value)}
            onBlur={saveGoal}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            className="tabular h-11 w-20 rounded-lg border border-lime-line bg-[#0b0d06] text-center font-mono text-[0.9375rem] font-semibold text-foreground placeholder:text-white/30 focus-visible:border-lime-ink focus-visible:outline-none"
          />
          <span className="text-sm text-foreground-secondary">{KIND_UNIT[kind]}</span>
        </div>
        <p className="text-caption text-foreground-subtle">{GOAL_HINT[kind]} Em branco, sem meta. A barra compara com a última vez.</p>
      </div>

      <div className="grid gap-2">
        <h3 id="exercicio-tipo" className="text-sm font-medium text-foreground-secondary">
          Tipo
        </h3>
        <div role="group" aria-labelledby="exercicio-tipo" className="flex flex-wrap gap-2">
          {EXERCISE_KINDS.map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} disabled={pending} onClick={() => changeKind(k)} className={limeChip(kind === k)}>
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
        <p className="text-caption text-foreground-subtle">Carga: séries × repetições · kg. Peso do corpo: séries × repetições. Tempo: minutos.</p>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <button type="button" onClick={() => setRenaming(true)} className={quietButton}>
          <Pencil aria-hidden strokeWidth={1.75} />
          Renomear
        </button>
        {exercise.archivedAt ? (
          <button type="button" disabled={pending} onClick={() => archive(false)} className={quietButton}>
            <ArchiveRestore aria-hidden strokeWidth={1.75} />
            Voltar para a lista
          </button>
        ) : (
          <button type="button" disabled={pending} onClick={() => archive(true)} className={quietButton}>
            <Archive aria-hidden strokeWidth={1.75} />
            Guardar
          </button>
        )}
      </div>
      {!exercise.archivedAt && <p className="-mt-3 text-caption text-foreground-subtle">Guardar tira da lista de escolha e das fichas. O histórico fica.</p>}

      <NameSheet
        open={renaming}
        onOpenChange={setRenaming}
        title="Renomear exercício"
        description="O histórico continua junto."
        label="Nome do exercício"
        initial={exercise.name}
        submitLabel="Salvar"
        maxLength={80}
        pending={pending}
        onSubmit={rename}
      />
    </div>
  );
}

/** "Novo exercício": nome e tipo. Abre a página dele (meta e histórico). */
export function NewExerciseButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ExerciseKind>("LOAD");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      const result = await createExercise({ name, kind });
      if (!result.ok) return void toast.error(result.error);
      setOpen(false);
      setName("");
      setKind("LOAD");
      router.push(`/treino/exercicios/${result.id}`);
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={quietButton}>
        <Plus aria-hidden strokeWidth={1.75} />
        Novo exercício
      </button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerPrimitive.VirtualKeyboardProvider>
          <DrawerContent className="bottom-(--drawer-keyboard-inset,0px) mx-auto max-w-lg rounded-t-xl border-border bg-elevated">
            <form onSubmit={submit} className="flex flex-col gap-5 px-4 pt-3 pb-[calc(var(--safe-bottom)+1rem)]">
              <div aria-hidden className="mx-auto h-1 w-10 rounded-full bg-border" />
              <div>
                <DrawerTitle className="text-left text-title font-semibold">Novo exercício</DrawerTitle>
                <DrawerDescription className="mt-0.5 text-left text-caption text-foreground-subtle">
                  Também dá para criar na hora, dentro do treino.
                </DrawerDescription>
              </div>
              <input
                aria-label="Nome do exercício"
                autoFocus
                autoComplete="off"
                enterKeyHint="done"
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Remada baixa"
                className="h-12 w-full rounded-md border border-border bg-surface px-4 text-body text-foreground placeholder:text-foreground-subtle focus-visible:border-primary-soft focus-visible:outline-none"
              />
              <div role="group" aria-label="Tipo do exercício" className="flex flex-wrap gap-2">
                {EXERCISE_KINDS.map((k) => (
                  <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={limeChip(kind === k)}>
                    {KIND_LABEL[k]}
                  </button>
                ))}
              </div>
              <Button type="submit" size="touch" disabled={!name.trim() || pending} className="w-full">
                Criar exercício
              </Button>
            </form>
          </DrawerContent>
        </DrawerPrimitive.VirtualKeyboardProvider>
      </Drawer>
    </>
  );
}
