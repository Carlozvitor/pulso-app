type AttributeRowProps = {
  id: string;
  label: string;
  hint?: string;
  /** Mostra "Limpar" quando há valor — alternativa visível a tocar de novo no chip. */
  onClear?: () => void;
  children: React.ReactNode;
};

export function AttributeRow({ id, label, hint, onClear, children }: AttributeRowProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex min-h-6 items-baseline justify-between gap-4">
        <div>
          <h3 id={id} className="text-sm font-medium text-foreground-secondary">
            {label}
          </h3>
          {hint && <p className="text-caption text-foreground-subtle">{hint}</p>}
        </div>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="-my-3 min-h-11 shrink-0 px-2 text-caption text-foreground-subtle active:text-foreground"
            aria-label={`Limpar ${label.toLowerCase()}`}
          >
            Limpar
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
