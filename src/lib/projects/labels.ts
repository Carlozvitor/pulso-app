import { datePill, dayTitle, daysBetween, dueLabel, shortDate, todayIn } from "@/lib/dates";
import type { Project } from "@/types/project";

/** Até quantos dias o prazo fica em destaque (âmbar) no card. */
const SOON_DAYS = 14;

/**
 * Prazo do projeto no card, sem cor de alerta para o que passou:
 * "prazo qua, 15 out" + "em 14 dias" · "prazo ter, 30 set" + "hoje" · "Era pra 3 out" · "sem prazo".
 * `soon`: até 14 dias — a nota ganha destaque.
 */
export function projectDue(dueDate: string | null, today: string): { label: string; note: string | null; soon: boolean } {
  if (!dueDate) return { label: "sem prazo", note: null, soon: false };
  const diff = daysBetween(today, dueDate);
  if (diff < 0) return { label: dueLabel(dueDate, today), note: null, soon: false };
  const note = diff === 0 ? "hoje" : diff === 1 ? "amanhã" : `em ${diff} dias`;
  return { label: `prazo ${datePill(dueDate).toLowerCase()}`, note, soon: diff <= SOON_DAYS };
}

/** Prazo grande na página do projeto: "Quarta, 15 out" + "em 14 dias" · "Segunda, 28 set" + "já passou". */
export function projectDueTitle(dueDate: string, today: string): { title: string; note: string } {
  const diff = daysBetween(today, dueDate);
  if (diff < 0) return { title: dayTitle(dueDate, today), note: "já passou" };
  if (diff === 0) return { title: "Hoje", note: "é hoje" };
  if (diff === 1) return { title: "Amanhã", note: "é amanhã" };
  return { title: dayTitle(dueDate, today), note: `em ${diff} dias` };
}

/** "Pausado desde 12 set" · "Concluído em 3 out" · "Arquivado em 3 out" · "desde 3 set". */
export function projectSince(project: Pick<Project, "status" | "pausedAt" | "completedAt" | "createdAt">): string {
  const day = (iso: string) => shortDate(todayIn(new Date(iso)));
  switch (project.status) {
    case "PAUSED":
      return project.pausedAt ? `Pausado desde ${day(project.pausedAt)}` : "Pausado";
    case "DONE":
      return project.completedAt ? `Concluído em ${day(project.completedAt)}` : "Concluído";
    case "ARCHIVED":
      return project.completedAt ? `Arquivado em ${day(project.completedAt)}` : "Arquivado";
    default:
      return `desde ${day(project.createdAt)}`;
  }
}

/** "5 de 12 ações" · "1 ação" · "Nenhuma ação ainda". */
export function actionsCount(done: number, total: number): string {
  if (total === 0) return "Nenhuma ação ainda";
  return `${done} de ${total} ${total === 1 ? "ação" : "ações"}`;
}
