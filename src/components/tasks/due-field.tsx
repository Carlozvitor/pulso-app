"use client";

import { addDays, dueLabel, endOfWeek } from "@/lib/dates";
import { AttributeRow } from "./attribute-row";
import { ChipGroup, chipClass } from "./chip-group";

/** Prazo: Hoje · Amanhã · Esta semana · Outra data. Usado em tarefa e projeto. */
export function DueField({
  today,
  value,
  onChange,
}: {
  today: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const quick = [
    { value: today, label: "Hoje" },
    { value: addDays(today, 1), label: "Amanhã" },
    { value: endOfWeek(today), label: "Esta semana" },
  ].filter((o, i, all) => all.findIndex((x) => x.value === o.value) === i); // domingo: "esta semana" = hoje
  const custom = value !== null && !quick.some((o) => o.value === value);

  return (
    <AttributeRow id="due-label" label="Prazo" onClear={value ? () => onChange(null) : undefined}>
      <ChipGroup labelId="due-label" options={quick} value={custom ? null : value} onChange={onChange}>
        {/* Input de data nativo por cima do chip: abre o seletor do sistema no toque. */}
        <label className={`${chipClass(custom)} relative`}>
          {custom ? dueLabel(value, today) : "Outra data"}
          <input
            type="date"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            aria-label="Escolher data do prazo"
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
      </ChipGroup>
    </AttributeRow>
  );
}
