import { FolderOpen } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/navigation/page-header";

export const metadata = { title: "Projetos" };

export default function ProjetosPage() {
  return (
    <>
      <PageHeader title="Projetos" />
      <EmptyState
        icon={FolderOpen}
        title="Nenhum projeto ainda."
        description="Projetos agrupam tarefas com começo e fim."
      />
    </>
  );
}
