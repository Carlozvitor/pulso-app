"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { Area } from "@/types/project";
import { activeOrigins, indexOrigins, originFullLabel } from "@/lib/origins/tree";
import { cn } from "@/lib/utils";
import { OriginPicker } from "./origin-picker";

/** Linha "Origem": mostra o caminho completo e abre a árvore para trocar. */
export function OriginField({
  labelId,
  areas,
  value,
  onChange,
  pickerTitle,
}: {
  labelId: string;
  areas: Area[];
  value: string | null;
  onChange: (id: string | null) => void;
  pickerTitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const label = value ? originFullLabel(value, indexOrigins(areas)) : null;

  return (
    <>
      <button
        type="button"
        aria-labelledby={`${labelId} ${labelId}-value`}
        onClick={() => setOpen(true)}
        className="-mx-4 -my-2 flex min-h-12 items-center justify-between gap-4 px-4 text-left transition-colors duration-(--duration-fast) hover:bg-elevated/60 active:bg-elevated"
      >
        <span id={`${labelId}-value`} className={cn("truncate text-body", label ? "text-foreground" : "text-foreground-subtle")}>
          {label ?? "Sem origem"}
        </span>
        <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-ui" />
      </button>
      <OriginPicker
        open={open}
        onOpenChange={setOpen}
        // Disciplina encerrada não aparece para escolher (a atual continua, para não sumir).
        areas={activeOrigins(areas, value)}
        selectedId={value}
        title={pickerTitle}
        onChoose={(id) => {
          setOpen(false);
          if (id !== value) onChange(id);
        }}
      />
    </>
  );
}
