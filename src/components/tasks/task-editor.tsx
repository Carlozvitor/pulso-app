"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { Moon, Undo2 } from "lucide-react";
import { toast } from "sonner";
import type { Task, TaskStatus } from "@/types/task";
import { Button } from "@/components/ui/button";
import { pauseTask, setTaskStatus, snoozeTask, updateTask } from "@/lib/actions/client";
import { isPaused, isSnoozed } from "@/lib/priorities/agora";
import { dayTitle } from "@/lib/dates";
import type { TaskPatch } from "@/lib/tasks/schemas";
import { TaskAttributes } from "./task-attributes";
import type { AssignOptions } from "./task-assign";

/** O status do banco + "pausada" (A fazer com marca), que tem ações próprias. */
type EditorState = TaskStatus | "PAUSED";

const STATE_LABEL: Record<EditorState, string> = {
  INBOX: "Inbox",
  TODO: "A fazer",
  PAUSED: "Pausada",
  IN_PROGRESS: "Em andamento",
  DONE: "Concluída",
  ARCHIVED: "Arquivada",
};

type StateAction = { to: EditorState; label: string; toast: string };

/** Ação principal (botão cheio) e secundárias, conforme o estado atual. */
const ACTIONS: Record<EditorState, { primary: StateAction; secondary: StateAction[] }> = {
  INBOX: {
    primary: { to: "TODO", label: "Pronta para fazer", toast: "Movida para A fazer." },
    secondary: [
      { to: "DONE", label: "Concluir", toast: "Concluída." },
      { to: "ARCHIVED", label: "Arquivar", toast: "Arquivada." },
    ],
  },
  TODO: {
    primary: { to: "IN_PROGRESS", label: "Começar", toast: "Em andamento." },
    secondary: [
      { to: "DONE", label: "Concluir", toast: "Concluída." },
      { to: "ARCHIVED", label: "Arquivar", toast: "Arquivada." },
    ],
  },
  PAUSED: {
    primary: { to: "IN_PROGRESS", label: "Retomar", toast: "Em andamento de novo." },
    secondary: [
      { to: "DONE", label: "Concluir", toast: "Concluída." },
      { to: "ARCHIVED", label: "Arquivar", toast: "Arquivada." },
    ],
  },
  IN_PROGRESS: {
    primary: { to: "DONE", label: "Concluir", toast: "Concluída." },
    secondary: [
      { to: "PAUSED", label: "Pausar", toast: "Pausada. Fica em A fazer até você retomar." },
      { to: "ARCHIVED", label: "Arquivar", toast: "Arquivada." },
    ],
  },
  DONE: {
    primary: { to: "TODO", label: "Reabrir", toast: "Reaberta." },
    secondary: [{ to: "ARCHIVED", label: "Arquivar", toast: "Arquivada." }],
  },
  ARCHIVED: {
    primary: { to: "TODO", label: "Restaurar", toast: "De volta em A fazer." },
    secondary: [],
  },
};

/** Leva a tarefa a um estado: "pausada" tem ação própria; o resto é troca de status. */
function applyState(id: string, state: EditorState) {
  return state === "PAUSED" ? pauseTask(id) : setTaskStatus(id, state);
}

const fieldBase =
  "w-full resize-none bg-transparent text-foreground placeholder:text-foreground-subtle focus-visible:outline-none [field-sizing:content]";

/** "unsaved": falhou (ex.: sem conexão) — o texto fica no campo e salva no próximo toque fora. */
type SaveState = "idle" | "saving" | "saved" | "unsaved";

const SAVE_LABEL: Record<SaveState, string> = { idle: "", saving: "Salvando…", saved: "Salvo", unsaved: "Não salvo" };

export function TaskEditor({ task, today, options }: { task: Task; today: string; options: AssignOptions }) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const pendingSaves = useRef(0);
  const [changing, startChanging] = useTransition();
  // O estado muda na tela no toque; volta sozinho se o servidor recusar.
  const initialState: EditorState = isPaused(task) ? "PAUSED" : task.status;
  const [state, setState] = useOptimistic<EditorState>(initialState);
  const [snoozed, setSnoozed] = useOptimistic(isSnoozed(task, today));
  const canSnooze = state === "TODO" || state === "PAUSED" || state === "INBOX";

  // Último valor confirmado pelo servidor — evita salvar sem mudança e permite voltar em erro.
  const savedTitle = useRef(task.title);
  const savedDescription = useRef(task.description ?? "");

  const { primary, secondary } = ACTIONS[state];

  /** Salvamento automático: um campo por vez. Só erro vira toast. */
  async function save(patch: TaskPatch): Promise<boolean> {
    pendingSaves.current += 1;
    setSaveState("saving");
    const result = await updateTask(task.id, patch);
    pendingSaves.current -= 1;
    if (!result.ok) {
      toast.error(result.error);
      setSaveState("unsaved");
      return false;
    }
    if (pendingSaves.current === 0) setSaveState("saved");
    return true;
  }

  async function saveTitle() {
    const next = title.trim();
    if (!next) return setTitle(savedTitle.current); // título vazio: volta ao anterior
    if (next === savedTitle.current) return;
    // Se falhar, o título digitado fica no campo; sair do campo de novo tenta outra vez.
    if (await save({ title: next })) savedTitle.current = next;
  }

  async function saveDescription() {
    if (description.trim() === savedDescription.current.trim()) return;
    if (await save({ description })) savedDescription.current = description;
  }

  function changeState(action: StateAction) {
    const previous = initialState;
    startChanging(async () => {
      setState(action.to);
      const result = await applyState(task.id, action.to);
      if (!result.ok) return void toast.error(result.error);
      toast(action.toast, {
        action: {
          label: "Desfazer",
          onClick: () =>
            startChanging(async () => {
              setState(previous);
              const undone = await applyState(task.id, previous);
              if (!undone.ok) toast.error(undone.error);
            }),
        },
      });
    });
  }

  /** "Agora não": fora da Agora até amanhã (continua em A fazer). */
  function toggleSnooze(snooze: boolean) {
    startChanging(async () => {
      setSnoozed(snooze);
      const result = await snoozeTask(task.id, snooze);
      if (!result.ok) return void toast.error(result.error);
      toast(snooze ? "Guardada em A fazer. Volta para a Agora amanhã." : "De volta à Agora.");
    });
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-baseline justify-between">
        <p className="text-caption font-semibold tracking-[0.08em] text-foreground-subtle uppercase">
          {STATE_LABEL[state]}
        </p>
        <p aria-live="polite" className="text-caption text-foreground-subtle">
          {SAVE_LABEL[saveState]}
        </p>
      </div>

      <div className="mt-2 flex flex-col">
        <label htmlFor="task-title" className="sr-only">
          Título
        </label>
        <textarea
          id="task-title"
          rows={1}
          maxLength={500}
          value={title}
          enterKeyHint="done"
          onChange={(e) => setTitle(e.target.value.replace(/\n/g, " "))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          onBlur={saveTitle}
          className={`${fieldBase} min-h-[2.125rem] text-display font-semibold tracking-tight`}
        />

        <label htmlFor="task-description" className="sr-only">
          Descrição
        </label>
        <textarea
          id="task-description"
          rows={3}
          maxLength={5000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={saveDescription}
          placeholder="Adicionar detalhes"
          className={`${fieldBase} mt-4 min-h-24 text-body`}
        />
      </div>

      <div className="mt-6 border-t border-border pt-6">
        <TaskAttributes task={task} today={today} options={options} save={save} />
      </div>

      <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6">
        <Button size="touch" disabled={changing} onClick={() => changeState(primary)} className="w-full">
          {primary.label}
        </Button>
        {secondary.length > 0 && (
          <div className="flex gap-3">
            {secondary.map((action) => (
              <Button
                key={action.to}
                variant="secondary"
                size="touch"
                disabled={changing}
                onClick={() => changeState(action)}
                className="flex-1"
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
        {canSnooze &&
          (snoozed ? (
            <p className="flex min-h-11 flex-wrap items-center justify-center gap-x-2 text-sm text-foreground-subtle">
              Fora da Agora até {task.snoozedUntil && task.snoozedUntil > today ? dayTitle(task.snoozedUntil, today).toLowerCase() : "amanhã"}.
              <button
                type="button"
                disabled={changing}
                onClick={() => toggleSnooze(false)}
                className="inline-flex min-h-11 items-center gap-1.5 text-foreground-secondary hover:text-foreground"
              >
                <Undo2 aria-hidden className="size-4" strokeWidth={1.75} />
                Trazer de volta agora
              </button>
            </p>
          ) : (
            <button
              type="button"
              disabled={changing}
              onClick={() => toggleSnooze(true)}
              className="inline-flex min-h-11 items-center justify-center gap-2 text-sm text-foreground-secondary hover:text-foreground"
            >
              <Moon aria-hidden className="size-4" strokeWidth={1.75} />
              Agora não — volta para a Agora amanhã
            </button>
          ))}
      </div>
    </div>
  );
}
