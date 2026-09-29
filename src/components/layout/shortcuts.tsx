"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CAPTURE_EVENT } from "@/components/tasks/capture-feedback";

/** Digitando em campo de texto, atalho de uma tecla não vale. */
function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

/**
 * Atalhos de teclado do app:
 * N → capturar · / → buscar
 */
export function Shortcuts() {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;

      if (event.key === "n" || event.key === "N") {
        event.preventDefault();
        window.dispatchEvent(new Event(CAPTURE_EVENT));
      } else if (event.key === "/") {
        event.preventDefault();
        const box = document.getElementById("busca");
        // Campo de busca visível na tela? Foca nele; senão vai para a busca.
        if (box instanceof HTMLInputElement && box.offsetParent !== null) box.focus();
        else router.push("/busca");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return null;
}
