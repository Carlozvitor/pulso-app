export const ASSESSMENT_KINDS = ["TRABALHO", "PROVA", "ATIVIDADE"] as const;
export type AssessmentKind = (typeof ASSESSMENT_KINDS)[number];

/**
 * Avaliação da Faculdade: contexto, não tarefa. O que precisa ser feito para ela vira ação
 * no PULSO (ligada pela `assessmentId` da tarefa).
 */
export type Assessment = {
  id: string;
  /** A disciplina (origem dentro de Faculdade). */
  areaId: string;
  kind: AssessmentKind;
  title: string;
  /** YYYY-MM-DD; sem data fica na disciplina, fora da agenda. */
  dueDate: string | null;
  /** "19:00"; só com data. */
  dueTime: string | null;
  location: string | null;
  /** Quanto vale. */
  maxGrade: number | null;
  grade: number | null;
  notes: string | null;
  /** Trabalho/atividade entregue. Prova não usa: passa sozinha depois do dia. */
  doneAt: string | null;
  createdAt: string;
};

/** Aberta · era pra (trabalho/atividade que passou do dia sem entregar) · feita. */
export type AssessmentState = "open" | "late" | "done";
