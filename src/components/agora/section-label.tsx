import { cn } from "@/lib/utils";

export function SectionLabel({ children, accent, id }: { children: React.ReactNode; accent?: boolean; id?: string }) {
  return (
    <h2
      id={id}
      className={cn(
        "text-caption font-semibold tracking-[0.08em] uppercase",
        accent ? "text-primary-soft" : "text-foreground-subtle",
      )}
    >
      {children}
    </h2>
  );
}
