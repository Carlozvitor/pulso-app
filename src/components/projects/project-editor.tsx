"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import type { Area, Project } from "@/types/project";
import { AttributeRow } from "@/components/tasks/attribute-row";
import { ChipGroup } from "@/components/tasks/chip-group";
import { DueField } from "@/components/tasks/due-field";
import { updateProject } from "@/lib/actions/client";
import type { ProjectPatch } from "@/lib/projects/schemas";

const STATUS_LABEL: Record<Project["status"], string> = {
  ACTIVE: "Projeto",
  DONE: "Projeto concluído",
  ARCHIVED: "Projeto arquivado",
};

const fieldBase =
  "w-full resize-none bg-transparent text-foreground placeholder:text-foreground-subtle focus-visible:outline-none [field-sizing:content]";

type SaveState = "idle" | "saving" | "saved";

/** Mesmo padrão da tarefa: salva sozinho — texto ao sair do campo, chips no toque. */
export function ProjectEditor({ project, areas, today }: { project: Project; areas: Area[]; today: string }) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [areaId, setAreaId] = useState(project.areaId);
  const [dueDate, setDueDate] = useState(project.dueDate);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const pendingSaves = useRef(0);
  const savedName = useRef(project.name);
  const savedDescription = useRef(project.description ?? "");

  async function save(patch: ProjectPatch): Promise<boolean> {
    pendingSaves.current += 1;
    setSaveState("saving");
    const result = await updateProject(project.id, patch);
    pendingSaves.current -= 1;
    if (!result.ok) {
      toast.error(result.error);
      setSaveState("idle");
      return false;
    }
    if (pendingSaves.current === 0) setSaveState("saved");
    return true;
  }

  async function saveName() {
    const next = name.trim();
    if (!next) return setName(savedName.current);
    if (next === savedName.current) return;
    if (await save({ name: next })) savedName.current = next;
    else setName(savedName.current);
  }

  async function saveDescription() {
    if (description.trim() === savedDescription.current.trim()) return;
    if (await save({ description })) savedDescription.current = description;
  }

  // Chips: atualizam na hora; se o servidor recusar, voltam.
  function changeArea(next: string | null) {
    const previous = areaId;
    setAreaId(next);
    void save({ areaId: next }).then((ok) => {
      if (!ok) setAreaId(previous);
    });
  }

  function changeDue(next: string | null) {
    const previous = dueDate;
    setDueDate(next);
    void save({ dueDate: next }).then((ok) => {
      if (!ok) setDueDate(previous);
    });
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-baseline justify-between">
        <p className="text-caption font-semibold tracking-[0.08em] text-foreground-subtle uppercase">
          {STATUS_LABEL[project.status]}
        </p>
        <p aria-live="polite" className="text-caption text-foreground-subtle">
          {saveState === "saving" ? "Salvando…" : saveState === "saved" ? "Salvo" : ""}
        </p>
      </div>

      <label htmlFor="project-name" className="sr-only">
        Nome do projeto
      </label>
      <textarea
        id="project-name"
        rows={1}
        maxLength={120}
        value={name}
        enterKeyHint="done"
        onChange={(e) => setName(e.target.value.replace(/\n/g, " "))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        onBlur={saveName}
        className={`${fieldBase} mt-2 min-h-[2.125rem] text-display font-semibold tracking-tight`}
      />

      <label htmlFor="project-description" className="sr-only">
        Descrição
      </label>
      <textarea
        id="project-description"
        rows={2}
        maxLength={2000}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onBlur={saveDescription}
        placeholder="Qual é o objetivo?"
        className={`${fieldBase} mt-3 min-h-16 text-body`}
      />

      <section aria-label="Detalhes do projeto" className="mt-6 flex flex-col gap-7 border-t border-border pt-6">
        {areas.length > 0 && (
          <AttributeRow
            id="project-area-label"
            label="Área"
            hint="As tarefas do projeto ficam nesta área"
            onClear={areaId ? () => changeArea(null) : undefined}
          >
            <ChipGroup
              labelId="project-area-label"
              options={areas.map((a) => ({ value: a.id, label: a.name }))}
              value={areaId}
              onChange={changeArea}
            />
          </AttributeRow>
        )}
        <DueField today={today} value={dueDate} onChange={changeDue} />
      </section>
    </div>
  );
}
