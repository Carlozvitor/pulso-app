"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { Plus, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Area } from "@/types/project";
import type { CalendarEvent, Occurrence } from "@/types/event";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { OriginField } from "@/components/origins/origin-field";
import { AttributeRow } from "@/components/tasks/attribute-row";
import { chipClass } from "@/components/tasks/chip-group";
import { createEvent, deleteEvent, updateEvent } from "@/lib/actions/client";
import { datePill, weekday } from "@/lib/dates";
import { isRecurring, repeatLabel } from "@/lib/events/occurrences";
import type { EventInput } from "@/lib/events/schemas";
import { cn } from "@/lib/utils";

/** Valores iniciais de um compromisso novo (ex.: "Novo horário" de uma disciplina). */
export type EventPreset = { title?: string; areaId?: string | null; repeatWeekly?: boolean };

type Target = { mode: "new"; date: string; preset?: EventPreset } | { mode: "edit"; event: CalendarEvent; date: string };

type SheetApi = {
  create: (date?: string, preset?: EventPreset) => void;
  edit: (eventId: string, date: string) => void;
};

const SheetContext = createContext<SheetApi | null>(null);

export function useEventSheet(): SheetApi {
  const api = useContext(SheetContext);
  if (!api) throw new Error("useEventSheet precisa de <EventSheetProvider>.");
  return api;
}

/** Guarda a gaveta de compromisso da página: cards e o botão "+" só pedem para abrir. */
export function EventSheetProvider({
  events,
  areas,
  today,
  children,
}: {
  events: CalendarEvent[];
  areas: Area[];
  today: string;
  children: React.ReactNode;
}) {
  const [target, setTarget] = useState<Target | null>(null);
  // Muda a cada abertura: o formulário nasce de novo com os valores certos.
  const [key, setKey] = useState(0);

  const api: SheetApi = {
    create: (date, preset) => {
      setTarget({ mode: "new", date: date ?? today, preset });
      setKey((k) => k + 1);
    },
    edit: (eventId, date) => {
      const event = events.find((e) => e.id === eventId);
      if (!event) return;
      setTarget({ mode: "edit", event, date });
      setKey((k) => k + 1);
    },
  };

  return (
    <SheetContext.Provider value={api}>
      {children}
      <Drawer open={target !== null} onOpenChange={(open) => !open && setTarget(null)}>
        <DrawerPrimitive.VirtualKeyboardProvider>
          <DrawerContent className="bottom-(--drawer-keyboard-inset,0px) mx-auto max-w-lg rounded-t-xl border-border bg-elevated">
            {target && <EventForm key={key} target={target} areas={areas} onDone={() => setTarget(null)} />}
          </DrawerContent>
        </DrawerPrimitive.VirtualKeyboardProvider>
      </Drawer>
    </SheetContext.Provider>
  );
}

/** "+ Compromisso" (no cabeçalho). */
export function NewEventButton({ date, className }: { date?: string; className?: string }) {
  const { create } = useEventSheet();
  return (
    <button
      type="button"
      onClick={() => create(date)}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-lg border border-amber-line bg-amber-tile px-3 text-sm font-medium text-[#ffedd5] transition-[filter] duration-(--duration-fast) hover:brightness-125 lg:h-10 lg:px-3.5",
        className,
      )}
    >
      <Plus aria-hidden className="size-4" strokeWidth={2} />
      Compromisso
    </button>
  );
}

function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h} h`;
}

/** Um compromisso num dia — toque abre para editar. */
export function OccurrenceCard({ occurrence, compact }: { occurrence: Occurrence; compact?: boolean }) {
  const { edit } = useEventSheet();
  const o = occurrence;
  const when = o.allDay ? "Dia todo" : [o.startTime, o.durationMinutes ? durationLabel(o.durationMinutes) : null].filter(Boolean).join(" · ");
  const meta = [o.location, o.context].filter(Boolean).join(" · ");

  return (
    <button
      type="button"
      onClick={() => edit(o.eventId, o.date)}
      aria-label={`${o.title}, ${when}`}
      className={cn(
        "tint tint-amber block w-full rounded-lg p-2.5 text-left transition-[filter,opacity] duration-(--duration-fast) hover:brightness-125",
        o.allDay && "border-dashed",
        o.past && "opacity-50",
        !compact && "lg:p-3",
      )}
    >
      <span className="tabular flex items-center gap-1.5 font-mono text-[0.71875rem] font-semibold text-amber-ink">
        {o.recurring && <Repeat aria-label="Repete" className="size-3 opacity-80" strokeWidth={2} />}
        {when}
      </span>
      <span className="mt-0.5 block text-[0.8125rem] leading-snug font-semibold lg:text-sm">{o.title}</span>
      {meta && <span className="mt-0.5 block truncate text-caption text-white/55">{meta}</span>}
    </button>
  );
}

// ── Formulário ─────────────────────────────────────────────────

const DURATIONS = [30, 60, 90, 120, 180];
/** Segunda primeiro, como a semana do Hub. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_LETTER = ["D", "S", "T", "Q", "Q", "S", "S"];
const DAY_NAME = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

const fieldClass =
  "h-12 w-full min-w-0 rounded-md border border-border bg-surface px-3.5 text-body text-foreground placeholder:text-foreground-subtle focus-visible:border-primary-soft focus-visible:outline-none disabled:opacity-40 [color-scheme:dark]";

type Step = "form" | "save-scope" | "delete-scope" | "delete-confirm";

function EventForm({ target, areas, onDone }: { target: Target; areas: Area[]; onDone: () => void }) {
  const existing = target.mode === "edit" ? target.event : null;
  const preset = target.mode === "new" ? target.preset : undefined;
  const recurring = existing ? isRecurring(existing) : false;
  // Num que se repete, o formulário mostra o dia que foi tocado.
  const [title, setTitle] = useState(existing?.title ?? preset?.title ?? "");
  const [date, setDate] = useState(target.date);
  const [allDay, setAllDay] = useState(existing ? existing.startTime === null : false);
  const [time, setTime] = useState(existing?.startTime ?? "09:00");
  const [duration, setDuration] = useState<number | null>(existing ? existing.durationMinutes : 60);
  const [repeatDays, setRepeatDays] = useState<number[]>(existing?.repeatDays ?? (preset?.repeatWeekly ? [weekday(target.date)] : []));
  const [repeatUntil, setRepeatUntil] = useState(existing?.repeatUntil ?? "");
  const [location, setLocation] = useState(existing?.location ?? "");
  const [areaId, setAreaId] = useState<string | null>(existing?.areaId ?? preset?.areaId ?? null);
  const [description, setDescription] = useState(existing?.description ?? "");
  const [step, setStep] = useState<Step>("form");
  const [pending, startTransition] = useTransition();

  const repeats = repeatDays.length > 0;
  const durations = duration && !DURATIONS.includes(duration) ? [...DURATIONS, duration].sort((a, b) => a - b) : DURATIONS;

  function input(scope: "all" | "only"): EventInput {
    // "Todos" sem mexer na data mantém o começo da repetição (não apaga as semanas anteriores).
    const startDate = scope === "all" && existing && recurring && date === target.date ? existing.startDate : date;
    return {
      title,
      startDate,
      startTime: allDay ? null : time,
      durationMinutes: allDay ? null : duration,
      repeatDays,
      repeatUntil: repeats && repeatUntil ? repeatUntil : null,
      location,
      description,
      areaId,
    };
  }

  function save(scope: "all" | "only") {
    startTransition(async () => {
      const result = !existing
        ? await createEvent(input("all"))
        : await updateEvent(existing.id, input(scope), scope === "all" ? { kind: "all" } : { kind: "only", date: target.date });
      if (!result.ok) {
        setStep("form");
        return void toast.error(result.error);
      }
      toast(existing ? "Compromisso atualizado." : "Compromisso criado.");
      onDone();
    });
  }

  function remove(scope: "all" | "only") {
    if (!existing) return;
    startTransition(async () => {
      const result = await deleteEvent(existing.id, scope === "all" ? { kind: "all" } : { kind: "only", date: target.date });
      if (!result.ok) {
        setStep("form");
        return void toast.error(result.error);
      }
      toast(scope === "only" ? `Tirado de ${datePill(target.date)}.` : "Compromisso apagado.");
      onDone();
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return void toast.error("Dê um nome para o compromisso.");
    if (existing && recurring) setStep("save-scope");
    else save("all");
  }

  function toggleRepeat(on: boolean) {
    // Ligou a repetição: já marca o dia da semana da data escolhida.
    setRepeatDays(on ? [weekday(date)] : []);
  }

  function toggleDay(d: number) {
    setRepeatDays((days) => (days.includes(d) ? days.filter((x) => x !== d) : [...days, d]));
  }

  const heading = existing ? "Compromisso" : "Novo compromisso";

  if (step !== "form") {
    const day = datePill(target.date);
    const choices =
      step === "save-scope"
        ? { title: "Salvar em quais dias?", only: `Só ${day}`, all: "Todos os dias da repetição", run: save }
        : step === "delete-scope"
          ? { title: `Apagar “${existing?.title}”?`, only: `Só ${day}`, all: "Todos os dias da repetição", run: remove }
          : null;
    return (
      <div className="flex flex-col gap-3 px-4 pt-3 pb-[calc(var(--safe-bottom)+1rem)]">
        <div aria-hidden className="mx-auto h-1 w-10 rounded-full bg-border" />
        {choices ? (
          <>
            <DrawerTitle className="text-left text-title font-semibold">{choices.title}</DrawerTitle>
            <DrawerDescription className="text-left text-sm text-foreground-secondary">
              Este compromisso se repete. “Só {day}” tira esse dia da repetição{step === "save-scope" ? " e guarda a mudança só nele" : ""}.
            </DrawerDescription>
            <Button size="touch" disabled={pending} onClick={() => choices.run("only")} className="w-full">
              {choices.only}
            </Button>
            <Button size="touch" variant="secondary" disabled={pending} onClick={() => choices.run("all")} className="w-full">
              {choices.all}
            </Button>
          </>
        ) : (
          <>
            <DrawerTitle className="text-left text-title font-semibold">Apagar “{existing?.title}”?</DrawerTitle>
            <DrawerDescription className="text-left text-sm text-foreground-secondary">Não dá para desfazer.</DrawerDescription>
            <Button size="touch" disabled={pending} onClick={() => remove("all")} className="w-full">
              Apagar
            </Button>
          </>
        )}
        <Button size="touch" variant="ghost" disabled={pending} onClick={() => setStep("form")} className="w-full">
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex max-h-[88dvh] flex-col overflow-y-auto px-4 pt-3 pb-[calc(var(--safe-bottom)+1rem)]">
      <div aria-hidden className="mx-auto h-1 w-10 shrink-0 rounded-full bg-border" />
      <DrawerTitle className="mt-4 text-left text-title font-semibold">{heading}</DrawerTitle>
      <DrawerDescription className="sr-only">Quando acontece, onde e de onde vem.</DrawerDescription>

      <label htmlFor="evento-titulo" className="sr-only">
        Título
      </label>
      <input
        id="evento-titulo"
        autoFocus={!existing}
        autoComplete="off"
        maxLength={200}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Ex.: Reunião com cliente"
        className={cn(fieldClass, "mt-3")}
      />

      <div className="mt-6 flex flex-col gap-6">
        <AttributeRow id="evento-quando" label="Quando">
          <div className="grid grid-cols-2 gap-2.5">
            <input type="date" aria-label="Data" required value={date} onChange={(e) => setDate(e.target.value)} className={fieldClass} />
            <input
              type="time"
              aria-label="Horário de início"
              value={time}
              disabled={allDay}
              onChange={(e) => setTime(e.target.value)}
              className={fieldClass}
            />
          </div>
          <label className="flex min-h-11 items-center justify-between gap-4 text-sm text-foreground-secondary">
            Dia todo
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className="relative h-6 w-10 rounded-full bg-[#2a2a2f] transition-colors duration-(--duration-fast) peer-checked:bg-amber-tile peer-focus-visible:ring-2 peer-focus-visible:ring-primary-soft after:absolute after:top-[3px] after:left-[3px] after:size-[18px] after:rounded-full after:bg-foreground-secondary after:transition-transform after:duration-(--duration-fast) peer-checked:after:translate-x-4 peer-checked:after:bg-amber-ink"
            />
          </label>
        </AttributeRow>

        {!allDay && (
          <AttributeRow id="evento-duracao" label="Duração">
            <div role="group" aria-labelledby="evento-duracao" className="flex flex-wrap gap-2">
              {durations.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  aria-pressed={duration === minutes}
                  onClick={() => setDuration(duration === minutes ? null : minutes)}
                  className={chipClass(duration === minutes)}
                >
                  {durationLabel(minutes)}
                </button>
              ))}
            </div>
          </AttributeRow>
        )}

        <AttributeRow id="evento-repetir" label="Repetir" hint={repeatLabel(repeatDays, repeatUntil || null) ?? undefined}>
          <div role="group" aria-labelledby="evento-repetir" className="flex gap-2">
            <button type="button" aria-pressed={!repeats} onClick={() => toggleRepeat(false)} className={chipClass(!repeats)}>
              Não
            </button>
            <button type="button" aria-pressed={repeats} onClick={() => !repeats && toggleRepeat(true)} className={chipClass(repeats)}>
              <Repeat aria-hidden className="mr-1.5 size-3.5" strokeWidth={2} />
              Toda semana
            </button>
          </div>
          {repeats && (
            <>
              <div role="group" aria-label="Dias da semana" className="grid grid-cols-7 gap-1.5">
                {WEEK_ORDER.map((d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={repeatDays.includes(d)}
                    aria-label={DAY_NAME[d]}
                    onClick={() => toggleDay(d)}
                    className={cn(chipClass(repeatDays.includes(d)), "px-0")}
                  >
                    {DAY_LETTER[d]}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-3 text-sm text-foreground-secondary">
                <span className="shrink-0">Até</span>
                <input
                  type="date"
                  aria-label="Repetir até (opcional)"
                  value={repeatUntil}
                  min={date}
                  onChange={(e) => setRepeatUntil(e.target.value)}
                  className={fieldClass}
                />
                {repeatUntil && (
                  <button type="button" onClick={() => setRepeatUntil("")} className="min-h-11 shrink-0 px-1 text-caption text-foreground-subtle hover:text-foreground">
                    Sem fim
                  </button>
                )}
              </label>
            </>
          )}
        </AttributeRow>

        <AttributeRow id="evento-local" label="Local">
          <input
            aria-labelledby="evento-local"
            autoComplete="off"
            maxLength={200}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ex.: Google Meet, Bloco C…"
            className={fieldClass}
          />
        </AttributeRow>

        <AttributeRow id="evento-origem" label="Origem">
          <OriginField labelId="evento-origem" areas={areas} value={areaId} onChange={setAreaId} pickerTitle="De onde vem esse compromisso?" />
        </AttributeRow>

        <AttributeRow id="evento-descricao" label="Descrição">
          <textarea
            aria-labelledby="evento-descricao"
            maxLength={5000}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Opcional"
            className={cn(fieldClass, "h-auto py-3")}
          />
        </AttributeRow>
      </div>

      <Button type="submit" size="touch" disabled={pending || !title.trim()} className="mt-7 w-full shrink-0">
        {existing ? "Salvar" : "Salvar compromisso"}
      </Button>
      {existing && (
        <button
          type="button"
          onClick={() => setStep(recurring ? "delete-scope" : "delete-confirm")}
          className="mt-2 flex min-h-11 shrink-0 items-center justify-center gap-2 text-sm text-foreground-subtle transition-colors duration-(--duration-fast) hover:text-foreground"
        >
          <Trash2 aria-hidden className="size-4" strokeWidth={1.75} />
          Apagar compromisso
        </button>
      )}
    </form>
  );
}
