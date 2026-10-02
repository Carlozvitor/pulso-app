"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import type { EntryValues, ExerciseKind } from "@/types/workout";
import { addWorkoutEntry, removeWorkoutEntry, updateWorkoutEntry } from "@/lib/actions/client";
import { dayLabel } from "@/lib/treino/summary";
import { KIND_LABEL, compareValues, formatNumber, parseNumber } from "@/lib/treino/format";
import type { CatalogItem, EntryRow } from "@/lib/treino/pages";
import { cn } from "@/lib/utils";
import { ExerciseAdder } from "./exercise-adder";
import { kindTag, numberField } from "./styles";

type Field = keyof EntryValues;

/** Os números que cada tipo usa, na ordem da linha. */
const FIELDS: Record<ExerciseKind, Field[]> = {
  LOAD: ["sets", "reps", "loadKg"],
  BODYWEIGHT: ["sets", "reps"],
  TIME: ["minutes"],
};

const FIELD_LABEL: Record<Field, string> = { sets: "Séries", reps: "Repetições", loadKg: "Carga em kg", minutes: "Minutos" };

const toText = (value: number | null) => (value === null ? "" : formatNumber(value));

/** Os exercícios do treino e o campo para adicionar mais. */
export function WorkoutEntries({
  sessionId,
  rows,
  catalog,
  today,
}: {
  sessionId: string;
  rows: EntryRow[];
  catalog: CatalogItem[];
  today: string;
}) {
  return (
    <div className="grid gap-2">
      {rows.length > 0 ? (
        <ul className="grid gap-1">
          {rows.map((row) => (
            <EntryItem key={row.entry.id} row={row} today={today} />
          ))}
        </ul>
      ) : (
        <p className="px-2 pt-1 pb-0.5 text-sm text-white/65">Nenhum exercício ainda. Comece pelo primeiro que você vai fazer.</p>
      )}
      <ExerciseAdder catalog={catalog} exclude={rows.map((r) => r.exercise.id)} onAdd={(target) => addWorkoutEntry(sessionId, target)} />
    </div>
  );
}

/**
 * Um exercício: marcar como feito, os números (já vêm com a última vez, tracejados até mudar
 * ou marcar) e a diferença para a última vez. Cada número salva ao sair do campo.
 */
function EntryItem({ row, today }: { row: EntryRow; today: string }) {
  const { entry, exercise, last } = row;
  const fields = FIELDS[exercise.kind];
  const [done, setDone] = useState(entry.done);
  const [text, setText] = useState<Record<Field, string>>({
    sets: toText(entry.sets),
    reps: toText(entry.reps),
    loadKg: toText(entry.loadKg),
    minutes: toText(entry.minutes),
  });
  const [saved, setSaved] = useState<EntryValues>({ sets: entry.sets, reps: entry.reps, loadKg: entry.loadKg, minutes: entry.minutes });
  const [removing, setRemoving] = useState(false);
  const [, startTransition] = useTransition();

  // O que está na tela agora (texto inválido conta como o último salvo).
  const current: EntryValues = { ...saved };
  for (const field of fields) {
    const value = parseNumber(text[field]);
    if (value !== undefined) current[field] = value;
  }
  const hasNumbers = fields.some((f) => current[f] !== null);
  const change = last && hasNumbers ? compareValues(exercise.kind, last.values, current) : null;

  function setField(field: Field, value: number | null) {
    setSaved((s) => ({ ...s, [field]: value }));
    setText((t) => ({ ...t, [field]: toText(value) }));
  }

  function save(field: Field) {
    const value = parseNumber(text[field]);
    if (value === undefined || (value !== null && field !== "loadKg" && !Number.isInteger(value))) {
      toast.error(field === "loadKg" ? "Use só números, como 40 ou 42,5." : "Use um número inteiro, como 10.");
      return setField(field, saved[field]);
    }
    const previous = saved[field];
    setField(field, value);
    if (value === previous) return;
    startTransition(async () => {
      const result = await updateWorkoutEntry(entry.id, { [field]: value });
      if (!result.ok) {
        toast.error(result.error);
        setField(field, previous);
      }
    });
  }

  function toggle() {
    const next = !done;
    setDone(next);
    startTransition(async () => {
      const result = await updateWorkoutEntry(entry.id, { done: next });
      if (!result.ok) {
        setDone(!next);
        toast.error(result.error);
      }
    });
  }

  function remove() {
    setRemoving(true);
    startTransition(async () => {
      const result = await removeWorkoutEntry(entry.id);
      if (!result.ok) {
        setRemoving(false);
        return void toast.error(result.error);
      }
      toast(`${exercise.name} saiu do treino.`);
    });
  }

  if (removing) return null;

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2.5 rounded-[9px] px-3 py-3 lg:px-3.5",
        done ? "bg-black/22" : "bg-black/30",
      )}
    >
      <button
        type="button"
        onClick={toggle}
        aria-pressed={done}
        aria-label={done ? `${exercise.name}: feito. Tocar desmarca.` : `Marcar ${exercise.name} como feito`}
        className="-m-2.5 grid size-11 shrink-0 place-items-center"
      >
        <span
          className={cn(
            "grid size-6 place-items-center rounded-full border-[1.5px] transition-colors duration-(--duration-fast)",
            done ? "border-lime-ink bg-lime-ink text-[#141a04]" : "border-[#5a5a62] hover:border-lime-ink",
          )}
        >
          {done && <Check aria-hidden className="size-3.5" strokeWidth={3} />}
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[0.9375rem] font-medium">{exercise.name}</span>
          <span className={cn(kindTag, "hidden sm:inline-flex")}>{KIND_LABEL[exercise.kind]}</span>
        </p>
        <p className="tabular truncate text-caption text-white/50">
          {last ? `Última: ${last.label} · ${dayLabel(last.date, today)}` : "Primeira vez"}
        </p>
      </div>

      <div className="order-last flex basis-full items-center gap-1.5 pl-9 text-caption text-white/50 lg:order-none lg:basis-auto lg:pl-0">
        {fields.map((field, i) => {
          const ghost = !done && last !== null && current[field] !== null && current[field] === last.values[field];
          return (
            <span key={field} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden>{field === "loadKg" ? "·" : "×"}</span>}
              <input
                aria-label={`${FIELD_LABEL[field]} de ${exercise.name}`}
                inputMode={field === "loadKg" ? "decimal" : "numeric"}
                autoComplete="off"
                enterKeyHint="done"
                maxLength={7}
                value={text[field]}
                placeholder="–"
                onChange={(e) => setText((t) => ({ ...t, [field]: e.target.value }))}
                onBlur={() => save(field)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                className={cn(numberField, field === "loadKg" || field === "minutes" ? "w-16" : "w-13", ghost && "border-dashed text-white/45")}
              />
            </span>
          );
        })}
        <span className="min-w-6">{exercise.kind === "LOAD" ? "kg" : exercise.kind === "TIME" ? "min" : "rep."}</span>
      </div>

      <span className="w-16 shrink-0 text-right">
        {change ? (
          change.direction === "up" ? (
            <span className="tabular rounded-md bg-lime-ink/10 px-1.5 py-0.5 font-mono text-xs font-semibold whitespace-nowrap text-lime-ink">{change.label}</span>
          ) : (
            <span className="tabular font-mono text-xs font-semibold whitespace-nowrap text-white/40">{change.label}</span>
          )
        ) : (
          !last && <span className="text-caption text-white/40">1ª vez</span>
        )}
      </span>

      {!done ? (
        <button
          type="button"
          onClick={remove}
          aria-label={`Tirar ${exercise.name} do treino`}
          title="Tirar do treino"
          className="-my-2.5 -mr-1.5 grid size-11 shrink-0 place-items-center text-white/35 transition-colors duration-(--duration-fast) hover:text-white"
        >
          <X aria-hidden className="size-4" strokeWidth={1.75} />
        </button>
      ) : (
        <span aria-hidden className="-mr-1.5 w-11 shrink-0 max-lg:hidden" />
      )}
    </li>
  );
}
