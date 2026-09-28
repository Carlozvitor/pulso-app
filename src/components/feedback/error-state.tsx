import { CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = "Não deu para carregar agora.",
  description = "Seus dados estão seguros. Tente de novo em instantes.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-16 text-center">
      <CloudOff aria-hidden className="mb-4 size-7 text-muted-ui" strokeWidth={1.5} />
      <p className="text-body font-medium">{title}</p>
      <p className="mt-1 max-w-[18rem] text-sm text-foreground-subtle">{description}</p>
      {onRetry && (
        <Button variant="secondary" size="touch" className="mt-6" onClick={onRetry}>
          Tentar de novo
        </Button>
      )}
    </div>
  );
}
