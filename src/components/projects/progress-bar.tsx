import type { ProjectProgress } from "@/types/project";

/** Barra fina e discreta — progresso sem virar métrica de cobrança. */
export function ProgressBar({ progress, label }: { progress: ProjectProgress; label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress.percent}
      aria-valuetext={`${progress.done} de ${progress.total} concluídas`}
      className="h-1 w-full overflow-hidden rounded-full bg-border"
    >
      <div
        className="h-full rounded-full bg-success transition-[width] duration-(--duration-base)"
        style={{ width: `${progress.percent}%` }}
      />
    </div>
  );
}
