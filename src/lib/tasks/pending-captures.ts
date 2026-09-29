import { useMemo, useSyncExternalStore } from "react";
import { OFFLINE_ERROR, resilient } from "@/lib/actions/resilient";
import { captureTask } from "./actions";
import {
  CAPTURE_QUEUE_KEY,
  newCapture,
  parseQueue,
  withCapture,
  withoutCapture,
  type PendingCapture,
} from "./capture-queue";

/*
 * Toda captura do + passa por aqui: primeiro fica guardada no aparelho (localStorage),
 * depois vai para o servidor. Só sai da fila quando o servidor confirma — assim nada
 * se perde se a internet cair, o app fechar ou a sessão expirar no meio do caminho.
 * Só roda no navegador.
 */

const send = resilient(captureTask);
const listeners = new Set<() => void>();

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null; // navegador bloqueando armazenamento: segue sem fila
  }
}

function readRaw(): string {
  try {
    return storage()?.getItem(CAPTURE_QUEUE_KEY) ?? "";
  } catch {
    return "";
  }
}

function read(): PendingCapture[] {
  return parseQueue(readRaw());
}

function write(queue: PendingCapture[]): boolean {
  try {
    const store = storage();
    if (!store) return false;
    if (queue.length === 0) store.removeItem(CAPTURE_QUEUE_KEY);
    else store.setItem(CAPTURE_QUEUE_KEY, JSON.stringify(queue));
    return true;
  } catch {
    return false;
  } finally {
    listeners.forEach((listener) => listener());
  }
}

function remove(id: string) {
  write(withoutCapture(read(), id));
}

const offline = () => navigator.onLine === false;

type SendOutcome = { sent: true } | { sent: false; error: string; keep: boolean };

async function sendOne(capture: PendingCapture): Promise<SendOutcome> {
  try {
    const result = await send(capture);
    if (result.ok) {
      remove(capture.id);
      return { sent: true };
    }
    if (!result.retry) remove(capture.id); // dado inválido: tentar de novo não adianta
    return { sent: false, error: result.error, keep: Boolean(result.retry) };
  } catch {
    // Sessão expirou: o Next já está levando para o login. A captura fica guardada.
    return { sent: false, error: OFFLINE_ERROR, keep: true };
  }
}

export type CaptureOutcome =
  | { status: "sent" }
  /** Ficou guardada no aparelho; vai sozinha quando der. */
  | { status: "queued" }
  | { status: "failed"; error: string };

export async function captureSoon(title: string): Promise<CaptureOutcome> {
  const capture = newCapture(title);
  const stored = write(withCapture(read(), capture));

  if (offline()) return stored ? { status: "queued" } : { status: "failed", error: OFFLINE_ERROR };

  const outcome = await sendOne(capture);
  if (outcome.sent) return { status: "sent" };
  if (outcome.keep && stored) return { status: "queued" };
  return { status: "failed", error: outcome.error };
}

let flushing: Promise<number> | null = null;

/** Manda o que ficou guardado, em ordem. Devolve quantas chegaram no servidor. */
export function flushCaptures(): Promise<number> {
  flushing ??= (async () => {
    let sent = 0;
    for (const capture of read()) {
      if (offline()) break;
      const outcome = await sendOne(capture);
      if (outcome.sent) sent += 1;
      else if (outcome.keep) break; // sem rede ou servidor fora: tenta tudo de novo depois
    }
    return sent;
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Outra aba ou a página offline também gravam na fila.
  const onStorage = (event: StorageEvent) => {
    if (event.key === CAPTURE_QUEUE_KEY || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Capturas ainda no aparelho (para mostrar em A fazer e na barra de captura). */
export function usePendingCaptures(): PendingCapture[] {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "");
  return useMemo(() => parseQueue(raw), [raw]);
}
