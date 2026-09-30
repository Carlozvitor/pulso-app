"use client";

import { useRef, useState } from "react";
import { CalendarDays, ChevronDown, GitBranch, X } from "lucide-react";
import { toast } from "sonner";
import type { Area, ProjectSummary } from "@/types/project";
import { OriginPicker } from "@/components/origins/origin-picker";
import { updateProject } from "@/lib/actions/client";
import { actionsCount, projectDueTitle } from "@/lib/projects/labels";
import { activeOrigins, indexOrigins, originFullLabel } from "@/lib/origins/tree";
import type { ProjectPatch } from "@/lib/projects/schemas";
import { cn } from "@/lib/utils";
import { ProgressBar } from "./progress-bar";

const labelClass = "text-[0.6875rem] font-semibold tracking-[0.1em] text-white/55 uppercase";

type SaveState = "idle" | "saving" | "saved";

/**
 * Topo da página do projeto, no card roxo: objetivo (salva ao sair do campo) e origem à
 * esquerda; progresso e prazo à direita. Origem e prazo salvam no toque, como na tarefa.
 */
export function ProjectHero({ project, areas, today }: { project: ProjectSummary; areas: Area[]; today: string }) {
  const [goal, setGoal] = useState(project.description ?? "");
  const savedGoal = useRef(project.description ?? "");
  const [areaId, setAreaId] = useState(project.areaId);
  const [dueDate, setDueDate] = useState(project.dueDate);
  const [picking, setPicking] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const pendingSaves = useRef(0);

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

  async function saveGoal() {
    if (goal.trim() === savedGoal.current.trim()) return;
    if (await save({ description: goal })) savedGoal.current = goal;
  }

  // Atualiza na hora; se o servidor recusar, volta.
  function change<K extends "areaId" | "dueDate">(key: K, next: ProjectSummary[K], previous: ProjectSummary[K], set: (v: ProjectSummary[K]) => void) {
    set(next);
    void save({ [key]: next } as ProjectPatch).then((ok) => {
      if (!ok) set(previous);
    });
  }

  const origin = areaId ? originFullLabel(areaId, indexOrigins(areas)) : null;
  const due = dueDate ? projectDueTitle(dueDate, today) : null;
  const soon = dueDate !== null && dueDate >= today;
  const { done, total, percent } = project.progress;

  return (
    <section aria-label="Objetivo, progresso e prazo" className="tint tint-plum grid lg:grid-cols-[minmax(0,1fr)_18.75rem]">
      <div className="p-4 lg:px-6 lg:py-5">
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor="project-goal" className={labelClass}>
            Objetivo
          </label>
          <p aria-live="polite" className="text-caption text-white/40">
            {saveState === "saving" ? "Salvando…" : saveState === "saved" ? "Salvo" : "salva sozinho"}
          </p>
        </div>
        <textarea
          id="project-goal"
          rows={2}
          maxLength={2000}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          onBlur={saveGoal}
          placeholder="Qual é o objetivo? Em uma ou duas frases."
          className="mt-2 block min-h-14 w-full max-w-[60ch] resize-none bg-transparent text-[1.0625rem] leading-snug font-medium text-foreground placeholder:font-normal placeholder:text-white/35 focus-visible:outline-none lg:text-lg [field-sizing:content]"
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-lg bg-black/25 px-3 text-left text-sm text-white/80 transition-colors duration-(--duration-fast) hover:bg-black/40"
          >
            <GitBranch aria-hidden className="size-3.5 shrink-0 text-plum-ink" strokeWidth={1.75} />
            <span className="truncate">
              <span className="text-white/55">Origem: </span>
              {origin ?? "sem origem"}
            </span>
            <ChevronDown aria-hidden className="size-3.5 shrink-0 text-white/45" strokeWidth={1.75} />
          </button>
        </div>
        <OriginPicker
          open={picking}
          onOpenChange={setPicking}
          areas={activeOrigins(areas, areaId)}
          selectedId={areaId}
          title="De onde vem esse projeto?"
          description="As ações do projeto herdam esta origem."
          onChoose={(id) => {
            setPicking(false);
            if (id !== areaId) change("areaId", id, areaId, setAreaId);
          }}
        />
      </div>

      <div className="grid content-start gap-5 border-t border-white/10 p-4 lg:border-t-0 lg:border-l lg:px-6 lg:py-5">
        <div>
          <p className={labelClass}>Progresso</p>
          <p className="mt-1.5 flex items-baseline gap-2.5">
            <span className="tabular text-[2rem] leading-none font-bold tracking-tight">{percent}%</span>
            <span className="text-sm text-white/60">{actionsCount(done, total)}</span>
          </p>
          <div className="mt-2.5">
            <ProgressBar percent={percent} label={`Progresso: ${actionsCount(done, total)}`} />
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-3">
            <p id="project-due-label" className={labelClass}>
              Prazo
            </p>
            {dueDate && (
              <button
                type="button"
                onClick={() => change("dueDate", null, dueDate, setDueDate)}
                className="-my-2 inline-flex min-h-9 items-center gap-1 px-1 text-caption text-white/45 hover:text-white"
              >
                <X aria-hidden className="size-3.5" strokeWidth={1.75} />
                Tirar prazo
              </button>
            )}
          </div>
          {/* Data nativa por cima: abre o seletor do sistema no toque ou clique. */}
          <label className="relative mt-1 flex min-h-12 cursor-pointer items-center gap-3 rounded-lg transition-colors duration-(--duration-fast) hover:bg-black/20 lg:-mx-2 lg:px-2">
            <CalendarDays aria-hidden className="size-5 shrink-0 text-plum-ink" strokeWidth={1.75} />
            <span className="min-w-0">
              <span className="block text-base font-semibold">{due ? due.title : "Sem prazo"}</span>
              <span className={cn("block text-caption", due && soon ? "text-amber-ink" : "text-white/50")}>
                {due ? due.note : "Toque para escolher uma data"}
              </span>
            </span>
            <input
              type="date"
              value={dueDate ?? ""}
              aria-labelledby="project-due-label"
              onClick={(e) => {
                try {
                  e.currentTarget.showPicker();
                } catch {
                  // Navegador sem showPicker: o toque no campo já abre.
                }
              }}
              onChange={(e) => change("dueDate", e.target.value || null, dueDate, setDueDate)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        </div>
      </div>
    </section>
  );
}
