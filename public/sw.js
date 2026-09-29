// Service worker do PULSO.
// Fase 1: ciclo de vida para o app ser instalável.
// Fase 8: sem conexão, abrir o app mostra /offline.html (dá para capturar lá) em vez da tela de erro do navegador.
// Dados continuam SEM cache — cachear cedo demais gera dados velhos na tela.

const CACHE = "pulso-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      // Navegação começa em paralelo com o boot do SW: sem custo extra de tempo online.
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return; // só abertura de página; o resto segue direto para a rede

  event.respondWith(
    (async () => {
      try {
        const preloaded = await event.preloadResponse;
        return preloaded || (await fetch(event.request));
      } catch {
        const offline = await caches.match(OFFLINE_URL);
        return offline || Response.error();
      }
    })(),
  );
});
