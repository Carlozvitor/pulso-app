"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Energy } from "@/types/task";
import { Button } from "@/components/ui/button";
import { AttributeRow } from "@/components/tasks/attribute-row";
import { ChipGroup, chipClass } from "@/components/tasks/chip-group";
import { formatDuration } from "@/lib/tasks/format";
import { MINUTES_RANGE, SESSION_ENERGY_LABEL, SESSION_PRESETS, proposalHref } from "@/lib/sessions/schemas";

const minuteOptions = SESSION_PRESETS.map((value) => ({ value, label: formatDuration(value) }));
const energyOptions = (["LOW", "MEDIUM", "HIGH"] as Energy[]).map((value) => ({
  value,
  label: SESSION_ENERGY_LABEL[value],
}));

/** Duas escolhas e um botão. O PULSO decide o resto. */
export function SessionPicker({ initial }: { initial?: { minutes: number; energy: Energy } }) {
  const router = useRouter();
  const [minutes, setMinutes] = useState<number | null>(initial?.minutes ?? null);
  const [energy, setEnergy] = useState<Energy | null>(initial?.energy ?? "MEDIUM");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const isPreset = minutes !== null && (SESSION_PRESETS as readonly number[]).includes(minutes);

  function commitCustom() {
    setEditing(false);
    const n = Number(draft);
    if (Number.isInteger(n) && n >= MINUTES_RANGE.min && n <= MINUTES_RANGE.max) setMinutes(n);
  }

  return (
    <div className="flex flex-col gap-8">
      <AttributeRow id="session-minutes" label="Quanto tempo você tem?">
        <ChipGroup labelId="session-minutes" options={minuteOptions} value={isPreset ? minutes : null} onChange={setMinutes}>
          {editing ? (
            <span className={`${chipClass(true)} gap-1 pr-3`}>
              <input
                autoFocus
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={3}
                value={draft}
                onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
                onBlur={commitCustom}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                aria-label="Minutos disponíveis"
                className="w-10 bg-transparent text-right text-foreground focus-visible:outline-none"
              />
              min
            </span>
          ) : (
            <button
              type="button"
              aria-pressed={minutes !== null && !isPreset}
              onClick={() => {
                setDraft(minutes && !isPreset ? String(minutes) : "");
                setEditing(true);
              }}
              className={chipClass(minutes !== null && !isPreset)}
            >
              {minutes !== null && !isPreset ? formatDuration(minutes) : "Outro"}
            </button>
          )}
        </ChipGroup>
      </AttributeRow>

      <AttributeRow id="session-energy" label="Como está sua energia?">
        <ChipGroup labelId="session-energy" options={energyOptions} value={energy} onChange={setEnergy} />
      </AttributeRow>

      <Button
        size="touch"
        disabled={minutes === null || energy === null}
        onClick={() => minutes && energy && router.push(proposalHref({ minutes, energy }))}
        className="w-full"
      >
        Montar sessão
      </Button>
    </div>
  );
}
