"use client";

import { useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import type { Area, Project } from "@/types/project";
import type { Task } from "@/types/task";
import type { TaskPatch } from "@/lib/tasks/schemas";
import { groupProjects } from "@/lib/projects/organize";
import { indexOrigins, originFullLabel } from "@/lib/origins/tree";
import { OriginField } from "@/components/origins/origin-field";
import { cn } from "@/lib/utils";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { AttributeRow } from "./attribute-row";

export type AssignOptions = { areas: Area[]; projects: Project[] };

type TaskAssignProps = {
  task: Task;
  options: AssignOptions;
  save: (patch: TaskPatch) => Promise<boolean>;
};

/**
 * Projeto e origem. Com projeto, a origem vem dele (só leitura).
 * Sem projeto, a origem é escolhida na árvore.
 */
export function TaskAssign({ task, options, save }: TaskAssignProps) {
  const [projectId, setProjectId] = useState(task.projectId);
  const [areaId, setAreaId] = useState(task.areaId);
  const [picking, setPicking] = useState(false);

  const project = options.projects.find((p) => p.id === projectId) ?? null;
  const index = indexOrigins(options.areas);

  function chooseProject(next: Project | null) {
    setPicking(false);
    if ((next?.id ?? null) === projectId) return;
    const previous = { projectId, areaId };
    setProjectId(next?.id ?? null);
    // Com projeto a origem passa a ser a dele; sem projeto, fica a última (igual ao banco).
    if (next) setAreaId(next.areaId);
    void save({ projectId: next?.id ?? null }).then((ok) => {
      if (ok) return;
      setProjectId(previous.projectId);
      setAreaId(previous.areaId);
    });
  }

  function chooseArea(next: string | null) {
    const previous = areaId;
    setAreaId(next);
    void save({ areaId: next }).then((ok) => {
      if (!ok) setAreaId(previous);
    });
  }

  // Só ativos na lista — mais o atual, se ele já foi concluído.
  const pickable = options.projects.filter((p) => p.status === "ACTIVE" || p.id === projectId);
  const hasAny = options.areas.length > 0 || options.projects.length > 0;
  if (!hasAny) return null;

  return (
    <>
      {options.projects.length > 0 && (
        <AttributeRow id="project-label" label="Projeto">
          <button
            type="button"
            aria-labelledby="project-label project-value"
            onClick={() => setPicking(true)}
            className="-mx-4 -my-2 flex min-h-12 items-center justify-between gap-4 px-4 text-left transition-colors duration-(--duration-fast) hover:bg-elevated/60 active:bg-elevated"
          >
            <span
              id="project-value"
              className={cn("truncate text-body", project ? "text-foreground" : "text-foreground-subtle")}
            >
              {project?.name ?? "Nenhum"}
            </span>
            <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-ui" />
          </button>
        </AttributeRow>
      )}

      {project ? (
        project.areaId && (
          <AttributeRow id="origin-label" label="Origem" hint="Vem do projeto">
            <p className="text-body text-foreground-secondary">{originFullLabel(project.areaId, index)}</p>
          </AttributeRow>
        )
      ) : (
        options.areas.length > 0 && (
          <AttributeRow id="origin-label" label="Origem">
            <OriginField labelId="origin-label" areas={options.areas} value={areaId} onChange={chooseArea} />
          </AttributeRow>
        )
      )}

      <ProjectPicker
        open={picking}
        onOpenChange={setPicking}
        areas={options.areas}
        projects={pickable}
        selectedId={projectId}
        onChoose={chooseProject}
      />
    </>
  );
}

type ProjectPickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  areas: Area[];
  projects: Project[];
  selectedId: string | null;
  onChoose: (project: Project | null) => void;
};

function ProjectPicker({ open, onOpenChange, areas, projects, selectedId, onChoose }: ProjectPickerProps) {
  const groups = groupProjects(projects, areas);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-lg rounded-t-xl border-border bg-elevated">
        <div className="flex min-h-0 flex-col px-4 pt-3 pb-[calc(var(--safe-bottom)+1rem)]">
          <div aria-hidden className="mx-auto h-1 w-10 shrink-0 rounded-full bg-border" />
          <DrawerTitle className="mt-4 text-left text-title font-semibold">Projeto</DrawerTitle>
          <DrawerDescription className="sr-only">Escolha o projeto desta tarefa.</DrawerDescription>

          <div className="mt-2 min-h-0 overflow-y-auto">
            <PickerOption label="Nenhum" selected={selectedId === null} onClick={() => onChoose(null)} />
            {groups.map((group) => (
              <div key={group.area?.id ?? "sem-origem"} className="mt-4">
                <p className="text-caption font-semibold tracking-[0.08em] text-foreground-subtle uppercase">
                  {group.label}
                </p>
                {group.projects.map((p) => (
                  <PickerOption
                    key={p.id}
                    label={p.name}
                    selected={p.id === selectedId}
                    onClick={() => onChoose(p)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function PickerOption({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className="-mx-4 flex min-h-12 w-[calc(100%+2rem)] items-center justify-between gap-4 px-4 text-left text-body transition-colors duration-(--duration-fast) hover:bg-elevated/60 active:bg-elevated"
    >
      <span className="truncate">{label}</span>
      {selected && <Check aria-hidden className="size-5 shrink-0 text-primary-soft" />}
    </button>
  );
}
