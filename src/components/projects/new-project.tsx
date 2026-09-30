"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import type { Area } from "@/types/project";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { AttributeRow } from "@/components/tasks/attribute-row";
import { OriginField } from "@/components/origins/origin-field";
import { DueField } from "@/components/tasks/due-field";
import { createProject } from "@/lib/actions/client";

/** "Novo projeto": só o nome é obrigatório. Ao criar, abre o projeto. */
/** `inline`: botão compacto para o cabeçalho da página (em vez de ocupar a largura toda). */
export function NewProject({ areas, today, inline }: { areas: Area[]; today: string; inline?: boolean }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [areaId, setAreaId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const titleId = useId();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      const result = await createProject({ name, areaId, dueDate });
      if (!result.ok) return void toast.error(result.error);
      setOpen(false);
      setName("");
      setAreaId(null);
      setDueDate(null);
      router.push(`/projetos/${result.id}`);
    });
  }

  return (
    <>
      <Button
        variant="secondary"
        size="touch"
        onClick={() => setOpen(true)}
        className={inline ? "h-9 w-auto border-border-strong px-3.5 text-sm font-medium lg:h-10" : "w-full"}
      >
        <Plus aria-hidden />
        Novo projeto
      </Button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerPrimitive.VirtualKeyboardProvider>
          <DrawerContent className="bottom-(--drawer-keyboard-inset,0px) mx-auto max-w-lg rounded-t-xl border-border bg-elevated">
            <form
              onSubmit={submit}
              className="flex flex-col gap-6 overflow-y-auto px-4 pt-3 pb-[calc(var(--safe-bottom)+1rem)]"
            >
              <div aria-hidden className="mx-auto h-1 w-10 rounded-full bg-border" />
              <div className="flex flex-col gap-4">
                <DrawerTitle id={titleId} className="text-left text-title font-semibold">
                  Novo projeto
                </DrawerTitle>
                <DrawerDescription className="sr-only">
                  Dê um nome. Origem e prazo são opcionais.
                </DrawerDescription>
                <input
                  aria-labelledby={titleId}
                  autoFocus
                  autoComplete="off"
                  enterKeyHint="done"
                  maxLength={120}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Portfólio"
                  className="h-12 w-full rounded-md border border-border bg-surface px-4 text-body text-foreground placeholder:text-foreground-subtle focus-visible:border-primary-soft focus-visible:outline-none"
                />
              </div>

              {areas.length > 0 && (
                <AttributeRow id="new-project-area" label="Origem">
                  <OriginField labelId="new-project-area" areas={areas} value={areaId} onChange={setAreaId} pickerTitle="De onde vem esse projeto?" />
                </AttributeRow>
              )}
              <DueField today={today} value={dueDate} onChange={setDueDate} />

              <Button type="submit" size="touch" disabled={!name.trim() || pending} className="w-full">
                Criar projeto
              </Button>
            </form>
          </DrawerContent>
        </DrawerPrimitive.VirtualKeyboardProvider>
      </Drawer>
    </>
  );
}
