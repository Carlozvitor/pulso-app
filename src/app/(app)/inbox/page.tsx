import { Inbox } from "lucide-react";
import { InboxContent } from "@/components/inbox/inbox-content";
import { Page } from "@/components/layout/page";
import { inboxLabel } from "@/lib/tasks/format";
import { listInbox } from "@/lib/tasks/queries";
import { todayIn } from "@/lib/dates";

export const metadata = { title: "Inbox" };

export default async function InboxPage() {
  const tasks = await listInbox();

  return (
    <Page icon={Inbox} title="Inbox" description={inboxLabel(tasks.length) ?? "Itens soltos para organizar."}>
      <InboxContent tasks={tasks} today={todayIn()} />
    </Page>
  );
}
