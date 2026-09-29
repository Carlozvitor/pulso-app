import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { SectionHeading } from "@/components/cards/card-parts";
import { EmptyState } from "@/components/feedback/empty-state";
import { ListPanel, Page } from "@/components/layout/page";
import { DONE_LIMIT, listDone } from "@/lib/tasks/queries";

export const metadata = { title: "Feitas" };

export default async function FeitasPage() {
  const days = await listDone();
  const total = days.reduce((sum, day) => sum + day.tasks.length, 0);

  return (
    <Page icon={CircleCheck} title="Feitas" description="O que você já concluiu, dia a dia.">
      {days.length === 0 ? (
        <EmptyState
          icon={CircleCheck}
          title="Nada concluído ainda."
          description="Quando você concluir uma tarefa, ela aparece aqui com o dia em que foi feita."
        />
      ) : (
        <div className="flex flex-col gap-7">
          {days.map((day) => (
            <section key={day.key} aria-labelledby={`feitas-${day.key}`}>
              <SectionHeading id={`feitas-${day.key}`} title={day.label} />
              <ListPanel>
                <ul className="divide-y divide-border">
                  {day.tasks.map((task) => (
                    <li key={task.id}>
                      <Link
                        href={`/tarefas/${task.id}`}
                        className="-mx-4 flex min-h-14 items-center gap-3 px-4 py-3 transition-colors duration-(--duration-fast) hover:bg-elevated/60 active:bg-elevated"
                      >
                        <CircleCheck aria-hidden className="size-5 shrink-0 text-success" strokeWidth={1.75} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-body text-foreground-secondary">{task.title}</span>
                          {task.context && (
                            <span className="block truncate text-caption text-foreground-subtle">{task.context}</span>
                          )}
                        </span>
                        <span className="tabular shrink-0 text-caption text-foreground-subtle">
                          <span className="sr-only">Concluída às </span>
                          {task.time}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </ListPanel>
            </section>
          ))}
          {total >= DONE_LIMIT && (
            <p className="text-center text-caption text-foreground-subtle">Mostrando as {DONE_LIMIT} mais recentes.</p>
          )}
        </div>
      )}
    </Page>
  );
}
