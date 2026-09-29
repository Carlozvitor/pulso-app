import { Search, SearchX } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { ListPanel, Page } from "@/components/layout/page";
import { SearchBox } from "@/components/navigation/search-box";
import { TaskItem } from "@/components/tasks/task-item";
import { todayIn } from "@/lib/dates";
import { searchTasks } from "@/lib/tasks/queries";

export const metadata = { title: "Buscar" };

export default async function BuscaPage({ searchParams }: PageProps<"/busca">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const results = query ? await searchTasks(query) : [];
  const today = todayIn();

  return (
    <Page icon={Search} title="Buscar" description="Título ou descrição de qualquer tarefa que não foi arquivada.">
      <SearchBox defaultValue={query} autoFocus={!query} />

      {query &&
        (results.length === 0 ? (
          <EmptyState icon={SearchX} title="Nada encontrado." description={`Nenhuma tarefa com “${query}”.`} />
        ) : (
          <>
            <p className="mt-6 mb-2 text-caption text-foreground-subtle">
              {results.length === 1 ? "1 tarefa" : `${results.length} tarefas`}
            </p>
            <ListPanel>
              <ul className="divide-y divide-border">
                {results.map((task) => (
                  <li key={task.id}>
                    <TaskItem task={task} today={today} quiet={task.status === "DONE"} />
                  </li>
                ))}
              </ul>
            </ListPanel>
          </>
        ))}
    </Page>
  );
}
