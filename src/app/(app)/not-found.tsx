import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";

export default function NotFound() {
  return (
    <EmptyState icon={SearchX} title="Não encontramos isso." description="Talvez tenha sido arquivado ou removido.">
      <Link href="/agora" className="inline-flex min-h-11 items-center text-sm text-primary-soft">
        Ir para Agora
      </Link>
    </EmptyState>
  );
}
