import { Inbox } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/navigation/page-header";

export const metadata = { title: "Inbox" };

export default function InboxPage() {
  // Fase 3: lista real + "Você possui X itens para organizar."
  return (
    <>
      <PageHeader title="Inbox" />
      <EmptyState
        icon={Inbox}
        title="Nada para organizar."
        description="Tudo que você capturar com + chega aqui primeiro."
      />
    </>
  );
}
