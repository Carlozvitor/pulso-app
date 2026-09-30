import type { Assessment, AssessmentKind, AssessmentState } from "@/types/assessment";
import { addDays, dueLabel } from "@/lib/dates";

export const KIND_LABEL: Record<AssessmentKind, string> = {
  TRABALHO: "Trabalho",
  PROVA: "Prova",
  ATIVIDADE: "Atividade",
};

/** Palavra que abre a avaliação na agenda e na Central: "Prova · AV1", "Entrega · Trabalho final". */
const AGENDA_PREFIX: Record<AssessmentKind, string> = {
  TRABALHO: "Entrega",
  PROVA: "Prova",
  ATIVIDADE: "Atividade",
};

/** Quantos dias à frente uma avaliação vira "próxima atenção" (barra lateral, card da Central). */
export const ATTENTION_DAYS = 7;

type Dated = Pick<Assessment, "kind" | "dueDate" | "doneAt">;

/**
 * Estado num dia. Entregue = feita. Prova passa sozinha depois do dia (vira feita);
 * trabalho e atividade ficam em "era pra …" até serem entregues. Sem data, sempre aberta.
 */
export function assessmentState(a: Dated, today: string): AssessmentState {
  if (a.doneAt) return "done";
  if (!a.dueDate || a.dueDate >= today) return "open";
  return a.kind === "PROVA" ? "done" : "late";
}

export function isPending(a: Dated, today: string): boolean {
  return assessmentState(a, today) !== "done";
}

type Sortable = Pick<Assessment, "dueDate" | "dueTime" | "title">;

/** Data mais cedo primeiro (sem data no fim); no mesmo dia, pelo horário (sem horário depois); depois o título. */
export function compareByDate(a: Sortable, b: Sortable): number {
  if (a.dueDate !== b.dueDate) {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate < b.dueDate ? -1 : 1;
  }
  if (a.dueTime !== b.dueTime) {
    if (!a.dueTime) return 1;
    if (!b.dueTime) return -1;
    return a.dueTime < b.dueTime ? -1 : 1;
  }
  return a.title.localeCompare(b.title, "pt-BR");
}

/** Abertas e "era pra", por data. */
export function pendingAssessments<A extends Assessment>(list: A[], today: string): A[] {
  return list.filter((a) => isPending(a, today)).sort(compareByDate);
}

/** Feitas, da mais recente para a mais antiga (pela data; sem data, pela entrega). */
export function doneAssessments<A extends Assessment>(list: A[], today: string): A[] {
  const when = (a: Assessment) => a.dueDate ?? a.doneAt?.slice(0, 10) ?? a.createdAt.slice(0, 10);
  return list.filter((a) => assessmentState(a, today) === "done").sort((a, b) => when(b).localeCompare(when(a)) || compareByDate(a, b));
}

/** A próxima que merece atenção: a primeira pendente com data até `days` dias (inclui "era pra"). */
export function nextAttention<A extends Assessment>(list: A[], today: string, days = ATTENTION_DAYS): A | null {
  const horizon = addDays(today, days);
  return pendingAssessments(list, today).find((a) => a.dueDate !== null && a.dueDate <= horizon) ?? null;
}

/**
 * Frase curta da próxima avaliação: "Prova amanhã · 19:00" · "Trabalho sexta" ·
 * "Lista 3 · era pra ontem" (o que passou do dia leva o nome, sem cobrança).
 */
export function attentionLabel(a: Assessment, today: string): string {
  if (!a.dueDate) return `${KIND_LABEL[a.kind]} sem data`;
  const due = dueLabel(a.dueDate, today).toLocaleLowerCase("pt-BR");
  if (assessmentState(a, today) === "late") return `${a.title} · ${due}`;
  const base = `${KIND_LABEL[a.kind]} ${due}`;
  return a.dueTime ? `${base} · ${a.dueTime}` : base;
}

/** "Prova · AV1" · "Entrega · Trabalho final"; sem repetir quando o título já começa com a palavra. */
export function agendaTitle(a: Pick<Assessment, "kind" | "title">): string {
  const prefix = AGENDA_PREFIX[a.kind];
  const first = a.title.trim().split(/\s+/)[0] ?? "";
  return first.toLocaleLowerCase("pt-BR") === prefix.toLocaleLowerCase("pt-BR") ? a.title : `${prefix} · ${a.title}`;
}

/** Botão de entrega; prova não tem (passa sozinha depois do dia). */
export function finishLabel(kind: AssessmentKind): string | null {
  if (kind === "PROVA") return null;
  return kind === "TRABALHO" ? "Marcar como entregue" : "Marcar como feita";
}

/** "Entregue" / "Feita" — para o que já foi. */
export function finishedLabel(kind: AssessmentKind): string {
  return kind === "TRABALHO" ? "Entregue" : "Feita";
}

/** 8.5 → "8,5"; 10 → "10"; até duas casas. */
export function formatGrade(value: number): string {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 2, useGrouping: false });
}

/** "8,5 de 10" · "8,5" · null (sem nota). */
export function gradeLabel(a: Pick<Assessment, "grade" | "maxGrade">): string | null {
  if (a.grade === null) return null;
  return a.maxGrade !== null ? `${formatGrade(a.grade)} de ${formatGrade(a.maxGrade)}` : formatGrade(a.grade);
}

/** Texto do campo de nota → número. Vazio = null; inválido = undefined. Aceita vírgula ou ponto. */
export function parseGrade(text: string): number | null | undefined {
  const value = text.trim().replace(",", ".");
  if (!value) return null;
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(value)) return undefined;
  const n = Number(value);
  return n <= 1000 ? n : undefined;
}

/** Página da disciplina com a gaveta da avaliação aberta. */
export function assessmentHref(a: Pick<Assessment, "id" | "areaId">): string {
  return `/faculdade/${a.areaId}?avaliacao=${a.id}`;
}

/** Uma avaliação na agenda ou na Central: já com o título da agenda e o nome da disciplina. */
export type AgendaAssessment = {
  id: string;
  areaId: string;
  kind: AssessmentKind;
  /** "Prova · AV1" */
  title: string;
  /** YYYY-MM-DD */
  dueDate: string;
  time: string | null;
  location: string | null;
  /** Disciplina ("Marketing Digital"). */
  context: string | null;
  state: AssessmentState;
};

export function toAgendaAssessment(
  a: Assessment & { dueDate: string },
  today: string,
  areaLabel: (areaId: string | null) => string | null = () => null,
): AgendaAssessment {
  return {
    id: a.id,
    areaId: a.areaId,
    kind: a.kind,
    title: agendaTitle(a),
    dueDate: a.dueDate,
    time: a.dueTime,
    location: a.location,
    context: areaLabel(a.areaId),
    state: assessmentState(a, today),
  };
}
