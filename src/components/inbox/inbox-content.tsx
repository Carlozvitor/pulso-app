"use client";

import { Inbox } from "lucide-react";
import type { TaskWithContext } from "@/types/task";
import { EmptyState } from "@/components/feedback/empty-state";
import { ListPanel } from "@/components/layout/page";
import { InboxList } from "./inbox-list";

/** Inbox: itens soltos para organizar (a captura agora vai direto para A fazer). */
export function InboxContent({ tasks, today }: { tasks: TaskWithContext[]; today: string }) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="Nada para organizar."
        description="O que você anota vai direto para A fazer."
      />
    );
  }

  return (
    <ListPanel>
      <InboxList tasks={tasks} today={today} />
    </ListPanel>
  );
}
