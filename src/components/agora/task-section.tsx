import type { TaskSummary } from "@/types/task";
import { TaskItem } from "@/components/tasks/task-item";
import { SectionLabel } from "./section-label";

type TaskSectionProps = {
  id: string;
  label: string;
  tasks: TaskSummary[];
  today: string;
  quiet?: boolean;
};

export function TaskSection({ id, label, tasks, today, quiet }: TaskSectionProps) {
  if (tasks.length === 0) return null;
  return (
    <section aria-labelledby={id} className="mt-8">
      <SectionLabel id={id}>{label}</SectionLabel>
      <ul className="mt-2 divide-y divide-border">
        {tasks.map((task) => (
          <li key={task.id}>
            <TaskItem task={task} today={today} quiet={quiet} />
          </li>
        ))}
      </ul>
    </section>
  );
}
