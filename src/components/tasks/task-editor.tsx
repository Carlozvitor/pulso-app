"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { Task, TaskStatus } from "@/types/task";
import { Button } from "@/components/ui/button";
import { setTaskStatus, updateTask } from "@/lib/tasks/actions";

const STATUS_LABEL: Record<TaskStatus, string> = {
  INBOX: "Inbox",
  TODO: "A fazer",
  IN_PROGRESS: "Em andamento",
  DONE: "Concluída",
  ARCHIVED: "Arquivada",
};

type StatusAction = { to: TaskStatus; label: string; toast: string };

/** Ação principal (botão cheio) e secundárias, conforme o status atual. */
const ACTIONS: Record<TaskStatus, { primary: StatusAction; secondary: StatusAction[] }> = {
  INBOX: {
    primary: { to: "TODO", label: "Pronta para fazer", toast: "Movida para suas tarefas." },
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
  IN_PROGRESS: {
    primary: { to: "DONE", label: "Concluir", toast: "Concluída." },
    secondary: [
      { to: "TODO", label: "Pausar", toast: "Pausada." },
      { to: "ARCHIVED", label: "Arquivar", toast: "Arquivada." },
    ],
  },
  DONE: {
    primary: { to: "TODO", label: "Reabrir", toast: "Reaberta." },
    secondary: [{ to: "ARCHIVED", label: "Arquivar", toast: "Arquivada." }],
  },
  ARCHIVED: {
    primary: { to: "INBOX", label: "Restaurar para a Inbox", toast: "De volta à Inbox." },
    secondary: [],
  },
};

const fieldBase =
  "w-full resize-none bg-transparent text-foreground placeholder:text-foreground-subtle focus-visible:outline-none [field-sizing:content]";

export function TaskEditor({ task }: { task: Task }) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [saving, startSaving] = useTransition();
  const [changing, startChanging] = useTransition();

  const dirty = title.trim() !== task.title || (description.trim() || null) !== task.description;
  const { primary, secondary } = ACTIONS[task.status];

  function save(event: React.FormEvent) {
    event.preventDefault();
    startSaving(async () => {
      const result = await updateTask({ id: task.id, title, description });
      if (result.ok) toast("Salvo.");
      else toast.error(result.error);
    });
  }

  function changeStatus(action: StatusAction) {
    const previous = task.status;
    startChanging(async () => {
      const result = await setTaskStatus(task.id, action.to);
      if (!result.ok) return void toast.error(result.error);
      toast(action.toast, {
        action: {
          label: "Desfazer",
          onClick: () => startChanging(async () => void (await setTaskStatus(task.id, previous))),
        },
      });
    });
  }

  return (
    <div className="flex flex-col">
      <p className="text-caption font-semibold tracking-[0.08em] text-foreground-subtle uppercase">
        {STATUS_LABEL[task.status]}
      </p>

      <form onSubmit={save} className="mt-2 flex flex-col">
        <label htmlFor="task-title" className="sr-only">
          Título
        </label>
        <textarea
          id="task-title"
          rows={1}
          maxLength={500}
          value={title}
          onChange={(e) => setTitle(e.target.value.replace(/\n/g, " "))}
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
          placeholder="Adicionar detalhes"
          className={`${fieldBase} mt-4 min-h-24 text-body`}
        />

        {dirty && (
          <Button type="submit" variant="secondary" size="touch" disabled={saving || !title.trim()} className="mt-4 w-full">
            {saving ? "Salvando…" : "Salvar alterações"}
          </Button>
        )}
      </form>

      <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6">
        <Button size="touch" disabled={changing} onClick={() => changeStatus(primary)} className="w-full">
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
                onClick={() => changeStatus(action)}
                className="flex-1"
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
