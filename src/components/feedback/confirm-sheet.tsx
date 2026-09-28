"use client";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";

type ConfirmSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  onConfirm: () => void;
  pending?: boolean;
};

/** Confirmação em bottom sheet — para ações que não têm "Desfazer". */
export function ConfirmSheet({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  pending,
}: ConfirmSheetProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-lg rounded-t-xl border-border bg-elevated">
        <div className="flex flex-col gap-4 px-4 pt-3 pb-[calc(var(--safe-bottom)+1rem)]">
          <div aria-hidden className="mx-auto h-1 w-10 rounded-full bg-border" />
          <div>
            <DrawerTitle className="text-left text-title font-semibold">{title}</DrawerTitle>
            {description ? (
              <DrawerDescription className="mt-1 text-left text-sm text-foreground-secondary">
                {description}
              </DrawerDescription>
            ) : null}
          </div>
          <Button size="touch" disabled={pending} onClick={onConfirm} className="w-full">
            {confirmLabel}
          </Button>
          <Button variant="secondary" size="touch" onClick={() => onOpenChange(false)} className="w-full">
            Cancelar
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
