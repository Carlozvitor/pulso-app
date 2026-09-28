import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { buildAgoraView } from "@/lib/priorities/agora";
import { todayIn } from "@/lib/dates";
import type { AgoraView, Task } from "@/types/task";
import { TASK_COLUMNS, taskIdSchema, taskRowSchema } from "./schemas";

const taskRows = z.array(taskRowSchema);

export async function listInbox(): Promise<Task[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_COLUMNS)
    .eq("status", "INBOX")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return taskRows.parse(data);
}

export async function getTask(id: string): Promise<Task | null> {
  if (!taskIdSchema.safeParse(id).success) return null;
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("tasks").select(TASK_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? taskRowSchema.parse(data) : null;
}

/** Tudo que está aberto — volume pessoal, o ranking é feito em memória. */
export async function getAgoraView(): Promise<AgoraView> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_COLUMNS)
    .in("status", ["INBOX", "TODO", "IN_PROGRESS"]);
  if (error) throw error;
  return buildAgoraView(taskRows.parse(data), todayIn());
}
