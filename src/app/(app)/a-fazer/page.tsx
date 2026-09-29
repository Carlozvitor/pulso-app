import Link from "next/link";
import { ChevronRight, Inbox, ListTodo } from "lucide-react";
import { SectionHeading } from "@/components/cards/card-parts";
import { EmptyState } from "@/components/feedback/empty-state";
import { ListPanel, Page } from "@/components/layout/page";
import { PendingCaptureList } from "@/components/tasks/pending-capture-list";
import { TodoList, type TodoSection } from "@/components/tasks/todo-list";
import { todayIn } from "@/lib/dates";
import { countInbox, listTodo } from "@/lib/tasks/queries";

export const metadata = { title: "A fazer" };

const SECTIONS: { key: TodoSection; title: string }[] = [
  { key: "inProgress", title: "Em andamento" },
  { key: "paused", title: "Pausadas" },
  { key: "todo", title: "A fazer" },
  { key: "later", title: "Agora não · voltam depois" },
];

function countLabel(count: number): string {
  if (count === 0) return "Nada por fazer agora.";
  return count === 1 ? "1 tarefa." : `${count} tarefas.`;
}

export default async function AFazerPage() {
  const [sections, inboxCount] = await Promise.all([listTodo(), countInbox()]);
  const today = todayIn();
  const ids = [...sections.inProgress, ...sections.paused, ...sections.todo, ...sections.later].map((t) => t.id);

  return (
    <Page icon={ListTodo} title="A fazer" description={countLabel(ids.length)}>
      <PendingCaptureList savedIds={ids} />

      {inboxCount > 0 && (
        <Link
          href="/inbox"
          className="panel mb-6 flex min-h-12 items-center gap-3 px-4 text-sm text-foreground-secondary transition-colors duration-(--duration-fast) hover:text-foreground"
        >
          <Inbox aria-hidden className="size-5 text-foreground-subtle" strokeWidth={1.75} />
          <span className="flex-1">
            {inboxCount === 1 ? "1 item na Inbox para organizar" : `${inboxCount} itens na Inbox para organizar`}
          </span>
          <ChevronRight aria-hidden className="size-5 text-muted-ui" />
        </Link>
      )}

      {ids.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="Nada por fazer agora."
          description="Quando lembrar de algo, anote — vira tarefa a fazer na hora."
        />
      ) : (
        <div className="flex flex-col gap-7">
          {SECTIONS.filter((s) => sections[s.key].length > 0).map((s) => (
            <section key={s.key} aria-labelledby={`a-fazer-${s.key}`}>
              <SectionHeading id={`a-fazer-${s.key}`} title={s.title} />
              <ListPanel>
                <TodoList tasks={sections[s.key]} today={today} section={s.key} />
              </ListPanel>
            </section>
          ))}
        </div>
      )}
    </Page>
  );
}
