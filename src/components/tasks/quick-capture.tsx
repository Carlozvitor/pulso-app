"use client";

import { useId, useState } from "react";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";

type QuickCaptureProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Recebe o texto já sem espaços nas pontas. */
  onCapture: (title: string) => void;
};

/**
 * Captura rápida: um campo, um botão. Nada obrigatório além do texto —
 * projeto, prazo, energia etc. ficam para depois. Entra direto em A fazer.
 */
export function QuickCapture({ open, onOpenChange, onCapture }: QuickCaptureProps) {
  const [value, setValue] = useState("");
  const titleId = useId();
  const title = value.trim();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title) return;
    onCapture(title);
    setValue("");
    onOpenChange(false);
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerPrimitive.VirtualKeyboardProvider>
        <DrawerContent className="bottom-(--drawer-keyboard-inset,0px) mx-auto max-w-lg rounded-t-xl border-border bg-elevated">
          <form onSubmit={submit} className="flex flex-col gap-4 px-4 pt-3 pb-[calc(var(--safe-bottom)+1rem)]">
            <div aria-hidden className="mx-auto h-1 w-10 rounded-full bg-border" />
            <div>
              <DrawerTitle id={titleId} className="text-left text-title font-semibold">
                O que você precisa fazer?
              </DrawerTitle>
              <DrawerDescription className="sr-only">
                Escreva e adicione. Os detalhes podem ficar para depois.
              </DrawerDescription>
            </div>
            <input
              aria-labelledby={titleId}
              autoFocus
              autoComplete="off"
              enterKeyHint="done"
              maxLength={500}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Ex.: Comprar remédio"
              className="h-12 w-full rounded-md border border-border bg-surface px-4 text-body text-foreground placeholder:text-foreground-subtle focus-visible:border-primary-soft focus-visible:outline-none"
            />
            <Button type="submit" size="touch" disabled={!title} className="w-full">
              Adicionar
            </Button>
          </form>
        </DrawerContent>
      </DrawerPrimitive.VirtualKeyboardProvider>
    </Drawer>
  );
}
