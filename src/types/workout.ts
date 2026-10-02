/** Carga (séries × repetições · kg) · Peso do corpo (séries × repetições) · Tempo (minutos). */
export const EXERCISE_KINDS = ["LOAD", "BODYWEIGHT", "TIME"] as const;
export type ExerciseKind = (typeof EXERCISE_KINDS)[number];

/** Um exercício do catálogo. O mesmo exercício em vários treinos soma uma evolução só. */
export type WorkoutExercise = {
  id: string;
  name: string;
  kind: ExerciseKind;
  /** Meta na unidade do tipo: kg (Carga), repetições (Peso do corpo) ou minutos (Tempo). */
  goal: number | null;
  /** Guardado: sai da lista de escolha; o histórico fica. */
  archivedAt: string | null;
  createdAt: string;
};

/** Ficha (opcional): um treino que se repete, com os exercícios em ordem. */
export type WorkoutPlan = {
  id: string;
  name: string;
  /** Ordem do rodízio (A → B → C). */
  position: number;
  createdAt: string;
};

export type WorkoutPlanItem = {
  id: string;
  planId: string;
  exerciseId: string;
  position: number;
};

/** Um treino feito (ou em andamento). */
export type WorkoutSession = {
  id: string;
  /** YYYY-MM-DD, no fuso do Carlos. */
  date: string;
  /** Ficha usada (para o rodízio). */
  planId: string | null;
  startedAt: string;
  /** null = em andamento. */
  finishedAt: string | null;
};

/** Os números de um exercício num treino. Cada tipo usa os seus. */
export type EntryValues = {
  sets: number | null;
  reps: number | null;
  loadKg: number | null;
  minutes: number | null;
};

/** Um exercício num treino: uma linha só (4 × 10 · 40 kg). */
export type WorkoutEntry = EntryValues & {
  id: string;
  sessionId: string;
  exerciseId: string;
  position: number;
  /** Marcado como feito. Só os feitos contam. */
  done: boolean;
  createdAt: string;
};

/** Tudo do Treino (volume pessoal: alguns treinos por semana). */
export type WorkoutData = {
  exercises: WorkoutExercise[];
  plans: WorkoutPlan[];
  planItems: WorkoutPlanItem[];
  sessions: WorkoutSession[];
  entries: WorkoutEntry[];
  /** Treinos por semana (segunda a domingo); null = sem meta. */
  weeklyGoal: number | null;
};
