import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { addDays, todayIn } from "@/lib/dates";
import { contextLabel } from "@/lib/projects/organize";
import { getContextLookup, listAreas } from "@/lib/projects/queries";
import { areaLinkRowSchema, idSchema } from "@/lib/projects/schemas";
import { TASK_COLUMNS, taskRowSchema } from "@/lib/tasks/schemas";
import { listOpenTasks } from "@/lib/tasks/queries";
import type { Area, AreaLink, ModuleKey } from "@/types/project";
import type { Task } from "@/types/task";
import { doneRecently, openCounts, originActions, summarizeFronts, type FrontSummary, type OriginCount, type OriginTask } from "./summary";
import { canDeleteOrigin, descendantIds, indexOrigins, moveTargets, originPath } from "./tree";

const taskRows = z.array(taskRowSchema);
const linkRows = z.array(areaLinkRowSchema);
const notesRow = z.object({ notes: z.string().nullable(), notes_updated_at: z.string().nullable() });

/** Quantas ações aparecem na página do módulo (o resto está na Agora, filtrada pelo módulo). */
const ACTIONS_ON_MODULE = 8;

export type ModulePage = {
  root: Area;
  fronts: FrontSummary[];
  actions: OriginTask[];
  /** Abertas no módulo inteiro. */
  open: number;
  today: string;
};

export async function getModulePage(module: ModuleKey): Promise<ModulePage | null> {
  const [areas, tasks, lookup] = await Promise.all([listAreas(), listOpenTasks(), getContextLookup()]);
  const root = areas.find((a) => a.module === module && a.parentId === null);
  if (!root) return null;
  const today = todayIn();
  // Dentro do módulo, o rótulo não repete o nome dele: "Valentine → Conteúdo".
  const contextOf = (t: Task) => contextLabel(t, lookup, root.id);
  const actions = originActions(root.id, areas, tasks, today, contextOf);
  return {
    root,
    fronts: summarizeFronts(root.id, areas, tasks, today, contextOf),
    actions: actions.slice(0, ACTIONS_ON_MODULE),
    open: actions.length,
    today,
  };
}

export type OriginPage = {
  node: Area;
  /** Do módulo até o item. */
  path: Area[];
  children: OriginCount[];
  notes: string | null;
  notesUpdatedAt: string | null;
  links: AreaLink[];
  actions: OriginTask[];
  doneLastWeek: number;
  /** A árvore do módulo sem o próprio item e o que está abaixo dele — para escolher o novo lugar. */
  movable: Area[];
  canMove: boolean;
  canDelete: boolean;
  today: string;
};

export async function getOriginPage(id: string): Promise<OriginPage | null> {
  if (!idSchema.safeParse(id).success) return null;
  const { supabase } = await requireUser();
  const since = new Date(`${addDays(todayIn(), -8)}T00:00:00Z`).toISOString();
  const [areas, open, lookup, notes, links, done] = await Promise.all([
    listAreas(),
    listOpenTasks(),
    getContextLookup(),
    supabase.from("areas").select("notes, notes_updated_at").eq("id", id).maybeSingle(),
    supabase.from("area_links").select("id, title, url").eq("area_id", id).order("created_at"),
    supabase.from("tasks").select(TASK_COLUMNS).eq("status", "DONE").gte("completed_at", since),
  ]);
  if (notes.error) throw notes.error;
  if (links.error) throw links.error;
  if (done.error) throw done.error;

  const node = areas.find((a) => a.id === id);
  if (!node || !notes.data) return null;

  const today = todayIn();
  const index = indexOrigins(areas);
  const counts = openCounts(areas, open);
  // Na página do item, o rótulo mostra só o que está abaixo dele ("Instagram").
  const contextOf = (t: Task) => contextLabel(t, lookup, node.id);
  const { notes: text, notes_updated_at } = notesRow.parse(notes.data);
  const ownSubtree = descendantIds(node.id, areas);

  return {
    node,
    path: originPath(node.id, index),
    children: areas
      .filter((a) => a.parentId === node.id)
      .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, "pt-BR"))
      .map((child) => ({ node: child, open: counts.get(child.id) ?? 0 })),
    notes: text,
    notesUpdatedAt: notes_updated_at,
    links: linkRows.parse(links.data),
    actions: originActions(node.id, areas, open, today, contextOf),
    doneLastWeek: doneRecently(node.id, areas, taskRows.parse(done.data), today),
    movable: areas.filter((a) => a.module === node.module && !ownSubtree.has(a.id)),
    canMove: moveTargets(node.id, areas).length > 0,
    canDelete: canDeleteOrigin(node.id, areas),
    today,
  };
}

/** Barra lateral: a árvore de um módulo com as abertas de cada item. */
export async function getModuleNav(module: ModuleKey): Promise<{ areas: Area[]; counts: Map<string, number> }> {
  const [areas, open] = await Promise.all([listAreas(), listOpenTasks()]);
  const inModule = areas.filter((a) => a.module === module);
  return { areas: inModule, counts: openCounts(inModule, open) };
}
