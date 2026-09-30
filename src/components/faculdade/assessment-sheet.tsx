"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { Award, Check, ClipboardCheck, FilePlus2, FileText, ListChecks, MapPin, Plus, Star, Trash2, Undo2, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import type { Assessment, AssessmentKind } from "@/types/assessment";
import type { Area } from "@/types/project";
import type { OriginTask } from "@/lib/origins/summary";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { OriginActions } from "@/components/origins/origin-actions";
import { AttributeRow } from "@/components/tasks/attribute-row";
import {
  createAssessment,
  createAssessmentTask,
  deleteAssessment,
  setAssessmentDone,
  updateAssessment,
} from "@/lib/actions/client";
import { datePill, dueLabel, pastDayTitle, todayIn } from "@/lib/dates";
import {
  KIND_LABEL,
  assessmentState,
  finishLabel,
  finishedLabel,
  formatGrade,
  parseGrade,
} from "@/lib/faculdade/assessments";
import type { AssessmentPatch } from "@/lib/faculdade/schemas";
import { ASSESSMENT_KINDS } from "@/types/assessment";
import { cn } from "@/lib/utils";

export const KIND_ICON: Record<AssessmentKind, LucideIcon> = {
  TRABALHO: FileText,
  PROVA: ClipboardCheck,
  ATIVIDADE: ListChecks,
};

type Target = { mode: "new"; subjectId: string | null } | { mode: "edit"; id: string };

type SheetApi = {
  create: (subjectId?: string | null) => void;
  open: (id: string) => void;
};

const SheetContext = createContext<SheetApi | null>(null);

export function useAssessmentSheet(): SheetApi {
  const api = useContext(SheetContext);
  if (!api) throw new Error("useAssessmentSheet precisa de <AssessmentSheetProvider>.");
  return api;
}

/**
 * Guarda a gaveta de avaliação da página: linhas e botões só pedem para abrir.
 * `initialId` (vindo de ?avaliacao=) abre a gaveta já na chegada — links da Central e da agenda.
 */
export function AssessmentSheetProvider({
  assessments,
  subjects,
  linked,
  today,
  defaultSubjectId = null,
  initialId,
  children,
}: {
  assessments: Assessment[];
  /** Disciplinas que dá para escolher. */
  subjects: Area[];
  /** Ações abertas ligadas a cada avaliação. */
  linked: Record<string, OriginTask[]>;
  today: string;
  defaultSubjectId?: string | null;
  initialId?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [target, setTarget] = useState<Target | null>(() =>
    initialId && assessments.some((a) => a.id === initialId) ? { mode: "edit", id: initialId } : null,
  );
  // Muda a cada abertura: o formulário nasce de novo com os valores certos.
  const [key, setKey] = useState(0);

  const api: SheetApi = {
    create: (subjectId) => {
      setTarget({ mode: "new", subjectId: subjectId ?? defaultSubjectId });
      setKey((k) => k + 1);
    },
    open: (id) => {
      setTarget({ mode: "edit", id });
      setKey((k) => k + 1);
    },
  };

  function close() {
    setTarget(null);
    // Chegou por um link (?avaliacao=): fechar limpa o endereço, para não reabrir ao atualizar.
    if (initialId) router.replace(pathname, { scroll: false });
  }

  const current = target?.mode === "edit" ? assessments.find((a) => a.id === target.id) : undefined;

  return (
    <SheetContext.Provider value={api}>
      {children}
      <Drawer open={target !== null && (target.mode === "new" || current !== undefined)} onOpenChange={(open) => !open && close()}>
        <DrawerPrimitive.VirtualKeyboardProvider>
          <DrawerContent className="bottom-(--drawer-keyboard-inset,0px) mx-auto max-w-lg rounded-t-xl border-border bg-elevated">
            {target?.mode === "new" && (
              <NewAssessmentForm key={key} subjects={subjects} subjectId={target.subjectId} onDone={close} />
            )}
            {target?.mode === "edit" && current && (
              <EditAssessmentForm
                key={key}
                assessment={current}
                subjects={subjects}
                actions={linked[current.id] ?? []}
                today={today}
                onDone={close}
              />
            )}
          </DrawerContent>
        </DrawerPrimitive.VirtualKeyboardProvider>
      </Drawer>
    </SheetContext.Provider>
  );
}

const headerButton =
  "inline-flex h-9 items-center gap-2 rounded-lg border border-border-strong bg-elevated px-3 text-sm font-medium text-foreground transition-colors duration-(--duration-fast) hover:bg-[#1d1d22] lg:h-10 lg:px-3.5";

/** "Nova avaliação": no cabeçalho (padrão) ou como linha tracejada no fim de uma lista. */
export function NewAssessmentButton({ subjectId, variant = "header" }: { subjectId?: string | null; variant?: "header" | "row" }) {
  const { create } = useAssessmentSheet();
  if (variant === "row") {
    return (
      <button
        type="button"
        onClick={() => create(subjectId)}
        className="mt-1.5 flex min-h-11 w-full items-center gap-2.5 rounded-lg border border-dashed border-white/15 px-3 text-left text-sm text-white/55 transition-colors duration-(--duration-fast) hover:text-white"
      >
        <Plus aria-hidden className="size-4" strokeWidth={1.75} />
        Nova avaliação
      </button>
    );
  }
  return (
    <button type="button" onClick={() => create(subjectId)} className={headerButton}>
      <FilePlus2 aria-hidden className="size-4 text-foreground-secondary" strokeWidth={1.75} />
      Nova avaliação
    </button>
  );
}

// ── Formulários ────────────────────────────────────────────────

const fieldClass =
  "h-12 w-full min-w-0 rounded-md border border-border bg-surface px-3.5 text-body text-foreground placeholder:text-foreground-subtle focus-visible:border-primary-soft focus-visible:outline-none disabled:opacity-40 [color-scheme:dark]";

const roseChip = (selected: boolean) =>
  cn(
    "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors duration-(--duration-fast)",
    selected
      ? "border-rose-line bg-rose-tile text-[#fce7f3]"
      : "border-border text-foreground-secondary hover:bg-elevated/60 active:bg-elevated",
  );

function KindChips({ value, onChange }: { value: AssessmentKind; onChange: (kind: AssessmentKind) => void }) {
  return (
    <div role="group" aria-label="Tipo" className="flex flex-wrap gap-2">
      {ASSESSMENT_KINDS.map((kind) => {
        const Icon = KIND_ICON[kind];
        return (
          <button key={kind} type="button" aria-pressed={value === kind} onClick={() => onChange(kind)} className={roseChip(value === kind)}>
            <Icon aria-hidden className="size-4" strokeWidth={1.75} />
            {KIND_LABEL[kind]}
          </button>
        );
      })}
    </div>
  );
}

function SubjectChips({ labelId, subjects, value, onChange }: { labelId: string; subjects: Area[]; value: string | null; onChange: (id: string) => void }) {
  if (subjects.length === 0) {
    return <p className="text-sm text-foreground-subtle">Crie uma disciplina primeiro, em “Nova disciplina”.</p>;
  }
  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-wrap gap-2">
      {subjects.map((s) => (
        <button key={s.id} type="button" aria-pressed={value === s.id} onClick={() => onChange(s.id)} className={roseChip(value === s.id)}>
          {s.name}
        </button>
      ))}
    </div>
  );
}

function NewAssessmentForm({ subjects, subjectId, onDone }: { subjects: Area[]; subjectId: string | null; onDone: () => void }) {
  const [kind, setKind] = useState<AssessmentKind>("PROVA");
  const [title, setTitle] = useState("");
  const [areaId, setAreaId] = useState<string | null>(subjectId ?? (subjects.length === 1 ? subjects[0].id : null));
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [maxGrade, setMaxGrade] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return void toast.error("Dê um nome para a avaliação.");
    if (!areaId) return void toast.error("Escolha a disciplina.");
    const value = parseGrade(maxGrade);
    if (value === undefined || value === 0) return void toast.error("Use um número no valor, como 10 ou 2,5.");
    startTransition(async () => {
      const result = await createAssessment({
        areaId,
        kind,
        title,
        dueDate: date || null,
        dueTime: date && time ? time : null,
        location,
        maxGrade: value,
        notes,
      });
      if (!result.ok) return void toast.error(result.error);
      toast("Avaliação criada.");
      onDone();
    });
  }

  return (
    <form onSubmit={submit} className="flex max-h-[88dvh] flex-col overflow-y-auto px-4 pt-3 pb-[calc(var(--safe-bottom)+1rem)]">
      <div aria-hidden className="mx-auto h-1 w-10 shrink-0 rounded-full bg-border" />
      <DrawerTitle className="mt-4 text-left text-title font-semibold">Nova avaliação</DrawerTitle>
      <DrawerDescription className="sr-only">Trabalho, prova ou atividade de uma disciplina.</DrawerDescription>

      <div className="mt-4">
        <KindChips value={kind} onChange={setKind} />
      </div>
      <label htmlFor="avaliacao-titulo" className="sr-only">
        Título
      </label>
      <input
        id="avaliacao-titulo"
        autoFocus
        autoComplete="off"
        maxLength={200}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={kind === "PROVA" ? "Ex.: AV1" : kind === "TRABALHO" ? "Ex.: Trabalho final" : "Ex.: Lista 3"}
        className={cn(fieldClass, "mt-3")}
      />

      <div className="mt-6 flex flex-col gap-6">
        <AttributeRow id="avaliacao-disciplina" label="Disciplina">
          <SubjectChips labelId="avaliacao-disciplina" subjects={subjects} value={areaId} onChange={setAreaId} />
        </AttributeRow>

        <AttributeRow id="avaliacao-quando" label="Quando" hint="Com data, aparece em Compromissos e na Central. Horário é opcional.">
          <div className="grid grid-cols-2 gap-2.5">
            <input type="date" aria-label="Data" value={date} onChange={(e) => setDate(e.target.value)} className={fieldClass} />
            <input
              type="time"
              aria-label="Horário (opcional)"
              value={time}
              disabled={!date}
              onChange={(e) => setTime(e.target.value)}
              className={fieldClass}
            />
          </div>
        </AttributeRow>

        <AttributeRow id="avaliacao-local" label="Local">
          <input
            aria-labelledby="avaliacao-local"
            autoComplete="off"
            maxLength={200}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Opcional — ex.: Bloco B, 110"
            className={fieldClass}
          />
        </AttributeRow>

        <AttributeRow id="avaliacao-vale" label="Vale">
          <label className="flex items-center gap-3">
            <input
              aria-labelledby="avaliacao-vale"
              inputMode="decimal"
              autoComplete="off"
              value={maxGrade}
              onChange={(e) => setMaxGrade(e.target.value)}
              placeholder="Opcional"
              className={cn(fieldClass, "w-36")}
            />
            <span className="text-sm text-foreground-subtle">pontos</span>
          </label>
        </AttributeRow>

        <AttributeRow id="avaliacao-anotacao" label="Anotação">
          <textarea
            aria-labelledby="avaliacao-anotacao"
            maxLength={5000}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Opcional — conteúdo, regras, dupla…"
            className={cn(fieldClass, "h-auto py-3")}
          />
        </AttributeRow>
      </div>

      <Button type="submit" size="touch" disabled={pending || !title.trim() || !areaId} className="mt-7 w-full shrink-0">
        Salvar avaliação
      </Button>
    </form>
  );
}

/** Linha de status embaixo do título: disciplina + como está ("Era pra ontem", "Entregue em 23 set"). */
function statusLine(a: Assessment, subject: string | null, today: string): string {
  const state = assessmentState(a, today);
  const parts = [subject];
  if (a.doneAt) parts.push(`${finishedLabel(a.kind)} em ${datePill(todayIn(new Date(a.doneAt)))}`);
  else if (state === "done" && a.dueDate) parts.push(`Foi ${pastDayTitle(a.dueDate, today).toLocaleLowerCase("pt-BR")}`);
  else if (a.dueDate) parts.push(a.dueTime ? `${dueLabel(a.dueDate, today)} · ${a.dueTime}` : dueLabel(a.dueDate, today));
  else parts.push("Sem data");
  return parts.filter(Boolean).join(" · ");
}

function EditAssessmentForm({
  assessment,
  subjects,
  actions,
  today,
  onDone,
}: {
  assessment: Assessment;
  subjects: Area[];
  actions: OriginTask[];
  today: string;
  onDone: () => void;
}) {
  const [kind, setKind] = useState(assessment.kind);
  const [title, setTitle] = useState(assessment.title);
  const [areaId, setAreaId] = useState(assessment.areaId);
  const [date, setDate] = useState(assessment.dueDate ?? "");
  const [time, setTime] = useState(assessment.dueTime ?? "");
  const [location, setLocation] = useState(assessment.location ?? "");
  const [maxGrade, setMaxGrade] = useState(assessment.maxGrade !== null ? formatGrade(assessment.maxGrade) : "");
  const [grade, setGrade] = useState(assessment.grade !== null ? formatGrade(assessment.grade) : "");
  const [notes, setNotes] = useState(assessment.notes ?? "");
  const [confirming, setConfirming] = useState(false);
  const [saving, startSaving] = useTransition();
  const [pending, startTransition] = useTransition();

  const subject = subjects.find((s) => s.id === areaId)?.name ?? null;
  const finish = finishLabel(kind);

  /** Salva um campo; se o servidor recusar, volta o valor anterior. */
  function save(patch: AssessmentPatch, revert: () => void) {
    startSaving(async () => {
      const result = await updateAssessment(assessment.id, patch);
      if (!result.ok) {
        revert();
        toast.error(result.error);
      }
    });
  }

  function saveText(field: "title" | "location" | "notes", value: string, previous: string | null, setter: (v: string) => void) {
    if (value.trim() === (previous ?? "").trim()) return;
    if (field === "title" && !value.trim()) {
      setter(previous ?? "");
      return void toast.error("A avaliação precisa de um nome.");
    }
    save({ [field]: value }, () => setter(previous ?? ""));
  }

  function saveGrade(field: "maxGrade" | "grade", text: string, previous: number | null, setter: (v: string) => void) {
    const value = parseGrade(text);
    const reset = () => setter(previous !== null ? formatGrade(previous) : "");
    if (value === undefined || (field === "maxGrade" && value === 0)) {
      reset();
      return void toast.error("Use um número, como 8,5.");
    }
    if (value === previous) return;
    save({ [field]: value }, reset);
  }

  function toggleDone() {
    startTransition(async () => {
      const result = await setAssessmentDone(assessment.id, !assessment.doneAt);
      if (!result.ok) return void toast.error(result.error);
      toast(assessment.doneAt ? "Voltou para as abertas." : `${finishedLabel(kind)}.`);
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteAssessment(assessment.id);
      if (!result.ok) {
        setConfirming(false);
        return void toast.error(result.error);
      }
      toast(`“${assessment.title}” apagada.`);
      onDone();
    });
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-3 px-4 pt-3 pb-[calc(var(--safe-bottom)+1rem)]">
        <div aria-hidden className="mx-auto h-1 w-10 rounded-full bg-border" />
        <DrawerTitle className="text-left text-title font-semibold">Apagar “{assessment.title}”?</DrawerTitle>
        <DrawerDescription className="text-left text-sm text-foreground-secondary">
          A nota e a anotação vão junto. As ações ligadas continuam no PULSO, em {subject ?? "Faculdade"}.
        </DrawerDescription>
        <Button size="touch" disabled={pending} onClick={remove} className="w-full">
          Apagar
        </Button>
        <Button size="touch" variant="ghost" disabled={pending} onClick={() => setConfirming(false)} className="w-full">
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex max-h-[88dvh] flex-col overflow-y-auto px-4 pt-3 pb-[calc(var(--safe-bottom)+1rem)]">
      <div aria-hidden className="mx-auto h-1 w-10 shrink-0 rounded-full bg-border" />
      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <DrawerTitle className="truncate text-left text-title font-semibold">{title || assessment.title}</DrawerTitle>
          <DrawerDescription className="mt-0.5 truncate text-left text-caption text-foreground-subtle">
            {statusLine(assessment, subject, today)}
          </DrawerDescription>
        </div>
        <span aria-live="polite" className="mt-1.5 flex shrink-0 items-center gap-1.5 text-caption text-foreground-subtle">
          {saving ? (
            "salvando…"
          ) : (
            <>
              <Check aria-hidden className="size-3.5" strokeWidth={2} />
              salva sozinha
            </>
          )}
        </span>
      </div>

      <div className="mt-4">
        <KindChips
          value={kind}
          onChange={(next) => {
            if (next === kind) return;
            const previous = kind;
            setKind(next);
            save({ kind: next }, () => setKind(previous));
          }}
        />
      </div>
      <label htmlFor="avaliacao-titulo" className="sr-only">
        Título
      </label>
      <input
        id="avaliacao-titulo"
        autoComplete="off"
        maxLength={200}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => saveText("title", title, assessment.title, setTitle)}
        className={cn(fieldClass, "mt-3")}
      />

      <div className="mt-6 flex flex-col gap-6">
        <AttributeRow id="avaliacao-disciplina" label="Disciplina">
          <SubjectChips
            labelId="avaliacao-disciplina"
            subjects={subjects}
            value={areaId}
            onChange={(next) => {
              if (next === areaId) return;
              const previous = areaId;
              setAreaId(next);
              save({ areaId: next }, () => setAreaId(previous));
            }}
          />
        </AttributeRow>

        <AttributeRow id="avaliacao-quando" label="Quando">
          <div className="grid grid-cols-2 gap-2.5">
            <input
              type="date"
              aria-label="Data"
              value={date}
              onChange={(e) => {
                const next = e.target.value;
                const previous = { date, time };
                setDate(next);
                if (!next) setTime("");
                save({ dueDate: next || null }, () => {
                  setDate(previous.date);
                  setTime(previous.time);
                });
              }}
              className={fieldClass}
            />
            <input
              type="time"
              aria-label="Horário (opcional)"
              value={time}
              disabled={!date}
              onChange={(e) => setTime(e.target.value)}
              onBlur={() => {
                if ((time || null) === assessment.dueTime) return;
                const previous = assessment.dueTime ?? "";
                save({ dueTime: time || null }, () => setTime(previous));
              }}
              className={fieldClass}
            />
          </div>
        </AttributeRow>

        <AttributeRow id="avaliacao-local" label="Local">
          <label className="relative block">
            <MapPin aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-foreground-subtle" strokeWidth={1.75} />
            <input
              aria-labelledby="avaliacao-local"
              autoComplete="off"
              maxLength={200}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onBlur={() => saveText("location", location, assessment.location, setLocation)}
              placeholder="Opcional"
              className={cn(fieldClass, "pl-10")}
            />
          </label>
        </AttributeRow>

        <div className="grid grid-cols-2 gap-2.5">
          <GradeField
            id="avaliacao-vale"
            label="Vale"
            icon={Award}
            value={maxGrade}
            onChange={setMaxGrade}
            onBlur={() => saveGrade("maxGrade", maxGrade, assessment.maxGrade, setMaxGrade)}
          />
          <GradeField
            id="avaliacao-nota"
            label="Nota"
            icon={Star}
            value={grade}
            onChange={setGrade}
            onBlur={() => saveGrade("grade", grade, assessment.grade, setGrade)}
          />
        </div>

        <AttributeRow id="avaliacao-anotacao" label="Anotação">
          <textarea
            aria-labelledby="avaliacao-anotacao"
            maxLength={5000}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => saveText("notes", notes, assessment.notes, setNotes)}
            placeholder="Conteúdo, regras, dupla…"
            className={cn(fieldClass, "h-auto py-3")}
          />
        </AttributeRow>

        <AttributeRow
          id="avaliacao-acoes"
          label="Ações no PULSO"
          hint={actions.length > 0 ? (actions.length === 1 ? "1 aberta" : `${actions.length} abertas`) : undefined}
        >
          <OriginActions
            tasks={actions}
            today={today}
            addTo={{
              id: assessment.id,
              name: assessment.title,
              placeholder: kind === "TRABALHO" ? "Nova ação para este trabalho…" : kind === "PROVA" ? "Nova ação para esta prova…" : "Nova ação para esta atividade…",
              create: (text) => createAssessmentTask(assessment.id, text),
            }}
            empty="O que precisa ser feito para ela? Anote acima — vai para o PULSO."
          />
        </AttributeRow>
      </div>

      <div className="mt-7 flex shrink-0 gap-2.5">
        {finish && (
          <Button
            size="touch"
            variant={assessment.doneAt ? "secondary" : "default"}
            disabled={pending}
            onClick={toggleDone}
            className={cn("flex-1", !assessment.doneAt && "border-[#1f5b44] bg-[#0f2a20] text-[#bbf7d0] hover:bg-[#123626]")}
          >
            {assessment.doneAt ? (
              <>
                <Undo2 aria-hidden strokeWidth={1.75} />
                Desfazer
              </>
            ) : (
              <>
                <Check aria-hidden strokeWidth={2} />
                {finish}
              </>
            )}
          </Button>
        )}
        <Button
          size="touch"
          variant="secondary"
          disabled={pending}
          onClick={() => setConfirming(true)}
          aria-label="Apagar avaliação"
          title="Apagar avaliação"
          className={cn(finish ? "w-12 px-0" : "flex-1")}
        >
          <Trash2 aria-hidden strokeWidth={1.75} />
          {!finish && "Apagar avaliação"}
        </Button>
      </div>
    </div>
  );
}

function GradeField({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  onBlur,
}: {
  id: string;
  label: string;
  icon: LucideIcon;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 id={id} className="text-sm font-medium text-foreground-secondary">
        {label}
      </h3>
      <label className="relative block">
        <Icon aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-foreground-subtle" strokeWidth={1.75} />
        <input
          aria-labelledby={id}
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder="—"
          className={cn(fieldClass, "tabular pl-10")}
        />
      </label>
    </div>
  );
}
