import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { buildSession, isSessionActive, sessionEndsAt } from "@/lib/priorities/session";
import { contextLabel } from "@/lib/projects/organize";
import { getContextLookup } from "@/lib/projects/queries";
import { TASK_COLUMNS, taskRowSchema } from "@/lib/tasks/schemas";
import { todayIn } from "@/lib/dates";
import type { ActiveSession, SessionChoice, SessionProposal } from "@/types/session";
import type { Task, TaskSummary } from "@/types/task";
import { sessionRowSchema } from "./schemas";

const taskRows = z.array(taskRowSchema);
const linkRows = z.array(z.object({ task_id: z.string(), position: z.number().int() }));

function toSummary(task: Task, context: string | null): TaskSummary {
  return { id: task.id, title: task.title, context, estimatedMinutes: task.estimatedMinutes, dueDate: task.dueDate };
}

/** Proposta calculada na hora — nada é salvo até "Começar". */
export async function getSessionProposal(choice: SessionChoice, skipped: string[]): Promise<SessionProposal> {
  const { supabase } = await requireUser();
  const [{ data, error }, lookup] = await Promise.all([
    supabase.from("tasks").select(TASK_COLUMNS).in("status", ["INBOX", "TODO", "IN_PROGRESS"]),
    getContextLookup(),
  ]);
  if (error) throw error;

  const plan = buildSession(taskRows.parse(data), { ...choice, today: todayIn(), skip: new Set(skipped) });
  return {
    ...choice,
    tasks: plan.tasks.map((t) => toSummary(t, contextLabel(t, lookup))),
    plannedMinutes: plan.plannedMinutes,
    skipped,
  };
}

/** A sessão aberta mais recente, se ainda estiver valendo. */
export async function getActiveSession(): Promise<ActiveSession | null> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("sessions")
    .select("id, started_at, ended_at, available_minutes, energy_level")
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const session = sessionRowSchema.parse(data);
  if (!isSessionActive(session, new Date())) return null;

  const { data: links, error: linksError } = await supabase
    .from("session_tasks")
    .select("task_id, position")
    .eq("session_id", session.id)
    .order("position");
  if (linksError) throw linksError;
  const ordered = linkRows.parse(links).map((l) => l.task_id);

  const [{ data: tasks, error: tasksError }, lookup] = await Promise.all([
    supabase.from("tasks").select(TASK_COLUMNS).in("id", ordered),
    getContextLookup(),
  ]);
  if (tasksError) throw tasksError;
  const byId = new Map(taskRows.parse(tasks).map((t) => [t.id, t]));

  return {
    id: session.id,
    availableMinutes: session.availableMinutes,
    energy: session.energy,
    endsAt: sessionEndsAt(session).toISOString(),
    tasks: ordered
      .map((id) => byId.get(id))
      .filter((t): t is Task => t !== undefined && t.status !== "ARCHIVED")
      .map((t) => ({ ...toSummary(t, contextLabel(t, lookup)), status: t.status })),
  };
}
