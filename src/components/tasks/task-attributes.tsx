"use client";

import { useState } from "react";
import type { Energy, Task } from "@/types/task";
import type { TaskPatch } from "@/lib/tasks/schemas";
import { formatDuration } from "@/lib/tasks/format";
import {
  DURATION_PRESETS,
  ENERGY_LABEL,
  LEVEL_LABEL,
  LEVEL_TO_SCALE,
  scaleToLevel,
  type Level,
} from "@/lib/tasks/levels";
import { AttributeRow } from "./attribute-row";
import { DueField } from "./due-field";
import { TaskAssign, type AssignOptions } from "./task-assign";
import { ChipGroup, chipClass } from "./chip-group";

type TaskAttributesProps = {
  task: Task;
  today: string;
  options: AssignOptions;
  /** Salva um campo; resolve `false` se falhou (o valor local volta). */
  save: (patch: TaskPatch) => Promise<boolean>;
};

const LEVELS: Level[] = ["LOW", "MEDIUM", "HIGH"];
const levelOptions = LEVELS.map((value) => ({ value, label: LEVEL_LABEL[value] }));
const energyOptions = (["LOW", "MEDIUM", "HIGH"] as Energy[]).map((value) => ({ value, label: ENERGY_LABEL[value] }));
const durationOptions = DURATION_PRESETS.map((value) => ({ value, label: formatDuration(value) }));

export function TaskAttributes({ task, today, options, save }: TaskAttributesProps) {
  const [due, setDue] = useState(task.dueDate);
  const [minutes, setMinutes] = useState(task.estimatedMinutes);
  const [energy, setEnergy] = useState(task.energy);
  const [importance, setImportance] = useState(scaleToLevel(task.importance));
  const [urgency, setUrgency] = useState(scaleToLevel(task.urgency));

  /** Atualiza na hora; se o servidor recusar, volta ao valor anterior. */
  function field<T>(current: T, set: (v: T) => void, toPatch: (v: T) => TaskPatch) {
    return (next: T) => {
      set(next);
      void save(toPatch(next)).then((ok) => {
        if (!ok) set(current);
      });
    };
  }

  const changeDue = field(due, setDue, (v) => ({ dueDate: v }));
  const changeMinutes = field(minutes, setMinutes, (v) => ({ estimatedMinutes: v }));
  const changeEnergy = field(energy, setEnergy, (v) => ({ energy: v }));
  const changeImportance = field(importance, setImportance, (v) => ({ importance: v && LEVEL_TO_SCALE[v] }));
  const changeUrgency = field(urgency, setUrgency, (v) => ({ urgency: v && LEVEL_TO_SCALE[v] }));

  return (
    <section aria-label="Detalhes" className="flex flex-col gap-7">
      <TaskAssign task={task} options={options} save={save} />
      <DueField today={today} value={due} onChange={changeDue} />
      <DurationField value={minutes} onChange={changeMinutes} />

      <AttributeRow
        id="energy-label"
        label="Energia"
        hint="Baixa: mensagens, organizar · Alta: criar, resolver problemas"
        onClear={energy ? () => changeEnergy(null) : undefined}
      >
        <ChipGroup labelId="energy-label" options={energyOptions} value={energy} onChange={changeEnergy} />
      </AttributeRow>

      <AttributeRow
        id="importance-label"
        label="Importância"
        hint="O quanto isso contribui para o que importa pra você"
        onClear={importance ? () => changeImportance(null) : undefined}
      >
        <ChipGroup labelId="importance-label" options={levelOptions} value={importance} onChange={changeImportance} />
      </AttributeRow>

      <AttributeRow
        id="urgency-label"
        label="Urgência"
        hint="O quanto precisa ser resolvido rápido"
        onClear={urgency ? () => changeUrgency(null) : undefined}
      >
        <ChipGroup labelId="urgency-label" options={levelOptions} value={urgency} onChange={changeUrgency} />
      </AttributeRow>
    </section>
  );
}

function DurationField({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const isPreset = value !== null && (DURATION_PRESETS as readonly number[]).includes(value);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  function commit() {
    setEditing(false);
    const n = Number(draft);
    if (Number.isInteger(n) && n >= 1 && n <= 1440 && n !== value) onChange(n);
  }

  return (
    <AttributeRow id="duration-label" label="Duração" onClear={value ? () => onChange(null) : undefined}>
      <ChipGroup
        labelId="duration-label"
        options={durationOptions}
        value={isPreset ? value : null}
        onChange={onChange}
        scroll
      >
        {editing ? (
          <span className={`${chipClass(true)} gap-1 pr-3`}>
            <input
              autoFocus
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={draft}
              onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
              onBlur={commit}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              aria-label="Duração em minutos"
              className="w-12 bg-transparent text-right text-foreground focus-visible:outline-none"
            />
            min
          </span>
        ) : (
          <button
            type="button"
            aria-pressed={value !== null && !isPreset}
            onClick={() => {
              setDraft(value && !isPreset ? String(value) : "");
              setEditing(true);
            }}
            className={chipClass(value !== null && !isPreset)}
          >
            {value !== null && !isPreset ? formatDuration(value) : "Outra"}
          </button>
        )}
      </ChipGroup>
    </AttributeRow>
  );
}
