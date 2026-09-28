import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
};

export function EmptyState({ icon: Icon, title, description, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <Icon aria-hidden className="mb-4 size-7 text-muted-ui" strokeWidth={1.5} />
      <p className="text-body font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1 max-w-[18rem] text-sm text-foreground-subtle">{description}</p>
      )}
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
