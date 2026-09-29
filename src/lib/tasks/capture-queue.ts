import { z } from "zod";

/**
 * Capturas guardadas no aparelho até chegarem no servidor (entram em A fazer).
 * public/offline.html grava nesta mesma chave e formato — mudar os dois juntos.
 */
export const CAPTURE_QUEUE_KEY = "pulso:capturas-pendentes";

export type PendingCapture = { id: string; title: string; capturedAt: string };

const itemSchema = z.object({ id: z.string(), title: z.string(), capturedAt: z.string() });

/** Lê a fila sem nunca quebrar: item estragado é ignorado, o resto continua. */
export function parseQueue(raw: string | null | undefined): PendingCapture[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  return data.flatMap((item) => {
    const parsed = itemSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

export function withCapture(queue: PendingCapture[], capture: PendingCapture): PendingCapture[] {
  return queue.some((c) => c.id === capture.id) ? queue : [...queue, capture];
}

export function withoutCapture(queue: PendingCapture[], id: string): PendingCapture[] {
  return queue.filter((c) => c.id !== id);
}

export function newCapture(title: string, now = new Date(), makeId = uuid): PendingCapture {
  return { id: makeId(), title: title.trim(), capturedAt: now.toISOString() };
}

/**
 * UUID v4. `crypto.randomUUID` só existe em contexto seguro (https/localhost) —
 * o teste no celular pela rede local (http://192.168.…) não é.
 */
export function uuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
