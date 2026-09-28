import { Inbox } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { InboxList } from "@/components/inbox/inbox-list";
import { PageHeader } from "@/components/navigation/page-header";
import { inboxLabel } from "@/lib/tasks/format";
import { listInbox } from "@/lib/tasks/queries";

export const metadata = { title: "Inbox" };

export default async function InboxPage() {
  const tasks = await listInbox();

  return (
    <>
      <PageHeader title="Inbox" description={inboxLabel(tasks.length)} />
      {tasks.length > 0 ? (
        <InboxList tasks={tasks} />
      ) : (
        <EmptyState
          icon={Inbox}
          title="Nada para organizar."
          description="Tudo que você capturar com + chega aqui primeiro."
        />
      )}
    </>
  );
}
