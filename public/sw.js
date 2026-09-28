// Service worker mínimo do PULSO (Fase 1).
// Só garante o ciclo de vida para o app ser instalável.
// Cache offline fica para a Fase 9 — cachear cedo demais gera dados velhos na tela.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
