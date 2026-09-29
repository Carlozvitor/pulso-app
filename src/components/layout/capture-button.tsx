"use client";

import { Plus } from "lucide-react";
import { CAPTURE_EVENT } from "@/components/tasks/capture-feedback";

/** "Capturar" do topo — o mesmo que apertar N. */
export function CaptureButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(CAPTURE_EVENT))}
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#555b8a] bg-[#3a3f63] px-3 text-[0.8125rem] font-medium text-foreground transition-colors duration-(--duration-fast) hover:bg-[#444a73]"
    >
      <Plus aria-hidden className="size-4" strokeWidth={2} />
      Capturar
      <kbd className="rounded-[5px] border border-white/15 bg-white/10 px-1.5 font-mono text-[0.6875rem] font-semibold text-foreground-secondary">
        N
      </kbd>
    </button>
  );
}
