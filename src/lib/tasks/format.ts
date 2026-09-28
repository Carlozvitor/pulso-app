/** 10 → "10 min" · 60 → "1 h" · 90 → "1 h 30" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m}`;
}

/** Frase neutra de contagem — sem tom de cobrança. */
export function pendingLabel(count: number): string | null {
  if (count <= 0) return null;
  return count === 1 ? "Você tem 1 pendência." : `Você tem ${count} pendências.`;
}

/** Contagem da Inbox — informa, sem virar obrigação. */
export function inboxLabel(count: number): string | null {
  if (count <= 0) return null;
  return count === 1 ? "Você possui 1 item para organizar." : `Você possui ${count} itens para organizar.`;
}
