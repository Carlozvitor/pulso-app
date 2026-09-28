type PageHeaderProps = {
  /** Linha pequena acima do título (ex.: saudação). */
  eyebrow?: string;
  title: string;
  description?: string | null;
};

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <header className="pt-4 pb-8">
      {eyebrow && <p className="text-sm text-foreground-secondary">{eyebrow}</p>}
      <h1 className="mt-1 text-display font-semibold tracking-tight">{title}</h1>
      {description && <p className="mt-2 text-sm text-foreground-subtle">{description}</p>}
    </header>
  );
}
