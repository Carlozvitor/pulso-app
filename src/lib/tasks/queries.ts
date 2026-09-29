import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { buildAgoraView } from "@/lib/priorities/agora";
import { todayIn } from "@/lib/dates";
import { contextLabel } from "@/lib/projects/organize";
import { getContextLookup } from "@/lib/projects/queries";
import type { AgoraView, Task, TaskWithContext } from "@/types/task";
import { agendaDays, type DayGroup } from "./agenda";
import { groupDoneByDay, type DoneDay } from "./done";
import { todoSections, type TodoSections } from "./todo";
import { searchTerm } from "./format";
import { TASK_COLUMNS, taskIdSchema, taskRowSchema } from "./schemas";

const taskRows = z.array(taskRowSchema);
const OPEN_STATUSES = ["INBOX", "TODO", "IN_PROGRESS"] as const;

export async function listInbox(): Promise<TaskWithContext[]> {
  const { supabase } = await requireUser();
  const [{ data, error }, lookup] = await Promise.all([
    supabase.from("tasks").select(TASK_COLUMNS).eq("status", "INBOX").order("created_at", { ascending: false }),
    getContextLookup(),
  ]);
  if (error) throw error;
  return taskRows.parse(data).map((t) => ({ ...t, context: contextLabel(t, lookup) }));
}

export async function getTask(id: string): Promise<Task | null> {
  if (!taskIdSchema.safeParse(id).success) return null;
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("tasks").select(TASK_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? taskRowSchema.parse(data) : null;
}

/** Tudo que está aberto — volume pessoal, o ranking é feito em memória. */
export async function listOpenTasks(): Promise<Task[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("tasks").select(TASK_COLUMNS).in("status", OPEN_STATUSES);
  if (error) throw error;
  return taskRows.parse(data);
}

/** `areaId`: filtro por área (a área da tarefa já vem do projeto, pelo banco). */
export async function getAgoraView(areaId?: string | null): Promise<AgoraView> {
  const [tasks, lookup] = await Promise.all([listOpenTasks(), getContextLookup()]);
  return buildAgoraView(
    tasks.filter((t) => !areaId || t.areaId === areaId),
    todayIn(),
    (t: Task) => contextLabel(t, lookup),
  );
}

/** Agenda: tudo que está aberto e tem prazo, por dia. */
export async function listAgenda(): Promise<DayGroup[]> {
  const { supabase } = await requireUser();
  const [{ data, error }, lookup] = await Promise.all([
    supabase.from("tasks").select(TASK_COLUMNS).in("status", OPEN_STATUSES).not("due_date", "is", null),
    getContextLookup(),
  ]);
  if (error) throw error;
  return agendaDays(taskRows.parse(data), todayIn(), (t) => contextLabel(t, lookup));
}

/** Busca no título e na descrição. Arquivadas ficam de fora; abertas antes das concluídas. */
export async function searchTasks(query: string): Promise<TaskWithContext[]> {
  const term = searchTerm(query);
  if (!term) return [];
  const { supabase } = await requireUser();
  const [{ data, error }, lookup] = await Promise.all([
    supabase
      .from("tasks")
      .select(TASK_COLUMNS)
      .neq("status", "ARCHIVED")
      .or(`title.ilike.%${term}%,description.ilike.%${term}%`)
      .order("updated_at", { ascending: false })
      .limit(40),
    getContextLookup(),
  ]);
  if (error) throw error;
  const rank = (t: Task) => (t.status === "DONE" ? 1 : 0);
  return taskRows
    .parse(data)
    .sort((a, b) => rank(a) - rank(b))
    .map((t) => ({ ...t, context: contextLabel(t, lookup) }));
}

/** Tela A fazer: tudo que está para fazer, em blocos. */
export async function listTodo(): Promise<TodoSections> {
  const { supabase } = await requireUser();
  const [{ data, error }, lookup] = await Promise.all([
    supabase.from("tasks").select(TASK_COLUMNS).in("status", ["TODO", "IN_PROGRESS"]),
    getContextLookup(),
  ]);
  if (error) throw error;
  return todoSections(taskRows.parse(data), todayIn(), (t) => contextLabel(t, lookup));
}

/** Quantas tarefas em A fazer (contador da barra lateral). */
export async function countTodo(): Promise<number> {
  const { supabase } = await requireUser();
  const { count, error } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .in("status", ["TODO", "IN_PROGRESS"]);
  if (error) throw error;
  return count ?? 0;
}

/** Quantas concluídas a tela Feitas mostra (as mais recentes). */
export const DONE_LIMIT = 150;

/** Feitas: as últimas concluídas, por dia de conclusão. */
export async function listDone(): Promise<DoneDay[]> {
  const { supabase } = await requireUser();
  const [{ data, error }, lookup] = await Promise.all([
    supabase
      .from("tasks")
      .select(TASK_COLUMNS)
      .eq("status", "DONE")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(DONE_LIMIT),
    getContextLookup(),
  ]);
  if (error) throw error;
  return groupDoneByDay(taskRows.parse(data), todayIn(), (t) => contextLabel(t, lookup));
}

/** Quantos itens na Inbox (contador da barra lateral). */
export async function countInbox(): Promise<number> {
  const { supabase } = await requireUser();
  const { count, error } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("status", "INBOX");
  if (error) throw error;
  return count ?? 0;
}

/** Quantas tarefas abertas (para o resumo do topo). */
export async function countOpenTasks(): Promise<number> {
  const { supabase } = await requireUser();
  const { count, error } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .in("status", OPEN_STATUSES);
  if (error) throw error;
  return count ?? 0;
}
