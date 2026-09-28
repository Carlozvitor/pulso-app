"use client";

import { useEffect } from "react";

// Registra o service worker só em produção — em dev ele atrapalha o hot reload.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {
        // Sem SW o app continua funcionando normalmente; só não fica instalável offline.
      });
  }, []);

  return null;
}
