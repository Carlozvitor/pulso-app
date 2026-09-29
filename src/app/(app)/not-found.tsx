import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";

export default function NotFound() {
  return (
    <div className="lg:p-6">
    <EmptyState icon={SearchX} title="Não encontramos isso." description="Talvez tenha sido arquivado ou removido.">
      <Link href="/central" className="inline-flex min-h-11 items-center text-sm text-primary-soft">
        Ir para a Central
      </Link>
    </EmptyState>
    </div>
  );
}
