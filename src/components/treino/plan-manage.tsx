"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Ellipsis, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { ConfirmSheet } from "@/components/feedback/confirm-sheet";
import { createPlan, createPlanFromWorkout, deletePlan, renamePlan } from "@/lib/actions/client";
import { cn } from "@/lib/utils";
import { quietButton } from "./styles";

const sheetItemClass =
  "flex min-h-13 w-full items-center gap-3 rounded-lg px-3 text-left text-body text-foreground transition-colors duration-(--duration-fast) hover:bg-surface active:bg-surface disabled:opacity-50";

/** Gaveta de um campo só (nome da ficha, novo nome do exercício…). */
export function NameSheet({
  open,
  onOpenChange,
  title,
  description,
  label,
  initial,
  placeholder,
  submitLabel,
  maxLength,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  label: string;
  initial: string;
  placeholder?: string;
  submitLabel: string;
  maxLength: number;
  pending: boolean;
  onSubmit: (value: string) => void;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerPrimitive.VirtualKeyboardProvider>
        <DrawerContent className="bottom-(--drawer-keyboard-inset,0px) mx-auto max-w-lg rounded-t-xl border-border bg-elevated">
          {/* Nasce de novo a cada abertura, com o valor certo. */}
          {open && (
            <NameForm
              title={title}
              description={description}
              label={label}
              initial={initial}
              placeholder={placeholder}
              submitLabel={submitLabel}
              maxLength={maxLength}
              pending={pending}
              onSubmit={onSubmit}
            />
          )}
        </DrawerContent>
      </DrawerPrimitive.VirtualKeyboardProvider>
    </Drawer>
  );
}

function NameForm({
  title,
  description,
  label,
  initial,
  placeholder,
  submitLabel,
  maxLength,
  pending,
  onSubmit,
}: Omit<Parameters<typeof NameSheet>[0], "open" | "onOpenChange">) {
  const [value, setValue] = useState(initial);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (value.trim()) onSubmit(value.trim());
      }}
      className="flex flex-col gap-4 px-4 pt-3 pb-[calc(var(--safe-bottom)+1rem)]"
    >
      <div aria-hidden className="mx-auto h-1 w-10 rounded-full bg-border" />
      <div>
        <DrawerTitle className="text-left text-title font-semibold">{title}</DrawerTitle>
        <DrawerDescription className="mt-0.5 text-left text-caption text-foreground-subtle">{description}</DrawerDescription>
      </div>
      <input
        aria-label={label}
        autoFocus
        autoComplete="off"
        enterKeyHint="done"
        maxLength={maxLength}
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        className="h-12 w-full rounded-md border border-border bg-surface px-4 text-body text-foreground placeholder:text-foreground-subtle focus-visible:border-primary-soft focus-visible:outline-none"
      />
      <Button type="submit" size="touch" disabled={!value.trim() || pending} className="w-full">
        {submitLabel}
      </Button>
    </form>
  );
}

/** "Nova ficha": só o nome; os exercícios entram na página dela. */
export function NewPlanButton({ suggestedName, variant = "button" }: { suggestedName: string; variant?: "button" | "link" }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(name: string) {
    startTransition(async () => {
      const result = await createPlan(name);
      if (!result.ok) return void toast.error(result.error);
      setOpen(false);
      router.push(`/treino/fichas/${result.id}`);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          variant === "link"
            ? "inline-flex min-h-11 items-center gap-1.5 text-caption text-foreground-subtle transition-colors duration-(--duration-fast) hover:text-foreground"
            : quietButton
        }
      >
        <Plus aria-hidden className={variant === "link" ? "size-3.5" : undefined} strokeWidth={1.75} />
        Nova ficha
      </button>
      <NameSheet
        open={open}
        onOpenChange={setOpen}
        title="Nova ficha"
        description="Dê um nome. Os exercícios você escolhe na página dela."
        label="Nome da ficha"
        initial={suggestedName}
        submitLabel="Criar ficha"
        maxLength={60}
        pending={pending}
        onSubmit={submit}
      />
    </>
  );
}

/** "Salvar como ficha": os exercícios do treino, na mesma ordem, viram uma ficha. */
export function SavePlanButton({ sessionId, suggestedName, disabled }: { sessionId: string; suggestedName: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(name: string) {
    startTransition(async () => {
      const result = await createPlanFromWorkout(sessionId, name);
      if (!result.ok) return void toast.error(result.error);
      setOpen(false);
      toast(`Ficha “${name}” criada.`, { action: { label: "Abrir", onClick: () => router.push(`/treino/fichas/${result.id}`) } });
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => (disabled ? undefined : setOpen(true))}
        title={disabled ? "Adicione exercícios ao treino primeiro." : undefined}
        className={quietButton}
      >
        <ClipboardList aria-hidden strokeWidth={1.75} />
        Salvar como ficha
      </button>
      <NameSheet
        open={open}
        onOpenChange={setOpen}
        title="Salvar como ficha"
        description="Os exercícios deste treino, na mesma ordem. Os números continuam vindo da última vez."
        label="Nome da ficha"
        initial={suggestedName}
        submitLabel="Salvar ficha"
        maxLength={60}
        pending={pending}
        onSubmit={submit}
      />
    </>
  );
}

/** "…" da ficha: Renomear e Apagar (os treinos feitos com ela continuam). */
export function PlanMenu({ planId, name }: { planId: string; name: string }) {
  const [dialog, setDialog] = useState<"more" | "rename" | "delete" | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function rename(value: string) {
    if (value === name) return setDialog(null);
    startTransition(async () => {
      const result = await renamePlan(planId, value);
      if (!result.ok) return void toast.error(result.error);
      setDialog(null);
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deletePlan(planId);
      if (!result.ok) return void toast.error(result.error);
      setDialog(null);
      toast(`Ficha “${name}” apagada.`);
      router.push("/treino");
    });
  }

  return (
    <>
      <button
        type="button"
        className={cn(quietButton, "w-9 px-0 lg:w-10")}
        onClick={() => setDialog("more")}
        aria-label={`Mais opções de ${name}`}
        title="Mais opções"
      >
        <Ellipsis aria-hidden strokeWidth={1.75} />
      </button>

      <Drawer open={dialog === "more"} onOpenChange={(open) => !open && setDialog(null)}>
        <DrawerContent className="mx-auto max-w-lg rounded-t-xl border-border bg-elevated">
          <div className="flex flex-col gap-2 px-4 pt-3 pb-[calc(var(--safe-bottom)+1rem)]">
            <div aria-hidden className="mx-auto h-1 w-10 rounded-full bg-border" />
            <DrawerTitle className="mt-2 truncate text-left text-title font-semibold">{name}</DrawerTitle>
            <DrawerDescription className="sr-only">Opções da ficha.</DrawerDescription>
            <ul className="mt-1 grid gap-0.5">
              <li>
                <button type="button" className={sheetItemClass} onClick={() => setDialog("rename")}>
                  <Pencil aria-hidden className="size-4 text-foreground-secondary" strokeWidth={1.75} />
                  Renomear
                </button>
              </li>
              <li>
                <button type="button" className={sheetItemClass} onClick={() => setDialog("delete")}>
                  <Trash2 aria-hidden className="size-4 text-foreground-secondary" strokeWidth={1.75} />
                  <span>
                    Apagar ficha
                    <span className="block text-caption text-foreground-subtle">Os treinos feitos com ela continuam no histórico.</span>
                  </span>
                </button>
              </li>
            </ul>
          </div>
        </DrawerContent>
      </Drawer>

      <NameSheet
        open={dialog === "rename"}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Renomear ficha"
        description={`Novo nome para ${name}.`}
        label="Nome da ficha"
        initial={name}
        submitLabel="Salvar"
        maxLength={60}
        pending={pending}
        onSubmit={rename}
      />

      <ConfirmSheet
        open={dialog === "delete"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={`Apagar “${name}”?`}
        description="Os treinos feitos com esta ficha continuam no histórico. Os exercícios também."
        confirmLabel="Apagar ficha"
        onConfirm={remove}
        pending={pending}
      />
    </>
  );
}
