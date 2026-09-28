import type { AgoraView } from "@/types/task";

// Dados de exemplo da Fase 2 (só visual). Saem na Fase 3, quando a Agora
// passa a ler do Supabase e na Fase 5, quando o motor de prioridade assume.
export const SAMPLE_AGORA: AgoraView = {
  pendingCount: 8,
  now: { id: "demo-1", title: "Responder cliente", context: "Valentine", estimatedMinutes: 10 },
  next: [
    { id: "demo-2", title: "Lançar contas da Valentine", context: "Valentine", estimatedMinutes: 25 },
    { id: "demo-3", title: "Estudar Marketing", context: "Faculdade", estimatedMinutes: 40 },
  ],
  later: [{ id: "demo-4", title: "Organizar portfólio", context: "Portfólio", estimatedMinutes: 60 }],
};

export const EMPTY_AGORA: AgoraView = { pendingCount: 0, now: null, next: [], later: [] };
